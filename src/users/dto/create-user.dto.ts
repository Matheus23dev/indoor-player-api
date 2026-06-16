import { UserRole } from '@prisma/client';

export class CreateUserDto {
  name!: string;
  email!: string;
  password!: string;
  role!: UserRole;
}