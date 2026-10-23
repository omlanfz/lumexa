import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdminCreateTrialDto,
  BlockDto,
  CancelTrialDto,
  CreateTrialDto,
  RuleDto,
} from './trial.dto';

const valid = {
  parentName: '  Sarah Rahman ',
  parentEmail: ' Sarah@Example.COM ',
  parentPhone: '01712-345678',
  childName: 'Alex',
  childAge: 10,
  subject: 'AI Builder (Ages 12–18)',
  startAt: '2026-11-04T10:00:00.000Z',
  whatsappConsent: true,
};

async function check<T extends object>(cls: new () => T, body: object) {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return {
    dto,
    errors,
    messages: errors.flatMap((e) => Object.values(e.constraints ?? {})),
  };
}

describe('CreateTrialDto (public booking form)', () => {
  it('accepts a valid booking and normalises name, email and phone', async () => {
    const { dto, errors } = await check(CreateTrialDto, valid);
    expect(errors).toHaveLength(0);
    expect(dto.parentName).toBe('Sarah Rahman');
    expect(dto.parentEmail).toBe('sarah@example.com');
    expect(dto.parentPhone).toBe('+8801712345678');
  });

  it.each([5, 4, 0, -1, 19, 25, 100])(
    'rejects child age %i (outside 6–18)',
    async (age) => {
      const { errors, messages } = await check(CreateTrialDto, {
        ...valid,
        childAge: age,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(messages.join(' ')).toContain('aged 6 to 18');
    },
  );

  it.each([6, 7, 12, 17, 18])('accepts child age %i', async (age) => {
    const { errors } = await check(CreateTrialDto, { ...valid, childAge: age });
    expect(errors).toHaveLength(0);
  });

  it('rejects non-integer and non-numeric ages', async () => {
    expect(
      (await check(CreateTrialDto, { ...valid, childAge: 10.5 })).errors.length,
    ).toBeGreaterThan(0);
    expect(
      (await check(CreateTrialDto, { ...valid, childAge: 'abc' })).errors
        .length,
    ).toBeGreaterThan(0);
  });

  it('requires a valid phone number', async () => {
    expect(
      (await check(CreateTrialDto, { ...valid, parentPhone: '12345' })).errors
        .length,
    ).toBeGreaterThan(0);
    const missing: any = { ...valid };
    delete missing.parentPhone;
    expect(
      (await check(CreateTrialDto, missing)).errors.length,
    ).toBeGreaterThan(0);
    const intl = await check(CreateTrialDto, {
      ...valid,
      parentPhone: '+44 7700 900123',
    });
    expect(intl.errors).toHaveLength(0);
    expect(intl.dto.parentPhone).toBe('+447700900123');
  });

  it('requires WhatsApp consent to be exactly true', async () => {
    for (const v of [false, undefined, 'true', 1]) {
      const { errors } = await check(CreateTrialDto, {
        ...valid,
        whatsappConsent: v,
      });
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('requires a start time and a valid email', async () => {
    expect(
      (await check(CreateTrialDto, { ...valid, startAt: 'tomorrow' })).errors
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await check(CreateTrialDto, { ...valid, parentEmail: 'nope' })).errors
        .length,
    ).toBeGreaterThan(0);
  });

  it('rejects line breaks in names and unknown fields', async () => {
    expect(
      (await check(CreateTrialDto, { ...valid, childName: 'Al\nex' })).errors
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await check(CreateTrialDto, { ...valid, isAdmin: true })).errors.length,
    ).toBeGreaterThan(0);
  });

  it('treats an empty optional message as absent', async () => {
    const { dto, errors } = await check(CreateTrialDto, {
      ...valid,
      message: '  ',
      timezone: '',
    });
    expect(errors).toHaveLength(0);
    expect(dto.message).toBeUndefined();
  });
});

describe('AdminCreateTrialDto', () => {
  it('applies the same age rule and does not force consent', async () => {
    expect(
      (
        await check(AdminCreateTrialDto, {
          ...valid,
          childAge: 5,
          whatsappConsent: false,
        })
      ).errors.length,
    ).toBeGreaterThan(0);
    expect(
      (await check(AdminCreateTrialDto, { ...valid, childAge: 19 })).errors
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await check(AdminCreateTrialDto, { ...valid, whatsappConsent: false }))
        .errors,
    ).toHaveLength(0);
  });
});

describe('availability DTOs', () => {
  it('RuleDto validates weekday and time format', async () => {
    expect(
      (
        await check(RuleDto, {
          weekday: 3,
          startTime: '15:00',
          endTime: '19:00',
        })
      ).errors,
    ).toHaveLength(0);
    expect(
      (
        await check(RuleDto, {
          weekday: 7,
          startTime: '15:00',
          endTime: '19:00',
        })
      ).errors.length,
    ).toBeGreaterThan(0);
    expect(
      (await check(RuleDto, { weekday: 3, startTime: '3pm', endTime: '19:00' }))
        .errors.length,
    ).toBeGreaterThan(0);
    expect(
      (
        await check(RuleDto, {
          weekday: 3,
          startTime: '15:00',
          endTime: '24:00',
        })
      ).errors,
    ).toHaveLength(0);
  });

  it('BlockDto requires a reason', async () => {
    expect(
      (
        await check(BlockDto, {
          startDate: '2026-12-16',
          endDate: '2026-12-16',
          reason: 'Victory Day',
        })
      ).errors,
    ).toHaveLength(0);
    expect(
      (
        await check(BlockDto, {
          startDate: '2026-12-16',
          endDate: '2026-12-16',
          reason: '',
        })
      ).errors.length,
    ).toBeGreaterThan(0);
  });

  it('CancelTrialDto requires an internal reason', async () => {
    expect(
      (await check(CancelTrialDto, { reason: 'Parent asked to cancel' }))
        .errors,
    ).toHaveLength(0);
    expect(
      (await check(CancelTrialDto, { reason: '' })).errors.length,
    ).toBeGreaterThan(0);
  });
});
