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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import {
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  FolderDeleteResponseDto,
  FolderResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: { id: string; companyId: string };
}

@Controller('folders')
@UseGuards(JwtAuthGuard)
@ApiTags('Pastas')
@ApiUserAuthentication()
@ApiServerError()
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma pasta na biblioteca de mídias' })
  @ApiCreatedResponse({ type: FolderResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(@Body() dto: CreateFolderDto, @Req() req: AuthenticatedRequest) {
    return this.foldersService.create(req.user.companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar as pastas da empresa' })
  @ApiOkResponse({ type: FolderResponseDto, isArray: true })
  list(@Req() req: AuthenticatedRequest) {
    return this.foldersService.list(req.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomear uma pasta' })
  @ApiUuidParameter('id', 'Identificador da pasta.')
  @ApiOkResponse({ type: FolderResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: CreateFolderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir uma pasta',
    description: 'As mídias existentes são movidas para a raiz da biblioteca.',
  })
  @ApiUuidParameter('id', 'Identificador da pasta.')
  @ApiOkResponse({ type: FolderDeleteResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.foldersService.remove(id, req.user.companyId);
  }
}
