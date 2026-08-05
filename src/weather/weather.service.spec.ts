import { ConfigService } from '@nestjs/config';

import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  const config = {
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normaliza o clima atual e reaproveita o cache da região', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              name: 'São Paulo',
              admin1: 'São Paulo',
              latitude: -23.55,
              longitude: -46.63,
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 23.6,
            weather_code: 3,
          },
        }),
      } as Response);
    const service = new WeatherService(config);

    const first = await service.getCurrent(' São Paulo ');
    const cached = await service.getCurrent('são paulo');

    expect(first).toMatchObject({
      location: 'São Paulo, São Paulo',
      temperature: '24°C',
      condition: 'Nublado',
      attribution: 'Open-Meteo',
    });
    expect(cached).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
