import type { PrismaService } from '../prisma/prisma.service';
import type { DeviceAuthService } from './device-auth.service';
import type { DevicesGateway } from './devices.gateway';
import { DevicesService } from './devices.service';

describe('DevicesService.list preview', () => {
  it('returns the active playlist bars and hydrates their content images', async () => {
    const timestamp = new Date('2026-08-06T12:00:00.000Z');
    const contentImage = {
      id: 'image-1',
      name: 'Logo',
      type: 'IMAGE',
      fileUrl: '/files/logo.png',
      fileSize: 1024,
      duration: null,
      companyId: 'company-1',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const findDevices = jest.fn().mockResolvedValue([
      {
        id: 'device-1',
        name: 'TV recepção',
        code: 'ABC123',
        isLinked: true,
        companyId: 'company-1',
        createdAt: timestamp,
        updatedAt: timestamp,
        lastHeartbeat: timestamp,
        currentMediaTime: null,
        currentMediaDuration: null,
        currentMediaStartedAt: null,
        playbackMuted: null,
        playbackUpdatedAt: null,
        currentPlaylistItem: null,
        currentMedia: null,
        currentPlaylist: {
          id: 'playlist-1',
          name: 'Institucional',
          orientation: 'LANDSCAPE',
          overlayBars: [
            {
              order: 1,
              overlayBar: {
                id: 'bar-1',
                name: 'Lateral',
                position: 'LEFT',
                sizePercent: 14,
                backgroundColor: '#000000',
                opacity: 100,
                fit: 'CONTAIN',
                contentPosition: 'CENTER',
                contentAlignment: 'CENTER',
                imageSizePercent: 80,
                contentPadding: 8,
                contentGap: 8,
                contentItems: [
                  {
                    id: 'content-image',
                    type: 'IMAGE',
                    mediaId: contentImage.id,
                  },
                ],
                textContent: null,
                textColor: '#FFFFFF',
                fontSize: 28,
                widgetType: 'NONE',
                weatherLocation: null,
                companyId: 'company-1',
                mediaId: null,
                createdAt: timestamp,
                updatedAt: timestamp,
                media: null,
              },
            },
          ],
        },
      },
    ]);
    const findSchedules = jest.fn().mockResolvedValue([]);
    const findMedias = jest.fn().mockResolvedValue([contentImage]);
    const prisma = {
      device: { findMany: findDevices },
      schedule: { findMany: findSchedules },
      media: { findMany: findMedias },
    } as unknown as PrismaService;
    const service = new DevicesService(
      prisma,
      {} as DevicesGateway,
      {} as DeviceAuthService,
    );

    const [device] = await service.list('company-1');

    expect(findMedias).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['image-1'] },
          type: 'IMAGE',
          companyId: 'company-1',
        },
      }),
    );
    expect(device.preview.playlist).toEqual(
      expect.objectContaining({
        id: 'playlist-1',
        orientation: 'LANDSCAPE',
        bars: [
          expect.objectContaining({
            id: 'bar-1',
            position: 'LEFT',
            contentItems: [
              expect.objectContaining({
                media: expect.objectContaining({
                  id: 'image-1',
                  createdAt: timestamp.toISOString(),
                  updatedAt: timestamp.toISOString(),
                }),
              }),
            ],
          }),
        ],
      }),
    );
  });
});
