import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { COLORS, SIZES, RADIUS } from '../constants/theme';
import { TransactionRecord } from '../store/walletStore';

export interface TransactionListItemProps extends Omit<TouchableOpacityProps, 'onPress'> {
  /** The transaction data to display. */
  transaction: TransactionRecord;
  /**
   * The public key of the current wallet owner, used to determine
   * whether the transaction is sent or received.
   */
  currentPublicKey?: string | null;
  /** Called when the row is pressed. Omit to render a non-interactive row. */
  onPress?: (transaction: TransactionRecord) => void;
  /**
   * Visual variant — "card" adds a background and border (used in the
   * full history list), "inline" uses a transparent background with a
   * bottom divider (used inside a container card on the home screen).
   */
  variant?: 'card' | 'inline';
}

/**
 * Reusable row component for displaying a single transaction summary.
 * Handles missing fields gracefully and supports press behaviour.
 */
export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  currentPublicKey,
  onPress,
  variant = 'card',
  style,
  ...props
}) => {
  const tx = transaction as any;
  const isSent = !!currentPublicKey && tx.from === currentPublicKey;

  const direction = isSent ? 'sent' : 'received';

  const label = isSent ? 'Sent XLM' : 'Received XLM';

  const formattedAmount = tx.amount
    ? `${isSent ? '-' : '+'}${tx.amount}`
    : null;

  const formattedDate = tx.created_at
    ? new Date(tx.created_at).toLocaleString()
    : null;

  // Counterparty: for sent txs show the recipient, for received show the sender
  const counterparty = isSent
    ? tx.to || null
    : tx.from || null;

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { ...props, onPress: () => onPress(transaction), activeOpacity: 0.7 }
    : props;

  return (
    <Container
      style={[
        styles.base,
        variant === 'card' ? styles.card : styles.inline,
        style,
      ]}
      {...(containerProps as any)}
    >
      {/* Direction icon */}
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: isSent ? SENT_BG : RECEIVED_BG },
        ]}
      >
        {isSent ? (
          <ArrowUpRight color={COLORS.error} size={20} />
        ) : (
          <ArrowDownLeft color={COLORS.success} size={20} />
        )}
      </View>

      {/* Centre info */}
      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>

        {counterparty ? (
          <Text style={styles.counterparty} numberOfLines={1} ellipsizeMode="middle">
            {counterparty}
          </Text>
        ) : null}

        {formattedDate ? (
          <Text style={styles.date}>{formattedDate}</Text>
        ) : null}
      </View>

      {/* Right-side amount + status */}
      <View style={styles.right}>
        {formattedAmount ? (
          <Text
            style={[
              styles.amount,
              { color: isSent ? COLORS.textPrimary : COLORS.success },
            ]}
          >
            {formattedAmount}
          </Text>
        ) : (
          <Text style={styles.amountMissing}>—</Text>
        )}

        {tx.asset ? (
          <Text style={styles.assetType}>
            {tx.asset}
          </Text>
        ) : null}
      </View>
    </Container>
  );
};

const SENT_BG = 'rgba(255, 61, 0, 0.10)';
const RECEIVED_BG = 'rgba(0, 230, 118, 0.10)';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** Stand-alone card row (History screen). */
  card: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: RADIUS.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  /** Inline row inside an existing card (Home screen). */
  inline: {
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  info: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  counterparty: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountMissing: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  assetType: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
