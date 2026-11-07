import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCORD_OPEN_URL,
  INSTAGRAM_NOTE,
  INSTAGRAM_STEPS,
  SHARE_MESSAGE_TEMPLATE,
  buildShareMessage,
  buildShareMessageWithoutLink,
  canShareNatively,
  copyText,
  facebookShareUrl,
  linkedinShareUrl,
  shareNatively,
  whatsappShareUrl,
  type ShareNavigator,
} from './share.ts';

const LINK = 'https://frontend.example.test/verify/LXA-2026-A7K9Q2';

// ─── The message ─────────────────────────────────────────────────────────────

test('the message is the founder\'s text with the programme and link filled in', () => {
  assert.equal(
    buildShareMessage('AI Builder', LINK),
    "🎉 I did it! I've successfully completed the AI Builder at Lumexa AI School! 🚀💻\n" +
      "I'm so excited to share what I've learned and the projects I've created. Can't wait for my next learning adventure! 🌟\n" +
      `Check out and verify my certificate here: ${LINK}`,
  );
});

test('both placeholders are replaced, wherever they appear', () => {
  const message = buildShareMessage('Game Creator', LINK);
  assert.ok(!message.includes('[Program Name]'));
  assert.ok(!message.includes('[Certificate URL]'));
  assert.ok(SHARE_MESSAGE_TEMPLATE.includes('[Program Name]'));
  assert.ok(SHARE_MESSAGE_TEMPLATE.includes('[Certificate URL]'));
});

test('a programme name with replacement-pattern characters is kept literally', () => {
  const message = buildShareMessage("Python $& $1 $' Pro", LINK);
  assert.ok(message.includes("completed the Python $& $1 $' Pro at Lumexa AI School"));
});

test('the message is three lines and ends with the verification link', () => {
  const lines = buildShareMessage('AI Builder', LINK).split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[2].endsWith(LINK));
});

test('the link-less version drops only the final "verify here" line', () => {
  const message = buildShareMessageWithoutLink('AI Builder');
  assert.equal(message.split('\n').length, 2);
  assert.ok(message.includes('AI Builder'));
  assert.ok(!message.includes('verify my certificate'));
  assert.ok(!message.includes('http'));
});

// ─── Links ───────────────────────────────────────────────────────────────────

test('WhatsApp opens its chooser with the whole message', () => {
  const message = buildShareMessage('AI Builder', LINK);
  const url = new URL(whatsappShareUrl(message));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.searchParams.get('text'), message);
});

test('Facebook and LinkedIn carry the verification link, encoded', () => {
  const facebook = new URL(facebookShareUrl(LINK, 'Hello & welcome'));
  assert.equal(facebook.hostname, 'www.facebook.com');
  assert.equal(facebook.searchParams.get('u'), LINK);
  assert.equal(facebook.searchParams.get('quote'), 'Hello & welcome');

  const linkedin = new URL(linkedinShareUrl(LINK));
  assert.equal(linkedin.hostname, 'www.linkedin.com');
  assert.equal(linkedin.searchParams.get('url'), LINK);
});

test('Discord has no share URL: we only ever open the app itself', () => {
  const url = new URL(DISCORD_OPEN_URL);
  assert.equal(url.hostname, 'discord.com');
  assert.ok(!/share/i.test(DISCORD_OPEN_URL));
  assert.equal(url.search, '');
});

test('Instagram is manual, and says so — no promise of direct posting', () => {
  assert.ok(INSTAGRAM_STEPS.length >= 3);
  assert.ok(INSTAGRAM_STEPS.some((s) => /download|save/i.test(s)));
  assert.ok(INSTAGRAM_STEPS.some((s) => /upload|share|post/i.test(s)));
  assert.match(INSTAGRAM_NOTE, /does not let websites post/i);
});

// ─── Web Share API ───────────────────────────────────────────────────────────

const file = { name: 'Lumexa-Certificate-LXA-2026-A7K9Q2.png' } as unknown as File;

test('native sharing is reported unsupported when the browser has no share()', async () => {
  assert.equal(canShareNatively(undefined), false);
  assert.equal(canShareNatively({}), false);
  assert.equal(await shareNatively(undefined, { title: 't', text: 'x' }), 'unsupported');
  assert.equal(await shareNatively({}, { title: 't', text: 'x' }), 'unsupported');
  assert.equal(canShareNatively({ share: () => Promise.resolve() }), true);
});

test('native sharing sends the message and the image when files can be shared', async () => {
  const seen: ShareData[] = [];
  const nav: ShareNavigator = {
    share: (data) => {
      seen.push(data);
      return Promise.resolve();
    },
    canShare: () => true,
  };
  assert.equal(await shareNatively(nav, { title: 'My certificate', text: 'the message', file }), 'shared');
  assert.deepEqual(seen[0], { title: 'My certificate', text: 'the message', files: [file] });
  // the link is inside the message: no separate url field that could repeat it
  assert.ok(!('url' in seen[0]));
});

test('native sharing falls back to text only when files are not supported', async () => {
  const seen: ShareData[] = [];
  const nav: ShareNavigator = {
    share: (data) => {
      seen.push(data);
      return Promise.resolve();
    },
    canShare: () => false,
  };
  assert.equal(await shareNatively(nav, { title: 'T', text: 'M', file }), 'shared');
  assert.deepEqual(seen[0], { title: 'T', text: 'M' });

  const seenNoCanShare: ShareData[] = [];
  await shareNatively(
    {
      share: (data) => {
        seenNoCanShare.push(data);
        return Promise.resolve();
      },
    },
    { title: 'T', text: 'M', file },
  );
  assert.deepEqual(seenNoCanShare[0], { title: 'T', text: 'M' });
});

test('closing the share sheet is "cancelled", anything else "failed"', async () => {
  const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
  assert.equal(await shareNatively({ share: () => Promise.reject(abort) }, { title: 't', text: 'x' }), 'cancelled');
  assert.equal(
    await shareNatively({ share: () => Promise.reject(new Error('boom')) }, { title: 't', text: 'x' }),
    'failed',
  );
});

// ─── Clipboard ───────────────────────────────────────────────────────────────

test('copying uses the clipboard when it is there', async () => {
  const written: string[] = [];
  const nav: ShareNavigator = {
    clipboard: {
      writeText: (text) => {
        written.push(text);
        return Promise.resolve();
      },
    },
  };
  assert.equal(await copyText('hello', nav), true);
  assert.deepEqual(written, ['hello']);
});

test('copying falls back to the legacy path when the clipboard refuses', async () => {
  const nav: ShareNavigator = { clipboard: { writeText: () => Promise.reject(new Error('denied')) } };
  const legacy: string[] = [];
  assert.equal(
    await copyText('hello', nav, (text) => {
      legacy.push(text);
      return true;
    }),
    true,
  );
  assert.deepEqual(legacy, ['hello']);
});

test('copying reports failure honestly when nothing works', async () => {
  assert.equal(await copyText('hello', undefined), false);
  assert.equal(await copyText('hello', {}, () => false), false);
  assert.equal(
    await copyText('hello', {}, () => {
      throw new Error('no execCommand');
    }),
    false,
  );
});
