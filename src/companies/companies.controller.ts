import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CompaniesService } from './companies.service';
import { RegisterCompanyDto } from './dto/companies.dto';
import {
  ApiErrorResponseDto,
  RegisterCompanyResponseDto,
} from '../swagger/swagger.models';
import { ApiServerError } from '../swagger/swagger.decorators';

@Controller('companies')
@ApiTags('Empresas')
@ApiServerError()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Criar uma empresa e seu usuário proprietário' })
  @ApiCreatedResponse({ type: RegisterCompanyResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    description: 'O e-mail informado já está cadastrado.',
    type: ApiErrorResponseDto,
  })
  register(
    @Body()
    dto: RegisterCompanyDto,
  ) {
    return this.companiesService.register(dto);
  }
}
