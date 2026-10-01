import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/bible/bible-states';
import { Flashcard } from '@/components/bible/flashcard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getBibleErrorMessage } from '@/hooks/use-bible-error';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import { useSearchVerse } from '@/hooks/use-search-verse';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const { isSaved, toggleVerse } = useSavedVerses();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [buscaCurta, setBuscaCurta] = useState(false);

  const search = useSearchVerse(submitted ?? '');
  const activeVerse = search.data ?? null;
  const isLoading = submitted !== null && search.isPending;
  const error = search.isError ? search.error : null;

  const submitSearch = (value = query) => {
    const normalized = value.trim();
    if (normalized.length < 3) {
      // Antes, a busca morria em silêncio e a tela continuava mostrando o
      // estado anterior, como se o botão não tivesse funcionado.
      setQuery(normalized);
      setSubmitted(null);
      setBuscaCurta(true);
      return;
    }
    setBuscaCurta(false);
    setQuery(normalized);
    setSubmitted(normalized);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmitted(null);
    setBuscaCurta(false);
  };

  return (
    <ThemedView edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.brand}>
              <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
              <ThemedText style={styles.brandName}>Palavra Viva</ThemedText>
            </View>
            <ThemedView type="backgroundSelected" style={styles.daysPill}>
              <ThemedText themeColor="primary" style={styles.flame}>♨</ThemedText>
              <ThemedText type="smallBold">5 dias</ThemedText>
            </ThemedView>
          </View>

          <View style={styles.intro}>
            <ThemedText type="subtitle" style={styles.title}>Encontre seu Versículo de Hoje</ThemedText>
            <ThemedText type="default" themeColor="text">
              Digite uma passagem bíblica ou explore pelos livros
            </ThemedText>
          </View>

          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
            <Pressable onPress={() => submitSearch()} hitSlop={8} accessibilityLabel="Buscar versículo">
              <ThemedText themeColor="primary" style={styles.searchIcon}>⌕</ThemedText>
            </Pressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => submitSearch()}
              placeholder="João 3:16"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.text }]}
            />
            {query ? (
              <Pressable onPress={clearSearch} hitSlop={8}>
                <ThemedText themeColor="textSecondary" style={styles.clearIcon}>×</ThemedText>
              </Pressable>
            ) : null}
          </View>

     

         {isLoading ? <LoadingState message="Buscando versículo..." /> : null} 
          {error ? <ErrorState message={getBibleErrorMessage(error)} onRetry={() => search.refetch()} /> : null}
          {buscaCurta ? (
            <ErrorState message="Digite ao menos 3 caracteres, por exemplo “João 3:16”." />
          ) : null}

          {activeVerse && !isLoading ? (
            <>
              <View style={styles.resultBar}>
                <Pressable onPress={clearSearch}>
                  <ThemedText type="small" themeColor="textSecondary">← Nova busca</ThemedText>
                </Pressable>
                <ThemedView type="backgroundSelected" style={styles.foundPill}>
                  <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                  <ThemedText type="smallBold" themeColor="success">VERSÍCULO ENCONTRADO</ThemedText>
                </ThemedView>
              </View>

              <Flashcard
                reference={activeVerse.reference}
                text={activeVerse.text}
                label="Versículo encontrado · NVI">
                <Pressable
                  onPress={() => toggleVerse(activeVerse)}
                  style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.saveButtonText}>
                    {isSaved(activeVerse.ref) ? '✓ Adicionado aos Meus Versículos' : '⚑  Adicionar aos Meus Versículos'}
                  </ThemedText>
                </Pressable>
              </Flashcard>
            </>
          ) : null}

          {!activeVerse && !isLoading && !error ? <EmptyState message="Digite uma referência e toque na lupa para buscar." /> : null}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1,
     maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  content: { gap: Spacing.three, padding: Spacing.three, paddingBottom: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logo: { width: 36, height: 36, borderRadius: Spacing.two },
  brandName: { fontFamily: 'serif', fontSize: 24 },
  daysPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 999 },
  flame: { fontSize: 15 },
  intro: { gap: Spacing.one, marginTop: Spacing.two },
  title: { fontSize: 25, lineHeight: 32 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 58, borderRadius: Spacing.three, shadowColor: '#362F2A', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  searchIcon: { fontSize: 27 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.two },
  clearIcon: { fontSize: 25 },
  resultBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foundPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  verseCard: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 1, borderColor: '#E5DDD0', shadowColor: '#362F2A', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  versionPill: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Spacing.two },
  verseText: { textAlign: 'center', fontFamily: 'serif', fontStyle: 'italic', fontSize: 20, lineHeight: 32, color: '#53433C' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, justifyContent: 'center' },
  tag: { backgroundColor: '#F8ECE4', paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: 999, overflow: 'hidden' },
  saveButton: { minHeight: 52, borderRadius: 999, backgroundColor: '#6F3312', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three },
  saveButtonText: { color: '#FFFFFF' },
  pressed: { opacity: 0.8 },
});
