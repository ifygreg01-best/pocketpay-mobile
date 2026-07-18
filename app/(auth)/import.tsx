import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { COLORS, SIZES, RADIUS } from '../../src/constants/theme';
import { useWalletStore } from '../../src/store/walletStore';
import { importWallet } from 'pocketpay-sdk';
import { Info, Shield, CheckCircle } from 'lucide-react-native';

const SECRET_KEY_LENGTH = 56;

export default function ImportWalletScreen() {
  const router = useRouter();
  const { setWallet } = useWalletStore();
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleImport = async () => {
    setError('');

    const trimmedKey = secretKey.trim();

    if (!trimmedKey) {
      setError('Please enter your secret key.');
      return;
    }

    if (!trimmedKey.startsWith('S')) {
      setError('Secret keys start with "S". Please check and try again.');
      return;
    }

    if (trimmedKey.length !== SECRET_KEY_LENGTH) {
      setError(`Secret keys are ${SECRET_KEY_LENGTH} characters. Yours is ${trimmedKey.length}.`);
      return;
    }

    try {
      setIsLoading(true);
      const { publicKey } = await importWallet(trimmedKey);

      const saved = await setWallet(publicKey, trimmedKey);
      if (!saved) {
        setError('Failed to persist wallet. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setIsSuccess(true);
    } catch {
      setError('Invalid secret key. It may be malformed or from the wrong network.');
      setIsLoading(false);
    }
  };

  const handleGoToWallet = () => {
    router.replace('/(tabs)');
  };

  // ── Success State ──────────────────────────────────────────
  if (isSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.contentCenter}>
          <View style={styles.successIcon}>
            <CheckCircle color={COLORS.success} size={64} />
          </View>
          <Text style={styles.title}>Wallet Imported!</Text>
          <Text style={styles.subtitle}>
            Your Testnet wallet has been restored. You can now send and receive test XLM.
          </Text>
        </View>
        <Button title="Go to Wallet" onPress={handleGoToWallet} />
      </View>
    );
  }

  // ── Import Form ────────────────────────────────────────────
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Import Wallet</Text>
          <Text style={styles.subtitle}>
            Enter your Stellar secret key to restore your wallet.
          </Text>
        </View>

        <View style={styles.infoBanner}>
          <Info color={COLORS.primary} size={18} />
          <Text style={styles.infoText}>
            This app runs on <Text style={styles.infoBold}>Testnet</Text>. Only test-net secret keys will work.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Shield color={COLORS.warning} size={18} />
          <Text style={styles.warningText}>
            Never paste your secret key from an untrusted source. Anyone with this key can access your funds.
          </Text>
        </View>

        <FormField
          label="Secret Key"
          placeholder="S…"
          value={secretKey}
          onChangeText={(text) => {
            setSecretKey(text);
            setError('');
          }}
          secureTextEntry
          error={error}
          helperText={`${SECRET_KEY_LENGTH}-character key starting with "S"`}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button 
        title="Import Wallet" 
        onPress={handleImport} 
        isLoading={isLoading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.xl,
    justifyContent: 'space-between',
    paddingBottom: SIZES.xxl,
  },
  content: {
    flex: 1,
  },
  contentCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: SIZES.lg,
    marginTop: SIZES.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    padding: SIZES.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 196, 0, 0.1)',
    padding: SIZES.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 0, 0.25)',
    marginBottom: SIZES.lg,
    gap: SIZES.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
});
