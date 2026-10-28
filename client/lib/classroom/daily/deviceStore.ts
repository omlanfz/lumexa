// FILE PATH: client/lib/classroom/daily/deviceStore.ts
//
// The devices of one kind on this computer, and which one is in use, as a store
// React can read (useSyncExternalStore): it asks Daily for them when something
// starts watching and again whenever Daily says a device was plugged in, removed
// or switched, and it stops listening when nothing watches any more.
//
// Plain TypeScript with no React in it, so the rules (what counts as a change,
// which answer wins when two arrive out of order) can be tested without a call.

import { activeDeviceId, devicesOfKind } from './devices.ts';
import type { DeviceKind, DeviceLike, InputDevicesLike } from './devices.ts';

/** The part of Daily's call object this store uses. */
export interface DeviceCall {
  enumerateDevices(): Promise<{ devices: DeviceLike[] }>;
  getInputDevices(): Promise<InputDevicesLike>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Daily's handlers are typed per event
  on(event: any, handler: (e: any) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: any, handler: (e: any) => void): unknown;
}

export interface DeviceListSnapshot {
  devices: DeviceLike[];
  /** The device in use, or '' when there is none yet. */
  activeId: string;
}

/** What nothing has been asked about yet — also what the server renders. */
export const NO_DEVICES: DeviceListSnapshot = { devices: [], activeId: '' };

/** Daily events that can change which devices exist or which one is in use. */
const DEVICE_EVENTS = ['available-devices-updated', 'selected-devices-updated', 'started-camera'] as const;

function sameDevices(a: DeviceLike[], b: DeviceLike[]): boolean {
  return a.length === b.length && a.every((d, i) => d.deviceId === b[i].deviceId && d.label === b[i].label);
}

export class DeviceListStore {
  private readonly call: DeviceCall;
  private readonly kind: DeviceKind;
  private snapshot: DeviceListSnapshot = NO_DEVICES;
  private readonly listeners = new Set<() => void>();
  /** Which question is the latest: an answer to an earlier one is out of date. */
  private asked = 0;
  private readonly onChange = () => void this.refresh();

  constructor(call: DeviceCall, kind: DeviceKind) {
    this.call = call;
    this.kind = kind;
  }

  /** For useSyncExternalStore: the first watcher starts listening to the call. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      for (const event of DEVICE_EVENTS) this.call.on(event, this.onChange);
      void this.refresh();
    }
    return () => {
      if (!this.listeners.delete(listener) || this.listeners.size > 0) return;
      for (const event of DEVICE_EVENTS) this.call.off(event, this.onChange);
      this.asked += 1; // an answer still on its way is no longer wanted
    };
  };

  /** For useSyncExternalStore: the same object until something really changed. */
  getSnapshot = (): DeviceListSnapshot => this.snapshot;

  /** Asks Daily which devices exist and which is in use. A failure (no permission
   * yet, or the call is going away) keeps what was known. */
  async refresh(): Promise<void> {
    const ticket = ++this.asked;
    try {
      const { devices: all } = await this.call.enumerateDevices();
      const devices = devicesOfKind(all, this.kind);
      const activeId = this.kind === 'audiooutput' ? '' : activeDeviceId(await this.call.getInputDevices(), this.kind);
      if (ticket === this.asked) this.publish(devices, activeId);
    } catch {
      // not available yet — try again when Daily reports a change
    }
  }

  /** Shows `id` as the device in use at once, before Daily has confirmed the
   * switch (the next refresh replaces it with what is really in use). */
  setActive(id: string): void {
    this.publish(this.snapshot.devices, id);
  }

  private publish(devices: DeviceLike[], activeId: string): void {
    const current = this.snapshot;
    if (activeId === current.activeId && sameDevices(devices, current.devices)) return;
    this.snapshot = { devices: sameDevices(devices, current.devices) ? current.devices : devices, activeId };
    this.listeners.forEach((l) => l());
  }
}
