import * as path from 'path';

const DEFAULT_PORT = 3000;
const DEFAULT_MEDIA_PUBLIC_PATH = '/files/indoor-player-api';

export function getApplicationPort(value = process.env.PORT) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return DEFAULT_PORT;
  }

  return port;
}

export function getCorsOrigins(value = process.env.CORS_ORIGINS) {
  return String(value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getJwtSecret(value = process.env.JWT_SECRET) {
  const secret = value?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET não foi configurado.');
  }

  return secret;
}

export function getMediaStoragePath(value = process.env.MEDIA_STORAGE_PATH) {
  const configuredPath = value?.trim();

  return configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(process.cwd(), '..', 'files', 'indoor-player-api');
}

export function getMediaPublicPath(value = process.env.MEDIA_PUBLIC_PATH) {
  const normalized = (value?.trim() || DEFAULT_MEDIA_PUBLIC_PATH)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return `/${normalized}`;
}
