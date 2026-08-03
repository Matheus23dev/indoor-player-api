import type { Prisma } from '@prisma/client';

import {
  applyPlaylistItemOrder,
  compactPlaylistItemOrder,
} from './playlist-item-order';

describe('playlist item ordering', () => {
  function createTransaction(
    storedItems: Array<{ id: string; order: number }> = [],
  ) {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue(storedItems);

    const tx = {
      $executeRaw: executeRaw,
      playlistItem: {
        findMany,
      },
    } as unknown as Prisma.TransactionClient;

    return { tx, executeRaw, findMany };
  }

  it('uses two bulk updates regardless of the number of items', async () => {
    const subject = createTransaction();
    const items = Array.from({ length: 100 }, (_, index) => ({
      id: `item-${index + 1}`,
      order: 100 - index,
    }));

    await applyPlaylistItemOrder(subject.tx, 'playlist-1', items);

    expect(subject.executeRaw).toHaveBeenCalledTimes(2);
  });

  it('does not query the database when the playlist is empty', async () => {
    const subject = createTransaction();

    await applyPlaylistItemOrder(subject.tx, 'playlist-1', []);

    expect(subject.executeRaw).not.toHaveBeenCalled();
  });

  it('loads the current order before compacting remaining items', async () => {
    const subject = createTransaction([
      { id: 'item-1', order: 1 },
      { id: 'item-3', order: 3 },
    ]);

    await compactPlaylistItemOrder(subject.tx, 'playlist-1');

    expect(subject.findMany).toHaveBeenCalledWith({
      where: { playlistId: 'playlist-1' },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });
    expect(subject.executeRaw).toHaveBeenCalledTimes(2);
  });
});
