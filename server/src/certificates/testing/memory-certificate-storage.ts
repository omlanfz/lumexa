// FILE PATH: server/src/certificates/testing/memory-certificate-storage.ts
//
// The certificate bucket, in memory, for the specs. It behaves like the real
// one where it matters: a key can be written once and never replaced, and there
// is (as in production) no way to delete anything.

import {
  CertificateObjectExistsError,
  CertificateStorageError,
  type CertificateObjectKeys,
  type CertificateStorage,
  type StoredCertificateObject,
} from '../certificate-storage.service';
import { utcToDhakaParts } from '../../scheduling/dhaka-time.util';

export class MemoryCertificateStorage implements CertificateStorage {
  objects = new Map<string, { body: Buffer; contentType: string }>();
  configured = true;
  /** Makes every request fail, as if R2 were unreachable. */
  down = false;
  /** Fails the write of any key containing one of these fragments. */
  failWritesMatching: string[] = [];
  /** Every write that was attempted, in order (including refused ones). */
  writeLog: string[] = [];

  isConfigured(): boolean {
    return this.configured;
  }

  configurationProblem(): string | null {
    return this.configured ? null : 'missing CERTIFICATE_R2_ACCESS_KEY_ID';
  }

  bucket(): string {
    return 'lumexa-certificates';
  }

  objectKeysFor(parts: {
    certificateId: string;
    issuedAt: Date;
  }): CertificateObjectKeys {
    const year = utcToDhakaParts(parts.issuedAt).dateStr.slice(0, 4);
    const base = `certificates/${year}/${parts.certificateId}/${parts.certificateId}`;
    return { pdfKey: `${base}.pdf`, pngKey: `${base}.png` };
  }

  private check(): void {
    if (this.down)
      throw new CertificateStorageError('R2 is down', 'InternalError', 500);
  }

  putObjectOnce(key: string, body: Buffer, contentType: string): Promise<void> {
    this.writeLog.push(key);
    try {
      this.check();
      if (this.failWritesMatching.some((f) => key.includes(f)))
        throw new CertificateStorageError('write failed', 'InternalError', 500);
      if (this.objects.has(key)) throw new CertificateObjectExistsError(key);
    } catch (err) {
      return Promise.reject(err as Error);
    }
    this.objects.set(key, { body: Buffer.from(body), contentType });
    return Promise.resolve();
  }

  headObject(key: string): Promise<StoredCertificateObject | null> {
    try {
      this.check();
    } catch (err) {
      return Promise.reject(err as Error);
    }
    const found = this.objects.get(key);
    return Promise.resolve(found ? { sizeBytes: found.body.length } : null);
  }

  getObject(key: string): Promise<Buffer> {
    try {
      this.check();
    } catch (err) {
      return Promise.reject(err as Error);
    }
    const found = this.objects.get(key);
    if (!found)
      return Promise.reject(
        new CertificateStorageError('Not found', 'NoSuchKey', 404),
      );
    return Promise.resolve(Buffer.from(found.body));
  }
}
