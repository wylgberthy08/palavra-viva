/**
 * Guarda do harness de teste. Se a transformation de JSX, o alias `@/`, o mock de
 * AsyncStorage ou o mock de Reanimated quebrarem, este arquivo é o primeiro a falhar,
 * e a falha aponta a configuração em vez de um teste de domínio.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { BIBLE_VERSION } from '@/config/bible';

describe('harness de teste', () => {
  it('transforma JSX e resolve o alias @/', async () => {
    const { getByText } = await render(
      <Text>
        <View testID="filho" />
        {BIBLE_VERSION}
      </Text>
    );

    expect(getByText(BIBLE_VERSION)).toBeTruthy();
  });

  it('persiste em AsyncStorage sem aparelho', async () => {
    await AsyncStorage.setItem('chave', 'valor');

    expect(await AsyncStorage.getItem('chave')).toBe('valor');
  });

  it('substitui Reanimated, que depende de módulo nativo', () => {
    expect(Animated.View).toBe(View);
    expect(new Keyframe({ from: { opacity: 0 }, to: { opacity: 1 } })).toBeInstanceOf(Keyframe);
  });
});
