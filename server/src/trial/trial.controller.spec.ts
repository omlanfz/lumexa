import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TrialAdminController } from './trial-admin.controller';
import { TrialController } from './trial.controller';

const reflector = new Reflector();
const methods = (c: any) =>
  Object.getOwnPropertyNames(c.prototype).filter((m) => m !== 'constructor');

describe('trial endpoints — authorization', () => {
  it('every admin trial route is behind JWT + RolesGuard(ADMIN) at the controller level', () => {
    const guards = reflector.get<any[]>(GUARDS_METADATA, TrialAdminController);
    expect(guards).toBeDefined();
    expect(guards).toContain(RolesGuard);
    expect(guards.length).toBe(2); // AuthGuard('jwt') + RolesGuard
    expect(reflector.get<Role[]>(ROLES_KEY, TrialAdminController)).toEqual([
      Role.ADMIN,
    ]);
    expect(methods(TrialAdminController).length).toBeGreaterThan(10);
  });

  it('the public controller exposes only booking, availability and the token-protected guest endpoints without auth; lead listing and status stay admin-only', () => {
    const open = methods(TrialController).filter(
      (m) =>
        !reflector.get<any[]>(
          GUARDS_METADATA,
          (TrialController.prototype as any)[m],
        ),
    );
    expect(open.sort()).toEqual([
      'availability',
      'create',
      'guestJoin',
      'guestStatus',
    ]);
    for (const m of ['list', 'updateStatus']) {
      const handler = (TrialController.prototype as any)[m];
      expect(reflector.get<any[]>(GUARDS_METADATA, handler)).toContain(
        RolesGuard,
      );
      expect(reflector.get<Role[]>(ROLES_KEY, handler)).toEqual([Role.ADMIN]);
    }
  });

  it('the guest endpoints are POSTs (the secret token never appears in a URL or access log) and are rate limited', () => {
    for (const m of ['guestJoin', 'guestStatus']) {
      const handler = (TrialController.prototype as any)[m];
      expect(reflector.get<number>('path', handler)).toMatch(/^guest\//);
      expect(reflector.get<number>('method', handler)).toBe(RequestMethod.POST);
      const keys = Reflect.getMetadataKeys(handler).map(String);
      expect(keys.some((k) => k.startsWith('THROTTLER:LIMIT'))).toBe(true);
    }
  });

  it('team-only trial management (assign, outcome, teachers) lives on the admin controller', () => {
    const adminMethods = methods(TrialAdminController);
    for (const m of ['assignTeacher', 'outcome', 'teachers']) {
      expect(adminMethods).toContain(m);
    }
    for (const m of ['assignTeacher', 'outcome', 'teachers']) {
      expect(methods(TrialController)).not.toContain(m);
    }
  });

  it('RolesGuard rejects non-admin roles for the admin controller', () => {
    const guard = new RolesGuard(reflector);
    const ctx = (role?: string) =>
      ({
        getHandler: () => (TrialAdminController.prototype as any).list,
        getClass: () => TrialAdminController,
        switchToHttp: () => ({
          getRequest: () => ({ user: role ? { role } : undefined }),
        }),
      }) as any;
    expect(guard.canActivate(ctx('ADMIN'))).toBe(true);
    for (const r of ['PARENT', 'STUDENT', 'TEACHER', undefined]) {
      expect(guard.canActivate(ctx(r))).toBe(false);
    }
  });
});
