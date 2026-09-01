import * as path from 'path';

const DEFAULT_PORT = 3000;
const DEFAULT_MEDIA_PUBLIC_PATH = '/files/indoor-player-api';
const DEFAULT_SWAGGER_PATH = 'docs';

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

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins = getCorsOrigins(),
) {
  return (
    !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)
  );
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

export function isSwaggerEnabled(
  value = process.env.SWAGGER_ENABLED,
  nodeEnvironment = process.env.NODE_ENV,
) {
  const normalized = value?.trim().toLowerCase();

  if (normalized) {
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  return nodeEnvironment?.trim().toLowerCase() !== 'production';
}

export function getSwaggerPath(value = process.env.SWAGGER_PATH) {
  const normalized = (value?.trim() || DEFAULT_SWAGGER_PATH)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');

  return normalized || DEFAULT_SWAGGER_PATH;
}
