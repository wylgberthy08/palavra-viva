import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/bible/bible-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { getBibleErrorMessage } from '@/hooks/use-bible-error';
import { useBooks } from '@/hooks/use-books';
import { useChapter } from '@/hooks/use-chapter';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import { useTheme } from '@/hooks/use-theme';
import { useVerse } from '@/hooks/use-verse';
import { useVerseOfDay } from '@/hooks/use-verse-of-day';
import type { BibleBook } from '@/types/bible';

type Picker = 'book' | 'chapter' | 'verse';
const titles: Record<Picker, string> = {
  book: 'Selecionar livro', chapter: 'Selecionar capítulo', verse: 'Selecionar versículo',
};

export default function HomeScreen() {
  const theme = useTheme();
  const saved = useSavedVerses();
  const [picker, setPicker] = useState<Picker | null>(null);
  const [book, setBook] = useState<BibleBook>();
  const [chapter, setChapter] = useState<number>();
  const [verse, setVerse] = useState<number>();
  const [revealedRef, setRevealedRef] = useState<string | null>(null);
  const books = useBooks({ enabled: picker === 'book' });
  const chapterQuery = useChapter(book?.slug, chapter);
  const selectedVerse = useVerse(book?.slug, chapter, verse);
  const dailyVerse = useVerseOfDay();
  const current = verse !== undefined ? selectedVerse : dailyVerse;
  const activeVerse = current.data;
  const revealed = !!activeVerse && revealedRef === activeVerse.ref;
  const mastered = saved.items.filter((item) => item.status === 'dominado').length;
  const alreadySaved = !!activeVerse && saved.isSaved(activeVerse.ref);
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const options = picker === 'book'
    ? (books.books ?? []).map((item) => ({ label: item.name, value: item.slug }))
    : picker === 'chapter'
      ? Array.from({ length: book?.chapters ?? 0 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` }))
      : (chapterQuery.data?.verses ?? []).map((item) => ({ label: `${item.verse}`, value: `${item.verse}` }));

  function selectOption(value: string) {
    setRevealedRef(null);
    if (picker === 'book') {
      setBook(books.books?.find((item) => item.slug === value));
      setChapter(undefined);
      setVerse(undefined);
    } else if (picker === 'chapter') {
      setChapter(Number(value));
      setVerse(undefined);
    } else {
      setVerse(Number(value));
    }
    setPicker(null);
  }

  return (
    <ThemedView edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText accessibilityRole="header" style={styles.brand}>Palavra Viva</ThemedText>
          <View style={[styles.mission, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={[styles.missionText, { color: theme.primary }]}>• MISSÃO DIÁRIA</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.date} themeColor="textSecondary">{date}</ThemedText>
        <View style={styles.collection}>
          <View style={styles.between}>
            <ThemedText style={styles.label} themeColor="textSecondary">SUA COLEÇÃO</ThemedText>
            <ThemedText style={styles.caption} themeColor="textSecondary">
              {saved.loading || saved.error ? '—' : `${mastered}/${saved.items.length} dominados`}
            </ThemedText>
          </View>
          <View accessibilityRole="progressbar" accessibilityLabel="Progresso da coleção"
            accessibilityValue={{ min: 0, max: saved.items.length || 1, now: mastered }}
            style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.progress, { backgroundColor: theme.success, width: `${saved.items.length ? mastered / saved.items.length * 100 : 0}%` }]} />
          </View>
          <View style={styles.stats}>
            {[
              { count: saved.items.length - mastered, label: 'DECORANDO', color: theme.accent },
              { count: mastered, label: 'DOMINADOS', color: theme.success },
            ].map((stat) => (
              <View key={stat.label} style={[styles.stat, { borderColor: stat.color, backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={[styles.count, { color: stat.color }]}>{saved.loading || saved.error ? '—' : stat.count}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: stat.color }]}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.selection}>
          <ThemedText style={styles.label} themeColor="textSecondary">SELECIONAR VERSÍCULO</ThemedText>
          <View style={styles.selectors}>
            {([
              { key: 'book', label: book?.name ?? 'Livro', disabled: false },
              { key: 'chapter', label: chapter ? `${chapter}` : 'Cap.', disabled: !book },
              { key: 'verse', label: verse ? `${verse}` : 'Ver.', disabled: !chapter },
            ] as const).map((field) => (
              <Pressable key={field.key} accessibilityRole="button" accessibilityLabel={titles[field.key]}
                accessibilityState={{ disabled: field.disabled }} disabled={field.disabled}
                onPress={() => setPicker(field.key)}
                style={({ pressed }) => [styles.selector, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                <ThemedText numberOfLines={1} style={styles.selectorText}>{field.label}</ThemedText>
                <Feather name="chevron-down" size={14} color={theme.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.verseHeading}>
          <ThemedText style={styles.label} themeColor="textSecondary">{verse ? 'VERSÍCULO SELECIONADO' : 'VERSÍCULO DO DIA'}</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
          <ThemedText numberOfLines={1} style={styles.smallReference} themeColor="accent">{activeVerse?.reference}</ThemedText>
        </View>
        {current.isPending ? <LoadingState message="Carregando versículo..." /> : null}
        {current.isError ? <ErrorState message={getBibleErrorMessage(current.error)} onRetry={() => current.refetch()} /> : null}
        {activeVerse ? (
          <>
            <Pressable accessibilityRole="button"
              accessibilityLabel={revealed ? 'Ocultar versículo' : `Revelar versículo ${activeVerse.reference}`}
              onPress={() => setRevealedRef(revealed ? null : activeVerse.ref)}
              style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, shadowColor: theme.text }, pressed && styles.pressed]}>
              <ThemedText style={styles.cardLabel} themeColor="accent">{revealed ? activeVerse.reference : 'REFERÊNCIA'}</ThemedText>
              <ThemedText style={revealed ? styles.verseText : styles.reference}>{revealed ? activeVerse.text : activeVerse.reference}</ThemedText>
              <View style={styles.reveal}>
                <Feather name="rotate-ccw" size={14} color={theme.textSecondary} />
                <ThemedText style={styles.revealText} themeColor="textSecondary">{revealed ? 'TOQUE PARA OCULTAR' : 'TOQUE PARA REVELAR'}</ThemedText>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={saved.loading || alreadySaved}
              onPress={() => saved.saveVerse(activeVerse)}
              style={({ pressed }) => [styles.saveButton, { backgroundColor: theme.primary }, (pressed || saved.loading) && styles.pressed]}>
              <Feather name={alreadySaved ? 'check' : 'bookmark'} size={18} color={theme.backgroundElement} />
              <ThemedText style={[styles.saveText, { color: theme.backgroundElement }]}>{alreadySaved ? 'Salvo na coleção' : 'Salvar para decorar'}</ThemedText>
            </Pressable>
          </>
        ) : null}
        {saved.error ? <ErrorState message={saved.error} onRetry={() => saved.reload()} /> : null}
      </ScrollView>
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.background }]}>
          <ThemedView accessibilityViewIsModal style={[styles.modal, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.between}>
              <ThemedText style={styles.modalTitle}>{picker ? titles[picker] : ''}</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar seleção" hitSlop={12} onPress={() => setPicker(null)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            {(picker === 'book' && books.isPending) || (picker === 'verse' && chapterQuery.isPending) ? <LoadingState message="Carregando opções..." /> : null}
            {picker === 'book' && books.isError ? <ErrorState message={getBibleErrorMessage(books.error)} onRetry={() => books.refetch()} /> : null}
            {picker === 'verse' && chapterQuery.isError ? <ErrorState message={getBibleErrorMessage(chapterQuery.error)} onRetry={() => chapterQuery.refetch()} /> : null}
            <ScrollView>
              {options.map((option) => (
                <Pressable key={option.value} accessibilityRole="button" onPress={() => selectOption(option.value)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <ThemedText>{option.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: Spacing.four, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  brand: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  mission: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  missionText: { fontSize: 9, lineHeight: 14, letterSpacing: 1.1 },
  date: { fontSize: 12, lineHeight: 20, marginTop: 2, textTransform: 'capitalize' },
  collection: { marginTop: 20 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 10, lineHeight: 16, letterSpacing: 1.2 },
  caption: { fontSize: 10, lineHeight: 16 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progress: { height: '100%', borderRadius: 4 },
  stats: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  stat: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, alignItems: 'center', paddingVertical: 12, gap: 2 },
  count: { fontFamily: Fonts.serif, fontSize: 22, lineHeight: 26 },
  statLabel: { fontSize: 9, lineHeight: 14, letterSpacing: 1.4 },
  selection: { marginTop: 20, gap: Spacing.two },
  selectors: { flexDirection: 'row', gap: Spacing.two },
  selector: { flex: 1, minHeight: 44, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectorText: { flex: 1, fontSize: 12, lineHeight: 20 },
  verseHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 20, marginBottom: 12 },
  divider: { width: 12, height: 1 },
  smallReference: { flex: 1, fontFamily: Fonts.serif, fontStyle: 'italic', fontSize: 11, lineHeight: 16 },
  card: { minHeight: 280, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 24, padding: Spacing.four, gap: Spacing.three, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardLabel: { fontFamily: Fonts.serif, fontStyle: 'italic', fontSize: 11, lineHeight: 18, letterSpacing: 1 },
  reference: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 36, fontWeight: '700', textAlign: 'center' },
  verseText: { fontFamily: Fonts.serif, fontSize: 20, lineHeight: 32, textAlign: 'center' },
  reveal: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  revealText: { fontSize: 10, lineHeight: 18, letterSpacing: 0.8 },
  saveButton: { minHeight: 48, borderRadius: 999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three, paddingHorizontal: Spacing.three },
  saveText: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  modal: { maxHeight: '80%', width: '100%', maxWidth: 560, alignSelf: 'center', borderRadius: 24, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  option: { paddingVertical: 14, paddingHorizontal: Spacing.two, minHeight: 48 },
});
