import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../auth/decorators/roles.decorators';
import { DevicesController } from './devices.controller';

describe('DevicesController logs access', () => {
  it('allows only owners and administrators to read Player logs', () => {
    const logsHandler = Object.getOwnPropertyDescriptor(
      DevicesController.prototype,
      'logs',
    )?.value as object;

    expect(Reflect.getMetadata(ROLES_KEY, logsHandler)).toEqual([
      UserRole.OWNER,
      UserRole.ADMIN,
    ]);
  });
});
