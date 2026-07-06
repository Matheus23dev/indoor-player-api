ALTER TABLE `Device`
  ADD COLUMN `activationSecretHash` VARCHAR(64) NULL,
  ADD COLUMN `deviceTokenHash` VARCHAR(64) NULL,
  ADD COLUMN `deviceTokenCreatedAt` DATETIME(3) NULL,
  ADD COLUMN `deviceTokenRevokedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Device_deviceTokenHash_key`
  ON `Device`(`deviceTokenHash`);

CREATE INDEX `Device_deviceTokenRevokedAt_idx`
  ON `Device`(`deviceTokenRevokedAt`);
