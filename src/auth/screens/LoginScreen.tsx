import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useAuth } from '../index';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const theme = useTheme();
  const inputColors = { backgroundColor: theme.backgroundElement, color: theme.text };

  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos obrigatórios', 'Informe email e senha.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao entrar', error);
    }
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
          <ThemedText type="subtitle" style={styles.title}>Palavra Viva</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Entre para sincronizar seus versículos
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.form}>
          <ThemedView style={styles.inputGroup}>
            <ThemedText type="smallBold" themeColor="text" style={styles.label}>
              Email
            </ThemedText>
            <TextInput
              style={[styles.input, inputColors]}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText type="smallBold" themeColor="text" style={styles.label}>
              Senha
            </ThemedText>
            <TextInput
              style={[styles.input, inputColors]}
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.primaryButton, (loading || authLoading) && styles.buttonLoading]}
            onPress={handleLogin}
            disabled={loading || authLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Entrar
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/register')}
            disabled={loading || authLoading}
            activeOpacity={0.8}
          >
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
              Não tem conta?{' '}
              <ThemedText type="linkPrimary" style={styles.linkText}>Criar conta</ThemedText>
            </ThemedText>
          </TouchableOpacity>
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
    borderColor: '#E5DDD0',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#8C4A27',
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
    color: '#fff',
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