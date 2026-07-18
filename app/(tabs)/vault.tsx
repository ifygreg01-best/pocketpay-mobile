import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { VaultConfirmModal, VaultAction } from '../../src/components/VaultConfirmModal';
import { COLORS, SIZES, RADIUS } from '../../src/constants/theme';
import { useWalletStore } from '../../src/store/walletStore';
import { useVaultStore } from '../../src/store/vaultStore';
import { validateAmount } from '../../src/utils/validation';
import { PiggyBank, ShieldCheck, AlertTriangle } from 'lucide-react-native';

const LOCK_PERIOD_SECONDS = 30 * 24 * 60 * 60; // 30 days

export default function VaultScreen() {
  const { publicKey, getSecretKey, balance: walletBalance } = useWalletStore();
  const {
    balance,
    isConfigured,
    contractId,
    isLoadingBalance,
    isSubmitting,
    balanceError,
    loadBalance,
    deposit,
    withdraw,
  } = useVaultStore();

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>();

  // Confirmation modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<VaultAction>('deposit');
  const [pendingUnlockTime, setPendingUnlockTime] = useState('');

  useEffect(() => {
    if (publicKey) {
      loadBalance(publicKey);
    }
  }, [publicKey]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setAmountError(value.trim() ? validateAmount(value) ?? undefined : undefined);
  };

  const handleAction = async (action: 'deposit' | 'withdraw') => {
    if (!publicKey) return;

    // Deposits are limited by the wallet balance; withdrawals by the vault balance.
    const error =
      validateAmount(amount, action === 'deposit' ? walletBalance : undefined) ??
      (action === 'withdraw' && Number(amount) > Number(balance)
        ? "You don't have enough XLM in the vault for this withdrawal."
        : undefined);
    setAmountError(error);
    if (error) return;

    try {
      const secret = await getSecretKey();
      if (!secret) throw new Error('Secret key not found');

      const hash =
        action === 'deposit'
          ? await deposit(secret, publicKey, amount)
          : await withdraw(secret, publicKey, amount);

      setAmount('');
      setAmountError(undefined);
      const verb = action === 'deposit' ? 'deposited into' : 'withdrawn from';
      Alert.alert(
        'Success',
        hash
          ? `Funds ${verb} the Soroban vault.\n\nTransaction: ${hash.slice(0, 8)}…${hash.slice(-8)}`
          : `Funds ${verb} the vault (mock — no real funds moved).`
      );
    } catch (e: any) {
      Alert.alert(`${action === 'deposit' ? 'Deposit' : 'Withdrawal'} failed`, e.message);
    }
  };

  const cancelAction = () => {
    setConfirmVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <PiggyBank color={COLORS.primary} size={40} />
        </View>
        <Text style={styles.cardTitle}>Soroban Savings Vault</Text>
        {isLoadingBalance ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.balanceLoader} />
        ) : (
          <Text style={styles.balanceValue}>{balance} XLM</Text>
        )}
        <Text style={styles.cardSubtitle}>
          {isConfigured
            ? `Contract ${contractId.slice(0, 4)}…${contractId.slice(-4)}`
            : 'Mock balance'}
        </Text>
        {balanceError && (
          <View style={styles.balanceErrorBox}>
            <Text style={styles.balanceErrorText}>{balanceError}</Text>
            <TouchableOpacity onPress={() => publicKey && loadBalance(publicKey)}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isConfigured ? (
        <View style={styles.infoBox}>
          <ShieldCheck color={COLORS.success} size={24} style={{ marginRight: SIZES.sm }} />
          <Text style={styles.infoText}>
            Connected to a live Soroban smart contract on{' '}
            {process.env.EXPO_PUBLIC_STELLAR_NETWORK || 'TESTNET'}. Deposits and withdrawals
            submit real transactions.
          </Text>
        </View>
      ) : (
        <View style={styles.warningBox}>
          <AlertTriangle color={COLORS.warning} size={24} style={{ marginRight: SIZES.sm }} />
          <Text style={styles.warningText}>
            No vault contract configured. Set EXPO_PUBLIC_VAULT_CONTRACT_ID in your .env file to
            connect to a deployed Soroban contract. Running in mock mode — no real funds are
            moved.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Input
          label="Amount (XLM)"
          placeholder="0.00"
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="decimal-pad"
          error={amountError}
          editable={!isSubmitting}
        />
        <View style={styles.actions}>
          <Button
            title="Deposit"
            onPress={() => handleAction('deposit')}
            isLoading={isSubmitting}
            disabled={isLoadingBalance}
            style={styles.actionButton}
          />
          <Button
            title="Withdraw"
            variant="secondary"
            onPress={() => handleAction('withdraw')}
            isLoading={isSubmitting}
            disabled={isLoadingBalance}
            style={styles.actionButton}
          />
        </View>
        <Button
          title="Lock Funds (30 days)"
          variant="outline"
          onPress={() =>
            Alert.alert(
              'Lock Funds',
              `Lock ${amount || '0'} XLM for 30 days? Locked funds cannot be withdrawn until the unlock time.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Lock',
                  onPress: () =>
                    Alert.alert(
                      'Notice',
                      'Vault lock is not yet implemented. This is a placeholder for Soroban time-lock functionality.'
                    ),
                },
              ]
            )
          }
          disabled={isSubmitting}
          style={styles.lockButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: SIZES.sm,
  },
  balanceValue: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  balanceLoader: {
    marginVertical: SIZES.sm,
  },
  cardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  balanceErrorBox: {
    marginTop: SIZES.md,
    alignItems: 'center',
  },
  balanceErrorText: {
    color: COLORS.error,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  retryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    padding: SIZES.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  infoText: {
    color: COLORS.success,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 196, 0, 0.1)',
    padding: SIZES.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  warningText: {
    color: COLORS.warning,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SIZES.xs,
  },
  lockButton: {
    marginTop: SIZES.md,
  },
});
