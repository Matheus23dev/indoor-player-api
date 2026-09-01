import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import {
  ApiRestrictedRoles,
  ApiServerError,
  ApiUserAuthentication,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  AuditLogsResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: { companyId: string; role: UserRole };
}

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@ApiTags('Auditoria')
@ApiUserAuthentication()
@ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
@ApiServerError()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar os eventos consolidados da empresa',
    description:
      'Retorna os eventos mais recentes primeiro, com paginação e opções para preencher os filtros da interface.',
  })
  @ApiOkResponse({ type: AuditLogsResponseDto })
  @ApiBadRequestResponse({
    description: 'Filtros inválidos ou período invertido.',
    type: ApiErrorResponseDto,
  })
  list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListAuditLogsQueryDto,
  ) {
    return this.auditLogsService.list(req.user.companyId, query);
  }
}
