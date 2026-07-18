import * as StellarSdk from '@stellar/stellar-sdk';
import * as ExpoCrypto from 'expo-crypto';
import { Buffer } from 'buffer';

const server = new StellarSdk.Horizon.Server(
  process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
);

/** Horizon operation record type used for transaction history. */
export type PaymentRecord = StellarSdk.Horizon.ServerApi.OperationRecord;

/**
 * Generates a new Stellar Keypair.
 * This function returns both the public and secret keys.
 * The secret key MUST be stored securely using SecureStore.
 */
export const generateKeypair = () => {
  const seed = ExpoCrypto.getRandomValues(new Uint8Array(32));
  const keypair = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(seed));
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
};

/**
 * Horizon returns 404 for accounts that don't exist on the network yet
 * (i.e. never funded). The SDK surfaces this as a NotFoundError with the
 * message "Not Found", while our own wrapper throws "Account not found".
 */
const isNotFoundError = (error: any): boolean =>
  error?.response?.status === 404 || /not found/i.test(error?.message || '');

/**
 * Helper to fetch account details including balances.
 */
export const fetchAccountDetails = async (publicKey: string) => {
  try {
    const account = await server.loadAccount(publicKey);
    return account;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw new Error('Account not found on the network. Please fund it first.');
    }
    throw error;
  }
};

/**
 * Fetch the XLM balance for a given public key.
 */
export const fetchXlmBalance = async (publicKey: string): Promise<string> => {
  try {
    const account = await fetchAccountDetails(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : '0.0000000';
  } catch (error: any) {
    // If account is not found (unfunded), balance is 0
    if (isNotFoundError(error)) {
      return '0.0000000';
    }
    throw error;
  }
};

/**
 * Fetch recent transactions for a given public key.
 */
export const fetchRecentTransactions = async (
  publicKey: string,
  limit: number = 20
): Promise<PaymentRecord[]> => {
  try {
    const response = await server
      .operations()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();

    return response.records;
  } catch (error: any) {
    if (isNotFoundError(error)) {
      return [];
    }
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export interface TransactionsPage {
  /** Fetched operation records for this page. */
  records: any[];
  /**
   * Paging token (cursor) of the oldest record in this page.
   * Pass this as `cursor` to `fetchTransactionsPage` to load the next
   * (older) page.  `null` means there are no more pages.
   */
  nextCursor: string | null;
  /** True when fewer records than `limit` were returned — no more pages. */
  hasMore: boolean;
}

/**
 * Fetch a page of operations for `publicKey`, ordered descending
 * (newest-first).  Supports cursor-based "load more older" pagination.
 *
 * @param publicKey  – Stellar public key to query.
 * @param limit      – Page size (default 20).
 * @param cursor     – Paging token from a previous page to continue from.
 *                     Pass `undefined` / omit to start from the latest.
 */
export const fetchTransactionsPage = async (
  publicKey: string,
  limit: number = 20,
  cursor?: string
): Promise<TransactionsPage> => {
  try {
    let builder = server
      .operations()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit);

    if (cursor) {
      builder = builder.cursor(cursor);
    }

    const response = await builder.call();
    const records = response.records;
    const hasMore = records.length === limit;

    // The cursor for the next page is the paging_token of the last (oldest)
    // record returned.  Horizon uses paging_token as the cursor value.
    const nextCursor =
      hasMore && records.length > 0
        ? (records[records.length - 1] as any).paging_token ?? null
        : null;

    return { records, nextCursor, hasMore };
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
      return { records: [], nextCursor: null, hasMore: false };
    }
    console.error('Error fetching transactions page:', error);
    throw error;
  }
};

/**
 * Send XLM to a destination address.
 */
export const sendXlmTransaction = async (
  secretKey: string,
  destinationPublicKey: string,
  amount: string,
  memoText?: string
) => {
  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    const account = await server.loadAccount(sourcePublicKey);
    const fee = await server.fetchBaseFee();

    let transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: fee.toString(),
      networkPassphrase: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET,
    });

    transactionBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination: destinationPublicKey,
        asset: StellarSdk.Asset.native(),
        amount: amount,
      })
    );

    if (memoText) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(memoText));
    }

    transactionBuilder.setTimeout(30);
    const transaction = transactionBuilder.build();
    transaction.sign(sourceKeypair);

    const response = await server.submitTransaction(transaction);
    return response;
  } catch (error: any) {
    console.error('Error sending transaction:', error?.response?.data || error);
    throw new Error(error?.response?.data?.extras?.result_codes?.transaction || 'Transaction failed');
  }
};

const isAccountNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'ACCOUNT_NOT_FOUND';

/**
 * MOCK SERVICE WRAPPERS FOR SOROBAN SAVINGS VAULT
 *
 * Used as a fallback by the vault store when EXPO_PUBLIC_VAULT_CONTRACT_ID
 * is not set. The real Soroban implementations live in ./vault.ts.
 */

export const mockConnectVault = async (publicKey: string): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
};

export const mockFetchVaultBalance = async (publicKey: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return '0.0000000'; // Default placeholder
};

export const mockDepositToVault = async (secretKey: string, amount: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return true;
};

export const mockWithdrawFromVault = async (secretKey: string, amount: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return true;
};

export const fundWithFriendbot = async (publicKey: string): Promise<void> => {
  try {
    const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Friendbot error: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error('Friendbot funding failed:', error);
    throw new Error(error.message || 'Friendbot funding failed');
  }
};

