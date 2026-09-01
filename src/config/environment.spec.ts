import * as path from 'path';

import {
  getApplicationPort,
  getCorsOrigins,
  getJwtSecret,
  getMediaPublicPath,
  getMediaStoragePath,
  getSwaggerPath,
  isCorsOriginAllowed,
  isSwaggerEnabled,
} from './environment';

describe('environment', () => {
  it.each([undefined, '', '0', '-1', '65536', 'invalid'])(
    'uses the default port for %p',
    (value) => {
      expect(getApplicationPort(value)).toBe(3000);
    },
  );

  it('accepts a valid application port', () => {
    expect(getApplicationPort('4100')).toBe(4100);
  });

  it('normalizes the CORS allowlist', () => {
    expect(
      getCorsOrigins(' http://localhost:5173,https://admin.test, '),
    ).toEqual(['http://localhost:5173', 'https://admin.test']);
  });

  it('allows configured CORS origins and non-browser clients', () => {
    const allowedOrigins = ['https://admin.test'];

    expect(isCorsOriginAllowed(undefined, allowedOrigins)).toBe(true);
    expect(isCorsOriginAllowed('https://admin.test', allowedOrigins)).toBe(
      true,
    );
    expect(isCorsOriginAllowed('https://unexpected.test', allowedOrigins)).toBe(
      false,
    );
    expect(isCorsOriginAllowed('https://any.test', [])).toBe(true);
  });

  it('requires a JWT secret', () => {
    expect(() => getJwtSecret('')).toThrow('JWT_SECRET não foi configurado.');
    expect(getJwtSecret(' secure-secret ')).toBe('secure-secret');
  });

  it('resolves media storage and public paths', () => {
    expect(getMediaStoragePath('')).toBe(
      path.resolve(process.cwd(), '..', 'files', 'indoor-player-api'),
    );
    expect(getMediaStoragePath('./custom-media')).toBe(
      path.resolve(process.cwd(), 'custom-media'),
    );
    expect(getMediaPublicPath('/custom-media/')).toBe('/custom-media');
  });

  it('enables Swagger safely according to the environment', () => {
    expect(isSwaggerEnabled(undefined, 'development')).toBe(true);
    expect(isSwaggerEnabled(undefined, 'production')).toBe(false);
    expect(isSwaggerEnabled('true', 'production')).toBe(true);
    expect(isSwaggerEnabled('false', 'development')).toBe(false);
  });

  it('normalizes the Swagger route', () => {
    expect(getSwaggerPath()).toBe('docs');
    expect(getSwaggerPath('/internal/api-docs/')).toBe('internal/api-docs');
    expect(getSwaggerPath('///')).toBe('docs');
  });
});
