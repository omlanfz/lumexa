import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { AdminController } from './admin.controller';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

// Confirms admin-only endpoints stay locked down: the controller (and thus
// every route on it, including the assign-teacher endpoint) is guarded by
// AuthGuard('jwt') + RolesGuard and requires the ADMIN role.
describe('AdminController - guards', () => {
  it('is decorated with RolesGuard and requires the ADMIN role', () => {
    const reflector = new Reflector();

    const guards = reflector.get<any[]>(GUARDS_METADATA, AdminController);
    expect(guards).toBeDefined();
    expect(guards).toContain(RolesGuard);

    const roles = reflector.get<Role[]>(ROLES_KEY, AdminController);
    expect(roles).toEqual([Role.ADMIN]);
  });
});
