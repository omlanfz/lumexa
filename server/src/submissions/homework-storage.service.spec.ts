import {
  HOMEWORK_VIEW_URL_TTL_SECONDS,
  HomeworkStorageService,
  contentDisposition,
} from './homework-storage.service';

// The homework bucket's configuration — above all that it can never be pointed at
// the class-recordings bucket — and the links it signs. Signing is local
// arithmetic, so no request is made.

const KEYS = [
  'HOMEWORK_R2_ACCOUNT_ID',
  'HOMEWORK_R2_ACCESS_KEY_ID',
  'HOMEWORK_R2_SECRET_ACCESS_KEY',
  'HOMEWORK_R2_BUCKET',
  'HOMEWORK_R2_ENDPOINT',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function configured(over: Record<string, string> = {}) {
  Object.assign(process.env, {
    HOMEWORK_R2_ACCOUNT_ID: 'acct123',
    HOMEWORK_R2_ACCESS_KEY_ID: 'hw-key-id',
    HOMEWORK_R2_SECRET_ACCESS_KEY: 'hw-secret',
    HOMEWORK_R2_BUCKET: 'lumexa-homework',
    ...over,
  });
  return new HomeworkStorageService();
}

describe('HomeworkStorageService configuration', () => {
  it('is unconfigured until every homework setting is present, and names what is missing', () => {
    const s = new HomeworkStorageService();
    expect(s.isConfigured()).toBe(false);
    expect(s.missingEnvVars()).toEqual([
      'HOMEWORK_R2_ACCOUNT_ID',
      'HOMEWORK_R2_ACCESS_KEY_ID',
      'HOMEWORK_R2_SECRET_ACCESS_KEY',
      'HOMEWORK_R2_BUCKET',
    ]);
    expect(configured().isConfigured()).toBe(true);
  });

  it('never borrows the recordings bucket’s credentials or bucket', () => {
    // Only the recordings settings are set: homework storage is NOT configured.
    Object.assign(process.env, {
      R2_ACCOUNT_ID: 'acct123',
      R2_ACCESS_KEY_ID: 'rec-key',
      R2_SECRET_ACCESS_KEY: 'rec-secret',
      R2_BUCKET: 'lumexa-recordings',
    });
    const s = new HomeworkStorageService();
    expect(s.isConfigured()).toBe(false);
    expect(s.missingEnvVars()).toEqual(
      expect.arrayContaining([
        'HOMEWORK_R2_ACCESS_KEY_ID',
        'HOMEWORK_R2_SECRET_ACCESS_KEY',
        'HOMEWORK_R2_BUCKET',
      ]),
    );
  });

  it('may share the (public, non-secret) account id with the recordings settings', () => {
    Object.assign(process.env, { R2_ACCOUNT_ID: 'shared-acct' });
    const s = configured();
    delete process.env.HOMEWORK_R2_ACCOUNT_ID;
    expect(s.isConfigured()).toBe(true);
    expect(s.endpoint()).toBe('https://shared-acct.r2.cloudflarestorage.com');
  });

  it('refuses to run on the class-recordings bucket, by name or by setting', () => {
    const byName = configured({ HOMEWORK_R2_BUCKET: 'lumexa-recordings' });
    expect(byName.isConfigured()).toBe(false);
    expect(byName.configurationProblem()).toMatch(/class-recordings bucket/);

    process.env.R2_BUCKET = 'some-other-recordings-name';
    const bySetting = configured({
      HOMEWORK_R2_BUCKET: 'some-other-recordings-name',
    });
    expect(bySetting.isConfigured()).toBe(false);
    expect(bySetting.configurationProblem()).toMatch(/class-recordings bucket/);
  });

  it('builds the endpoint from the account, or takes an explicit one', () => {
    expect(configured().endpoint()).toBe(
      'https://acct123.r2.cloudflarestorage.com',
    );
    expect(
      configured({
        HOMEWORK_R2_ENDPOINT: 'https://acct123.eu.r2.cloudflarestorage.com/',
      }).endpoint(),
    ).toBe('https://acct123.eu.r2.cloudflarestorage.com');
  });

  it('object keys are namespaced, unique per file and contain no path tricks', () => {
    const s = configured();
    const key = s.objectKeyFor({
      courseId: 'c1',
      studentUserId: 's1',
      fileId: 'f1',
      fileName: '../../my project (1).py',
    });
    expect(key).toBe('homework/c1/s1/f1/my_project__1_.py');
    expect(key).not.toContain('..');
    expect(
      s.objectKeyFor({
        courseId: 'c1',
        studentUserId: 's1',
        fileId: 'f2',
        fileName: 'x.py',
      }),
    ).not.toBe(
      s.objectKeyFor({
        courseId: 'c1',
        studentUserId: 's1',
        fileId: 'f1',
        fileName: 'x.py',
      }),
    );
    expect(key.startsWith('recordings/')).toBe(false);
  });
});

describe('signed links', () => {
  it('are short-lived and tell the browser exactly how to treat the file', async () => {
    const s = configured();
    const { url, expiresAt } = await s.createViewUrl(
      'homework/c1/s1/f1/report.pdf',
      {
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        disposition: 'inline',
      },
    );
    const u = new URL(url);
    expect(u.hostname).toBe('acct123.r2.cloudflarestorage.com');
    expect(u.pathname).toBe('/lumexa-homework/homework/c1/s1/f1/report.pdf');
    expect(u.searchParams.get('X-Amz-Expires')).toBe(
      String(HOMEWORK_VIEW_URL_TTL_SECONDS),
    );
    expect(HOMEWORK_VIEW_URL_TTL_SECONDS).toBeLessThanOrEqual(10 * 60);
    expect(u.searchParams.get('response-content-type')).toBe('application/pdf');
    expect(u.searchParams.get('response-content-disposition')).toMatch(
      /^inline; filename="report\.pdf"/,
    );
    expect(u.searchParams.get('X-Amz-Signature')).toBeTruthy();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    // The credentials never appear in a link.
    expect(url).not.toContain('hw-secret');
  });

  it('a download link says attachment', async () => {
    const s = configured();
    const { url } = await s.createViewUrl('homework/c1/s1/f1/game.sb3', {
      fileName: 'My Game.sb3',
      contentType: 'application/octet-stream',
      disposition: 'attachment',
    });
    const u = new URL(url);
    expect(u.searchParams.get('response-content-disposition')).toMatch(
      /^attachment; filename="My Game\.sb3"/,
    );
  });

  it('refuses to sign anything when it is not configured', async () => {
    await expect(
      new HomeworkStorageService().createViewUrl('k', {
        fileName: 'a.pdf',
        contentType: 'application/pdf',
        disposition: 'inline',
      }),
    ).rejects.toThrow(/not configured/);
  });
});

describe('contentDisposition', () => {
  it('keeps a plain filename and an encoded UTF-8 one, and never breaks out of the quotes', () => {
    expect(contentDisposition('attachment', 'a.py')).toBe(
      `attachment; filename="a.py"; filename*=UTF-8''a.py`,
    );
    const hostile = contentDisposition('inline', 'x".html\r\nSet-Cookie: a=b');
    expect(hostile).not.toMatch(/[\r\n]/);
    expect(hostile.match(/"/g)).toHaveLength(2);
    expect(contentDisposition('inline', 'Café.pdf')).toContain(
      "filename*=UTF-8''Caf%C3%A9.pdf",
    );
  });
});
