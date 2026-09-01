import { PartialType } from '@nestjs/swagger';

import { CreateOverlayBarDto } from './create-overlay-bar.dto';

export class UpdateOverlayBarDto extends PartialType(CreateOverlayBarDto) {}
