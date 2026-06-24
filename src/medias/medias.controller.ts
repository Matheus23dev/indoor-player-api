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
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediasService } from './medias.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

@Controller('medias')
@UseGuards(JwtAuthGuard)
export class MediasController {
  constructor(private readonly mediasService: MediasService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const fileName = Date.now() + '-' + file.originalname;
          callback(null, fileName);
        },
      }),
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mediasService.upload(file, req.user.companyId, folderId);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.mediasService.list(req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.mediasService.remove(id, req.user.companyId);
  }
}
