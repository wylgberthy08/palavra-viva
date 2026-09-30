import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface VerseCardProps {
  reference: string;
  text: string;
  saved?: boolean;
  onToggleSave?: () => void;
  onPress?: () => void;
}

/** Cartão compacto de versículo (lista, busca, meus). */
export function VerseCard({ reference, text, saved, onToggleSave, onPress }: VerseCardProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedView style={styles.header}>
          <ThemedText type="smallBold">{reference}</ThemedText>
          <ThemedText type="code" themeColor="textSecondary">
            NVI
          </ThemedText>
        </ThemedView>
        <ThemedText numberOfLines={3}>{text}</ThemedText>
        {onToggleSave ? (
          <Pressable onPress={onToggleSave} hitSlop={8} style={styles.saveButton}>
            <ThemedText type="linkPrimary">{saved ? 'Salvo ✓' : 'Decorar'}</ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  saveButton: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
});
