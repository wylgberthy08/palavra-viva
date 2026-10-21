import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { Fonts, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const isDark = useColorScheme() === 'dark';
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
    <Image
      source={isDark
        ? require('@/assets/images/palavra-viva-splash-dark.png')
        : require('@/assets/images/palavra-viva-splash.png')}
      style={styles.mark}
      resizeMode="contain"
      accessibilityLabel="Palavra Viva"
      onLoadEnd={reveal}
    />
  );
  const name = <Text style={[styles.wordmarkText, { color: theme.text }]}>Palavra Viva</Text>;

  if (!revealed) {
    return (
      <View style={[styles.overlay, surface]}>
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
    width: 160,
    height: 160,
  },
  wordmark: {
    position: 'absolute',
    top: '50%',
    marginTop: 96,
  },
  wordmarkText: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
});
