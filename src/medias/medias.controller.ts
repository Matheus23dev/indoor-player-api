import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { MediasService } from './medias.service';

@Controller('medias')
@UseGuards(JwtAuthGuard)
export class MediasController {
  constructor(
    private readonly mediasService: MediasService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename: (
          req,
          file,
          callback,
        ) => {
          const fileName =
            Date.now() +
            '-' +
            file.originalname;

          callback(
            null,
            fileName,
          );
        },
      }),
    }),
  )
  upload(
    @UploadedFile()
    file: Express.Multer.File,

    @Req()
    req: any,
  ) {
    return this.mediasService.upload(
      file,
      req.user.companyId,
    );
  }

  @Get()
  list(
    @Req()
    req: any,
  ) {
    return this.mediasService.list(
      req.user.companyId,
    );
  }
@Delete(':id')
@UseGuards(JwtAuthGuard)
remove(
  @Param('id') id: string,
) {
  return this.mediasService.remove(id);
}
}