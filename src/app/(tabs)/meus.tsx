import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { OpcoesConta } from '@/account/components/OpcoesConta';
import { useExcluirConta } from '@/account/hooks/use-excluir-conta';
import { useAuth } from '@/auth';
import { EmptyState, ErrorState, LoadingState } from '@/components/bible/bible-states';
import { VersePractice } from '@/components/bible/verse-practice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import { useTheme } from '@/hooks/use-theme';
import type { SavedStatus } from '@/types/saved-verse';

type Filter = 'all' | SavedStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'decorando', label: 'Decorando' },
  { key: 'dominado', label: 'Dominados' },
];

export default function MeusScreen() {
  const { items, loading, error, reload, removeVerse, updateStatus } = useSavedVerses();
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [contaAberta, setContaAberta] = useState(false);
  const { estado: estadoExclusao, mensagem, excluir, limpar } = useExcluirConta();
  const avatarInitial = (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();
  const visible = filter === 'all' ? items : items.filter((item) => item.status === filter);
  const practicing = items.find((item) => item.ref === openRef);

  function fecharConta() {
    setContaAberta(false);
    limpar();
  }

  function handleSignOut() {
    fecharConta();
    void signOut();
  }

  return (
    <ThemedView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.collectionCanvas }]}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.heading}>
              <ThemedText accessibilityRole="header" style={styles.title}>Decorados</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="collectionMuted">
                {loading ? 'Carregando coleção...' : error ? 'Coleção indisponível' : `${items.length} ${items.length === 1 ? 'versículo salvo' : 'versículos salvos'}`}
              </ThemedText>
            </View>
            {user ? (
              <Pressable onPress={() => setContaAberta(true)} accessibilityRole="button" accessibilityLabel="Abrir opções da conta"
                style={[styles.avatar, { backgroundColor: theme.collectionChip }]}>
                {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} /> : (
                  <ThemedText type="smallBold" themeColor="collectionPrimary">{avatarInitial}</ThemedText>
                )}
              </Pressable>
            ) : null}
          </View>
          <View style={styles.filters}>
            {FILTERS.map((entry) => {
              const selected = filter === entry.key;
              return (
                <Pressable key={entry.key} accessibilityRole="button" accessibilityLabel={entry.label} accessibilityState={{ selected }}
                  onPress={() => setFilter(entry.key)}
                  style={({ pressed }) => [styles.chip, { backgroundColor: selected ? theme.collectionPrimary : theme.collectionChip, borderColor: selected ? theme.collectionPrimary : theme.collectionBorder }, pressed && styles.pressed]}>
                  <ThemedText style={styles.chipText} themeColor={selected ? 'collectionOnPrimary' : 'collectionMuted'}>{entry.label.toUpperCase()}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
        {loading ? <LoadingState message="Carregando salvos..." /> : error ? (
          <View style={styles.list}><ErrorState message={error} onRetry={reload} /></View>
        ) : (
          <FlatList data={visible} keyExtractor={(item) => item.ref} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState message={items.length === 0 ? 'Nenhum versículo decorado ainda. Salve um na Home.' : 'Nenhum versículo neste filtro.'} />}
            renderItem={({ item }) => {
              const mastered = item.status === 'dominado';
              const statusColor = mastered ? theme.success : theme.accent;
              const nextColor = mastered ? theme.accent : theme.success;
              return (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.collectionBorder, shadowColor: theme.text }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.referenceGroup}>
                      <ThemedText style={styles.reference}>{item.reference}</ThemedText>
                      <ThemedText style={styles.citation} themeColor="collectionMuted">{item.reference}</ThemedText>
                    </View>
                    <View style={[styles.badge, { backgroundColor: mastered ? theme.collectionSuccess : theme.collectionAccent }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <ThemedText style={[styles.badgeText, { color: statusColor }]}>{mastered ? 'DOMINADO' : 'DECORANDO'}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.verseText}>{item.text}</ThemedText>
                  <View style={[styles.actions, { borderTopColor: theme.collectionBorder }]}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Praticar ${item.reference}`} onPress={() => setOpenRef(item.ref)}
                      style={({ pressed }) => [styles.practiceButton, { backgroundColor: theme.collectionPrimary }, pressed && styles.pressed]}>
                      <ThemedText style={styles.actionText} themeColor="collectionOnPrimary">Praticar</ThemedText>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Marcar ${item.reference} como ${mastered ? 'decorando' : 'dominado'}`}
                      onPress={() => updateStatus(item.ref, mastered ? 'decorando' : 'dominado')}
                      style={({ pressed }) => [styles.statusButton, { backgroundColor: mastered ? theme.collectionAccent : theme.collectionSuccess }, pressed && styles.pressed]}>
                      <Feather name={mastered ? 'rotate-ccw' : 'star'} size={17} color={nextColor} />
                      <ThemedText style={[styles.actionText, { color: nextColor }]}>{mastered ? 'Decorando' : 'Dominado'}</ThemedText>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${item.reference}`} onPress={() => removeVerse(item.ref)}
                      style={({ pressed }) => [styles.removeButton, { backgroundColor: theme.collectionDanger }, pressed && styles.pressed]}>
                      <Feather name="trash-2" size={17} color={theme.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            }} />
        )}
      </View>
      {practicing ? <VersePractice key={practicing.ref} verse={practicing} error={error} onClose={() => setOpenRef(null)} onMaster={() => updateStatus(practicing.ref, 'dominado')} /> : null}
      <OpcoesConta visible={contaAberta} email={user?.email ?? ''} busy={estadoExclusao === 'excluindo'} mensagem={mensagem}
        onClose={fecharConta} onSignOut={handleSignOut} onDelete={() => excluir()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, maxWidth: 560, width: '100%' },
  header: { gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.three },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  heading: { flex: 1, gap: Spacing.one },
  title: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 40, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 20 },
  filters: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { minHeight: 36, borderRadius: 999, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 10, lineHeight: 16, letterSpacing: 0.8, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: 18, padding: Spacing.three, gap: Spacing.three, shadowOpacity: 0.035, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two },
  referenceGroup: { flexShrink: 1, gap: 2 },
  reference: { fontFamily: Fonts.serif, fontSize: 19, lineHeight: 26, fontWeight: '700' },
  citation: { fontFamily: Fonts.serif, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, lineHeight: 14, letterSpacing: 0.8, fontWeight: '700' },
  verseText: { fontFamily: Fonts.serif, fontSize: 16, lineHeight: 25 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  practiceButton: { flex: 1, minWidth: 88, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  statusButton: { flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: 999, paddingHorizontal: 10 },
  removeButton: { width: 36, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 11, lineHeight: 18, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
