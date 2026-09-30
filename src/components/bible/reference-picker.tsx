import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ErrorState, LoadingState } from '@/components/bible/bible-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getBibleErrorMessage } from '@/hooks/use-bible-error';
import { useBooks } from '@/hooks/use-books';
import { useTheme } from '@/hooks/use-theme';

interface ReferencePickerProps {
  onSearch: (book: string, chapter: number, verse: number) => void;
}

/** Escolhe livro (chips) + capítulo/versículo (numéricos) e dispara a busca. */
export function ReferencePicker({ onSearch }: ReferencePickerProps) {
  const theme = useTheme();
  const { books, isPending, isError, error, refetch } = useBooks();
  const [book, setBook] = useState('joao');
  const [chapter, setChapter] = useState('3');
  const [verse, setVerse] = useState('16');

  if (isPending) {
    return <LoadingState message="Carregando livros..." />;
  }

  if (isError) {
    return <ErrorState message={getBibleErrorMessage(error)} onRetry={() => refetch()} />;
  }

  const chapterNum = Number(chapter);
  const verseNum = Number(verse);
  const canSearch = book.length > 0 && Number.isInteger(chapterNum) && chapterNum > 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">REFERÊNCIA</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {books?.map((b) => {
          const selected = b.slug === book;
          return (
            <Pressable
              key={b.id}
              onPress={() => setBook(b.slug)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'textSecondary'}>
                {b.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ThemedView style={styles.row}>
        <ThemedView style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">CAPÍTULO</ThemedText>
          <TextInput
            value={chapter}
            onChangeText={setChapter}
            keyboardType="number-pad"
            placeholder="3"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          />
        </ThemedView>
        <ThemedView style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">VERSÍCULO</ThemedText>
          <TextInput
            value={verse}
            onChangeText={setVerse}
            keyboardType="number-pad"
            placeholder="16"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          />
        </ThemedView>
      </ThemedView>

      <Pressable
        disabled={!canSearch}
        onPress={() => onSearch(book, chapterNum, verseNum > 0 ? verseNum : 1)}
        style={({ pressed }) => [styles.search, !canSearch && styles.disabled, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.searchText}>
          Buscar versículo
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  chips: {
    flexGrow: 0,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    marginRight: Spacing.two,
    borderWidth: 1,
    borderColor: '#E5DDD0',
    backgroundColor: '#F8ECE4',
  },
  chipSelected: {
    backgroundColor: '#FFDBCB',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  field: {
    flex: 1,
    gap: Spacing.one,
    backgroundColor: 'transparent',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  search: {
    backgroundColor: '#6F3312',
    borderRadius: 999,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
    minHeight: 48,
    justifyContent: 'center',
  },
  searchText: {
    color: '#ffffff',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
