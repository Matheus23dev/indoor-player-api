-- AlterTable
ALTER TABLE `Device` ADD COLUMN `currentMediaDuration` INTEGER NULL,
    ADD COLUMN `currentMediaId` VARCHAR(191) NULL,
    ADD COLUMN `currentMediaStartedAt` DATETIME(3) NULL,
    ADD COLUMN `currentMediaTime` INTEGER NULL,
    ADD COLUMN `currentPlaylistId` VARCHAR(191) NULL,
    ADD COLUMN `currentPlaylistItemId` VARCHAR(191) NULL,
    ADD COLUMN `playbackUpdatedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Device_currentPlaylistId_idx` ON `Device`(`currentPlaylistId`);

-- CreateIndex
CREATE INDEX `Device_currentPlaylistItemId_idx` ON `Device`(`currentPlaylistItemId`);

-- CreateIndex
CREATE INDEX `Device_currentMediaId_idx` ON `Device`(`currentMediaId`);

-- CreateIndex
CREATE INDEX `Device_playbackUpdatedAt_idx` ON `Device`(`playbackUpdatedAt`);

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_currentPlaylistId_fkey` FOREIGN KEY (`currentPlaylistId`) REFERENCES `Playlist`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_currentPlaylistItemId_fkey` FOREIGN KEY (`currentPlaylistItemId`) REFERENCES `PlaylistItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_currentMediaId_fkey` FOREIGN KEY (`currentMediaId`) REFERENCES `Media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
