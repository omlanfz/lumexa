// FILE PATH: client/lib/classroom/recording/classAudio.ts
//
// What a recording of the class HEARS.
//
// Capturing the browser window gives video only — and where a browser can offer
// audio with a window or screen at all, it is whatever the computer is playing
// (other tabs, notifications, music), only if the teacher ticks a box, and never
// the teacher's own microphone. So the class's audio is not taken from the
// capture. It is mixed here, from the same Daily audio tracks the classroom
// itself plays (see ClassAudioRenderer):
//
//   - the teacher's own microphone (and the audio of a screen they share),
//   - every student's microphone (and the audio of a screen they share),
//
// each track once. A shared screen's sound is there only where the browser lets
// it be shared at all (Chrome and Edge, for a tab or the whole screen, when the
// sharer ticks "share audio"). A student who joins, leaves, mutes or switches
// microphone mid-class simply appears in or drops out of the mix: the tracks are
// re-read whenever the call changes (and every second as a safety net). The mix is
// never played through the speakers (no echo, no doubled sound) — it only feeds
// the recorder.
//
// What is in the mix is decided by what DAILY says each track is doing, not by
// what the underlying media track happens to carry: a microphone Daily reports as
// off (the person muted it, the teacher muted it or took away the right to use it)
// is not recorded, however Daily implements muting underneath — "muted" must mean
// "not in the recording" for the teacher's own microphone above all.

/** A Daily track, as far as the recording reads it. Daily's `persistentTrack` is
 * the same MediaStreamTrack for as long as the track lives, whether or not it is
 * flowing at this instant; `track` exists only while it is playable. */
export interface AudioTrackState {
  /** Daily's state for the track: 'off' (muted, or not allowed to send) and
   * 'blocked' (no device, or no permission) mean it is not being sent. */
  state?: string;
  persistentTrack?: MediaStreamTrack;
  track?: MediaStreamTrack;
}

/** Whether Daily says this track is not being sent. */
function isSilenced(state: AudioTrackState | undefined): boolean {
  return state?.state === 'off' || state?.state === 'blocked';
}

/** The part of a Daily participant the recording reads. */
export interface ParticipantAudio {
  tracks: {
    /** The microphone. */
    audio?: AudioTrackState;
    /** The sound of a shared screen or tab. */
    screenAudio?: AudioTrackState;
  };
}

/** The part of a Daily call the recording reads: `participants()` holds this
 * browser's own connection (`local`) and everyone else's. */
export interface ClassAudioSource {
  participants(): Record<string, ParticipantAudio>;
}

/** Every live audio track in the class — local and remote, microphones and
 * screen-share audio — once each (by track id). A remote track appears once it is
 * subscribed; one that has ended is left out, and so is one Daily says is off (a
 * muted microphone, the audio of a share that has stopped). */
export function collectClassAudioTracks(call: ClassAudioSource): MediaStreamTrack[] {
  const found = new Map<string, MediaStreamTrack>();
  const take = (state: AudioTrackState | undefined) => {
    if (isSilenced(state)) return;
    const track = state?.persistentTrack ?? state?.track;
    if (track && track.kind === 'audio' && track.readyState === 'live') {
      found.set(track.id, track);
    }
  };
  for (const participant of Object.values(call.participants())) {
    take(participant.tracks.audio);
    take(participant.tracks.screenAudio);
  }
  return [...found.values()];
}

/** What to connect and disconnect to go from the tracks in the mix to the tracks
 * the class has now. */
export function diffTrackIds(
  inMix: Iterable<string>,
  wanted: Iterable<string>,
): { add: string[]; remove: string[] } {
  const have = new Set(inMix);
  const want = new Set(wanted);
  return {
    add: [...want].filter((id) => !have.has(id)),
    remove: [...have].filter((id) => !want.has(id)),
  };
}

/** Mixes any number of audio tracks into one, for the recorder. Created inside
 * the teacher's click (an AudioContext may only start from a user action). */
export class ClassAudioMixer {
  private readonly context: AudioContext;
  private readonly destination: MediaStreamAudioDestinationNode;
  private readonly bus: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly inMix = new Map<string, MediaStreamAudioSourceNode>();

  constructor(context: AudioContext = new AudioContext()) {
    this.context = context;
    this.destination = context.createMediaStreamDestination();
    this.bus = context.createGain();
    this.bus.gain.value = 0.9;
    // Several people talking at once must not clip: a gentle limiter that only
    // acts near the top, so ordinary speech is left exactly as it is.
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 3;
    this.limiter.attack.value = 0.005;
    this.limiter.release.value = 0.2;
    this.bus.connect(this.limiter);
    this.limiter.connect(this.destination);
    // Deliberately NOT connected to context.destination: the class hears itself
    // through the classroom's own audio, never twice.
  }

  /** The mixed audio, to be recorded. */
  get track(): MediaStreamTrack {
    return this.destination.stream.getAudioTracks()[0];
  }

  /** How many tracks are in the mix right now. */
  get size(): number {
    return this.inMix.size;
  }

  /** Browsers start an AudioContext suspended until a user action allows it. */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') await this.context.resume();
  }

  /** Makes the mix contain exactly `tracks`. Safe to call as often as needed. */
  sync(tracks: MediaStreamTrack[]): { added: number; removed: number } {
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const { add, remove } = diffTrackIds(this.inMix.keys(), byId.keys());
    for (const id of remove) {
      const node = this.inMix.get(id);
      node?.disconnect();
      this.inMix.delete(id);
    }
    for (const id of add) {
      try {
        const node = this.context.createMediaStreamSource(
          new MediaStream([byId.get(id)!]),
        );
        node.connect(this.bus);
        this.inMix.set(id, node);
      } catch {
        // A track that cannot be mixed (it ended this very moment) is simply
        // not in the mix; the next sync sees the room as it is then.
      }
    }
    return { added: add.length, removed: remove.length };
  }

  async close(): Promise<void> {
    for (const node of this.inMix.values()) node.disconnect();
    this.inMix.clear();
    this.destination.stream.getTracks().forEach((t) => t.stop());
    if (this.context.state !== 'closed') await this.context.close();
  }
}
