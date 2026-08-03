export const ADMIN_LOG_PREFIX = '@ADMIN_EVENT:';
export const PLAYER_LOG_PREFIX = '@PLAYER_EVENT:';
export const SYSTEM_LOG_PREFIX = '@SYSTEM_EVENT:';

export interface DeviceAuditActor {
  id: string;
  name: string;
}

export interface DeviceAuditEvent {
  actor: DeviceAuditActor;
  action: string;
  message: string;
  entityType: 'DEVICE' | 'SCHEDULE' | 'PLAYLIST' | 'MEDIA';
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function serializeDeviceAuditEvent(event: DeviceAuditEvent) {
  const actorName = event.actor.name.trim() || 'Usuário';

  return `${ADMIN_LOG_PREFIX}${JSON.stringify({
    version: 1,
    source: 'ADMINISTRATION',
    action: event.action,
    message: `${actorName} ${event.message}`,
    actor: {
      id: event.actor.id,
      name: actorName,
    },
    entity: {
      type: event.entityType,
      id: event.entityId,
    },
    metadata: event.metadata,
    occurredAt: new Date().toISOString(),
  })}`;
}

export interface DeviceSystemEvent {
  event: 'PLAYER_CONNECTION_LOST' | 'PLAYER_CONNECTION_RESTORED';
  level: 'SUCCESS' | 'WARNING';
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  occurredAt?: Date;
}

export function serializeDeviceSystemEvent(event: DeviceSystemEvent) {
  return `${SYSTEM_LOG_PREFIX}${JSON.stringify({
    version: 1,
    source: 'SYSTEM',
    event: event.event,
    category: 'CONNECTION',
    level: event.level,
    message: event.message,
    metadata: event.metadata,
    occurredAt: (event.occurredAt ?? new Date()).toISOString(),
  })}`;
}
