import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../auth/decorators/roles.decorators';
import { AuditLogsController } from './audit-logs.controller';

describe('AuditLogsController access', () => {
  it('allows only owners and administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditLogsController)).toEqual([
      UserRole.OWNER,
      UserRole.ADMIN,
    ]);
  });
});
