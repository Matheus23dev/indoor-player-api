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

describe('PlaylistsService.duplicateItem', () => {
  it('copies the item settings and places the duplicate after the source item', async () => {
    const playlistId = 'playlist-1';
    const sourceItem = {
      id: 'item-2',
      playlistId,
      mediaId: 'media-1',
      order: 2,
      duration: 12,
      muted: true,
      playlist: { name: 'Institucional' },
      media: {
        id: 'media-1',
        name: 'Campanha.png',
        type: 'IMAGE',
      },
    };
    const createItem = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'item-copy',
        ...data,
        createdAt: '2026-08-27T10:00:00.000Z',
        media: sourceItem.media,
      }),
    );
    const executeRaw = jest.fn().mockResolvedValue(3);
    const touchPlaylist = jest.fn().mockResolvedValue({ id: playlistId });
    const transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        playlistItem: {
          findFirst: jest.fn().mockResolvedValue(sourceItem),
          findMany: jest.fn().mockResolvedValue([
            { id: 'item-1', order: 1 },
            { id: sourceItem.id, order: 2 },
            { id: 'item-3', order: 3 },
          ]),
          create: createItem,
        },
        playlist: { update: touchPlaylist },
        $executeRaw: executeRaw,
      }),
    );
    const notifyPlaylistChanged = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const gateway = {
      notifyPlaylistChanged,
    } as unknown as DevicesGateway;
    const service = new PlaylistsService(prisma, gateway);

    const result = await service.duplicateItem(sourceItem.id, 'company-1', {
      id: 'admin-1',
      name: 'Maria',
    });

    expect(createItem).toHaveBeenCalledWith({
      data: {
        playlistId,
        mediaId: sourceItem.mediaId,
        order: 4,
        duration: sourceItem.duration,
        muted: sourceItem.muted,
      },
      include: { media: true },
    });
    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(touchPlaylist).toHaveBeenCalledWith({
      where: { id: playlistId },
      data: { updatedAt: expect.any(Date) },
    });
    expect(notifyPlaylistChanged).toHaveBeenCalledWith(
      playlistId,
      'PLAYLIST_ITEM_ADDED',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'item-copy',
        order: 3,
        duration: sourceItem.duration,
        muted: sourceItem.muted,
      }),
    );
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

describe('PlaylistsService.saveComposition', () => {
  it('salva ordem, duração e áudio em uma única transação', async () => {
    const playlistId = 'playlist-1';
    const playlist = {
      id: playlistId,
      name: 'Vitrine',
      orientation: 'LANDSCAPE',
      overlayBars: [{ overlayBarId: 'bar-old', order: 1 }],
      items: [
        {
          id: 'item-image',
          order: 1,
          duration: 5,
          muted: false,
          media: {
            name: 'Oferta.png',
            type: 'IMAGE',
            hasAudio: null,
          },
        },
        {
          id: 'item-video',
          order: 2,
          duration: 20,
          muted: false,
          media: {
            name: 'Institucional.mp4',
            type: 'VIDEO',
            hasAudio: true,
          },
        },
      ],
    };
    const updateItem = jest.fn().mockResolvedValue({});
    const executeRaw = jest.fn().mockResolvedValue(2);
    const updatedPlaylist = {
      ...playlist,
      items: [
        { ...playlist.items[1], order: 1, muted: true },
        { ...playlist.items[0], order: 2, duration: 9 },
      ],
    };
    const transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        playlistItem: { update: updateItem },
        playlistOverlayBar: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        playlist: {
          update: jest.fn().mockResolvedValue({ id: playlistId }),
          findUnique: jest.fn().mockResolvedValue(updatedPlaylist),
        },
        $executeRaw: executeRaw,
      }),
    );
    const notifyPlaylistChanged = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      playlist: { findFirst: jest.fn().mockResolvedValue(playlist) },
      overlayBar: {
        findMany: jest.fn().mockResolvedValue([{ id: 'bar-new' }]),
      },
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const gateway = {
      notifyPlaylistChanged,
    } as unknown as DevicesGateway;
    const service = new PlaylistsService(prisma, gateway);

    const result = await service.saveComposition(
      playlistId,
      {
        items: [
          { id: 'item-video', order: 1, muted: true },
          { id: 'item-image', order: 2, duration: 9 },
        ],
        orientation: 'PORTRAIT',
        overlayBarIds: ['bar-new'],
      },
      'company-1',
      { id: 'admin-1', name: 'Maria' },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(updateItem).toHaveBeenCalledWith({
      where: { id: 'item-video' },
      data: { muted: true },
    });
    expect(updateItem).toHaveBeenCalledWith({
      where: { id: 'item-image' },
      data: { duration: 9 },
    });
    expect(notifyPlaylistChanged).toHaveBeenCalledWith(
      playlistId,
      'PLAYLIST_UPDATED',
    );
    expect(result).toEqual(updatedPlaylist);
  });

  it('cria duplicações pendentes somente dentro da transação de salvamento', async () => {
    const playlistId = 'playlist-1';
    const sourceItem = {
      id: 'item-image',
      mediaId: 'media-1',
      order: 1,
      duration: 5,
      muted: false,
      media: {
        name: 'Oferta.png',
        type: 'IMAGE',
        hasAudio: null,
      },
    };
    const createItem = jest.fn().mockResolvedValue({ id: 'item-copy' });
    const executeRaw = jest.fn().mockResolvedValue(2);
    const updatedPlaylist = {
      id: playlistId,
      name: 'Vitrine',
      orientation: 'LANDSCAPE',
      overlayBars: [],
      items: [sourceItem, { ...sourceItem, id: 'item-copy', order: 2 }],
    };
    const transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        playlistItem: {
          create: createItem,
          update: jest.fn().mockResolvedValue({}),
        },
        playlistOverlayBar: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        playlist: {
          update: jest.fn().mockResolvedValue({ id: playlistId }),
          findUnique: jest.fn().mockResolvedValue(updatedPlaylist),
        },
        $executeRaw: executeRaw,
      }),
    );
    const notifyPlaylistChanged = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      playlist: {
        findFirst: jest.fn().mockResolvedValue({
          id: playlistId,
          name: 'Vitrine',
          orientation: 'LANDSCAPE',
          overlayBars: [],
          items: [sourceItem],
        }),
      },
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const service = new PlaylistsService(prisma, {
      notifyPlaylistChanged,
    } as unknown as DevicesGateway);

    const result = await service.saveComposition(
      playlistId,
      {
        items: [
          { id: sourceItem.id, order: 1, duration: 5 },
          { sourceItemId: sourceItem.id, order: 2, duration: 5 },
        ],
        orientation: 'LANDSCAPE',
        overlayBarIds: [],
      },
      'company-1',
      { id: 'admin-1', name: 'Maria' },
    );

    expect(createItem).toHaveBeenCalledWith({
      data: {
        playlistId,
        mediaId: sourceItem.mediaId,
        order: 2,
        duration: sourceItem.duration,
        muted: sourceItem.muted,
      },
      select: { id: true },
    });
    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(notifyPlaylistChanged).toHaveBeenCalledTimes(1);
    expect(result).toEqual(updatedPlaylist);
  });

  it('rejeita uma composição incompleta antes de iniciar a transação', async () => {
    const transaction = jest.fn();
    const prisma = {
      playlist: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'playlist-1',
          name: 'Vitrine',
          orientation: 'LANDSCAPE',
          overlayBars: [],
          items: [
            {
              id: 'item-1',
              order: 1,
              duration: 5,
              muted: false,
              media: { name: 'Um.png', type: 'IMAGE', hasAudio: null },
            },
            {
              id: 'item-2',
              order: 2,
              duration: 5,
              muted: false,
              media: { name: 'Dois.png', type: 'IMAGE', hasAudio: null },
            },
          ],
        }),
      },
      $transaction: transaction,
    } as unknown as PrismaService;
    const service = new PlaylistsService(prisma, {} as DevicesGateway);

    await expect(
      service.saveComposition(
        'playlist-1',
        {
          items: [{ id: 'item-1', order: 1, duration: 5 }],
          orientation: 'LANDSCAPE',
          overlayBarIds: [],
        },
        'company-1',
        { id: 'admin-1', name: 'Maria' },
      ),
    ).rejects.toThrow(
      'Todos os itens atuais da playlist devem ser enviados ao salvar.',
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('PlaylistsService.removeItems', () => {
  it('exclui todas as mídias selecionadas e compacta a ordem uma única vez', async () => {
    const playlistId = 'playlist-1';
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const executeRaw = jest.fn().mockResolvedValue(1);
    const transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        playlistItem: {
          deleteMany,
          findMany: jest.fn().mockResolvedValue([{ id: 'item-3', order: 3 }]),
        },
        playlist: { update: jest.fn().mockResolvedValue({ id: playlistId }) },
        $executeRaw: executeRaw,
      }),
    );
    const notifyPlaylistChanged = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      playlist: {
        findFirst: jest.fn().mockResolvedValue({
          id: playlistId,
          name: 'Vitrine',
        }),
      },
      playlistItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'item-1', media: { name: 'Um.png' } },
          { id: 'item-2', media: { name: 'Dois.png' } },
        ]),
      },
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const gateway = {
      notifyPlaylistChanged,
    } as unknown as DevicesGateway;
    const service = new PlaylistsService(prisma, gateway);

    const result = await service.removeItems(
      playlistId,
      { itemIds: ['item-1', 'item-2'] },
      'company-1',
      { id: 'admin-1', name: 'Maria' },
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        playlistId,
        id: { in: ['item-1', 'item-2'] },
      },
    });
    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(notifyPlaylistChanged).toHaveBeenCalledWith(
      playlistId,
      'PLAYLIST_ITEM_REMOVED',
    );
    expect(result).toEqual(
      expect.objectContaining({ success: true, removedItems: 2 }),
    );
  });
});
