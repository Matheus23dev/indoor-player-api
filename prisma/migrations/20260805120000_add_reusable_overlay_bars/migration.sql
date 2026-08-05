-- Reusable fixed bars that can be attached to more than one playlist.
CREATE TABLE `OverlayBar` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `position` ENUM('TOP', 'BOTTOM', 'LEFT', 'RIGHT') NOT NULL,
  `sizePercent` INTEGER NOT NULL DEFAULT 12,
  `backgroundColor` VARCHAR(7) NOT NULL DEFAULT '#000000',
  `opacity` INTEGER NOT NULL DEFAULT 100,
  `fit` ENUM('CONTAIN', 'COVER', 'FILL') NOT NULL DEFAULT 'CONTAIN',
  `companyId` VARCHAR(191) NOT NULL,
  `mediaId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `OverlayBar_companyId_idx`(`companyId`),
  INDEX `OverlayBar_mediaId_idx`(`mediaId`),
  INDEX `OverlayBar_position_idx`(`position`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlaylistOverlayBar` (
  `playlistId` VARCHAR(191) NOT NULL,
  `overlayBarId` VARCHAR(191) NOT NULL,
  `order` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PlaylistOverlayBar_playlistId_order_key`(`playlistId`, `order`),
  INDEX `PlaylistOverlayBar_overlayBarId_idx`(`overlayBarId`),
  PRIMARY KEY (`playlistId`, `overlayBarId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OverlayBar`
  ADD CONSTRAINT `OverlayBar_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OverlayBar`
  ADD CONSTRAINT `OverlayBar_mediaId_fkey`
  FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PlaylistOverlayBar`
  ADD CONSTRAINT `PlaylistOverlayBar_playlistId_fkey`
  FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlaylistOverlayBar`
  ADD CONSTRAINT `PlaylistOverlayBar_overlayBarId_fkey`
  FOREIGN KEY (`overlayBarId`) REFERENCES `OverlayBar`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
