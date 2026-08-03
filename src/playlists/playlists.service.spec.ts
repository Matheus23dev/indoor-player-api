import { BadRequestException } from '@nestjs/common';

import type { DevicesGateway } from '../devices/devices.gateway';
import type { PrismaService } from '../prisma/prisma.service';
import { PlaylistsService } from './playlists.service';

describe('PlaylistsService.updateItem', () => {
  const companyId = 'company-1';
  const playlistId = 'playlist-1';
  const itemId = 'item-1';
  const actor = { id: 'admin-1', name: 'Maria' };

  function createSubject(mediaType: 'VIDEO' | 'IMAGE' = 'VIDEO') {
    const findFirst = jest.fn().mockResolvedValue({
      id: itemId,
      playlistId,
      playlist: { name: 'Institucional' },
      media: { id: 'media-1', name: 'Abertura.mp4', type: mediaType },
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

  it('rejects an empty update', async () => {
    const subject = createSubject();

    await expect(
      subject.service.updateItem(itemId, {}, companyId, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subject.findFirst).not.toHaveBeenCalled();
  });
});
