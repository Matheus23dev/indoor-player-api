import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; companyId: string };
}

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@Body() dto: CreateFolderDto, @Req() req: AuthenticatedRequest) {
    return this.foldersService.create(req.user.companyId, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.foldersService.list(req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreateFolderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.foldersService.remove(id, req.user.companyId);
  }
}
