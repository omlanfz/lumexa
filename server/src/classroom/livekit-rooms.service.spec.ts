import { DataPacket_Kind } from 'livekit-server-sdk';
import {
  LiveKitRoomsService,
  SERVER_EVENT_TOPIC,
} from './livekit-rooms.service';

function participant(identity: string, extra: Record<string, unknown> = {}) {
  return {
    identity,
    name: identity,
    kind: 0,
    joinedAt: 1700000000n,
    joinedAtMs: 1700000000123n,
    ...extra,
  };
}

function setup(listParticipants: jest.Mock = jest.fn()) {
  const client = {
    listParticipants,
    sendData: jest.fn().mockResolvedValue(undefined),
    removeParticipant: jest.fn().mockResolvedValue(undefined),
  };
  const service = new LiveKitRoomsService();
  jest.spyOn(service, 'client').mockReturnValue(client as never);
  return { service, client };
}

describe('LiveKitRoomsService.listPeople', () => {
  it('lists people, with their user id and when they joined', async () => {
    const { service } = setup(
      jest.fn().mockResolvedValue([participant('user-1~abcd1234')]),
    );
    expect(await service.listPeople('room')).toEqual([
      {
        identity: 'user-1~abcd1234',
        userId: 'user-1',
        name: 'user-1~abcd1234',
        joinedAtMs: 1700000000123,
      },
    ]);
  });

  it('falls back to the joined-at seconds when milliseconds are missing', async () => {
    const { service } = setup(
      jest
        .fn()
        .mockResolvedValue([participant('u~aaaa1111', { joinedAtMs: 0n })]),
    );
    expect((await service.listPeople('room'))[0].joinedAtMs).toBe(
      1700000000000,
    );
  });

  it('leaves out the hidden admin observer, the recording egress and other non-people', async () => {
    const { service } = setup(
      jest
        .fn()
        .mockResolvedValue([
          participant('user-1~abcd1234'),
          participant('admin-observer-1700000000'),
          participant('EG_AbCdEf'),
          participant('user-2~abcd1234', { kind: 2 }),
        ]),
    );
    const people = await service.listPeople('room');
    expect(people.map((p) => p.identity)).toEqual(['user-1~abcd1234']);
  });

  it('a room that does not exist yet is simply empty', async () => {
    const { service } = setup(
      jest.fn().mockRejectedValue(new Error('requested room does not exist')),
    );
    expect(await service.listPeople('room')).toEqual([]);
  });

  it('any other LiveKit failure is the caller’s to decide about', async () => {
    const { service } = setup(
      jest.fn().mockRejectedValue(new Error('connection refused')),
    );
    await expect(service.listPeople('room')).rejects.toThrow(
      'connection refused',
    );
  });
});

describe('LiveKitRoomsService.sendServerEvent', () => {
  const event = {
    type: 'badge-awarded' as const,
    awardId: 'a1',
    badgeId: 'bright-spark',
    name: 'Bright Spark',
    emoji: '⭐',
  };

  it('addresses exactly the given connections, on the server topic, reliably', async () => {
    const { service, client } = setup();
    const sent = await service.sendServerEvent(
      'room',
      ['user-1~aaaa1111', 'user-1~bbbb2222'],
      event,
    );
    expect(sent).toBe(2);
    expect(client.sendData).toHaveBeenCalledTimes(1);
    const [room, data, kind, options] = client.sendData.mock.calls[0] as [
      string,
      Uint8Array,
      DataPacket_Kind,
      { destinationIdentities: string[]; topic: string },
    ];
    expect(room).toBe('room');
    expect(JSON.parse(new TextDecoder().decode(data))).toEqual(event);
    expect(kind).toBe(DataPacket_Kind.RELIABLE);
    expect(options).toEqual({
      destinationIdentities: ['user-1~aaaa1111', 'user-1~bbbb2222'],
      topic: SERVER_EVENT_TOPIC,
    });
  });

  it('never broadcasts: with nobody to send to it sends nothing', async () => {
    const { service, client } = setup();
    expect(await service.sendServerEvent('room', [], event)).toBe(0);
    expect(client.sendData).not.toHaveBeenCalled();
  });
});

describe('LiveKitRoomsService.removeConnection', () => {
  it('removes the connection, and swallows a failure (it may already have left)', async () => {
    const { service, client } = setup();
    await service.removeConnection('room', 'u~aaaa1111');
    expect(client.removeParticipant).toHaveBeenCalledWith('room', 'u~aaaa1111');

    client.removeParticipant.mockRejectedValue(new Error('not found'));
    await expect(
      service.removeConnection('room', 'u~aaaa1111'),
    ).resolves.toBeUndefined();
  });
});
