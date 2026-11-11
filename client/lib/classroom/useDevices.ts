// FILE PATH: client/lib/classroom/useDevices.ts
//
// The devices of one kind on this computer, and which one is in use — for the
// pre-join screen and the mic / camera menus. Kept current as devices are plugged
// in or removed (see daily/deviceStore.ts). Switching a microphone or camera goes
// through Daily — except a camera while video effects have it, which is switched
// inside the effects (and is then reported by them, since Daily cannot say which camera
// it is sending; see videoEffects.ts); the speaker is played by the classroom itself
// (see audioOutput.ts).

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { DeviceListStore, NO_DEVICES } from './daily/deviceStore';
import type { DeviceKind } from './daily/devices';
import { setSpeakerId, useSpeakerId } from './audioOutput';
import { effectsFor } from './useVideoEffects';

export function useDevices(call: DailyCall, kind: DeviceKind) {
  const store = useMemo(() => new DeviceListStore(call, kind), [call, kind]);
  const { devices, activeId } = useSyncExternalStore(store.subscribe, store.getSnapshot, () => NO_DEVICES);
  const speakerId = useSpeakerId();
  const effects = effectsFor(call);
  const effectsCamera = useSyncExternalStore(
    effects.subscribe,
    () => effects.getSnapshot().cameraDeviceId,
    () => null,
  );

  const select = useCallback(
    async (deviceId: string) => {
      if (kind === 'audiooutput') {
        setSpeakerId(deviceId);
        return;
      }
      store.setActive(deviceId);
      try {
        if (kind === 'audioinput') {
          await call.setInputDevicesAsync({ audioDeviceId: deviceId });
        } else {
          // With effects on, the camera is switched inside them and the picture goes
          // on without a break; otherwise Daily does it (see videoEffects.ts).
          await effects.selectCamera(deviceId, () => call.setInputDevicesAsync({ videoDeviceId: deviceId }));
        }
      } catch {
        void store.refresh(); // it did not switch: show what is really in use
      }
    },
    [call, effects, kind, store],
  );

  const activeDeviceId = kind === 'audiooutput' ? speakerId : kind === 'videoinput' && effectsCamera ? effectsCamera : activeId;
  return { devices, activeDeviceId, select };
}
