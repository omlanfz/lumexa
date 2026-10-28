// FILE PATH: client/lib/classroom/daily/devices.ts
//
// The microphones, cameras and speakers on this computer, as the device menus
// and the pre-join screen show them. Pure functions over what Daily reports
// (enumerateDevices, getInputDevices), so they can be tested without a call.

export type DeviceKind = 'audioinput' | 'videoinput' | 'audiooutput';

/** The part of a MediaDeviceInfo the menus read. */
export interface DeviceLike {
  deviceId: string;
  kind: string;
  label: string;
}

/** What Daily's getInputDevices() answers: the device in use (or `{}` when it has
 * none yet). */
export interface InputDevicesLike {
  camera?: { deviceId?: string } | Record<string, never>;
  mic?: { deviceId?: string } | Record<string, never>;
  speaker?: { deviceId?: string } | Record<string, never>;
}

/** The devices of one kind, without the browser's duplicate "default" and
 * "communications" aliases of a device that is also listed under its own name, and
 * without devices that have no id. */
export function devicesOfKind<T extends DeviceLike>(devices: T[], kind: DeviceKind): T[] {
  const ofKind = devices.filter((d) => d.kind === kind && d.deviceId);
  const named = new Set(ofKind.filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications').map((d) => d.label));
  return ofKind.filter((d) => {
    if (d.deviceId !== 'default' && d.deviceId !== 'communications') return true;
    // Chrome lists "Default - Built-in Microphone" as well as the microphone itself.
    const bare = d.label.replace(/^(default|communications)\s*-\s*/i, '');
    return !named.has(bare);
  });
}

/** The id of the device in use for `kind`, or '' when Daily has none yet. */
export function activeDeviceId(infos: InputDevicesLike | null | undefined, kind: DeviceKind): string {
  const info = kind === 'videoinput' ? infos?.camera : kind === 'audioinput' ? infos?.mic : infos?.speaker;
  return (info as { deviceId?: string } | undefined)?.deviceId ?? '';
}

/** What to show for a device in a menu. */
export function deviceLabel(device: DeviceLike, kind: DeviceKind): string {
  if (device.label) return device.label;
  return kind === 'audioinput' ? 'Microphone' : kind === 'videoinput' ? 'Camera' : 'Speaker';
}
