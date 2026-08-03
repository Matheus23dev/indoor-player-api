import { Prisma } from '@prisma/client';

type PlaylistItemPosition = {
  id: string;
  order: number;
};

/**
 * Reorders every item in a playlist using two bulk queries.
 *
 * The temporary negative positions prevent collisions with the unique
 * (playlistId, order) index while the final positions are applied.
 */
export async function applyPlaylistItemOrder(
  tx: Prisma.TransactionClient,
  playlistId: string,
  items: PlaylistItemPosition[],
) {
  if (items.length === 0) {
    return;
  }

  const normalizedItems = [...items]
    .sort((first, second) => first.order - second.order)
    .map((item, index) => ({
      id: item.id,
      order: index + 1,
    }));

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE \`PlaylistItem\`
      SET \`order\` = -ABS(\`order\`)
      WHERE \`playlistId\` = ${playlistId}
    `,
  );

  const orderCases = Prisma.join(
    normalizedItems.map(
      (item) => Prisma.sql`WHEN ${item.id} THEN ${item.order}`,
    ),
    ' ',
  );
  const itemIds = Prisma.join(normalizedItems.map((item) => item.id));

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE \`PlaylistItem\`
      SET \`order\` = CASE \`id\`
        ${orderCases}
        ELSE \`order\`
      END
      WHERE \`playlistId\` = ${playlistId}
        AND \`id\` IN (${itemIds})
    `,
  );
}

export async function compactPlaylistItemOrder(
  tx: Prisma.TransactionClient,
  playlistId: string,
) {
  const items = await tx.playlistItem.findMany({
    where: {
      playlistId,
    },

    orderBy: {
      order: 'asc',
    },

    select: {
      id: true,
      order: true,
    },
  });

  await applyPlaylistItemOrder(tx, playlistId, items);
}
