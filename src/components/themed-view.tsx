import { type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** Edges com inset do safe area. Vazio por padrão para não acumular padding em ThemedViews aninhados. */
  edges?: Edge[];
};

export function ThemedView({ style, lightColor, darkColor, type, edges = [], ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[{ backgroundColor: theme[type ?? 'background'] }, style]}
      {...otherProps}
    />
  );
}
