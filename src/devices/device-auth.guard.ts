import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { Request } from 'express';

import { DeviceAuthService } from './device-auth.service';

import type { AuthenticatedDevice } from './device-auth.types';

export interface DeviceAuthenticatedRequest extends Request {
  device: AuthenticatedDevice;
}

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly deviceAuthService: DeviceAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<DeviceAuthenticatedRequest>();

    const authorization = request.headers.authorization;

    const token = this.deviceAuthService.extractBearerToken(authorization);

    request.device = await this.deviceAuthService.validateDeviceToken(token);

    return true;
  }
}
