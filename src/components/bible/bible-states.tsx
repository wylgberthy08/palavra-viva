import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator color={theme.text} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.gap}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      <ThemedText type="smallBold">Algo deu errado</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable onPress={onRetry} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="linkPrimary">Tentar de novo</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  gap: {
    marginTop: Spacing.two,
  },
  box: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  centerText: {
    textAlign: 'center',
  },
});
