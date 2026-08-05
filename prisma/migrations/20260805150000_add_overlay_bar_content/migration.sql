-- Allow reusable bars to combine editable text and positioned images.
ALTER TABLE `OverlayBar`
  ADD COLUMN `contentPosition` ENUM('START', 'CENTER', 'END') NOT NULL DEFAULT 'CENTER',
  ADD COLUMN `imageSizePercent` INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN `contentPadding` INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN `contentGap` INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN `contentItems` JSON NULL,
  ADD COLUMN `textContent` VARCHAR(500) NULL,
  ADD COLUMN `textColor` VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN `fontSize` INTEGER NOT NULL DEFAULT 28,
  ADD COLUMN `widgetType` ENUM('NONE', 'CLOCK', 'DATE', 'WEATHER') NOT NULL DEFAULT 'NONE',
  ADD COLUMN `weatherLocation` VARCHAR(120) NULL;
