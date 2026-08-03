import { AppService } from './app.service';

describe('AppService', () => {
  it('returns operational health information', () => {
    const health = new AppService().getHealth();

    expect(health).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'indoor-player-api',
        version: expect.any(String),
        timestamp: expect.any(String),
        uptimeSeconds: expect.any(Number),
      }),
    );
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });
});
