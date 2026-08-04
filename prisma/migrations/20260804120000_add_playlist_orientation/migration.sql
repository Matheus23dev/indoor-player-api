-- Keep existing playlists horizontal while allowing portrait signage.
ALTER TABLE `Playlist`
ADD COLUMN `orientation` ENUM('LANDSCAPE', 'PORTRAIT') NOT NULL DEFAULT 'LANDSCAPE';
