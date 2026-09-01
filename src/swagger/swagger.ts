import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  getMediaPublicPath,
  getSwaggerPath,
  isSwaggerEnabled,
} from '../config/environment';
import { DEVICE_TOKEN_SECURITY, USER_JWT_SECURITY } from './swagger.constants';

const SWAGGER_CUSTOM_CSS = `
  :root { --indoor-blue: #1d4ed8; }
  .swagger-ui .topbar { background: #0f172a; border-bottom: 3px solid var(--indoor-blue); }
  .swagger-ui .topbar a.link img,
  .swagger-ui .topbar a.link svg { display: none; }
  .swagger-ui .topbar a.link::before {
    content: 'Indoor Player API';
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: .02em;
  }
  .swagger-ui .topbar .download-url-wrapper { display: none; }
  .swagger-ui .info { margin: 36px 0 24px; }
  .swagger-ui .info .title { color: #0f172a; }
  .swagger-ui .opblock-tag { color: #0f172a; }
  .swagger-ui .btn.authorize { color: var(--indoor-blue); border-color: var(--indoor-blue); }
  .swagger-ui .btn.authorize svg { fill: var(--indoor-blue); }
`;

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Indoor Player API')
    .setDescription(
      [
        'Documentação oficial da API do Indoor Player.',
        '',
        'As operações administrativas usam o esquema **user-jwt**. As operações executadas pelo aplicativo da TV usam **device-token**.',
        '',
        'O canal em tempo real utiliza Socket.IO no namespace `/devices`, com transporte WebSocket e o token do Player em `auth.token` ou no cabeçalho Authorization. Eventos enviados: `programming:changed` e `device:unlinked`. Evento recebido: `player:log`.',
        '',
        'Todas as datas usam ISO 8601. Horários de agendamento usam `HH:mm`. Os dados administrativos são isolados pela empresa presente no token JWT.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setLicense('Uso interno', '')
    .addServer('/', 'Servidor atual')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT retornado por POST /auth/login.',
      },
      USER_JWT_SECURITY,
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'DeviceToken',
        description:
          'Token retornado por POST /devices/activate após o vínculo.',
      },
      DEVICE_TOKEN_SECURITY,
    )
    .addTag('Saúde', 'Disponibilidade e prontidão da API.')
    .addTag('Autenticação', 'Cadastro de conta e autenticação dos usuários.')
    .addTag('Empresas', 'Criação de empresa e proprietário inicial.')
    .addTag('Usuários', 'Usuários, perfis e permissões da empresa.')
    .addTag(
      'Dispositivos',
      'Registro, vínculo, sincronização, reprodução e logs dos Players.',
    )
    .addTag('Mídias', 'Upload e gerenciamento de imagens e vídeos.')
    .addTag('Pastas', 'Organização da biblioteca de mídias.')
    .addTag('Playlists', 'Composição, orientação, ordem, duração e áudio.')
    .addTag('Barras fixas', 'Barras reutilizáveis e vínculo com playlists.')
    .addTag('Agendamentos', 'Programação de playlists nos Players.')
    .addTag('Auditoria', 'Consulta consolidada dos eventos da empresa.')
    .addTag('Clima', 'Clima usado pelos conteúdos dinâmicos das barras.')
    .build();
}

export function setupSwagger(app: INestApplication) {
  if (!isSwaggerEnabled()) return null;

  const path = getSwaggerPath();
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig(), {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });

  document.paths[`${getMediaPublicPath()}/{file}`] = {
    get: {
      tags: ['Mídias'],
      summary: 'Baixar ou reproduzir um arquivo de mídia',
      description:
        'Rota pública de arquivos com suporte a Range, ETag e cache. O nome é obtido em fileUrl nas respostas de mídia.',
      operationId: 'MediaFiles_download',
      parameters: [
        {
          name: 'file',
          in: 'path',
          required: true,
          description: 'Nome físico retornado pela API.',
          schema: { type: 'string' },
          example: '1724430000000-uuid-campanha.mp4',
        },
        {
          name: 'Range',
          in: 'header',
          required: false,
          description: 'Intervalo opcional para streaming de vídeos.',
          schema: { type: 'string' },
          example: 'bytes=0-1048575',
        },
      ],
      responses: {
        200: {
          description: 'Arquivo completo.',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        206: {
          description: 'Trecho do arquivo solicitado pelo cabeçalho Range.',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        404: { description: 'Arquivo não encontrado.' },
        500: { description: 'Falha interna inesperada.' },
      },
    },
  };

  Object.assign(document, {
    'x-socket-io': {
      namespace: '/devices',
      transports: ['websocket'],
      authentication: ['auth.token', 'Authorization: Bearer <deviceToken>'],
      serverEvents: {
        'programming:changed': 'Solicita uma nova sincronização REST.',
        'device:unlinked':
          'Encerra a sessão e retorna o Player para a ativação.',
      },
      clientEvents: {
        'player:log':
          'Evento aceito para compatibilidade; atualmente não é persistido.',
      },
    },
  });

  SwaggerModule.setup(path, app, document, {
    customSiteTitle: 'Indoor Player API | Documentação',
    customCss: SWAGGER_CUSTOM_CSS,
    jsonDocumentUrl: `${path}/openapi.json`,
    yamlDocumentUrl: `${path}/openapi.yaml`,
    swaggerOptions: {
      deepLinking: true,
      displayOperationId: false,
      displayRequestDuration: true,
      filter: true,
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      defaultModelExpandDepth: 2,
      defaultModelsExpandDepth: 1,
      docExpansion: 'list',
      requestSnippetsEnabled: true,
      tryItOutEnabled: true,
    },
  });

  return document;
}
