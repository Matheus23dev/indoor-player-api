import { PartialType } from '@nestjs/mapped-types';

import { CreateOverlayBarDto } from './create-overlay-bar.dto';

export class UpdateOverlayBarDto extends PartialType(CreateOverlayBarDto) {}
