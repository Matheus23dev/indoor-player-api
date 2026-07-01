const {
  PrismaClient,
} = require('@prisma/client');

const prisma =
  new PrismaClient();

async function execute(sql) {
  console.log('\nExecutando:');
  console.log(sql.trim());

  await prisma.$executeRawUnsafe(
    sql,
  );
}

async function query(sql) {
  return prisma.$queryRawUnsafe(
    sql,
  );
}

async function columnExists(
  tableName,
  columnName,
) {
  const rows = await query(`
    SELECT COUNT(*) AS total
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${tableName}'
      AND COLUMN_NAME = '${columnName}'
  `);

  return Number(rows[0].total) > 0;
}

async function indexExists(
  tableName,
  indexName,
) {
  const rows = await query(`
    SELECT COUNT(*) AS total
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${tableName}'
      AND INDEX_NAME = '${indexName}'
  `);

  return Number(rows[0].total) > 0;
}

async function foreignKeyExists(
  tableName,
  constraintName,
) {
  const rows = await query(`
    SELECT COUNT(*) AS total
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = '${tableName}'
      AND CONSTRAINT_NAME = '${constraintName}'
  `);

  return Number(rows[0].total) > 0;
}

async function dropForeignKey(
  tableName,
  constraintName,
) {
  const exists =
    await foreignKeyExists(
      tableName,
      constraintName,
    );

  if (!exists) {
    console.log(
      `[OK] FK ${constraintName} não existe.`,
    );

    return;
  }

  await execute(`
    ALTER TABLE \`${tableName}\`
    DROP FOREIGN KEY \`${constraintName}\`
  `);

  console.log(
    `[OK] FK ${constraintName} removida.`,
  );
}

async function ensureIndex(
  tableName,
  indexName,
  columns,
) {
  const exists =
    await indexExists(
      tableName,
      indexName,
    );

  if (exists) {
    console.log(
      `[OK] Índice ${indexName} já existe.`,
    );

    return;
  }

  await execute(`
    CREATE INDEX \`${indexName}\`
    ON \`${tableName}\`(${columns})
  `);

  console.log(
    `[OK] Índice ${indexName} criado.`,
  );
}

async function ensureRenamedIndex(
  tableName,
  oldName,
  newName,
  columns,
) {
  const newIndexExists =
    await indexExists(
      tableName,
      newName,
    );

  if (newIndexExists) {
    console.log(
      `[OK] Índice ${newName} já existe.`,
    );

    return;
  }

  const oldIndexExists =
    await indexExists(
      tableName,
      oldName,
    );

  if (oldIndexExists) {
    await execute(`
      ALTER TABLE \`${tableName}\`
      RENAME INDEX \`${oldName}\`
      TO \`${newName}\`
    `);

    console.log(
      `[OK] Índice ${oldName} renomeado para ${newName}.`,
    );

    return;
  }

  await ensureIndex(
    tableName,
    newName,
    columns,
  );
}

async function addForeignKey({
  tableName,
  constraintName,
  columnName,
  referencedTable,
  referencedColumn,
}) {
  await execute(`
    ALTER TABLE \`${tableName}\`
    ADD CONSTRAINT \`${constraintName}\`
    FOREIGN KEY (\`${columnName}\`)
    REFERENCES \`${referencedTable}\`(\`${referencedColumn}\`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
  `);

  console.log(
    `[OK] FK ${constraintName} criada com CASCADE.`,
  );
}

async function main() {
  console.log(
    'Iniciando reparo da migration...',
  );

  /*
   * Remove apenas registros órfãos,
   * que já apontam para pais inexistentes.
   */
  await execute(`
    DELETE dl
    FROM \`DeviceLog\` AS dl
    LEFT JOIN \`Device\` AS d
      ON d.id = dl.deviceId
    WHERE d.id IS NULL
  `);

  await execute(`
    DELETE pi
    FROM \`PlaylistItem\` AS pi
    LEFT JOIN \`Media\` AS m
      ON m.id = pi.mediaId
    WHERE m.id IS NULL
  `);

  await execute(`
    DELETE s
    FROM \`Schedule\` AS s
    LEFT JOIN \`Device\` AS d
      ON d.id = s.deviceId
    LEFT JOIN \`Playlist\` AS p
      ON p.id = s.playlistId
    WHERE d.id IS NULL
       OR p.id IS NULL
  `);

  /*
   * Remove as relações parcialmente criadas,
   * independentemente de estarem como
   * RESTRICT ou CASCADE.
   */
  await dropForeignKey(
    'DeviceLog',
    'DeviceLog_deviceId_fkey',
  );

  await dropForeignKey(
    'PlaylistItem',
    'PlaylistItem_mediaId_fkey',
  );

  await dropForeignKey(
    'Schedule',
    'Schedule_deviceId_fkey',
  );

  await dropForeignKey(
    'Schedule',
    'Schedule_playlistId_fkey',
  );

  /*
   * Garante a existência da coluna active.
   */
  const activeExists =
    await columnExists(
      'Schedule',
      'active',
    );

  if (!activeExists) {
    await execute(`
      ALTER TABLE \`Schedule\`
      ADD COLUMN \`active\`
      BOOLEAN NOT NULL
      DEFAULT true
    `);

    console.log(
      '[OK] Coluna Schedule.active criada.',
    );
  } else {
    console.log(
      '[OK] Coluna Schedule.active já existe.',
    );
  }

  /*
   * Índices novos.
   */
  await ensureIndex(
    'Device',
    'Device_lastHeartbeat_idx',
    '`lastHeartbeat`',
  );

  await ensureIndex(
    'DeviceLog',
    'DeviceLog_deviceId_idx',
    '`deviceId`',
  );

  await ensureIndex(
    'DeviceLog',
    'DeviceLog_createdAt_idx',
    '`createdAt`',
  );

  await ensureIndex(
    'Media',
    'Media_type_idx',
    '`type`',
  );

  await ensureIndex(
    'PlaylistItem',
    'PlaylistItem_playlistId_idx',
    '`playlistId`',
  );

  await ensureIndex(
    'Schedule',
    'Schedule_deviceId_active_idx',
    '`deviceId`, `active`',
  );

  await ensureIndex(
    'Schedule',
    'Schedule_deviceId_startDate_endDate_idx',
    '`deviceId`, `startDate`, `endDate`',
  );

  /*
   * Renomeia os índices antigos para
   * os nomes definidos pelo schema atual.
   */
  await ensureRenamedIndex(
    'Device',
    'Device_companyId_fkey',
    'Device_companyId_idx',
    '`companyId`',
  );

  await ensureRenamedIndex(
    'Folder',
    'Folder_companyId_fkey',
    'Folder_companyId_idx',
    '`companyId`',
  );

  await ensureRenamedIndex(
    'Media',
    'Media_companyId_fkey',
    'Media_companyId_idx',
    '`companyId`',
  );

  await ensureRenamedIndex(
    'Media',
    'Media_folderId_fkey',
    'Media_folderId_idx',
    '`folderId`',
  );

  await ensureRenamedIndex(
    'Playlist',
    'Playlist_companyId_fkey',
    'Playlist_companyId_idx',
    '`companyId`',
  );

  await ensureRenamedIndex(
    'PlaylistItem',
    'PlaylistItem_mediaId_fkey',
    'PlaylistItem_mediaId_idx',
    '`mediaId`',
  );

  await ensureRenamedIndex(
    'Schedule',
    'Schedule_companyId_fkey',
    'Schedule_companyId_idx',
    '`companyId`',
  );

  await ensureRenamedIndex(
    'Schedule',
    'Schedule_deviceId_fkey',
    'Schedule_deviceId_idx',
    '`deviceId`',
  );

  await ensureRenamedIndex(
    'Schedule',
    'Schedule_playlistId_fkey',
    'Schedule_playlistId_idx',
    '`playlistId`',
  );

  await ensureRenamedIndex(
    'User',
    'User_companyId_fkey',
    'User_companyId_idx',
    '`companyId`',
  );

  /*
   * Recria as quatro relações com
   * ON DELETE CASCADE.
   */
  await addForeignKey({
    tableName:
      'DeviceLog',

    constraintName:
      'DeviceLog_deviceId_fkey',

    columnName:
      'deviceId',

    referencedTable:
      'Device',

    referencedColumn:
      'id',
  });

  await addForeignKey({
    tableName:
      'PlaylistItem',

    constraintName:
      'PlaylistItem_mediaId_fkey',

    columnName:
      'mediaId',

    referencedTable:
      'Media',

    referencedColumn:
      'id',
  });

  await addForeignKey({
    tableName:
      'Schedule',

    constraintName:
      'Schedule_deviceId_fkey',

    columnName:
      'deviceId',

    referencedTable:
      'Device',

    referencedColumn:
      'id',
  });

  await addForeignKey({
    tableName:
      'Schedule',

    constraintName:
      'Schedule_playlistId_fkey',

    columnName:
      'playlistId',

    referencedTable:
      'Playlist',

    referencedColumn:
      'id',
  });

  /*
   * Exibe o estado final das relações.
   */
  const foreignKeys =
    await query(`
      SELECT
        TABLE_NAME AS tableName,
        CONSTRAINT_NAME AS constraintName,
        REFERENCED_TABLE_NAME AS referencedTable,
        DELETE_RULE AS deleteRule,
        UPDATE_RULE AS updateRule
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          'DeviceLog',
          'PlaylistItem',
          'Schedule'
        )
      ORDER BY
        TABLE_NAME,
        CONSTRAINT_NAME
    `);

  console.log(
    '\nForeign keys finais:',
  );

  console.table(
    foreignKeys,
  );

  console.log(
    '\nReparo concluído com sucesso.',
  );
}

main()
  .catch(error => {
    console.error(
      '\nErro durante o reparo:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });