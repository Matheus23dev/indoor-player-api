import type { JwtService } from '@nestjs/jwt';

import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  it('normalizes account data before persisting a registration', async () => {
    const findUser = jest.fn().mockResolvedValue(null);
    const findCompany = jest.fn().mockResolvedValue(null);
    const createCompany = jest.fn().mockResolvedValue({
      id: 'company-1',
      name: 'Café Indoor',
      slug: 'cafe-indoor',
    });
    const createUser = jest.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      role: 'OWNER',
      companyId: 'company-1',
    });
    const transaction = jest.fn().mockImplementation((callback) =>
      callback({
        company: { create: createCompany },
        user: { create: createUser },
      }),
    );
    const prisma = {
      user: { findUnique: findUser },
      company: { findUnique: findCompany },
      $transaction: transaction,
    } as unknown as PrismaService;
    const jwt = {} as JwtService;
    const service = new AuthService(prisma, jwt);

    await service.register({
      companyName: '  Café Indoor  ',
      userName: '  Maria Silva  ',
      email: '  MARIA@EXAMPLE.COM ',
      password: 'secure-password',
    });

    expect(findUser).toHaveBeenCalledWith({
      where: { email: 'maria@example.com' },
    });
    expect(findCompany).toHaveBeenCalledWith({
      where: { slug: 'cafe-indoor' },
    });
    expect(createCompany).toHaveBeenCalledWith({
      data: { name: 'Café Indoor', slug: 'cafe-indoor' },
    });
    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'hashed-password',
        companyId: 'company-1',
        role: 'OWNER',
      }),
    });
  });
});
