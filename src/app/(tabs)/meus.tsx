import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { OpcoesConta } from '@/account/components/OpcoesConta';
import { useExcluirConta } from '@/account/hooks/use-excluir-conta';
import { ErrorState, EmptyState, LoadingState } from '@/components/bible/bible-states';
import { Flashcard } from '@/components/bible/flashcard';
import { VerseCard } from '@/components/bible/verse-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/auth';
import type { SavedStatus } from '@/types/saved-verse';

type Filter = 'all' | SavedStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'decorando', label: 'Decorando' },
  { key: 'dominado', label: 'Dominados' },
];

/** Toca no versículo e ele abre direto no flashcard, sem trocar de tela. */
export default function MeusScreen() {
  const { items, loading, error, reload, removeVerse, updateStatus } = useSavedVerses();
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [contaAberta, setContaAberta] = useState(false);
  const { estado: estadoExclusao, mensagem, excluir, limpar } = useExcluirConta();

  // `user.email` é string vazia para conta sem e-mail, e `[0]` em string vazia é
  // `undefined`. O fallback evita o TypeError que derrubava a tela inteira.
  const avatarInitial = (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  const emAndamento = estadoExclusao === 'excluindo';

  const fecharConta = () => {
    setContaAberta(false);
    limpar();
  };

  const confirmarExclusao = () => excluir();

  const handleSignOut = () => {
    fecharConta();
    void signOut();
  };

  const visible = filter === 'all' ? items : items.filter((v) => v.status === filter);

  return (
    <ThemedView edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerTop}>
            <ThemedView>
              <ThemedText type="smallBold" themeColor="primary" style={styles.eyebrow}>
                SEU CAMINHO
              </ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                Versículos decorados
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {items.length} {items.length === 1 ? 'versículo guardado' : 'versículos guardados'}
              </ThemedText>
            </ThemedView>
            {user && (
              <Pressable
                onPress={() => setContaAberta(true)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Abrir opções da conta"
                style={styles.profileButton}>
                <ThemedView style={styles.avatar}>
                  {user.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText type="smallBold" themeColor="primary" style={styles.avatarInitial}>
                      {avatarInitial}
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            )}
          </ThemedView>
          <ThemedView style={styles.filters}>
            {FILTERS.map((f) => {
              const selected = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    { borderColor: theme.primary },
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}>
                    <ThemedText type="small" themeColor={selected ? 'backgroundElement' : 'textSecondary'}>
                    {f.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </ThemedView>

        {loading ? (
          <LoadingState message="Carregando salvos..." />
        ) : error ? (
          // Falha de leitura é o motivo de a lista vir vazia, então ela é
          // mostrada no lugar da lista e não ao lado dela.
          <View style={styles.list}>
            <ErrorState message={error} onRetry={reload} />
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.ref}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState message="Nenhum versículo decorado ainda. Salve um na Home." />
            }
            renderItem={({ item }) => {
              const open = openRef === item.ref;
              return (
                <ThemedView style={styles.item}>
                  <VerseCard
                    reference={item.reference}
                    text={item.text}
                    onPress={() => setOpenRef(open ? null : item.ref)}
                  />
                  {open ? (
                    <Flashcard reference={item.reference} text={item.text}>
                      <ThemedView style={styles.itemActions}>
                        <Pressable
                          hitSlop={8}
                          onPress={() =>
                            updateStatus(item.ref, item.status === 'dominado' ? 'decorando' : 'dominado')
                          }>
                          <ThemedText type="linkPrimary">
                            {item.status === 'dominado' ? '✓ Dominado' : 'Marcar dominado'}
                          </ThemedText>
                        </Pressable>
                        <Pressable hitSlop={8} onPress={() => removeVerse(item.ref)}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Remover
                          </ThemedText>
                        </Pressable>
                      </ThemedView>
                    </Flashcard>
                  ) : null}
                </ThemedView>
              );
            }}
          />
        )}
      </View>

      <OpcoesConta
        visible={contaAberta}
        email={user?.email ?? ''}
        busy={emAndamento}
        mensagem={mensagem}
        onClose={fecharConta}
        onSignOut={handleSignOut}
        onDelete={confirmarExclusao}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: Spacing.two,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  eyebrow: {
    letterSpacing: 1,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#E46F4D',
  },
  chipSelected: {
    backgroundColor: '#E46F4D',
  },
  profileButton: {
    padding: Spacing.one,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E46F4D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 14,
  },
  list: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  item: {
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
});
