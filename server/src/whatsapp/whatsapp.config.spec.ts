import {
  DEFAULT_ADMIN_WHATSAPP_NUMBER,
  adminWhatsAppChatUrl,
  whatsappConfig,
} from './whatsapp.config';

describe('the admin WhatsApp inbox', () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.WHATSAPP_ADMIN_RECIPIENT;
    delete process.env.WHATSAPP_ADMIN_RECIPIENT;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.WHATSAPP_ADMIN_RECIPIENT;
    else process.env.WHATSAPP_ADMIN_RECIPIENT = saved;
  });

  it('is written down in exactly one place: the default admin number', () => {
    expect(DEFAULT_ADMIN_WHATSAPP_NUMBER).toBe('+8801774878252');
  });

  it('falls back to that default when no admin contact is configured', () => {
    expect(whatsappConfig.adminChatNumber()).toBe('8801774878252');
    process.env.WHATSAPP_ADMIN_RECIPIENT = '   ';
    expect(whatsappConfig.adminChatNumber()).toBe('8801774878252');
    process.env.WHATSAPP_ADMIN_RECIPIENT = 'not a number';
    expect(whatsappConfig.adminChatNumber()).toBe('8801774878252');
  });

  it('uses the admin contact that is already configured, in wa.me form', () => {
    process.env.WHATSAPP_ADMIN_RECIPIENT = '+880 1712-345678';
    expect(whatsappConfig.adminChatNumber()).toBe('8801712345678');
  });

  it('leaves the existing admin-alert recipient untouched (still empty when unset)', () => {
    expect(whatsappConfig.adminRecipient()).toBe('');
    process.env.WHATSAPP_ADMIN_RECIPIENT = '+8801712345678';
    expect(whatsappConfig.adminRecipient()).toBe('+8801712345678');
  });

  it('builds a wa.me chat link with the message URL-encoded', () => {
    const url = adminWhatsAppChatUrl("Hello! I'd like 8 credits & more?");
    expect(url).toBe(
      "https://wa.me/8801774878252?text=Hello!%20I'd%20like%208%20credits%20%26%20more%3F",
    );
  });
});
