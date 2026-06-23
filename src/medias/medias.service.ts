import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import fs from 'fs-extra';
import { PrismaService } from '../prisma/prisma.service';
import path from 'path';

@Injectable()
export class MediasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async upload(
    file: Express.Multer.File,
    companyId: string,
  ) {
    const mediaType =
      file.mimetype.startsWith('video')
        ? 'VIDEO'
        : 'IMAGE';

    return this.prisma.media.create({
      data: {
        name: file.originalname,

        type: mediaType as any,

        fileUrl:
          '/uploads/' +
          file.filename,

        fileSize: file.size,

        companyId,
      },
    });
  }

  async list(
    companyId: string,
  ) {
    return this.prisma.media.findMany({
      where: {
        companyId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async remove(id: string) {
  const media =
    await this.prisma.media.findUnique({
      where: {
        id,
      },
    });

  if (!media) {
    throw new NotFoundException(
      'Mídia não encontrada',
    );
  }
  

  const filePath = path.join(
    process.cwd(),
    media.fileUrl,
  );

  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
  }

return this.prisma.$transaction([
    this.prisma.playlistItem.deleteMany({
      where: {
        mediaId: id,
      },
    }),

    this.prisma.media.delete({
      where: {
        id,
      },
    }),
  ]);
}}