import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { solicitarRecuperacaoDeSenha } from '../services/password-recovery';

/**
 * Pede o e-mail de recuperação de senha.
 *
 * A tela **não** diz se a conta existe, e o serviço também não: e-mail existente,
 * inexistente e taxa de envio estourada chegam todos como `confirmado`. Se esta
 * tela voltasse a distinguir os casos, viraria um oráculo de quais pessoas têm
 * conta no app. Ver `spec.md`, US2 e FR-003.
 *
 * Não há campo de senha aqui. A troca acontece depois, na sessão que o link
 * abre.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputColors = { backgroundColor: theme.backgroundElement, color: theme.text };
  // O botão usa `primary` com a cor de `background` sobre ele, e não branco
  // fixo: no tema escuro `primary` é um pêssego claro, e o branco ficaria
  // ilegível. Inverter os dois tokens dá contraste correto nos dois temas.
  const botaoColors = { backgroundColor: theme.primary };
  const botaoTextoColors = { color: theme.background };
  const bordaInputColors = { borderColor: theme.backgroundSelected };

  const handleEnviar = async () => {
    if (!email.trim()) {
      setErro('Informe seu email.');
      return;
    }

    setEnviando(true);
    setErro(null);
    const resultado = await solicitarRecuperacaoDeSenha(email);
    setEnviando(false);

    if (resultado.status === 'falha_de_rede') {
      setErro(resultado.mensagem);
      return;
    }

    setConfirmado(true);
  };

  return (
    <ThemedView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>Recuperar senha</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {confirmado
                ? 'Se a conta existir, enviamos um link para o seu email.'
                : 'Informe seu email e enviaremos um link para escolher uma nova senha.'}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.form}>
            {!confirmado && (
              <ThemedView style={styles.inputGroup}>
                <ThemedText type="smallBold" themeColor="text" style={styles.label}>
                  Email
                </ThemedText>
                <TextInput
                  style={[styles.input, inputColors, bordaInputColors]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!enviando}
                  onSubmitEditing={handleEnviar}
                  returnKeyType="go"
                />
              </ThemedView>
            )}

            {erro && (
              <ThemedText type="small" style={styles.erro} accessibilityRole="alert">
                {erro}
              </ThemedText>
            )}

            {!confirmado ? (
              <TouchableOpacity
                style={[styles.primaryButton, botaoColors, enviando && styles.buttonLoading]}
                onPress={handleEnviar}
                disabled={enviando}
                activeOpacity={0.8}
              >
                {enviando ? (
                  <ActivityIndicator size="small" color={theme.background} />
                ) : (
                  <ThemedText type="smallBold" style={[styles.primaryButtonText, botaoTextoColors]}>
                    Enviar link
                  </ThemedText>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, botaoColors]}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.8}
              >
                <ThemedText type="smallBold" style={[styles.primaryButtonText, botaoTextoColors]}>
                  Voltar para entrar
                </ThemedText>
              </TouchableOpacity>
            )}

            {!confirmado && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.back()}
                disabled={enviando}
                activeOpacity={0.8}
              >
                <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                  <ThemedText type="linkPrimary" style={styles.linkText}>Voltar</ThemedText>
                </ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 32,
    fontWeight: '400',
    marginBottom: Spacing.one,
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  erro: {
    marginBottom: Spacing.two,
  },
  primaryButton: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.two,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: Spacing.four,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 15,
  },
  footerText: {
    fontSize: 15,
  },
});