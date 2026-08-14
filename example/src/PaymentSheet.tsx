import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;

export type PaymentMethod = 'samsungpay' | 'card' | 'knet';

export interface PaymentSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  /**
   * Called when the user picks a method. `remember` reflects the
   * "Remember this payment method" checkbox at selection time.
   */
  onSelect: (method: PaymentMethod, remember: boolean) => void;
  onClose: () => void;
}

/**
 * Demo payment-methods bottom sheet. Pure UI — the Samsung Pay work happens
 * in App.tsx through the SDK's headless `SamsungPay` API. The other options
 * are dummies to show how a real picker would mix methods.
 */
export function PaymentSheet({
  visible,
  title = 'Payment methods',
  subtitle,
  onSelect,
  onClose,
}: Readonly<PaymentSheetProps>) {
  const [mounted, setMounted] = useState(visible);
  const [remember, setRemember] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(480);

  const animateTo = useCallback(
    (toValue: 0 | 1, done?: () => void) => {
      Animated.timing(progress, {
        toValue,
        duration: toValue === 1 ? OPEN_DURATION : CLOSE_DURATION,
        easing:
          toValue === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) done?.();
      });
    },
    [progress]
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      animateTo(1);
    } else {
      animateTo(0, () => setMounted(false));
    }
  }, [visible, animateTo]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight.current, 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          onLayout={(e) => {
            sheetHeight.current = e.nativeEvent.layout.height;
          }}
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {/* Samsung Pay — the real one; SamsungPay.pay() handles init and
              readiness on demand, so the row is always selectable */}
          <Pressable
            onPress={() => onSelect('samsungpay', remember)}
            style={({ pressed }) => [
              styles.methodRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.methodIcon}>📱</Text>
            <Text style={styles.methodLabel}>Samsung Pay</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {/* Dummy methods — replace with your real integrations */}
          <Pressable
            onPress={() => onSelect('card', remember)}
            style={({ pressed }) => [
              styles.methodRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.methodIcon}>💳</Text>
            <Text style={styles.methodLabel}>Credit / Debit Card</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => onSelect('knet', remember)}
            style={({ pressed }) => [
              styles.methodRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.methodIcon}>🏦</Text>
            <Text style={styles.methodLabel}>KNET</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRemember((r) => !r)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
          >
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>
              Remember this payment method
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    backgroundColor: '#48484A',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
    color: '#9B9B9F',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#2C2C2E',
    gap: 12,
  },
  methodIcon: { fontSize: 18 },
  methodLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: { color: '#9B9B9F', fontSize: 22, lineHeight: 24 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#9B9B9F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  rememberText: { fontSize: 14, color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});
