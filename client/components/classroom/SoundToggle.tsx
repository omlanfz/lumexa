// FILE PATH: client/components/classroom/SoundToggle.tsx
//
// The classroom's sound switch: one icon button that turns the short effects
// (someone joining or leaving, a raised hand, a chat message, a badge) on or off
// for this person. The choice is remembered on this device. Pressing it is also
// the user action browsers want before they let a page make any sound, so
// turning sounds on plays a soft confirmation.

'use client';

import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  playClassroomTone,
  setSoundsEnabled,
  soundsEnabled,
  subscribeSounds,
  unlockClassroomSounds,
} from '@/lib/classroom/sounds';

export default function SoundToggle() {
  const on = useSyncExternalStore(subscribeSounds, soundsEnabled, () => true);

  const toggle = () => {
    const next = !on;
    setSoundsEnabled(next);
    if (next) {
      unlockClassroomSounds();
      playClassroomTone('chat-message');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="sound-toggle"
      aria-pressed={on}
      aria-label={on ? 'Mute classroom sounds' : 'Unmute classroom sounds'}
      data-tooltip={on ? 'Classroom sounds on — click to mute' : 'Classroom sounds muted — click to unmute'}
      data-tooltip-pos="bottom"
      data-tooltip-align="end"
      className={`cr-icon-btn w-9 h-9 ${on ? '' : 'is-off'}`}
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}
