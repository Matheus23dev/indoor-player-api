import { MediaType } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { MediasService } from './medias.service';

describe('MediasService.list', () => {
  it('identifies the audio track of a legacy video and persists the metadata', async () => {
    const legacyVideo = {
      id: 'media-1',
      name: 'Vídeo silencioso.mp4',
      type: MediaType.VIDEO,
      fileUrl: 'video-silencioso.mp4',
      duration: null,
      hasAudio: null,
    };
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      media: {
        findMany: jest.fn().mockResolvedValue([legacyVideo]),
        update,
      },
    } as unknown as PrismaService;
    const service = new MediasService(prisma);
    const serviceWithProbe = service as unknown as {
      getVideoMetadata: (filePath: string) => Promise<{
        duration: number;
        hasAudio: boolean;
      }>;
    };

    jest.spyOn(serviceWithProbe, 'getVideoMetadata').mockResolvedValue({
      duration: 18,
      hasAudio: false,
    });

    const result = await service.list('company-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: legacyVideo.id },
      data: {
        duration: 18,
        hasAudio: false,
      },
    });
    expect(result).toEqual([
      expect.objectContaining({
        duration: 18,
        hasAudio: false,
      }),
    ]);
  });
});
