import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/bible/bible-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SavedVerse } from '@/types/saved-verse';

interface VersePracticeProps {
  verse: SavedVerse;
  error: string | null;
  onClose: () => void;
  onMaster: () => Promise<void>;
}

export function VersePractice({ verse, error, onClose, onMaster }: VersePracticeProps) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const mastered = verse.status === 'dominado';

  async function markMastered() {
    setBusy(true);
    try {
      await onMaster();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemedView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.collectionCanvas }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <ThemedText style={styles.eyebrow} themeColor="collectionMuted">PRATICANDO</ThemedText>
              <ThemedText style={styles.title}>{verse.reference}</ThemedText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar prática" onPress={onClose}
              style={[styles.close, { backgroundColor: theme.backgroundElement, borderColor: theme.collectionBorder }]}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.stage}>
            <Pressable accessibilityRole="button" accessibilityLabel={revealed ? 'Ocultar versículo' : 'Revelar versículo'}
              onPress={() => setRevealed((value) => !value)}
              style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.collectionBorder, shadowColor: theme.text }, revealed && styles.cardBack, pressed && styles.pressed]}>
              <ThemedText style={styles.cardLabel} themeColor="collectionMuted">{revealed ? 'VERSÍCULO' : 'REFERÊNCIA'}</ThemedText>
              <ThemedText style={revealed ? styles.verseText : styles.reference}>{revealed ? verse.text : verse.reference}</ThemedText>
              {revealed ? (
                <ThemedText style={styles.citation} themeColor="collectionMuted">— {verse.reference}</ThemedText>
              ) : (
                <View style={styles.revealHint}>
                  <Feather name="rotate-ccw" size={18} color={theme.collectionMuted} />
                  <ThemedText style={styles.hintLabel} themeColor="collectionMuted">TOQUE PARA REVELAR</ThemedText>
                </View>
              )}
            </Pressable>
            <ThemedText style={styles.hint} themeColor="collectionMuted">
              {revealed ? 'Como foi? Marque o seu progresso.' : 'Tente lembrar o versículo antes de virar.'}
            </ThemedText>
          </View>
          <View style={styles.footer}>
            {mastered ? (
              <View style={styles.success} accessibilityLiveRegion="polite">
                <View style={[styles.check, { backgroundColor: theme.collectionSuccess }]}>
                  <Feather name="check" size={24} color={theme.success} />
                </View>
                <ThemedText style={styles.successTitle}>Progresso registrado!</ThemedText>
                <ThemedText style={styles.successHint} themeColor="collectionMuted">Continue praticando amanhã.</ThemedText>
              </View>
            ) : null}
            {error ? <ErrorState message={error} /> : null}
            {revealed && !mastered ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void markMastered()}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.collectionPrimary }, (pressed || busy) && styles.pressed]}>
                <ThemedText style={styles.buttonText} themeColor="collectionOnPrimary">{busy ? 'Salvando...' : 'Dominei este versículo'}</ThemedText>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onClose} disabled={busy}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: mastered ? theme.collectionPrimary : theme.collectionChip }, pressed && styles.pressed]}>
              <ThemedText style={styles.buttonText} themeColor={mastered ? 'collectionOnPrimary' : 'textSecondary'}>{mastered ? 'Concluir' : 'Continuar decorando'}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.four, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  heading: { flex: 1 },
  eyebrow: { fontSize: 11, lineHeight: 18, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontFamily: Fonts.serif, fontSize: 25, lineHeight: 34, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.five },
  card: { minHeight: 300, borderRadius: 24, borderWidth: 1, padding: Spacing.four, alignItems: 'center', justifyContent: 'center', gap: 22, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardBack: { alignItems: 'flex-start' },
  cardLabel: { fontFamily: Fonts.serif, fontSize: 12, lineHeight: 20, fontStyle: 'italic', fontWeight: '700', letterSpacing: 1 },
  reference: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 38, textAlign: 'center', fontWeight: '700' },
  verseText: { fontFamily: Fonts.serif, fontSize: 24, lineHeight: 38 },
  citation: { fontFamily: Fonts.serif, fontStyle: 'italic', fontSize: 16, lineHeight: 24 },
  revealHint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  hintLabel: { fontSize: 11, lineHeight: 18, fontWeight: '700', letterSpacing: 0.6 },
  hint: { textAlign: 'center', fontSize: 13, lineHeight: 22, marginTop: Spacing.three },
  footer: { gap: Spacing.three },
  success: { alignItems: 'center', gap: 12, marginBottom: 12 },
  check: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontFamily: Fonts.serif, fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  successHint: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  primaryButton: { minHeight: 48, paddingHorizontal: Spacing.three, paddingVertical: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
