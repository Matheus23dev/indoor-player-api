import { normalizeMediaFileName } from './media-file-name';

describe('normalizeMediaFileName', () => {
  it.each([
    ['ÃMEGA 3 - 1920 x 1080 3.mp4', 'ÔMEGA 3 - 1920 x 1080 3.mp4'],
    ['VÃ­deo institucional.mp4', 'Vídeo institucional.mp4'],
    ['ApresentaÃƒÂ§Ã£o.jpg', 'Apresentação.jpg'],
    ['campanha-2026.mp4', 'campanha-2026.mp4'],
    ['Ângela.jpg', 'Ângela.jpg'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeMediaFileName(input)).toBe(expected);
  });
});
