import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  Request,
} from 'express';

import {
  UserRole,
} from '@prisma/client';

import {
  UsersService,
} from './users.service';

import {
  CreateUserDto,
} from './dto/create-user.dto';

import {
  UpdateUserDto,
} from './dto/update-user.dto';

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  RolesGuard,
} from '../auth/roles.guard';

import {
  Roles,
} from '../auth/decorators/roles.decorators';

interface AuthenticatedRequest
  extends Request {
  user: {
    id: string;
    companyId: string;
    role: UserRole;
  };
}

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.OWNER,
  UserRole.ADMIN,
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(
    @Body()
    createUserDto: CreateUserDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.create(
      req.user.companyId,
      req.user.role,
      createUserDto,
    );
  }

  @Get()
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.list(
      req.user.companyId,
    );
  }

  @Get(':id')
  findById(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.findById(
      id,
      req.user.companyId,
    );
  }

  @Patch(':id')
  update(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,

    @Body()
    updateUserDto: UpdateUserDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.update(
      id,
      req.user.companyId,
      req.user.id,
      req.user.role,
      updateUserDto,
    );
  }

  @Delete(':id')
  remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.remove(
      id,
      req.user.companyId,
      req.user.id,
      req.user.role,
    );
  }
}