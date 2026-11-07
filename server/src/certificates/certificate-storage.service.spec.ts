import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  CertificateObjectExistsError,
  CertificateStorageError,
  CertificateStorageService,
  DEFAULT_CERTIFICATE_BUCKET,
} from './certificate-storage.service';

const ENV_KEYS = [
  'CERTIFICATE_R2_BUCKET',
  'CERTIFICATE_R2_ACCESS_KEY_ID',
  'CERTIFICATE_R2_SECRET_ACCESS_KEY',
  'CERTIFICATE_R2_ACCOUNT_ID',
  'CERTIFICATE_R2_ENDPOINT',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'HOMEWORK_R2_BUCKET',
  'CHAT_R2_BUCKET',
];

/** An error shaped like the AWS SDK's (typed loosely: the spy's overloads reject most types). */
const awsError = (name: string, status: number, message = name) =>
  Object.assign(new Error(message), {
    name,
    $metadata: { httpStatusCode: status },
  }) as never;

describe('CertificateStorageService', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    jest.restoreAllMocks();
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const configured = () => {
    process.env.CERTIFICATE_R2_ACCESS_KEY_ID = 'key';
    process.env.CERTIFICATE_R2_SECRET_ACCESS_KEY = 'secret';
    process.env.CERTIFICATE_R2_ACCOUNT_ID = 'acct123';
    return new CertificateStorageService();
  };

  describe('configuration', () => {
    it('is the dedicated bucket lumexa-certificates by default', () => {
      expect(DEFAULT_CERTIFICATE_BUCKET).toBe('lumexa-certificates');
      expect(configured().bucket()).toBe('lumexa-certificates');
    });

    it('names exactly what is missing', () => {
      const s = new CertificateStorageService();
      expect(s.isConfigured()).toBe(false);
      expect(s.configurationProblem()).toBe(
        'missing CERTIFICATE_R2_ACCOUNT_ID, CERTIFICATE_R2_ACCESS_KEY_ID, CERTIFICATE_R2_SECRET_ACCESS_KEY',
      );
    });

    it('is configured with its own token and the account id', () => {
      expect(configured().configurationProblem()).toBeNull();
      expect(configured().endpoint()).toBe(
        'https://acct123.r2.cloudflarestorage.com',
      );
    });

    it("falls back to R2_ACCOUNT_ID (an id, not a secret) but never to another feature's credentials", () => {
      process.env.R2_ACCOUNT_ID = 'shared-account';
      process.env.R2_ACCESS_KEY_ID = 'recordings-key';
      process.env.R2_SECRET_ACCESS_KEY = 'recordings-secret';
      const s = new CertificateStorageService();
      expect(s.endpoint()).toBe(
        'https://shared-account.r2.cloudflarestorage.com',
      );
      // The recordings token must not make certificate storage "configured".
      expect(s.configurationProblem()).toBe(
        'missing CERTIFICATE_R2_ACCESS_KEY_ID, CERTIFICATE_R2_SECRET_ACCESS_KEY',
      );
    });

    it('accepts a custom endpoint (EU jurisdiction, local S3)', () => {
      process.env.CERTIFICATE_R2_ENDPOINT = 'http://localhost:9000/';
      expect(new CertificateStorageService().endpoint()).toBe(
        'http://localhost:9000',
      );
    });

    it.each([
      ['lumexa-recordings', {}],
      ['recordings-bucket', { R2_BUCKET: 'recordings-bucket' }],
      ['homework-bucket', { HOMEWORK_R2_BUCKET: 'homework-bucket' }],
      ['chat-bucket', { CHAT_R2_BUCKET: 'chat-bucket' }],
    ])(
      'refuses to share the bucket "%s" with another feature',
      (bucket, others) => {
        Object.assign(process.env, others);
        process.env.CERTIFICATE_R2_BUCKET = bucket;
        const problem = configured().configurationProblem();
        expect(problem).toMatch(/another feature's bucket/);
        expect(configured().isConfigured()).toBe(false);
      },
    );
  });

  describe('object keys', () => {
    const s = new CertificateStorageService();
    const at = new Date('2026-11-06T09:00:00Z');

    it('puts both files under certificates/<year>/<id>/', () => {
      expect(
        s.objectKeysFor({ certificateId: 'LXA-2026-A7K9Q2', issuedAt: at }),
      ).toEqual({
        pdfKey: 'certificates/2026/LXA-2026-A7K9Q2/LXA-2026-A7K9Q2.pdf',
        pngKey: 'certificates/2026/LXA-2026-A7K9Q2/LXA-2026-A7K9Q2.png',
      });
    });

    it('is stable (the same certificate always has the same keys) and unique per certificate', () => {
      const a = s.objectKeysFor({
        certificateId: 'LXA-2026-AAAAAA',
        issuedAt: at,
      });
      expect(
        s.objectKeysFor({ certificateId: 'LXA-2026-AAAAAA', issuedAt: at }),
      ).toEqual(a);
      const b = s.objectKeysFor({
        certificateId: 'LXA-2026-BBBBBB',
        issuedAt: at,
      });
      expect(new Set([a.pdfKey, a.pngKey, b.pdfKey, b.pngKey]).size).toBe(4);
    });

    it('a replacement (new ID) can never share a key with the original', () => {
      const original = s.objectKeysFor({
        certificateId: 'LXA-2026-AAAAAA',
        issuedAt: at,
      });
      const replacement = s.objectKeysFor({
        certificateId: 'LXA-2026-CCCCCC',
        issuedAt: new Date('2026-11-20T09:00:00Z'),
      });
      expect(replacement.pdfKey).not.toBe(original.pdfKey);
      expect(replacement.pngKey).not.toBe(original.pngKey);
    });

    it('uses the Asia/Dhaka year', () => {
      const keys = s.objectKeysFor({
        certificateId: 'LXA-2027-ZZZZZZ',
        issuedAt: new Date('2026-12-31T18:30:00Z'),
      });
      expect(keys.pdfKey.startsWith('certificates/2027/')).toBe(true);
    });

    it('cannot be steered out of its folder by a hostile id', () => {
      const keys = s.objectKeysFor({
        certificateId: '../../x/y',
        issuedAt: at,
      });
      expect(keys.pdfKey).not.toContain('..');
      expect(keys.pdfKey).not.toContain('//');
    });
  });

  describe('writes never overwrite', () => {
    it('sends If-None-Match: * so R2 itself refuses to replace an existing object', async () => {
      const send = jest
        .spyOn(S3Client.prototype, 'send')
        .mockResolvedValue({} as never);
      await configured().putObjectOnce(
        'certificates/2026/X/X.pdf',
        Buffer.from('%PDF-1.4'),
        'application/pdf',
      );
      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0][0] as PutObjectCommand;
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'lumexa-certificates',
        Key: 'certificates/2026/X/X.pdf',
        ContentType: 'application/pdf',
        IfNoneMatch: '*',
        ContentLength: 8,
      });
    });

    it('reports an existing object as CertificateObjectExistsError (412 PreconditionFailed)', async () => {
      jest
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(
          awsError('PreconditionFailed', 412, 'Precondition Failed'),
        );
      await expect(
        configured().putObjectOnce('k', Buffer.from('x'), 'image/png'),
      ).rejects.toBeInstanceOf(CertificateObjectExistsError);
    });

    it('treats a refusal by the bucket lock (409 ObjectLockedByBucketPolicy) the same way', async () => {
      jest
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(
          awsError('ObjectLockedByBucketPolicy', 409, 'locked'),
        );
      await expect(
        configured().putObjectOnce('k', Buffer.from('x'), 'image/png'),
      ).rejects.toBeInstanceOf(CertificateObjectExistsError);
    });

    it('wraps any other failure in CertificateStorageError (with the status)', async () => {
      jest
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(awsError('InternalError', 500, 'boom'));
      await expect(
        configured().putObjectOnce('k', Buffer.from('x'), 'image/png'),
      ).rejects.toMatchObject({
        name: 'CertificateStorageError',
        status: 500,
      });
    });

    it('refuses to even try when storage is not configured', async () => {
      const send = jest.spyOn(S3Client.prototype, 'send');
      await expect(
        new CertificateStorageService().putObjectOnce(
          'k',
          Buffer.from('x'),
          'a/b',
        ),
      ).rejects.toMatchObject({
        code: 'NotConfigured',
      });
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('reads', () => {
    it('headObject returns the stored size, or null when nothing is there', async () => {
      const send = jest.spyOn(S3Client.prototype, 'send');
      send.mockResolvedValueOnce({ ContentLength: 1234 } as never);
      expect(await configured().headObject('k')).toEqual({ sizeBytes: 1234 });
      send.mockRejectedValueOnce(awsError('NotFound', 404, 'nf'));
      expect(await configured().headObject('k')).toBeNull();
    });

    it('getObject returns the bytes', async () => {
      jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({
        Body: {
          transformToByteArray: () =>
            Promise.resolve(new Uint8Array([1, 2, 3])),
        },
      } as never);
      expect([...(await configured().getObject('k'))]).toEqual([1, 2, 3]);
    });

    it('a failed read is a CertificateStorageError, not a crash', async () => {
      jest
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(new Error('down') as never);
      await expect(configured().getObject('k')).rejects.toBeInstanceOf(
        CertificateStorageError,
      );
    });
  });
});
