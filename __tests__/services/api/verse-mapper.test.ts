import { mapVerseResponse } from '@/services/api/verse-mapper';
import type { VerseApiResponse } from '@/types/bible';

/** Payload cru da API midvash, no formato exato que o mapper consome. */
function respostaDaApi(dados: Partial<VerseApiResponse['data']>): VerseApiResponse {
  return {
    data: {
      version: 'nvi',
      book: 'gn',
      bookName: 'Gênesis',
      chapter: 1,
      verse: 1,
      text: 'No princípio, Deus criou os céus e a terra.',
      ...dados,
    },
    meta: { reference: 'Gênesis 1:1', total: 1 },
  };
}

describe('mapVerseResponse', () => {
  it('preenche verseEnd com verse quando ausente', () => {
    const verse = mapVerseResponse(respostaDaApi({ book: 'gn', chapter: 1, verse: 1 }));

    expect(verse.verseStart).toBe(1);
    expect(verse.verseEnd).toBe(1);
    expect(verse.ref).toBe('gn/1/1');
  });

  it('preserva verseEnd quando presente', () => {
    const resposta = respostaDaApi({ book: 'sl', chapter: 23, verse: 1, verseEnd: 2 });
    resposta.meta.reference = 'Salmos 23:1-2';

    const verse = mapVerseResponse(resposta);

    expect(verse.verseStart).toBe(1);
    expect(verse.verseEnd).toBe(2);
    expect(verse.reference).toBe('Salmos 23:1-2');
  });

  it('aceita texto sem a chave pt-br', () => {
    const resposta = respostaDaApi({ book: 'jo', bookName: 'João', chapter: 3, verse: 16 });
    resposta.meta.reference = 'João 3:16';
    resposta.data.text = 'Porque Deus amou o mundo de tal maneira...';

    const verse = mapVerseResponse(resposta);

    expect(verse.text).toBe('Porque Deus amou o mundo de tal maneira...');
    expect(verse.bookSlug).toBe('jo');
    expect(verse.bookName).toBe('João');
  });
});
