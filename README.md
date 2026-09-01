# Indoor Player API

API central do Indoor Player. Gerencia autenticação, empresas, usuários, dispositivos, mídias, playlists, barras fixas, agendamentos, programação, heartbeat e auditoria.

## Tecnologias

- Node.js 22.13+
- NestJS 11
- Prisma 6
- MySQL 8 compatível
- Socket.IO 4
- FFprobe fornecido por `ffprobe-static`

## Início rápido

```powershell
Copy-Item .env.example .env
docker compose up -d mysql
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:dev
```

Validação:

```text
GET http://localhost:3000/health
GET http://localhost:3000/health/ready
```

Documentação interativa:

```text
http://localhost:3000/docs
http://localhost:3000/docs/openapi.json
http://localhost:3000/docs/openapi.yaml
```

## Ambiente

| Variável                     |    Obrigatória    | Padrão                       |
| ---------------------------- | :---------------: | ---------------------------- |
| `DATABASE_URL`               |        Sim        | —                            |
| `JWT_SECRET`                 |        Sim        | —                            |
| `PORT`                       |        Não        | `3000`                       |
| `CORS_ORIGINS`               |     Produção      | qualquer origem quando vazia |
| `SWAGGER_ENABLED`            |        Não        | ativo fora de produção       |
| `SWAGGER_PATH`               |        Não        | `docs`                       |
| `MEDIA_STORAGE_PATH`         |        Não        | `../files/indoor-player-api` |
| `MEDIA_PUBLIC_PATH`          |        Não        | `/files/indoor-player-api`   |
| `WEATHER_GEOCODING_BASE_URL` |        Não        | Open-Meteo                   |
| `WEATHER_FORECAST_BASE_URL`  |        Não        | Open-Meteo                   |
| `WEATHER_API_KEY`            | Conforme provedor | —                            |

Os arquivos de mídia não ficam no banco. Em produção, inclua o diretório físico de mídias no backup junto com o MySQL.

## Scripts

```powershell
npm run start:dev             # desenvolvimento com watch
npm run build                 # gera dist/
npm run start:prod            # executa dist/main
npm run validate              # formato, tipos, lint, testes e Prisma
npm run prisma:migrate:dev    # cria/aplica migration em desenvolvimento
npm run prisma:migrate:deploy # aplica migrations versionadas
```

## Estrutura

```text
src/
├── audit-logs/    consulta centralizada da auditoria
├── auth/          login, JWT e autorização por perfil
├── companies/     criação de empresa e proprietário
├── config/        leitura e normalização do ambiente
├── devices/       vínculo, programação, heartbeat, preview e Socket.IO
├── folders/       organização da biblioteca
├── medias/        upload, metadados e arquivos
├── overlay-bars/  barras reutilizáveis e vínculo com playlists
├── playlists/     conteúdo, ordem, duração, áudio e orientação
├── prisma/        acesso ao banco
├── schedules/     regras e ocorrências de programação
├── users/         usuários e perfis
└── weather/       integração e cache de clima

prisma/
├── migrations/    evolução versionada do banco
└── schema.prisma  modelo atual
```

## Documentação

- [Swagger / OpenAPI interativo](http://localhost:3000/docs)
- [Referência dos endpoints](docs/REFERENCIA_API.md)
- [Modelo de dados](docs/MODELO_DE_DADOS.md)
- [Documentação geral da solução](https://github.com/Matheus23dev/IndoorPlayer-app/tree/develop/docs)

## Observações operacionais

- Rotas administrativas usam JWT de usuário; rotas do Player usam token próprio do dispositivo.
- O namespace Socket.IO é `/devices` e aceita apenas transporte WebSocket.
- O status online considera heartbeat recebido há menos de 60 segundos.
- A programação é calculada no fuso `America/Fortaleza`.
- A rota pública das mídias suporta ranges, ETag e cache de uma hora.
- A aplicação deve ficar atrás de HTTPS e de um gerenciador de processos em produção.
