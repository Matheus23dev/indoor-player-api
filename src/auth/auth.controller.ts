import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiErrorResponseDto,
  LoginResponseDto,
  RegisterAccountResponseDto,
} from '../swagger/swagger.models';
import { ApiServerError } from '../swagger/swagger.decorators';

@Controller('auth')
@ApiTags('Autenticação')
@ApiServerError()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Criar uma empresa e o primeiro usuário proprietário',
  })
  @ApiCreatedResponse({ type: RegisterAccountResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    description: 'E-mail ou empresa já cadastrados.',
    type: ApiErrorResponseDto,
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Autenticar um usuário do painel' })
  @ApiCreatedResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: 'E-mail ou senha incorretos.',
    type: ApiErrorResponseDto,
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
