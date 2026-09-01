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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { UpdatePlaylistItemDto } from './dto/update-playlist-item.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { ReorderPlaylistDto } from './dto/reorder-playlist.dto';
import { SavePlaylistCompositionDto } from './dto/save-playlist-composition.dto';
import { DeletePlaylistItemsDto } from './dto/delete-playlist-items.dto';
import type { DeviceAuditActor } from '../devices/device-audit';
import {
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  PlaylistDeleteResponseDto,
  PlaylistItemResponseDto,
  PlaylistItemsDeleteResponseDto,
  PlaylistResponseDto,
  SuccessMessageResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: DeviceAuditActor & {
    companyId: string;
  };
}

@Controller('playlists')
@UseGuards(JwtAuthGuard)
@ApiTags('Playlists')
@ApiUserAuthentication()
@ApiServerError()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma playlist' })
  @ApiCreatedResponse({ type: PlaylistResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(
    @Body() createPlaylistDto: CreatePlaylistDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.create(req.user.companyId, createPlaylistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar as playlists da empresa' })
  @ApiOkResponse({ type: PlaylistResponseDto, isArray: true })
  list(@Req() req: AuthenticatedRequest) {
    return this.playlistsService.list(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar a composição completa de uma playlist' })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiOkResponse({ type: PlaylistResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar a orientação de uma playlist',
    description: 'Notifica os Players afetados para que sincronizem novamente.',
  })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiOkResponse({ type: PlaylistResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.update(id, req.user.companyId, dto, req.user);
  }

  @Post(':id/items')
  @ApiOperation({
    summary: 'Adicionar uma mídia à playlist',
    description:
      'A duração manual é aceita somente para imagens. Vídeos usam a duração detectada no arquivo.',
  })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiCreatedResponse({ type: PlaylistItemResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  addItem(
    @Param('id') playlistId: string,
    @Body() addPlaylistItemDto: AddPlaylistItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.addItem(
      playlistId,
      req.user.companyId,
      addPlaylistItemDto,
      req.user,
    );
  }

  @Patch(':id/composition')
  @ApiOperation({
    summary: 'Salvar todas as alterações da composição da playlist',
    description:
      'Aplica em uma única transação a ordem, a duração das imagens e o áudio dos vídeos.',
  })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiOkResponse({ type: PlaylistResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  saveComposition(
    @Param('id') playlistId: string,
    @Body() dto: SavePlaylistCompositionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.saveComposition(
      playlistId,
      dto,
      req.user.companyId,
      req.user,
    );
  }

  @Delete(':id/items')
  @ApiOperation({
    summary: 'Excluir as mídias selecionadas da playlist',
    description:
      'Remove todos os itens informados em uma única transação e compacta a ordem restante.',
  })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiOkResponse({ type: PlaylistItemsDeleteResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  removeItems(
    @Param('id') playlistId: string,
    @Body() dto: DeletePlaylistItemsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.removeItems(
      playlistId,
      dto,
      req.user.companyId,
      req.user,
    );
  }

  @Post('items/:id/duplicate')
  @ApiOperation({
    summary: 'Duplicar um item da playlist',
    description:
      'Copia a mídia e suas configurações de duração e áudio para a posição seguinte ao item original.',
  })
  @ApiUuidParameter('id', 'Identificador do item da playlist.')
  @ApiCreatedResponse({ type: PlaylistItemResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  duplicateItem(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.duplicateItem(
      id,
      req.user.companyId,
      req.user,
    );
  }

  @Patch('items/:id')
  @ApiOperation({
    summary: 'Atualizar duração ou áudio de um item',
    description:
      'Duração é configurável somente em imagens. O áudio só pode ser alterado quando o vídeo possui faixa de áudio.',
  })
  @ApiUuidParameter('id', 'Identificador do item da playlist.')
  @ApiOkResponse({ type: PlaylistItemResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  updateItem(
    @Param('id')
    id: string,

    @Body()
    dto: UpdatePlaylistItemDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.playlistsService.updateItem(
      id,
      dto,
      req.user.companyId,
      req.user,
    );
  }
  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Reordenar todos os itens de uma playlist' })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiOkResponse({ type: PlaylistResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  reorder(
    @Param('id') playlistId: string,
    @Body() dto: ReorderPlaylistDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.reorder(
      playlistId,
      dto.items,
      req.user.companyId,
      req.user,
    );
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remover um item e compactar a ordem da playlist' })
  @ApiUuidParameter('id', 'Identificador do item da playlist.')
  @ApiOkResponse({ type: SuccessMessageResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  removeItem(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.removeItem(id, req.user.companyId, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir uma playlist e seus vínculos' })
  @ApiUuidParameter('id', 'Identificador da playlist.')
  @ApiOkResponse({ type: PlaylistDeleteResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.remove(id, req.user.companyId, req.user);
  }
}
