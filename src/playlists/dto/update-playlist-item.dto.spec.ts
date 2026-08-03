import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdatePlaylistItemDto } from './update-playlist-item.dto';

describe('UpdatePlaylistItemDto', () => {
  it.each([true, false])('accepts muted=%p', async (muted) => {
    const dto = plainToInstance(UpdatePlaylistItemDto, { muted });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['true', 1, null])(
    'rejects a non-boolean muted value: %p',
    async (muted) => {
      const dto = plainToInstance(UpdatePlaylistItemDto, { muted });
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'muted')).toBe(true);
    },
  );

  it.each([0, null, 1.5])(
    'rejects an invalid duration: %p',
    async (duration) => {
      const dto = plainToInstance(UpdatePlaylistItemDto, { duration });
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'duration')).toBe(true);
    },
  );
});
