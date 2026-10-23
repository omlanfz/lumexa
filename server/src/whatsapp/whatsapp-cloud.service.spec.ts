import {
  WhatsAppCloudService,
  sanitizeTemplateValue,
} from './whatsapp-cloud.service';

const ENV_KEYS = [
  'WHATSAPP_ENABLED',
  'WHATSAPP_GRAPH_API_VERSION',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_TEMPLATE_PARAMETER_FORMAT',
];
const TOKEN = 'EAAG-super-secret-token';

const params = {
  to: '+8801712345678',
  templateName: 'lumexa_trial_confirmation',
  languageCode: 'en',
  variables: [
    { name: 'parent_name', value: 'Sarah' },
    { name: 'child_name', value: 'Alex' },
  ],
};

function mockFetch(status: number, body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe('WhatsAppCloudService', () => {
  const service = new WhatsAppCloudService();
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    ENV_KEYS.forEach((k) => (saved[k] = process.env[k]));
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.WHATSAPP_TEMPLATE_PARAMETER_FORMAT;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    ENV_KEYS.forEach((k) =>
      saved[k] === undefined
        ? delete process.env[k]
        : (process.env[k] = saved[k]),
    );
  });

  it('is off unless WHATSAPP_ENABLED is exactly "true"', () => {
    delete process.env.WHATSAPP_ENABLED;
    expect(service.isEnabled()).toBe(false);
    process.env.WHATSAPP_ENABLED = 'yes';
    expect(service.isEnabled()).toBe(false);
    process.env.WHATSAPP_ENABLED = 'true';
    expect(service.isEnabled()).toBe(true);
  });

  it('missing credentials: returns NOT_CONFIGURED and never touches the network', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const spy = jest.spyOn(global, 'fetch');
    const r = await service.sendTemplate(params);
    expect(spy).not.toHaveBeenCalled();
    expect(r).toMatchObject({
      ok: false,
      retryable: false,
      code: 'NOT_CONFIGURED',
    });
    expect((r as any).message).toContain('WHATSAPP_ACCESS_TOKEN');
  });

  it('posts a template message with positional body parameters', async () => {
    const spy = mockFetch(200, { messages: [{ id: 'wamid.ABC' }] });
    const r = await service.sendTemplate(params);
    expect(r).toEqual({ ok: true, messageId: 'wamid.ABC' });

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v25.0/1234567890/messages');
    expect((init.headers as any).Authorization).toBe(`Bearer ${TOKEN}`);
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '8801712345678',
      type: 'template',
      template: {
        name: 'lumexa_trial_confirmation',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Sarah' },
              { type: 'text', text: 'Alex' },
            ],
          },
        ],
      },
    });
  });

  it('uses the configured Graph API version and named parameters when asked', async () => {
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v26.0';
    process.env.WHATSAPP_TEMPLATE_PARAMETER_FORMAT = 'named';
    const spy = mockFetch(200, { messages: [{ id: 'wamid.X' }] });
    await service.sendTemplate(params);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v26.0/');
    const parameters = JSON.parse(init.body as string).template.components[0]
      .parameters;
    expect(parameters[0]).toEqual({
      type: 'text',
      text: 'Sarah',
      parameter_name: 'parent_name',
    });
  });

  it('ignores a malformed version setting', async () => {
    process.env.WHATSAPP_GRAPH_API_VERSION = '../evil';
    const spy = mockFetch(200, { messages: [{ id: 'wamid.X' }] });
    await service.sendTemplate(params);
    expect((spy.mock.calls[0] as any)[0]).toContain('/v25.0/');
  });

  it('treats Meta rate limits and 5xx as retryable', async () => {
    mockFetch(429, { error: { code: 130429, message: 'Rate limit hit' } });
    expect(await service.sendTemplate(params)).toMatchObject({
      ok: false,
      retryable: true,
      code: '130429',
    });
    jest.restoreAllMocks();
    mockFetch(500, { error: { code: 1, message: 'Unknown' } });
    expect(await service.sendTemplate(params)).toMatchObject({
      ok: false,
      retryable: true,
    });
    jest.restoreAllMocks();
    mockFetch(503, null);
    expect(await service.sendTemplate(params)).toMatchObject({
      ok: false,
      retryable: true,
      code: 'HTTP_503',
    });
  });

  it('treats bad token / template / recipient errors as permanent', async () => {
    for (const [status, code] of [
      [401, 190],
      [400, 132001],
      [400, 131026],
      [400, 100],
    ] as const) {
      mockFetch(status, { error: { code, message: 'nope' } });
      const r = await service.sendTemplate(params);
      expect(r).toMatchObject({
        ok: false,
        retryable: false,
        code: String(code),
      });
      jest.restoreAllMocks();
    }
  });

  it('network failures and timeouts are retryable and never leak the token', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('getaddrinfo ENOTFOUND graph.facebook.com'));
    const r = await service.sendTemplate(params);
    expect(r).toMatchObject({ ok: false, retryable: true, code: 'NETWORK' });
    expect(JSON.stringify(r)).not.toContain(TOKEN);

    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    jest.restoreAllMocks();
    jest.spyOn(global, 'fetch').mockRejectedValue(abort);
    expect(await service.sendTemplate(params)).toMatchObject({
      code: 'TIMEOUT',
      retryable: true,
    });
  });

  it('a 200 without a message id is not treated as success', async () => {
    mockFetch(200, { messages: [] });
    expect(await service.sendTemplate(params)).toMatchObject({
      ok: false,
      code: 'NO_MESSAGE_ID',
    });
  });
});

describe('sanitizeTemplateValue', () => {
  it('removes newlines/tabs and long space runs, never returns empty, and truncates', () => {
    expect(sanitizeTemplateValue('a\nb\tc    d')).toBe('a b c d');
    expect(sanitizeTemplateValue('   ')).toBe('-');
    expect(sanitizeTemplateValue('x'.repeat(2000)).length).toBe(900);
  });
});
