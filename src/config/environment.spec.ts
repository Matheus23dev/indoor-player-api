import * as path from 'path';

import {
  getApplicationPort,
  getCorsOrigins,
  getJwtSecret,
  getMediaPublicPath,
  getMediaStoragePath,
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
});
