import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOverlayBarDto } from './dto/create-overlay-bar.dto';
import { UpdateOverlayBarDto } from './dto/update-overlay-bar.dto';
import { OverlayBarsService } from './overlay-bars.service';
import {
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  OverlayBarResponseDto,
  PlaylistOverlayBarResponseDto,
  SuccessMessageResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: {
    companyId: string;
  };
}

@Controller('overlay-bars')
@UseGuards(JwtAuthGuard)
@ApiTags('Barras fixas')
@ApiUserAuthentication()
@ApiServerError()
export class OverlayBarsController {
  constructor(private readonly overlayBarsService: OverlayBarsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma barra fixa reutilizável' })
  @ApiCreatedResponse({ type: OverlayBarResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(@Body() dto: CreateOverlayBarDto, @Req() req: AuthenticatedRequest) {
    return this.overlayBarsService.create(req.user.companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar as barras fixas da empresa' })
  @ApiOkResponse({ type: OverlayBarResponseDto, isArray: true })
  list(@Req() req: AuthenticatedRequest) {
    return this.overlayBarsService.list(req.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar uma barra fixa',
    description:
      'A alteração é propagada para todas as playlists e Players que utilizam a barra.',
  })
  @ApiUuidParameter('id', 'Identificador da barra fixa.')
  @ApiOkResponse({ type: OverlayBarResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOverlayBarDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.overlayBarsService.update(id, req.user.companyId, dto);
  }

  @Post(':id/playlists/:playlistId')
  @ApiOperation({ summary: 'Vincular uma barra reutilizável a uma playlist' })
  @ApiUuidParameter('id', 'Identificador da barra fixa.')
  @ApiUuidParameter('playlistId', 'Identificador da playlist.')
  @ApiCreatedResponse({ type: PlaylistOverlayBarResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  attach(
    @Param('id') id: string,
    @Param('playlistId') playlistId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.overlayBarsService.attachToPlaylist(
      id,
      playlistId,
      req.user.companyId,
    );
  }

  @Delete(':id/playlists/:playlistId')
  @ApiOperation({ summary: 'Desvincular uma barra de uma playlist' })
  @ApiUuidParameter('id', 'Identificador da barra fixa.')
  @ApiUuidParameter('playlistId', 'Identificador da playlist.')
  @ApiOkResponse({ type: SuccessMessageResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  detach(
    @Param('id') id: string,
    @Param('playlistId') playlistId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.overlayBarsService.detachFromPlaylist(
      id,
      playlistId,
      req.user.companyId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir uma barra fixa reutilizável' })
  @ApiUuidParameter('id', 'Identificador da barra fixa.')
  @ApiOkResponse({ type: SuccessMessageResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.overlayBarsService.remove(id, req.user.companyId);
  }
}
