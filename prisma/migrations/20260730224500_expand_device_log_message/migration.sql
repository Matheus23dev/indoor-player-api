-- Player events are stored as structured JSON and can exceed MySQL's default
-- VARCHAR(191) generated for an unconstrained Prisma String.
ALTER TABLE `DeviceLog`
    MODIFY `message` TEXT NOT NULL;
