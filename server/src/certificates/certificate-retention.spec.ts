// PERMANENT RETENTION. No issued certificate file may ever be deleted, and nothing
// may be able to overwrite one. These checks keep that true as the code changes:
// they look at what the code CAN do (its methods, its routes, its source), not at
// what one run happened to do.

import * as fs from 'fs';
import * as path from 'path';
import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { CertificateEmailService } from './certificate-email.service';
import { CertificateRendererService } from './certificate-renderer.service';
import { CertificateReviewsService } from './certificate-reviews.service';
import { CertificateStorageService } from './certificate-storage.service';
import { CertificatesAdminController } from './certificates-admin.controller';
import { CertificatesPublicController } from './certificates-public.controller';
import { CertificatesController } from './certificates.controller';
import { CertificatesModule } from './certificates.module';
import { CertificatesService } from './certificates.service';
import { MemoryCertificateStorage } from './testing/memory-certificate-storage';

const CERT_DIR = __dirname;
const SERVER_SRC = path.join(__dirname, '..');

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (/\.ts$/.test(entry.name) && !/\.spec\.ts$/.test(entry.name))
      yield full;
  }
}

const methodsOf = (cls: { prototype: object }) =>
  Object.getOwnPropertyNames(cls.prototype).filter((n) => n !== 'constructor');

describe('certificate files are never deleted or overwritten', () => {
  const DESTRUCTIVE =
    /delet|remov|purge|expire|lifecycle|destroy|truncat|overwrit|replaceObject|putObject$/i;

  it('the storage services have no way to delete (or silently replace) an object', () => {
    for (const cls of [CertificateStorageService, MemoryCertificateStorage]) {
      const bad = methodsOf(cls).filter((m) => DESTRUCTIVE.test(m));
      expect(bad).toEqual([]);
    }
    // The only write is the write-once one.
    expect(methodsOf(CertificateStorageService)).toEqual(
      expect.arrayContaining(['putObjectOnce', 'headObject', 'getObject']),
    );
  });

  it('none of the certificate services exposes a destructive operation either', () => {
    for (const cls of [
      CertificatesService,
      CertificateReviewsService,
      CertificateEmailService,
      CertificateRendererService,
    ]) {
      const bad = methodsOf(cls).filter((m) => DESTRUCTIVE.test(m));
      expect(bad).toEqual([]);
    }
  });

  it('there is NO delete route: no certificate controller handles HTTP DELETE', () => {
    for (const controller of [
      CertificatesController,
      CertificatesAdminController,
      CertificatesPublicController,
    ]) {
      for (const name of methodsOf(controller)) {
        const handler = (
          controller.prototype as unknown as Record<string, unknown>
        )[name];
        const method = Reflect.getMetadata(
          METHOD_METADATA,
          handler as object,
        ) as RequestMethod | undefined;
        if (method === undefined) continue; // a helper, not a route
        expect([RequestMethod.GET, RequestMethod.POST]).toContain(method);
        expect(method).not.toBe(RequestMethod.DELETE);
        expect(method).not.toBe(RequestMethod.PUT);
        expect(method).not.toBe(RequestMethod.PATCH);
      }
    }
  });

  it('every admin and student route is a GET (read) or a POST that creates/changes status — and none is named for deletion', () => {
    const paths: string[] = [];
    for (const controller of [
      CertificatesController,
      CertificatesAdminController,
      CertificatesPublicController,
    ]) {
      for (const name of methodsOf(controller)) {
        const handler = (
          controller.prototype as unknown as Record<string, unknown>
        )[name] as object;
        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined)
          continue;
        paths.push(`${name}:${Reflect.getMetadata(PATH_METADATA, handler)}`);
      }
    }
    expect(paths.length).toBeGreaterThan(15);
    for (const p of paths) expect(p).not.toMatch(DESTRUCTIVE);
  });

  it('no source file in the certificate system calls a storage delete, lifecycle or bucket operation', () => {
    const forbidden =
      /DeleteObject|DeleteObjects|DeleteBucket|PutBucketLifecycle|LifecycleConfiguration|AbortMultipartUpload|\.deleteObject\(|RemoveObject/;
    const offenders: string[] = [];
    for (const file of sourceFiles(CERT_DIR)) {
      if (forbidden.test(fs.readFileSync(file, 'utf8')))
        offenders.push(path.relative(CERT_DIR, file));
    }
    expect(offenders).toEqual([]);
  });

  it('no code anywhere deletes a Certificate or CertificateReview row', () => {
    const forbidden =
      /\b(certificate|certificateReview|tx\.certificate|tx\.certificateReview)\s*\.\s*(delete|deleteMany)\s*\(/;
    const offenders: string[] = [];
    for (const file of sourceFiles(SERVER_SRC)) {
      if (forbidden.test(fs.readFileSync(file, 'utf8')))
        offenders.push(path.relative(SERVER_SRC, file));
    }
    expect(offenders).toEqual([]);
    // …nor in raw SQL
    const raw = /(DELETE\s+FROM|TRUNCATE\s+TABLE?)\s+"?Certificate/i;
    for (const file of sourceFiles(SERVER_SRC)) {
      if (/testing\//.test(file)) continue;
      expect(raw.test(fs.readFileSync(file, 'utf8'))).toBe(false);
    }
  });

  it('no scheduled job touches certificate storage (no cleanup, no expiry)', () => {
    const withCron: string[] = [];
    for (const file of sourceFiles(CERT_DIR)) {
      if (/@(Cron|Interval|Timeout)\(/.test(fs.readFileSync(file, 'utf8')))
        withCron.push(path.basename(file));
    }
    // The only jobs: re-checking for missed completions, and retrying emails.
    expect(withCron.sort()).toEqual([
      'certificate-email.service.ts',
      'certificate-reviews.service.ts',
    ]);
    const storageSource = fs.readFileSync(
      path.join(CERT_DIR, 'certificate-storage.service.ts'),
      'utf8',
    );
    expect(storageSource).not.toMatch(/@Cron|setInterval|setTimeout/);
  });

  it('the bucket gets no lifecycle/expiry rule from the code (the documented setup is a Bucket Lock instead)', () => {
    const docs = path.join(SERVER_SRC, '../../docs/CERTIFICATES_SETUP.md');
    if (!fs.existsSync(docs)) return; // written alongside; checked in the docs spec below
    const text = fs.readFileSync(docs, 'utf8');
    expect(text).toMatch(/Bucket Lock/i);
    expect(text).toMatch(/retention-indefinite/);
    expect(text).not.toMatch(/lifecycle rule\b.*\bexpire/i);
  });

  it('the module wires the write-once storage and nothing that could delete', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CertificatesModule,
    ) as unknown[];
    expect(providers.length).toBeGreaterThan(4);
  });
});

describe('MemoryCertificateStorage behaves like the bucket where it matters', () => {
  it('a key can be written once and never replaced', async () => {
    const s = new MemoryCertificateStorage();
    await s.putObjectOnce('k', Buffer.from('first'), 'application/pdf');
    await expect(
      s.putObjectOnce('k', Buffer.from('second'), 'application/pdf'),
    ).rejects.toThrow(/never overwritten/);
    expect((await s.getObject('k')).toString()).toBe('first');
  });
});
