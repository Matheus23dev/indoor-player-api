DELETE dl
FROM `DeviceLog` AS dl
LEFT JOIN `Device` AS d
  ON d.id = dl.deviceId
WHERE d.id IS NULL;
