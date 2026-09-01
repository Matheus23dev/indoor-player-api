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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Request } from 'express';

import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';

import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../auth/roles.guard';

import { Roles } from '../auth/decorators/roles.decorators';
import {
  ApiRestrictedRoles,
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  SuccessMessageResponseDto,
  UserResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
    role: UserRole;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Usuários')
@ApiUserAuthentication()
@ApiServerError()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Consultar o usuário autenticado' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getMe(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.findById(req.user.id, req.user.companyId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Criar um usuário na empresa',
    description:
      'OWNER pode criar ADMIN ou OPERATOR. ADMIN pode criar somente OPERATOR.',
  })
  @ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
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
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar os usuários da empresa' })
  @ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.list(req.user.companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Consultar um usuário da empresa' })
  @ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
  @ApiUuidParameter('id', 'Identificador do usuário.')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
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
    return this.usersService.findById(id, req.user.companyId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Atualizar um usuário da empresa',
    description:
      'As regras de hierarquia impedem alterações indevidas entre perfis.',
  })
  @ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
  @ApiUuidParameter('id', 'Identificador do usuário.')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
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
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir um usuário da empresa' })
  @ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
  @ApiUuidParameter('id', 'Identificador do usuário.')
  @ApiOkResponse({ type: SuccessMessageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
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
