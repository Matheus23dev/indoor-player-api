# Indoor Player API

API NestJS responsável por autenticação, empresas, usuários, dispositivos, mídias, playlists, agendamentos, programação das TVs, heartbeat e atualizações em tempo real via Socket.IO.

## Requisitos

- Node.js 22+
- MySQL compatível com Prisma
- FFprobe (fornecido pela dependência `ffprobe-static`)

## Configuração

Copie `.env.example` para `.env` e ajuste os valores:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/indoor_player
JWT_SECRET=use-uma-chave-longa-e-aleatoria
```

A API usa automaticamente a porta `3000`, o fuso `America/Fortaleza`, a pasta irmã `files/indoor-player-api` fora do projeto e a rota pública `/files/indoor-player-api`. Por exemplo, uma API instalada em `/var/www/indoor-player-api` armazena as mídias em `/var/www/files/indoor-player-api`. Em produção, faça backup dessa pasta junto com o banco.

## Instalação e banco

```sh
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

O histórico do banco atual foi reconciliado com as migrations. Novos ambientes aplicam todas as migrations normalmente.

## Execução

```sh
# desenvolvimento
npm run start:dev

# produção
npm run build
npm run start:prod
```

Saúde da aplicação:

```text
GET /health
```

Arquivos de mídia:

```text
GET /files/indoor-player-api/<nome-do-arquivo>
```

## Qualidade

```sh
npm run validate
```

O comando valida formatação, TypeScript, ESLint, testes Jest e o schema Prisma.

## Fluxo do áudio

`PlaylistItem.muted` é retornado em `GET /devices/programming`, participa da versão SHA-256 da programação e dispara `programming:changed` após uma alteração. O heartbeat recebe também `muted`, permitindo que o painel mostre o estado efetivamente aplicado pelo APK.

## Estrutura

```text
src/
├── auth/          autenticação e autorização
├── config/        validação de ambiente
├── devices/       ativação, programação, heartbeat e Socket.IO
├── medias/        upload, metadados e arquivos
├── playlists/     itens, ordem, duração e áudio
├── schedules/     regras de agendamento
└── users/         usuários e permissões
```
