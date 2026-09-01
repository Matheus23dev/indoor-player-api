import { Test } from '@nestjs/testing';

import { AppModule } from '../app.module';
import { setupSwagger } from './swagger';

const EXPECTED_OPERATIONS: Record<string, string[]> = {
  '/': ['get'],
  '/health': ['get'],
  '/health/ready': ['get'],
  '/auth/register': ['post'],
  '/auth/login': ['post'],
  '/companies/register': ['post'],
  '/users/me': ['get'],
  '/users': ['get', 'post'],
  '/users/{id}': ['get', 'patch', 'delete'],
  '/devices/register': ['post'],
  '/devices/activate': ['post'],
  '/devices/code/{code}': ['get'],
  '/devices/current-playlist': ['get'],
  '/devices/programming': ['get'],
  '/devices/heartbeat': ['post'],
  '/devices/pair': ['post'],
  '/devices': ['get'],
  '/devices/{id}/preview': ['get'],
  '/devices/{id}/logs': ['get'],
  '/devices/{id}/unlink': ['post'],
  '/devices/{id}': ['delete'],
  '/medias/upload': ['post'],
  '/medias': ['get'],
  '/medias/{id}': ['delete'],
  '/folders': ['get', 'post'],
  '/folders/{id}': ['patch', 'delete'],
  '/playlists': ['get', 'post'],
  '/playlists/{id}': ['get', 'patch', 'delete'],
  '/playlists/{id}/items': ['post', 'delete'],
  '/playlists/{id}/composition': ['patch'],
  '/playlists/items/{id}/duplicate': ['post'],
  '/playlists/items/{id}': ['patch', 'delete'],
  '/playlists/{id}/reorder': ['patch'],
  '/overlay-bars': ['get', 'post'],
  '/overlay-bars/{id}': ['patch', 'delete'],
  '/overlay-bars/{id}/playlists/{playlistId}': ['post', 'delete'],
  '/schedules': ['get', 'post'],
  '/schedules/{id}': ['get', 'patch', 'delete'],
  '/audit-logs': ['get'],
  '/weather/current': ['get'],
  '/files/indoor-player-api/{file}': ['get'],
};

describe('Swagger', () => {
  const previousSwaggerEnabled = process.env.SWAGGER_ENABLED;

  beforeAll(() => {
    process.env.SWAGGER_ENABLED = 'true';
    process.env.JWT_SECRET ||= 'swagger-test-secret';
  });

  afterAll(() => {
    if (previousSwaggerEnabled === undefined) {
      delete process.env.SWAGGER_ENABLED;
    } else {
      process.env.SWAGGER_ENABLED = previousSwaggerEnabled;
    }
  });

  it('documents every REST operation exposed by the application', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();

    const document = setupSwagger(app);

    expect(document).not.toBeNull();
    expect(document?.info.title).toBe('Indoor Player API');
    expect(document?.components?.securitySchemes).toEqual(
      expect.objectContaining({
        'user-jwt': expect.any(Object),
        'device-token': expect.any(Object),
      }),
    );
    expect(document).toEqual(
      expect.objectContaining({
        'x-socket-io': expect.objectContaining({ namespace: '/devices' }),
      }),
    );
    expect(document?.components?.schemas?.LoginDto).toEqual(
      expect.objectContaining({
        required: expect.arrayContaining(['email', 'password']),
        properties: expect.objectContaining({
          email: expect.objectContaining({ format: 'email' }),
          password: expect.objectContaining({ minLength: 6 }),
        }),
      }),
    );
    expect(document?.components?.schemas?.CreateOverlayBarDto).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          position: expect.any(Object),
          contentItems: expect.any(Object),
        }),
      }),
    );
    expect(document?.paths['/users']?.get?.security).toContainEqual({
      'user-jwt': [],
    });
    expect(
      document?.paths['/devices/programming']?.get?.security,
    ).toContainEqual({ 'device-token': [] });
    expect(document?.paths['/auth/login']?.post?.security).toBeUndefined();

    for (const [path, methods] of Object.entries(EXPECTED_OPERATIONS)) {
      expect(document?.paths[path]).toBeDefined();

      for (const method of methods) {
        const operation = document?.paths[path]?.[
          method as keyof (typeof document.paths)[string]
        ] as
          | {
              summary?: string;
              responses?: Record<string, unknown>;
            }
          | undefined;

        expect(operation).toBeDefined();
        expect(operation).toEqual(
          expect.objectContaining({
            summary: expect.any(String),
            responses: expect.any(Object),
          }),
        );
        expect(operation?.responses).toHaveProperty('500');
      }
    }

    expect(Object.keys(document?.paths ?? {}).sort()).toEqual(
      Object.keys(EXPECTED_OPERATIONS).sort(),
    );

    await moduleRef.close();
  });
});
