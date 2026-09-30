import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const FLIP_MS = 450;

interface FlashcardProps {
  reference: string;
  text: string;
  children?: ReactNode;
  initialShowBack?: boolean;
  label?: string;
}

export function Flashcard({ reference, text, children, initialShowBack = false, label }: FlashcardProps) {
  const [showBack, setShowBack] = useState(initialShowBack);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(showBack ? 1 : 0, { duration: FLIP_MS });
  }, [showBack, progress]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.49, 0.51, 1], [1, 1, 0, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(progress.value, [0, 1], [180, 360])}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.49, 0.51, 1], [0, 0, 1, 1]),
  }));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="code" themeColor="textSecondary" style={styles.label}>
        {label ?? 'Desafio de memória · NVI'}
      </ThemedText>

      <Pressable onPress={() => setShowBack((v) => !v)}>
        <View style={styles.stage}>
          {/* Verso no fluxo: define a altura do palco */}
          <Animated.View style={[styles.face, backStyle]}>
            <ThemedText type="smallBold">{reference}</ThemedText>
            <ThemedText style={styles.text}>{text}</ThemedText>
          </Animated.View>
          {/* Frente sobreposta */}
          <Animated.View style={[styles.face, styles.faceFront, frontStyle]}>
            <ThemedText type="subtitle" style={styles.reference}>
              {reference}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              O que diz este versículo?
            </ThemedText>
          </Animated.View>
        </View>
      </Pressable>

      <ThemedView style={styles.flipRow}>
        <Pressable
          onPress={() => setShowBack(false)}
          style={({ pressed }) => [
            styles.flipButton,
            !showBack && styles.flipButtonActive,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">Frente</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setShowBack(true)}
          style={({ pressed }) => [
            styles.flipButton,
            showBack && styles.flipButtonActive,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">Verso</ThemedText>
        </Pressable>
      </ThemedView>

      {children ? <ThemedView style={styles.footer}>{children}</ThemedView> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 2,
    borderColor: '#F2C14E',
  },
  label: {
    textTransform: 'uppercase',
  },
  stage: {
    position: 'relative',
    minHeight: 200,
    justifyContent: 'center',
  },
  face: {
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
  },
  faceFront: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  reference: {
    textAlign: 'center',
  },
  text: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 28,
  },
  flipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  flipButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E46F4D',
  },
  flipButtonActive: {
    backgroundColor: '#E46F4D',
  },
  footer: {
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
});
