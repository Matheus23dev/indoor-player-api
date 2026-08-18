import { BadRequestException } from '@nestjs/common';

import type { DevicesGateway } from '../devices/devices.gateway';
import type { PrismaService } from '../prisma/prisma.service';
import { PlaylistsService } from './playlists.service';

describe('PlaylistsService.updateItem', () => {
  const companyId = 'company-1';
  const playlistId = 'playlist-1';
  const itemId = 'item-1';
  const actor = { id: 'admin-1', name: 'Maria' };

  function createSubject(
    mediaType: 'VIDEO' | 'IMAGE' = 'VIDEO',
    hasAudio: boolean | null = true,
  ) {
    const findFirst = jest.fn().mockResolvedValue({
      id: itemId,
      playlistId,
      playlist: { name: 'Institucional' },
      media: {
        id: 'media-1',
        name: 'Abertura.mp4',
        type: mediaType,
        hasAudio,
      },
    });
    const updateItem = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        id: itemId,
        playlistId,
        duration: 31,
        muted: data.muted ?? false,
        media: { id: 'media-1', type: mediaType },
      }),
    );
    const touchPlaylist = jest.fn().mockResolvedValue({ id: playlistId });
    const transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        playlistItem: { update: updateItem },
        playlist: { update: touchPlaylist },
      }),
    );
    const notifyPlaylistChanged = jest.fn().mockResolvedValue(undefined);

    const prisma = {
      playlistItem: { findFirst },
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const gateway = {
      notifyPlaylistChanged,
    } as unknown as DevicesGateway;

    return {
      service: new PlaylistsService(prisma, gateway),
      findFirst,
      updateItem,
      touchPlaylist,
      notifyPlaylistChanged,
    };
  }

  it.each([true, false])(
    'persists muted=%p, touches the playlist and notifies connected devices',
    async (muted) => {
      const subject = createSubject();

      const result = await subject.service.updateItem(
        itemId,
        { muted },
        companyId,
        actor,
      );

      expect(subject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: itemId,
            playlist: { companyId },
          },
        }),
      );
      expect(subject.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({ data: { muted } }),
      );
      expect(subject.touchPlaylist).toHaveBeenCalledWith({
        where: { id: playlistId },
        data: { updatedAt: expect.any(Date) },
      });
      expect(subject.notifyPlaylistChanged).toHaveBeenCalledWith(
        playlistId,
        'PLAYLIST_UPDATED',
      );
      expect(result).toEqual(expect.objectContaining({ muted }));
    },
  );

  it('rejects audio configuration for an image', async () => {
    const subject = createSubject('IMAGE');

    await expect(
      subject.service.updateItem(itemId, { muted: true }, companyId, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subject.updateItem).not.toHaveBeenCalled();
    expect(subject.notifyPlaylistChanged).not.toHaveBeenCalled();
  });

  it('rejects enabling audio when the video has no audio track', async () => {
    const subject = createSubject('VIDEO', false);

    await expect(
      subject.service.updateItem(itemId, { muted: false }, companyId, actor),
    ).rejects.toThrow('Este vídeo não possui faixa de áudio para ser ativada.');
    expect(subject.updateItem).not.toHaveBeenCalled();
    expect(subject.notifyPlaylistChanged).not.toHaveBeenCalled();
  });

  it('allows changing duration only for images', async () => {
    const videoSubject = createSubject('VIDEO');

    await expect(
      videoSubject.service.updateItem(
        itemId,
        { duration: 12 },
        companyId,
        actor,
      ),
    ).rejects.toThrow('A duração pode ser alterada somente para imagens.');
    expect(videoSubject.updateItem).not.toHaveBeenCalled();

    const imageSubject = createSubject('IMAGE');

    await imageSubject.service.updateItem(
      itemId,
      { duration: 12 },
      companyId,
      actor,
    );

    expect(imageSubject.updateItem).toHaveBeenCalledWith(
      expect.objectContaining({ data: { duration: 12 } }),
    );
  });

  it('rejects an empty update', async () => {
    const subject = createSubject();

    await expect(
      subject.service.updateItem(itemId, {}, companyId, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subject.findFirst).not.toHaveBeenCalled();
  });
});

describe('PlaylistsService.addItem', () => {
  it('creates a video without an audio track already muted', async () => {
    const playlistId = 'playlist-1';
    const mediaId = 'media-1';
    const createItem = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'item-1',
        ...data,
        media: {
          id: mediaId,
          name: 'Vídeo silencioso.mp4',
          type: 'VIDEO',
          hasAudio: false,
        },
      }),
    );
    const prisma = {
      playlist: {
        findFirst: jest.fn().mockResolvedValue({
          id: playlistId,
          name: 'Institucional',
        }),
      },
      media: {
        findFirst: jest.fn().mockResolvedValue({
          id: mediaId,
          name: 'Vídeo silencioso.mp4',
          type: 'VIDEO',
          duration: 20,
          hasAudio: false,
        }),
      },
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (callback) =>
        callback({
          playlistItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: createItem,
          },
          playlist: { update: jest.fn().mockResolvedValue({ id: playlistId }) },
        }),
      ),
    } as unknown as PrismaService;
    const gateway = {
      notifyPlaylistChanged: jest.fn().mockResolvedValue(undefined),
    } as unknown as DevicesGateway;
    const service = new PlaylistsService(prisma, gateway);

    const result = await service.addItem(
      playlistId,
      'company-1',
      { mediaId },
      { id: 'admin-1', name: 'Maria' },
    );

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ muted: true }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ muted: true }));

    await expect(
      service.addItem(
        playlistId,
        'company-1',
        { mediaId, duration: 10 },
        { id: 'admin-1', name: 'Maria' },
      ),
    ).rejects.toThrow('A duração pode ser configurada somente para imagens.');
    expect(createItem).toHaveBeenCalledTimes(1);
  });
});

describe('PlaylistsService.update', () => {
  it('updates the orientation and notifies scheduled devices', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'playlist-1',
      name: 'Vitrine',
      orientation: 'LANDSCAPE',
    });
    const update = jest.fn().mockResolvedValue({
      id: 'playlist-1',
      name: 'Vitrine',
      orientation: 'PORTRAIT',
    });
    const notifyPlaylistChanged = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      playlist: { findFirst, update },
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const gateway = {
      notifyPlaylistChanged,
    } as unknown as DevicesGateway;
    const service = new PlaylistsService(prisma, gateway);

    const result = await service.update(
      'playlist-1',
      'company-1',
      { orientation: 'PORTRAIT' },
      { id: 'admin-1', name: 'Maria' },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'playlist-1' },
      data: { orientation: 'PORTRAIT' },
    });
    expect(notifyPlaylistChanged).toHaveBeenCalledWith(
      'playlist-1',
      'PLAYLIST_UPDATED',
    );
    expect(result).toEqual(
      expect.objectContaining({ orientation: 'PORTRAIT' }),
    );
  });
});
