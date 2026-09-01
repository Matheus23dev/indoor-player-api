# Referência da API

A especificação executável e atualizada automaticamente está disponível em:

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/openapi.json`
- OpenAPI YAML: `GET /docs/openapi.yaml`

O caminho e a disponibilidade podem ser alterados pelas variáveis `SWAGGER_PATH` e `SWAGGER_ENABLED`.

## Convenções

- URL local padrão: `http://localhost:3000`.
- Não há prefixo global nem versionamento na URL.
- Requisições JSON usam `Content-Type: application/json`.
- Campos não previstos nos DTOs são rejeitados.
- Datas são ISO 8601; horários de agendamento usam `HH:mm`.
- Identificadores principais são UUID v4, exceto o código curto do Player.
- Erros seguem o formato padrão do NestJS, normalmente com `statusCode`, `message` e `error`.

## Tipos de autenticação

| Nome        | Cabeçalho                             | Origem                                |
| ----------- | ------------------------------------- | ------------------------------------- |
| Pública     | nenhum                                | cadastro, login e ativação            |
| Usuário     | `Authorization: Bearer <jwt>`         | `POST /auth/login`                    |
| Dispositivo | `Authorization: Bearer <deviceToken>` | `POST /devices/activate` após vínculo |

## Saúde e cadastro

| Método | Rota                  | Autenticação | Descrição                       |
| ------ | --------------------- | ------------ | ------------------------------- |
| GET    | `/`                   | Pública      | Saúde e versão do serviço       |
| GET    | `/health`             | Pública      | Saúde e versão do serviço       |
| GET    | `/health/ready`       | Pública      | Prontidão e conexão com o banco |
| POST   | `/auth/register`      | Pública      | Cria empresa e primeiro `OWNER` |
| POST   | `/auth/login`         | Pública      | Autentica usuário e retorna JWT |
| POST   | `/companies/register` | Pública      | Cria empresa e proprietário     |

Payload de login:

```json
{
  "email": "usuario@empresa.com",
  "password": "senha"
}
```

## Usuários

Todas as rotas usam JWT.

| Método | Rota         | Perfis       | Descrição                                    |
| ------ | ------------ | ------------ | -------------------------------------------- |
| GET    | `/users/me`  | Todos        | Dados do usuário autenticado                 |
| GET    | `/users`     | OWNER, ADMIN | Lista usuários da empresa                    |
| POST   | `/users`     | OWNER, ADMIN | Cria usuário na empresa                      |
| GET    | `/users/:id` | OWNER, ADMIN | Consulta usuário                             |
| PATCH  | `/users/:id` | OWNER, ADMIN | Atualiza usuário                             |
| DELETE | `/users/:id` | OWNER, ADMIN | Exclui usuário conforme regras de hierarquia |

Perfis válidos: `OWNER`, `ADMIN` e `OPERATOR`.

## Dispositivos

| Método | Rota                        | Autenticação      | Descrição                                      |
| ------ | --------------------------- | ----------------- | ---------------------------------------------- |
| POST   | `/devices/register`         | Pública           | Gera dispositivo, código e segredo de ativação |
| POST   | `/devices/activate`         | Pública + segredo | Consulta vínculo e emite token do dispositivo  |
| GET    | `/devices/code/:code`       | Pública           | Consulta estado básico pelo código             |
| GET    | `/devices/current-playlist` | Dispositivo       | Playlist ativa no instante atual               |
| GET    | `/devices/programming`      | Dispositivo       | Janela versionada de programação               |
| POST   | `/devices/heartbeat`        | Dispositivo       | Atualiza presença e reprodução                 |
| POST   | `/devices/pair`             | Usuário           | Vincula código à empresa                       |
| GET    | `/devices`                  | Usuário           | Lista players e estado operacional             |
| GET    | `/devices/:id/preview`      | Usuário           | Estado e conteúdo atual para a prévia          |
| GET    | `/devices/:id/logs`         | OWNER, ADMIN      | Até 500 logs, mais recentes primeiro           |
| POST   | `/devices/:id/unlink`       | Usuário           | Desvincula, revoga token e remove agendamentos |
| DELETE | `/devices/:id`              | Usuário           | Exclui o dispositivo                           |

Parâmetros de programação:

| Query   | Padrão | Limite               | Descrição                |
| ------- | ------ | -------------------- | ------------------------ |
| `hours` | 24     | normalizado pela API | tamanho da janela futura |
| `limit` | 20     | normalizado pela API | máximo de ocorrências    |

Payload de vínculo:

```json
{
  "code": "ABC234",
  "name": "Recepção"
}
```

Payload de heartbeat:

```json
{
  "playlistId": "uuid-ou-null",
  "playlistItemId": "uuid-ou-null",
  "mediaId": "uuid-ou-null",
  "currentTime": 12,
  "duration": 30,
  "muted": false,
  "startedAt": "2026-08-19T14:00:00.000Z"
}
```

Playlist, item e mídia devem ser enviados juntos ou todos como `null`.

## Mídias e pastas

Todas as rotas usam JWT.

| Método | Rota             | Descrição                                               |
| ------ | ---------------- | ------------------------------------------------------- |
| GET    | `/medias`        | Lista mídias da empresa                                 |
| POST   | `/medias/upload` | Upload `multipart/form-data` de imagem/vídeo até 500 MB |
| DELETE | `/medias/:id`    | Remove mídia e arquivo conforme vínculos                |
| GET    | `/folders`       | Lista pastas                                            |
| POST   | `/folders`       | Cria pasta                                              |
| PATCH  | `/folders/:id`   | Renomeia pasta                                          |
| DELETE | `/folders/:id`   | Remove pasta conforme regras do acervo                  |

No upload, o campo binário é `file`; `folderId` é opcional.

## Playlists

Todas as rotas usam JWT.

| Método | Rota                     | Descrição                                  |
| ------ | ------------------------ | ------------------------------------------ |
| GET    | `/playlists`             | Lista playlists                            |
| POST   | `/playlists`             | Cria playlist                              |
| GET    | `/playlists/:id`         | Detalhes, itens e barras                   |
| PATCH  | `/playlists/:id`         | Altera nome/orientação                     |
| DELETE | `/playlists/:id`         | Exclui playlist conforme vínculos          |
| POST   | `/playlists/:id/items`   | Adiciona mídia                             |
| PATCH  | `/playlists/items/:id`   | Altera duração de imagem ou áudio de vídeo |
| DELETE | `/playlists/items/:id`   | Remove item                                |
| PATCH  | `/playlists/:id/reorder` | Atualiza ordem dos itens                   |

Exemplo de criação:

```json
{
  "name": "Conteúdo institucional",
  "orientation": "LANDSCAPE"
}
```

Exemplo de item de imagem:

```json
{
  "mediaId": "uuid-da-midia",
  "duration": 8
}
```

Para vídeos, a duração é obtida do arquivo. O campo `duration` é recusado. `muted` só é alterável em vídeo e permanece `true` quando `hasAudio` é `false`.

## Barras fixas

Todas as rotas usam JWT.

| Método | Rota                                      | Descrição                                    |
| ------ | ----------------------------------------- | -------------------------------------------- |
| GET    | `/overlay-bars`                           | Lista barras reutilizáveis                   |
| POST   | `/overlay-bars`                           | Cria barra                                   |
| PATCH  | `/overlay-bars/:id`                       | Atualiza barra e notifica playlists afetadas |
| DELETE | `/overlay-bars/:id`                       | Exclui barra                                 |
| POST   | `/overlay-bars/:id/playlists/:playlistId` | Vincula barra à playlist                     |
| DELETE | `/overlay-bars/:id/playlists/:playlistId` | Desvincula barra                             |

Posições: `TOP`, `BOTTOM`, `LEFT`, `RIGHT`. Ajustes de imagem: `CONTAIN`, `COVER`, `FILL`. Blocos: `TEXT`, `CLOCK`, `DATE`, `WEATHER`, `IMAGE`, `SPACER`. Uma barra aceita no máximo 20 blocos.

## Agendamentos

Todas as rotas usam JWT.

| Método | Rota             | Descrição                            |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/schedules`     | Lista agendamentos da empresa        |
| GET    | `/schedules/:id` | Consulta agendamento                 |
| POST   | `/schedules`     | Cria e notifica o Player             |
| PATCH  | `/schedules/:id` | Atualiza e notifica players afetados |
| DELETE | `/schedules/:id` | Exclui e notifica o Player           |

Exemplo:

```json
{
  "name": "Horário comercial",
  "deviceId": "uuid-do-player",
  "playlistId": "uuid-da-playlist",
  "startDate": "2026-08-01",
  "endDate": "2026-12-31",
  "startTime": "08:00",
  "endTime": "18:00",
  "daysOfWeek": "1,2,3,4,5",
  "priority": 1,
  "active": true
}
```

## Auditoria

`GET /audit-logs` exige perfil `OWNER` ou `ADMIN`.

| Query      | Tipo          | Padrão | Descrição                                   |
| ---------- | ------------- | ------ | ------------------------------------------- |
| `page`     | inteiro ≥ 1   | 1      | página                                      |
| `limit`    | 1 a 100       | 25     | itens por página                            |
| `source`   | enum          | `ALL`  | `ALL`, `ADMINISTRATION`, `PLAYER`, `SYSTEM` |
| `deviceId` | UUID          | —      | player específico                           |
| `search`   | texto até 120 | —      | nome, playlist ou mensagem                  |
| `from`     | ISO 8601      | —      | início do período                           |
| `to`       | ISO 8601      | —      | fim do período                              |

Resposta:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0
  },
  "filters": {
    "devices": []
  }
}
```

## Clima e arquivos

| Método | Rota                                  | Autenticação | Descrição                             |
| ------ | ------------------------------------- | ------------ | ------------------------------------- |
| GET    | `/weather/current?location=Fortaleza` | Dispositivo  | Clima atual com cache de 15 min       |
| GET    | `/files/indoor-player-api/:file`      | Pública      | Entrega mídia com range, ETag e cache |

## Socket.IO

- Namespace: `/devices`.
- Transporte: `websocket`.
- Autenticação: `auth.token` no handshake ou bearer no cabeçalho.

Eventos enviados pela API:

| Evento                | Finalidade                          |
| --------------------- | ----------------------------------- |
| `programming:changed` | Solicita nova sincronização REST    |
| `device:unlinked`     | Encerra sessão e retorna à ativação |

Evento recebido:

| Evento       | Comportamento atual                                 |
| ------------ | --------------------------------------------------- |
| `player:log` | Confirmado para compatibilidade, mas não persistido |
