import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.usersService.create(
      req.user.companyId,
      body,
    );
  }

  @Get()
  list(
    @Req() req: any,
  ) {
    return this.usersService.list(
      req.user.companyId,
    );
  }

  @Get(':id')
findById(
  @Param('id') id: string,
  @Req() req: any,
) {
  return this.usersService.findById(
    id,
    req.user.companyId,
  );
}
}