import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HeartbeatDto } from './heartbeat.dto';

describe('HeartbeatDto', () => {
  it.each([true, false, null])('accepts muted=%p', async (muted) => {
    const dto = plainToInstance(HeartbeatDto, { muted });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['true', 1, 0])('rejects non-boolean muted=%p', async (muted) => {
    const dto = plainToInstance(HeartbeatDto, { muted });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'muted')).toBe(true);
  });
});
