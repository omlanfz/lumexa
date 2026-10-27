// The R2 storage service: what it reports about its configuration, where files
// go, and the shape of the URLs it signs. Signing is local arithmetic, so none
// of this touches the network.

import { Logger } from '@nestjs/common';
import {
  PLAYBACK_URL_TTL_SECONDS,
  RECORDING_CONTENT_TYPE,
  RecordingStorageError,
  RecordingStorageService,
  UPLOAD_URL_TTL_SECONDS,
  describeStorageError,
} from './recording-storage.service';

const KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
] as const;

const SEGMENT = '11111111-1111-4111-8111-111111111111';

describe('RecordingStorageService', () => {
  const saved: Record<string, string | undefined> = {};
  let storage: RecordingStorageService;

  function configure() {
    process.env.R2_ACCOUNT_ID = 'acct123';
    process.env.R2_ACCESS_KEY_ID = 'AKIATESTKEY';
    process.env.R2_SECRET_ACCESS_KEY = 'a-test-secret-key';
    process.env.R2_BUCKET = 'lumexa-recordings';
  }

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    storage = new RecordingStorageService();
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  describe('configuration', () => {
    it('names every missing setting, so the log says exactly what to add', () => {
      expect(storage.isConfigured()).toBe(false);
      expect(storage.missingEnvVars()).toEqual([
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET',
      ]);

      configure();
      expect(storage.isConfigured()).toBe(true);
      expect(storage.missingEnvVars()).toEqual([]);

      delete process.env.R2_BUCKET;
      expect(storage.missingEnvVars()).toEqual(['R2_BUCKET']);
    });

    it('never asks for the old S3_* settings', () => {
      configure();
      for (const k of Object.keys(process.env)) {
        if (k.startsWith('S3_') || k.startsWith('AWS_')) delete process.env[k];
      }
      expect(storage.isConfigured()).toBe(true);
    });

    it('builds the R2 endpoint from the account id', () => {
      configure();
      expect(storage.endpoint()).toBe(
        'https://acct123.r2.cloudflarestorage.com',
      );
    });

    it('lets an explicit endpoint stand in for the account id', () => {
      process.env.R2_ENDPOINT = 'https://acct123.eu.r2.cloudflarestorage.com/';
      process.env.R2_ACCESS_KEY_ID = 'k';
      process.env.R2_SECRET_ACCESS_KEY = 's';
      process.env.R2_BUCKET = 'b';
      expect(storage.missingEnvVars()).toEqual([]);
      expect(storage.endpoint()).toBe(
        'https://acct123.eu.r2.cloudflarestorage.com',
      );
    });
  });

  describe('where a file goes', () => {
    it('names a segment’s file by its class and its own id', () => {
      expect(storage.objectKeyFor('lesson-abc', SEGMENT)).toBe(
        `recordings/lesson-abc/${SEGMENT}.webm`,
      );
    });

    it('a room name can never climb out of its folder', () => {
      const key = storage.objectKeyFor('../../etc/passwd', SEGMENT);
      expect(key).toBe(`recordings/.._.._etc_passwd/${SEGMENT}.webm`);
      expect(key).not.toContain('/../');
      expect(key.split('/')).toHaveLength(3);
    });

    it('two segments never share a file', () => {
      const other = '22222222-2222-4222-8222-222222222222';
      expect(storage.objectKeyFor('r', SEGMENT)).not.toBe(
        storage.objectKeyFor('r', other),
      );
    });
  });

  describe('signed URLs', () => {
    beforeEach(configure);

    it('signs an upload URL for one file, valid for 15 minutes', async () => {
      const key = storage.objectKeyFor('lesson-abc', SEGMENT);
      const signed = await storage.createUploadUrl(key);
      const url = new URL(signed.url);

      // Path style, on the account's R2 endpoint, inside the one bucket.
      expect(url.host).toBe('acct123.r2.cloudflarestorage.com');
      expect(url.pathname).toBe(`/lumexa-recordings/${key}`);
      expect(url.searchParams.get('X-Amz-Expires')).toBe(
        String(UPLOAD_URL_TTL_SECONDS),
      );
      expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(url.searchParams.get('X-Amz-Credential')).toContain(
        'AKIATESTKEY/',
      );
      expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
      // It is a PUT url, so the secret key itself is nowhere in it.
      expect(url.search).not.toContain('a-test-secret-key');
      expect(signed.url).not.toContain('a-test-secret-key');
      expect(signed.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + (UPLOAD_URL_TTL_SECONDS - 5) * 1000,
      );
    });

    it('the browser must send the video type, nothing else extra', async () => {
      const signed = await storage.createUploadUrl('recordings/r/x.webm');
      expect(signed.headers).toEqual({
        'Content-Type': RECORDING_CONTENT_TYPE,
      });
      expect(RECORDING_CONTENT_TYPE).toBe('video/webm');
    });

    it('adds no checksum parameters a browser upload could not satisfy', async () => {
      const { url } = await storage.createUploadUrl('recordings/r/x.webm');
      const names = [...new URL(url).searchParams.keys()].map((k) =>
        k.toLowerCase(),
      );
      expect(names.some((n) => n.includes('checksum'))).toBe(false);
      // Only the host is signed: the browser sets every other header itself.
      expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('host');
    });

    it('signs a playback URL that lasts long enough to watch a class', async () => {
      const key = storage.objectKeyFor('lesson-abc', SEGMENT);
      const signed = await storage.createPlaybackUrl(key);
      const url = new URL(signed.url);
      expect(url.pathname).toBe(`/lumexa-recordings/${key}`);
      expect(url.searchParams.get('X-Amz-Expires')).toBe(
        String(PLAYBACK_URL_TTL_SECONDS),
      );
      expect(PLAYBACK_URL_TTL_SECONDS).toBeGreaterThanOrEqual(2 * 60 * 60);
      expect(url.searchParams.has('x-id')).toBe(true);
      expect(url.searchParams.get('x-id')).toBe('GetObject');
    });

    it('a URL is good for its own file only', async () => {
      const a = await storage.createPlaybackUrl('recordings/r/a.webm');
      const b = await storage.createPlaybackUrl('recordings/r/b.webm');
      expect(new URL(a.url).pathname).not.toBe(new URL(b.url).pathname);
      expect(new URL(a.url).searchParams.get('X-Amz-Signature')).not.toBe(
        new URL(b.url).searchParams.get('X-Amz-Signature'),
      );
    });

    it('follows a changed endpoint without a restart', async () => {
      const first = await storage.createUploadUrl('recordings/r/a.webm');
      process.env.R2_ENDPOINT = 'http://127.0.0.1:9000';
      const second = await storage.createUploadUrl('recordings/r/a.webm');
      expect(new URL(first.url).host).toBe('acct123.r2.cloudflarestorage.com');
      expect(new URL(second.url).host).toBe('127.0.0.1:9000');
    });
  });

  describe('talking to R2', () => {
    beforeEach(configure);

    function withSend(send: jest.Mock) {
      jest
        .spyOn(storage as unknown as { s3: () => unknown }, 's3')
        .mockReturnValue({ send });
    }
    const awsError = (name: string, status: number, message = name) =>
      Object.assign(new Error(message), {
        name,
        $metadata: { httpStatusCode: status },
      });

    it('reports what is stored', async () => {
      withSend(
        jest.fn().mockResolvedValue({
          ContentLength: 1234,
          ContentType: 'video/webm',
        }),
      );
      await expect(storage.headObject('k')).resolves.toEqual({
        sizeBytes: 1234,
        contentType: 'video/webm',
      });
    });

    it('says "nothing there" (null) for a file that is not stored', async () => {
      withSend(jest.fn().mockRejectedValue(awsError('NotFound', 404)));
      await expect(storage.headObject('k')).resolves.toBeNull();
    });

    it('does not mistake a refusal for a missing file', async () => {
      withSend(
        jest
          .fn()
          .mockRejectedValue(awsError('Forbidden', 403, 'Access Denied')),
      );
      await expect(storage.headObject('k')).rejects.toMatchObject({
        name: 'RecordingStorageError',
        status: 403,
      });
    });

    it('deleting a file that is already gone is fine', async () => {
      withSend(jest.fn().mockRejectedValue(awsError('NoSuchKey', 404)));
      await expect(storage.deleteObject('k')).resolves.toBeUndefined();
    });

    it('a failed delete is an error', async () => {
      withSend(jest.fn().mockRejectedValue(awsError('InternalError', 500)));
      await expect(storage.deleteObject('k')).rejects.toBeInstanceOf(
        RecordingStorageError,
      );
    });

    it('describes a failure for the log in one line', () => {
      expect(
        describeStorageError(awsError('InvalidAccessKeyId', 403, 'bad key')),
      ).toBe('InvalidAccessKeyId — HTTP 403 — bad key');
      expect(describeStorageError('plain')).toContain('plain');
    });

    it('the start-up check passes when R2 answers "not found" for its probe file', async () => {
      withSend(jest.fn().mockRejectedValue(awsError('NotFound', 404)));
      await expect(storage.checkConnection()).resolves.toBe(true);
    });

    it('the start-up check reports wrong credentials, and never throws', async () => {
      withSend(
        jest.fn().mockRejectedValue(awsError('InvalidAccessKeyId', 403)),
      );
      await expect(storage.checkConnection()).resolves.toBe(false);
    });
  });
});
