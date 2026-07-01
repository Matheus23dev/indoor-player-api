-- Remove agendamentos ligados a dispositivos
-- ou playlists que não existem mais.
DELETE s
FROM `Schedule` AS s
LEFT JOIN `Device` AS d
  ON d.id = s.deviceId
LEFT JOIN `Playlist` AS p
  ON p.id = s.playlistId
WHERE d.id IS NULL
   OR p.id IS NULL;

-- Restaura temporariamente a relação antiga
-- entre Schedule e Device.
ALTER TABLE `Schedule`
ADD CONSTRAINT `Schedule_deviceId_fkey`
FOREIGN KEY (`deviceId`)
REFERENCES `Device`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Restaura temporariamente a relação antiga
-- entre Schedule e Playlist.
ALTER TABLE `Schedule`
ADD CONSTRAINT `Schedule_playlistId_fkey`
FOREIGN KEY (`playlistId`)
REFERENCES `Playlist`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;