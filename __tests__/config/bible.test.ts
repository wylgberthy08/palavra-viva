describe('base URL da API da Bíblia', () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_BIBLE_BASE_URL;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_BIBLE_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_BIBLE_BASE_URL = originalBaseUrl;
    }
    jest.resetModules();
  });

  it('remove o sufixo /v1 opcional sem deixar barras finais', () => {
    process.env.EXPO_PUBLIC_BIBLE_BASE_URL = 'https://api.midvash.com/v1/';
    jest.isolateModules(() => {
      const { BIBLE_BASE_URL } = jest.requireActual<typeof import('../../src/config/bible')>(
        '../../src/config/bible',
      );
      expect(BIBLE_BASE_URL).toBe('https://api.midvash.com');
    });
  });
});
