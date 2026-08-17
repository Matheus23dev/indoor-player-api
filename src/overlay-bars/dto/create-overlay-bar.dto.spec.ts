import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { OverlayBarContentItemDto } from './create-overlay-bar.dto';

const imageItem = {
  id: 'content-image-1',
  type: 'IMAGE',
  textColor: '#FFFFFF',
  fontSize: 28,
  fontWeight: 'BOLD',
  padding: 0,
  paddingHorizontal: 0,
  paddingVertical: 0,
  borderRadius: 0,
  spacerSize: 24,
  mediaId: 'c47411f1-9b4b-458b-8ffa-b844feaa89de',
  imageSizePercent: 72,
  fit: 'CONTAIN',
  offsetX: -24,
  offsetY: 36,
};

describe('OverlayBarContentItemDto', () => {
  it('aceita imagem como conteúdo com ajuste e deslocamento individuais', async () => {
    const dto = plainToInstance(OverlayBarContentItemDto, imageItem);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejeita deslocamento fora da área editável', async () => {
    const dto = plainToInstance(OverlayBarContentItemDto, {
      ...imageItem,
      offsetY: 121,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'offsetY')).toBe(true);
  });

  it('aceita ampliar a imagem até seiscentos por cento', async () => {
    const dto = plainToInstance(OverlayBarContentItemDto, {
      ...imageItem,
      imageSizePercent: 600,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejeita imagem maior que o limite editável', async () => {
    const dto = plainToInstance(OverlayBarContentItemDto, {
      ...imageItem,
      imageSizePercent: 601,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'imageSizePercent')).toBe(
      true,
    );
  });
});
