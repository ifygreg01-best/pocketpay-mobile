/**
 * ContactsScreen
 *
 * Supports two ways to add a contact:
 *  1. Manual entry – type a name and a Stellar public key.
 *  2. Scan-to-add  – open the QR scanner, scan an address, then type a name.
 *
 * Duplicate detection: if the scanned or typed address already exists in the
 * contact list, the user is informed before they can save.
 *
 * Accessibility: interactive elements carry accessibilityLabel / accessibilityRole.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { QrScanner } from '../src/components/QrScanner';
import { COLORS, SIZES, RADIUS } from '../src/constants/theme';
import { useAppStore, Contact } from '../src/store/appStore';
import { validateAddress } from '../src/utils/validation';
import { Trash2, User, ScanLine } from 'lucide-react-native';

// ── View modes ───────────────────────────────────────────────────────────────
type Mode =
  | 'list'           // Default: show contact list
  | 'manual'         // Manual add form (name + address)
  | 'scanning'       // Full-screen QR scanner
  | 'confirm-scan';  // Post-scan form: address pre-filled, enter name

export default function ContactsScreen() {
  const { contacts, addContact, removeContact } = useAppStore();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('list');
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [keyError, setKeyError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setName('');
    setPublicKey('');
    setNameError(undefined);
    setKeyError(undefined);
    setIsSaving(false);
  }, []);

  /** Returns true when the address already exists in the contact list. */
  const isDuplicate = useCallback(
    (address: string) =>
      contacts.some(
        (c) => c.publicKey.toLowerCase() === address.trim().toLowerCase(),
      ),
    [contacts],
  );

  // ── Field change handlers ───────────────────────────────────────────────────

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) setNameError(undefined);
  };

  const handleKeyChange = (value: string) => {
    setPublicKey(value);
    if (!value.trim()) {
      setKeyError(undefined);
      return;
    }
    const addrError = validateAddress(value);
    if (addrError) {
      setKeyError(addrError);
      return;
    }
    if (isDuplicate(value)) {
      setKeyError('This address is already saved as a contact.');
      return;
    }
    setKeyError(undefined);
  };

  // ── Save handler (used by both manual and scan-confirm forms) ───────────────

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedKey = publicKey.trim();

    const currentNameError = trimmedName ? undefined : 'Please enter a name.';
    const addrValidationError = validateAddress(trimmedKey) ?? undefined;
    const duplicateError = isDuplicate(trimmedKey)
      ? 'This address is already saved as a contact.'
      : undefined;
    const currentKeyError = addrValidationError ?? duplicateError;

    setNameError(currentNameError);
    setKeyError(currentKeyError);

    if (currentNameError || currentKeyError) return;

    const existing = contacts.find(
      (c) => c.publicKey.toLowerCase() === trimmedKey.toLowerCase(),
    );
    if (existing) {
      setKeyError(
        `This address is already saved as "${existing.name}". You cannot add duplicate addresses.`,
      );
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: trimmedName,
      publicKey: trimmedKey,
    };

    try {
      setIsSaving(true);
      await addContact(newContact);
      resetForm();
      setMode('list');
    } catch {
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── QR scanner callbacks ────────────────────────────────────────────────────

  const handleScanSuccess = useCallback(
    (address: string) => {
      // Check for duplicates immediately after a successful scan.
      if (isDuplicate(address)) {
        const existing = contacts.find(
          (c) => c.publicKey.toLowerCase() === address.toLowerCase(),
        );
        Alert.alert(
          'Already saved',
          `This address is already in your contacts${existing ? ` as "${existing.name}"` : ''}.`,
        );
        setMode('list');
        return;
      }
      // Pre-fill the address and switch to the confirm form.
      setPublicKey(address);
      setMode('confirm-scan');
    },
    [contacts, isDuplicate],
  );

  const handleScanError = useCallback((message: string) => {
    Alert.alert('Invalid QR Code', message);
    setMode('list');
  }, []);

  const handleScanClose = useCallback(() => {
    setMode('list');
    resetForm();
  }, [resetForm]);

  // ── Remove handler ──────────────────────────────────────────────────────────

  const handleRemove = (id: string) => {
    Alert.alert('Delete Contact', 'Are you sure you want to remove this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeContact(id),
      },
    ]);
  };

  // ── Render: full-screen QR scanner ─────────────────────────────────────────
  if (mode === 'scanning') {
    return (
      <Modal
        visible
        animationType="slide"
        onRequestClose={handleScanClose}
        accessibilityViewIsModal
      >
        <QrScanner
          onScan={handleScanSuccess}
          onError={handleScanError}
          onClose={handleScanClose}
        />
      </Modal>
    );
  }

  // ── Render: add form (manual or post-scan confirm) ──────────────────────────
  const isFormMode = mode === 'manual' || mode === 'confirm-scan';

  return (
    <View style={styles.container}>
      {isFormMode ? (
        <View style={styles.addForm}>
          <Text style={styles.title}>
            {mode === 'confirm-scan' ? 'Save Scanned Contact' : 'Add New Contact'}
          </Text>

          {/* Name field */}
          <Input
            label="Name"
            placeholder="Alice"
            value={name}
            onChangeText={handleNameChange}
            error={nameError}
            autoFocus
            accessibilityLabel="Contact name"
          />

          {/* Address field – read-only when pre-filled from scan */}
          <Input
            label="Stellar Address"
            placeholder="G..."
            value={publicKey}
            onChangeText={handleKeyChange}
            error={keyError}
            autoCapitalize="none"
            autoCorrect={false}
            editable={mode !== 'confirm-scan'}
            accessibilityLabel="Stellar public key address"
          />

          {/* Scan button (only in manual mode – lets the user switch to scanner) */}
          {mode === 'manual' && (
            <Button
              title="Scan QR Instead"
              variant="outline"
              onPress={() => {
                resetForm();
                setMode('scanning');
              }}
              style={styles.scanInsteadBtn}
              accessibilityLabel="Open QR scanner"
            />
          )}

          <View style={styles.actions}>
            <Button
              title="Save Contact"
              onPress={handleSave}
              isLoading={isSaving}
              style={styles.actionBtn}
              accessibilityLabel="Save contact"
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                resetForm();
                setMode('list');
              }}
              style={styles.actionBtn}
              accessibilityLabel="Cancel"
            />
          </View>
        </View>
      ) : (
        <>
          {/* ── List header: two action buttons ────────────────────────────── */}
          <View style={styles.headerActions}>
            <Button
              title="+ Add Manually"
              onPress={() => {
                resetForm();
                setMode('manual');
              }}
              style={styles.headerBtn}
              accessibilityLabel="Add contact manually"
            />
            <Button
              title="Scan QR"
              variant="secondary"
              onPress={() => {
                resetForm();
                setMode('scanning');
              }}
              style={styles.headerBtn}
              accessibilityLabel="Scan QR code to add contact"
            />
          </View>

          {/* ── Contact list ─────────────────────────────────────────────────── */}
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState} accessibilityLiveRegion="polite">
                <User
                  color={COLORS.textMuted}
                  size={48}
                  style={{ marginBottom: SIZES.md }}
                />
                <Text style={styles.emptyText}>No contacts yet</Text>
                <Text style={styles.emptySubText}>
                  Add a contact manually or scan a QR code.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text
                    style={styles.contactKey}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.publicKey}
                  </Text>
                </View>
                <Trash2
                  color={COLORS.error}
                  size={20}
                  onPress={() => handleRemove(item.id)}
                  accessibilityLabel={`Remove ${item.name}`}
                  accessibilityRole="button"
                />
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
    gap: SIZES.sm,
  },
  headerBtn: {
    flex: 1,
  },
  // ── Add / confirm form ───────────────────────────────────────────────────────
  addForm: {
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SIZES.lg,
  },
  scanInsteadBtn: {
    marginBottom: SIZES.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  actionBtn: {
    flex: 1,
  },
  // ── Contact list ─────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: SIZES.xxl,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    borderRadius: RADIUS.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactInfo: {
    flex: 1,
    marginRight: SIZES.md,
  },
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactKey: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: SIZES.xxl * 2,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginBottom: SIZES.xs,
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
