import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { CompaniesService } from './companies.service';
import { RegisterCompanyDto } from './dto/companies.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
  ) {}

  @Post('register')
  register(
    @Body()
    dto: RegisterCompanyDto,
  ) {
    return this.companiesService.register(dto);
  }
}