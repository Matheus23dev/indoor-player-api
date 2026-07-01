-- DropForeignKey
ALTER TABLE `PlaylistItem` DROP FOREIGN KEY `PlaylistItem_mediaId_fkey`;

-- DropForeignKey
ALTER TABLE `Schedule` DROP FOREIGN KEY `Schedule_deviceId_fkey`;

-- DropForeignKey
ALTER TABLE `Schedule` DROP FOREIGN KEY `Schedule_playlistId_fkey`;

-- AlterTable
ALTER TABLE `Schedule` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `Device_lastHeartbeat_idx` ON `Device`(`lastHeartbeat`);

-- CreateIndex
CREATE INDEX `DeviceLog_deviceId_idx` ON `DeviceLog`(`deviceId`);

-- CreateIndex
CREATE INDEX `DeviceLog_createdAt_idx` ON `DeviceLog`(`createdAt`);

-- CreateIndex
CREATE INDEX `Media_type_idx` ON `Media`(`type`);

-- CreateIndex
CREATE INDEX `PlaylistItem_playlistId_idx` ON `PlaylistItem`(`playlistId`);

-- CreateIndex
CREATE INDEX `Schedule_deviceId_active_idx` ON `Schedule`(`deviceId`, `active`);

-- CreateIndex
CREATE INDEX `Schedule_deviceId_startDate_endDate_idx` ON `Schedule`(`deviceId`, `startDate`, `endDate`);

-- AddForeignKey
ALTER TABLE `DeviceLog` ADD CONSTRAINT `DeviceLog_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistItem` ADD CONSTRAINT `PlaylistItem_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Device` RENAME INDEX `Device_companyId_fkey` TO `Device_companyId_idx`;

-- RenameIndex
ALTER TABLE `Folder` RENAME INDEX `Folder_companyId_fkey` TO `Folder_companyId_idx`;

-- RenameIndex
ALTER TABLE `Media` RENAME INDEX `Media_companyId_fkey` TO `Media_companyId_idx`;

-- RenameIndex
ALTER TABLE `Media` RENAME INDEX `Media_folderId_fkey` TO `Media_folderId_idx`;

-- RenameIndex
ALTER TABLE `Playlist` RENAME INDEX `Playlist_companyId_fkey` TO `Playlist_companyId_idx`;

-- RenameIndex
ALTER TABLE `PlaylistItem` RENAME INDEX `PlaylistItem_mediaId_fkey` TO `PlaylistItem_mediaId_idx`;

-- RenameIndex
ALTER TABLE `Schedule` RENAME INDEX `Schedule_companyId_fkey` TO `Schedule_companyId_idx`;

-- RenameIndex
ALTER TABLE `Schedule` RENAME INDEX `Schedule_deviceId_fkey` TO `Schedule_deviceId_idx`;

-- RenameIndex
ALTER TABLE `Schedule` RENAME INDEX `Schedule_playlistId_fkey` TO `Schedule_playlistId_idx`;

-- RenameIndex
ALTER TABLE `User` RENAME INDEX `User_companyId_fkey` TO `User_companyId_idx`;
