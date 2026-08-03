import {
  ADMIN_LOG_PREFIX,
  serializeDeviceAuditEvent,
  serializeDeviceSystemEvent,
  SYSTEM_LOG_PREFIX,
} from './device-audit';

describe('serializeDeviceAuditEvent', () => {
  it('stores the administrator identity and affected entity', () => {
    const message = serializeDeviceAuditEvent({
      actor: {
        id: 'admin-1',
        name: 'Maria',
      },
      action: 'SCHEDULE_DEACTIVATED',
      message: 'desativou o agendamento "Almoço".',
      entityType: 'SCHEDULE',
      entityId: 'schedule-1',
      metadata: {
        scheduleName: 'Almoço',
        active: false,
      },
    });

    expect(message.startsWith(ADMIN_LOG_PREFIX)).toBe(true);

    const payload = JSON.parse(message.slice(ADMIN_LOG_PREFIX.length));

    expect(payload).toMatchObject({
      version: 1,
      source: 'ADMINISTRATION',
      action: 'SCHEDULE_DEACTIVATED',
      message: 'Maria desativou o agendamento "Almoço".',
      actor: {
        id: 'admin-1',
        name: 'Maria',
      },
      entity: {
        type: 'SCHEDULE',
        id: 'schedule-1',
      },
      metadata: {
        scheduleName: 'Almoço',
        active: false,
      },
    });
    expect(Number.isFinite(new Date(payload.occurredAt).getTime())).toBe(true);
  });

  it('stores connection events separately from Player telemetry', () => {
    const message = serializeDeviceSystemEvent({
      event: 'PLAYER_CONNECTION_RESTORED',
      level: 'SUCCESS',
      message: 'A conexão do Player foi restabelecida após 30s.',
      metadata: {
        offlineSeconds: 30,
      },
      occurredAt: new Date('2026-07-30T15:00:00.000Z'),
    });

    expect(message.startsWith(SYSTEM_LOG_PREFIX)).toBe(true);
    expect(JSON.parse(message.slice(SYSTEM_LOG_PREFIX.length))).toMatchObject({
      source: 'SYSTEM',
      event: 'PLAYER_CONNECTION_RESTORED',
      category: 'CONNECTION',
      level: 'SUCCESS',
      metadata: {
        offlineSeconds: 30,
      },
      occurredAt: '2026-07-30T15:00:00.000Z',
    });
  });
});
