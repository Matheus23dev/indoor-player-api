import { BadRequestException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import type { DeviceAuthService } from './device-auth.service';
import type { AuthenticatedDevice } from './device-auth.types';
import type { DevicesGateway } from './devices.gateway';
import { DevicesService } from './devices.service';

describe('DevicesService.heartbeat', () => {
  const authenticatedDevice: AuthenticatedDevice = {
    id: 'device-1',
    code: 'ABC123',
    name: 'TV 1',
    companyId: 'company-1',
    isLinked: true,
    currentPlaylistId: 'playlist-1',
    currentPlaylistItemId: 'item-1',
    currentMediaId: 'media-1',
  };

  function createSubject(validItem: { id: string } | null = { id: 'item-2' }) {
    const update = jest.fn().mockResolvedValue({ id: authenticatedDevice.id });
    const findFirst = jest.fn().mockResolvedValue(validItem);
    const prisma = {
      device: { update },
      playlistItem: { findFirst },
    } as unknown as PrismaService;

    return {
      service: new DevicesService(
        prisma,
        {} as DevicesGateway,
        {} as DeviceAuthService,
      ),
      update,
      findFirst,
    };
  }

  it('does not revalidate an unchanged playback identity', async () => {
    const subject = createSubject();

    await subject.service.heartbeat(
      {
        playlistId: 'playlist-1',
        playlistItemId: 'item-1',
        mediaId: 'media-1',
        currentTime: 10,
        duration: 31,
        muted: false,
      },
      authenticatedDevice,
    );

    expect(subject.findFirst).not.toHaveBeenCalled();
    expect(subject.update).toHaveBeenCalledTimes(1);
  });

  it('validates a new playback identity before saving it', async () => {
    const subject = createSubject();

    await subject.service.heartbeat(
      {
        playlistId: 'playlist-1',
        playlistItemId: 'item-2',
        mediaId: 'media-2',
      },
      authenticatedDevice,
    );

    expect(subject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'item-2',
          playlistId: 'playlist-1',
          mediaId: 'media-2',
        }),
      }),
    );
    expect(subject.update).toHaveBeenCalledTimes(1);
  });

  it('rejects a new playback identity outside the device company', async () => {
    const subject = createSubject(null);

    await expect(
      subject.service.heartbeat(
        {
          playlistId: 'playlist-2',
          playlistItemId: 'item-2',
          mediaId: 'media-2',
        },
        authenticatedDevice,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(subject.update).not.toHaveBeenCalled();
  });
});
