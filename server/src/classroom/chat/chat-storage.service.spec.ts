import { ChatStorageService } from './chat-storage.service';

const NAMES = [
  'CHAT_R2_ACCOUNT_ID',
  'CHAT_R2_ACCESS_KEY_ID',
  'CHAT_R2_SECRET_ACCESS_KEY',
  'CHAT_R2_BUCKET',
  'CHAT_R2_ENDPOINT',
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'HOMEWORK_R2_BUCKET',
];

describe('ChatStorageService configuration', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const n of NAMES) {
      saved[n] = process.env[n];
      delete process.env[n];
    }
  });
  afterEach(() => {
    for (const n of NAMES) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
  });

  const configured = (extra: Record<string, string> = {}) =>
    Object.assign(process.env, {
      CHAT_R2_ACCOUNT_ID: 'acct123',
      CHAT_R2_ACCESS_KEY_ID: 'key',
      CHAT_R2_SECRET_ACCESS_KEY: 'secret',
      CHAT_R2_BUCKET: 'lumexa-chat',
      ...extra,
    });

  it('is not configured until all four settings are there, and says which are missing', () => {
    const s = new ChatStorageService();
    expect(s.isConfigured()).toBe(false);
    expect(s.missingEnvVars()).toEqual([
      'CHAT_R2_ACCOUNT_ID',
      'CHAT_R2_ACCESS_KEY_ID',
      'CHAT_R2_SECRET_ACCESS_KEY',
      'CHAT_R2_BUCKET',
    ]);
    configured();
    expect(s.isConfigured()).toBe(true);
  });

  it('shares the account id with the other buckets when it is the same account', () => {
    configured();
    delete process.env.CHAT_R2_ACCOUNT_ID;
    process.env.R2_ACCOUNT_ID = 'shared-acct';
    expect(new ChatStorageService().endpoint()).toBe(
      'https://shared-acct.r2.cloudflarestorage.com',
    );
  });

  it('uses a custom endpoint when given', () => {
    configured({ CHAT_R2_ENDPOINT: 'https://x.eu.r2.cloudflarestorage.com/' });
    expect(new ChatStorageService().endpoint()).toBe(
      'https://x.eu.r2.cloudflarestorage.com',
    );
  });

  it('refuses to share the recordings or homework bucket', () => {
    for (const bucket of ['lumexa-recordings', 'lumexa-homework']) {
      configured({ CHAT_R2_BUCKET: bucket });
      const s = new ChatStorageService();
      expect(s.isConfigured()).toBe(false);
      expect(s.configurationProblem()).toMatch(/needs a bucket of its own/);
    }
    configured({ CHAT_R2_BUCKET: 'my-recs', R2_BUCKET: 'my-recs' });
    expect(new ChatStorageService().isConfigured()).toBe(false);
    configured({
      CHAT_R2_BUCKET: 'my-hw',
      R2_BUCKET: '',
      HOMEWORK_R2_BUCKET: 'my-hw',
    });
    expect(new ChatStorageService().isConfigured()).toBe(false);
  });
});
