import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from './swagger.models';
import { DEVICE_TOKEN_SECURITY, USER_JWT_SECURITY } from './swagger.constants';

export function ApiUserAuthentication() {
  return applyDecorators(
    ApiBearerAuth(USER_JWT_SECURITY),
    ApiUnauthorizedResponse({
      description: 'JWT ausente, inválido ou expirado.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeviceAuthentication() {
  return applyDecorators(
    ApiBearerAuth(DEVICE_TOKEN_SECURITY),
    ApiUnauthorizedResponse({
      description:
        'Token do Player ausente, inválido, revogado ou desvinculado.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRestrictedRoles(roles: string[]) {
  return ApiForbiddenResponse({
    description: `Acesso permitido somente para: ${roles.join(', ')}.`,
    type: ApiErrorResponseDto,
  });
}

export function ApiServerError() {
  return ApiInternalServerErrorResponse({
    description: 'Falha interna inesperada.',
    type: ApiErrorResponseDto,
  });
}

export function ApiUuidParameter(name: string, description: string) {
  return ApiParam({
    name,
    description,
    format: 'uuid',
    example: 'd9428888-122b-11e1-b85c-61cd3cbb3210',
  });
}
