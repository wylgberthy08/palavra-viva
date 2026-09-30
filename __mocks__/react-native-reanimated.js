/* Mock manual do Reanimated para ambiente Node. */
/* Cobre exatamente a superfície usada por animated-icon.tsx e animated-icon.web.tsx: */
/* Animated.View, Easing e Keyframe. Reanimated 4 depende do módulo nativo de worklets, */
/* que não existe fora do aparelho. */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { View } = require('react-native');

/** Animated.View sem animação: o teste valida estrutura, não curva de interpolação. */
const Animated = {
  View,
  Text: require('react-native').Text,
  ScrollView: require('react-native').ScrollView,
  Image: require('react-native').Image,
};

const Easing = {
  linear: (t) => t,
  ease: (t) => t,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  bezier: () => (t) => t,
  in: (fn) => fn,
  out: (fn) => fn,
  inOut: (fn) => fn,
};

/** Keyframe executa a primeira entrada da sequência, sem interpolação. */
class Keyframe {
  constructor(definition) {
    this.definition = definition;
    this.values = Object.values(definition);
  }
}

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  Easing,
  Keyframe,
  useSharedValue: (value) => ({ value }),
  useAnimatedStyle: (factory) => factory(),
  useDerivedValue: (factory) => ({ value: factory() }),
  withTiming: (value) => value,
  withSpring: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  withDelay: (_delay, value) => value,
  withRepeat: (value) => value,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  createAnimatedComponent: (Component) => Component,
};
