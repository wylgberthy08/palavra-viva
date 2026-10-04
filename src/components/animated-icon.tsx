import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tempo do nome entrando, e duração do overlay se retirando. */
const WORDMARK_DELAY = 120;
const WORDMARK_DURATION = 320;
const WORDMARK_HOLD = 180;
const EXIT_DURATION = 240;

/**
 * Rede de segurança: se `onLayout` não chegar, ou se a splash nativa não
 * colaborar, o overlay assume o controle mesmo assim. Sem isso, uma promessa
 * que não resolve deixa a tela presa na splash.
 */
const REVEAL_FALLBACK = 1200;

const WORDMARK_TOTAL = WORDMARK_DELAY + WORDMARK_DURATION;

const wordmarkKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: Spacing.three }],
  },
  [Math.round((WORDMARK_DELAY / WORDMARK_TOTAL) * 100)]: {
    opacity: 0,
    transform: [{ translateY: Spacing.three }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }],
    easing: Easing.out(Easing.cubic),
  },
});

const overlayKeyframe = new Keyframe({
  0: {
    opacity: 1,
  },
  100: {
    opacity: 0,
    easing: Easing.in(Easing.quad),
  },
});

/**
 * Cobre a splash nativa com a mesma paleta e o mesmo monograma, de modo que a
 * troca não se vê; só então o nome entra e o overlay se retira.
 *
 * A troca de `View` para `Animated.View` não é cosmética: animação de layout só
 * roda no mount, e é a remontagem que faz o `entering` do nome acontecer.
 */
export function AnimatedSplashOverlay() {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState(true);
  const revealedRef = useRef(false);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(reveal, REVEAL_FALLBACK);
    return () => clearTimeout(timeout);
  }, [reveal]);

  useEffect(() => {
    if (!revealed) return;
    const timeout = setTimeout(() => setVisible(false), WORDMARK_TOTAL + WORDMARK_HOLD);
    return () => clearTimeout(timeout);
  }, [revealed]);

  if (!visible) return null;

  const surface = { backgroundColor: theme.background };
  const mark = (
    <View style={[styles.mark, { backgroundColor: theme.primary }]}>
      <Text style={[styles.glyph, { color: theme.background }]}>P</Text>
    </View>
  );
  const name = <Text style={[styles.wordmarkText, { color: theme.text }]}>Palavra Viva</Text>;

  if (!revealed) {
    return (
      <View onLayout={reveal} style={[styles.overlay, surface]}>
        {mark}
        <View style={styles.wordmark}>{name}</View>
      </View>
    );
  }

  return (
    <Animated.View exiting={overlayKeyframe.duration(EXIT_DURATION)} style={[styles.overlay, surface]}>
      {mark}
      <Animated.View entering={wordmarkKeyframe.duration(WORDMARK_TOTAL)} style={styles.wordmark}>
        {name}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  mark: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: Fonts.serif,
    fontSize: 96,
    lineHeight: 108,
    fontWeight: '700',
  },
  wordmark: {
    marginTop: Spacing.four,
  },
  wordmarkText: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
});
