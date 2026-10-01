import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface OpcoesContaProps {
  visible: boolean;
  email: string;
  /** Desabilitado durante a exclusão, para não haver duas operações de sessão. */
  busy?: boolean;
  /** Motivo da falha, exibido dentro do diálogo para o usuário poder repetir. */
  mensagem?: string | null;
  onClose: () => void;
  onSignOut: () => void;
  /** Executa a exclusão. Só é chamado a partir da tela de confirmação. */
  onDelete: () => void;
}

/**
 * Menu da conta, aberto ao tocar no nome.
 *
 * `Modal` e não `Alert.alert`: o Alert do React Native não apresenta dois
 * botões de forma confiável no navegador, e a confirmação de exclusão precisa
 * funcionar igual nas três plataformas (FR-014).
 *
 * A tela tem dois estados em vez de dois modais empilhados: empilhar `Modal`
 * sobre `Modal` é frágil no web e torna a hierarquia de foco difícil de prever.
 */
export function OpcoesConta({
  visible,
  email,
  busy = false,
  mensagem,
  onClose,
  onSignOut,
  onDelete,
}: OpcoesContaProps) {
  const theme = useTheme();
  const [confirmando, setConfirmando] = useState(false);

  const fechar = () => {
    setConfirmando(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={fechar}>
      <Pressable
        style={styles.backdrop}
        onPress={fechar}
        accessibilityLabel="Fechar opções da conta"
        testID="conta-backdrop"
      />
      <View style={styles.centralizado} pointerEvents="box-none">
        <ThemedView type="backgroundElement" style={styles.cartao} testID="conta-opcoes">
          {!confirmando ? (
            <>
              <View style={styles.cabecalho}>
                <ThemedText type="small" themeColor="textSecondary">
                  CONTA
                </ThemedText>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {email || 'Sem e-mail'}
                </ThemedText>
              </View>

              <Pressable
                onPress={onSignOut}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.acao, pressed && styles.pressionado, busy && styles.desabilitado]}>
                <ThemedText type="default">Sair</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Mantém seus versículos guardados neste aparelho
                </ThemedText>
              </Pressable>

              <View style={styles.separador} />

              <Pressable
                onPress={() => setConfirmando(true)}
                disabled={busy}
                accessibilityRole="button"
                testID="conta-item-excluir"
                style={({ pressed }) => [styles.acao, pressed && styles.pressionado, busy && styles.desabilitado]}>
                <ThemedText type="default" style={{ color: theme.danger }}>
                  Excluir conta
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Remove a conta e os versículos guardados
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.cabecalho}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Excluir conta
                </ThemedText>
                {/* A irreversibilidade é dita antes do botão, não depois. */}
                <ThemedText type="small" themeColor="textSecondary">
                  Esta ação não pode ser desfeita. Sua conta será removida e os versículos
                  guardados neste aparelho serão perdidos.
                </ThemedText>
              </View>

              {mensagem ? (
                <ThemedText type="small" style={{ color: theme.danger }} testID="conta-erro">
                  {mensagem}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={onClose}
                disabled={busy}
                accessibilityRole="button"
                testID="conta-cancelar"
                style={({ pressed }) => [styles.botao, pressed && styles.pressionado, busy && styles.desabilitado]}>
                <ThemedText type="default">Cancelar</ThemedText>
              </Pressable>

              <Pressable
                onPress={onDelete}
                disabled={busy}
                accessibilityRole="button"
                testID="conta-confirmar-exclusao"
                style={({ pressed }) => [styles.botao, styles.botaoPerigo, pressed && styles.pressionado, busy && styles.desabilitado]}>
                <ThemedText type="default" style={{ color: theme.danger }}>
                  {busy ? 'Excluindo...' : 'Excluir conta'}
                </ThemedText>
              </Pressable>
            </>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cartao: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  cabecalho: {
    gap: Spacing.one,
  },
  acao: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
  separador: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.25)',
  },
  botao: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  botaoPerigo: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  pressionado: {
    opacity: 0.7,
  },
  desabilitado: {
    opacity: 0.4,
  },
});
