import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useWalletStore } from '../../src/store/walletStore';
import { COLORS, SIZES, RADIUS } from '../../src/constants/theme';
import { Button } from '../../src/components/Button';
import { FundButton } from '../../src/components/FundButton';
import { TransactionListItem } from '../../src/components/TransactionListItem';
import { Clock } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const {
    publicKey,
    balance,
    transactions,
    isLoading,
    isFunding,
    fundError,
    refreshWalletData,
    fundWallet,
  } = useWalletStore();

  useEffect(() => {
    refreshWalletData();
  }, []);

  const isFunded = balance !== '0.0000000';
  const recentTransactions = transactions.slice(0, 3); // Preview

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={isLoading} 
          onRefresh={refreshWalletData} 
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance (Testnet)</Text>
        <Text style={styles.balanceValue}>{balance} XLM</Text>
        <Text style={styles.publicKey} numberOfLines={1} ellipsizeMode="middle">
          {publicKey}
        </Text>
      </View>

      <FundButton
        isFunding={isFunding}
        fundError={fundError}
        onFund={fundWallet}
        isFunded={isFunded}
      />

      <View style={styles.actionsContainer}>
        <Button 
          title="Send" 
          onPress={() => router.push('/send')} 
          style={styles.actionButton}
        />
        <Button 
          title="Receive" 
          variant="secondary"
          onPress={() => router.push('/receive')} 
          style={styles.actionButton}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text 
          style={styles.seeAll} 
          onPress={() => router.push('/(tabs)/history')}
        >
          See All
        </Text>
      </View>

      <View style={styles.transactionsList}>
        {recentTransactions.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Clock color={COLORS.textMuted} size={48} style={{ marginBottom: SIZES.md }} />
            <Text style={styles.emptyText}>No recent transactions</Text>
          </View>
        )}
        {recentTransactions.map((tx, index) => (
          <TransactionListItem
            key={tx.id || index}
            transaction={tx}
            currentPublicKey={publicKey}
            variant="inline"
            onPress={() => router.push('/(tabs)/history')}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
  },
  balanceCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SIZES.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SIZES.xs,
  },
  balanceValue: {
    color: COLORS.textPrimary,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: SIZES.sm,
  },
  publicKey: {
    color: COLORS.textMuted,
    fontSize: 12,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: RADIUS.round,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xxl,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SIZES.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    marginBottom: SIZES.xxl,
  },
  emptyState: {
    padding: SIZES.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
