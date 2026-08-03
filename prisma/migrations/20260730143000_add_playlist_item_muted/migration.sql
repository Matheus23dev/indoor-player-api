-- Preserve existing playlists while making the audio preference explicit.
ALTER TABLE `PlaylistItem`
ADD COLUMN `muted` BOOLEAN NOT NULL DEFAULT false;
