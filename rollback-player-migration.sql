ALTER TABLE `Device`
DROP INDEX `Device_lastHeartbeat_idx`;

ALTER TABLE `DeviceLog`
DROP INDEX `DeviceLog_deviceId_idx`;

ALTER TABLE `DeviceLog`
DROP INDEX `DeviceLog_createdAt_idx`;

ALTER TABLE `Media`
DROP INDEX `Media_type_idx`;

ALTER TABLE `PlaylistItem`
DROP INDEX `PlaylistItem_playlistId_idx`;

ALTER TABLE `Schedule`
DROP INDEX `Schedule_deviceId_active_idx`;

ALTER TABLE `Schedule`
DROP INDEX `Schedule_deviceId_startDate_endDate_idx`;

ALTER TABLE `Schedule`
DROP COLUMN `active`;

ALTER TABLE `PlaylistItem`
ADD CONSTRAINT `PlaylistItem_mediaId_fkey`
FOREIGN KEY (`mediaId`)
REFERENCES `Media`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE `Schedule`
ADD CONSTRAINT `Schedule_deviceId_fkey`
FOREIGN KEY (`deviceId`)
REFERENCES `Device`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE `Schedule`
ADD CONSTRAINT `Schedule_playlistId_fkey`
FOREIGN KEY (`playlistId`)
REFERENCES `Playlist`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;
