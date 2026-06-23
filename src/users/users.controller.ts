import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto'; 

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.create(req.user.companyId, createUserDto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.usersService.list(req.user.companyId);
  }

  @Get(':id')
  findById(
    @Param('id') id: string, 
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.findById(id, req.user.companyId);
  }
}