import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { SamsungPayConfiguration } from './types';

export interface SamsungPayButtonProps {
  /** Called when the user presses the button — start the payment here. */
  onPress: () => void;
  /**
   * The same configuration object used everywhere else in the SDK. The button
   * styles itself from `configuration.interface` per Samsung's guidelines:
   * - `theme`: 'dark' → black button / white wordmark; 'light' → white
   *   button / black wordmark with a black keyline border
   * - `locale`: 'ar' → Arabic prefix, right-to-left layout (the Samsung Pay
   *   wordmark itself always stays in Latin script — it is never translated)
   * - `edges`: 'curved' → pill shape; 'flat' → small corner radius
   */
  configuration?: SamsungPayConfiguration;
  /** Overrides `configuration.interface.theme`. */
  theme?: 'dark' | 'light';
  /** Overrides `configuration.interface.edges`. */
  edges?: 'curved' | 'flat';
  /** Overrides `configuration.interface.locale`. */
  locale?: 'en' | 'ar';
  /**
   * Optional text before the brand. Defaults per locale:
   * 'Pay with' (en) / 'ادفع بواسطة' (ar). Pass '' for the brand alone.
   */
  label?: string;
  disabled?: boolean;
  /** Shows a spinner instead of the label (e.g. while pay() is in flight). */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Replaces the default text content — e.g. an <Image> of Samsung's official
   * button asset (downloadable from the Samsung developer portal).
   */
  children?: React.ReactNode;
}

/**
 * A standalone Samsung Pay–branded button with a plain onPress callback,
 * following Samsung's button guidelines (approved black/white variants,
 * untranslated wordmark, 48dp minimum touch height). It does NOT start a
 * payment by itself — wire it to whatever you want, typically the headless
 * one-call API:
 *
 * ```tsx
 * <SamsungPayButton
 *   configuration={config} // theme/locale/edges come from config.interface
 *   onPress={() => SamsungPay.pay(config)}
 * />
 * ```
 */
export function SamsungPayButton({
  onPress,
  configuration,
  theme,
  edges,
  locale,
  label,
  disabled = false,
  loading = false,
  style,
  children,
}: Readonly<SamsungPayButtonProps>): React.ReactElement {
  // Explicit props win; otherwise follow the SDK configuration; then defaults.
  const ui = configuration?.interface;
  const resolvedTheme = theme ?? ui?.theme ?? 'dark';
  const resolvedEdges = edges ?? ui?.edges ?? 'curved';
  const resolvedLocale = locale ?? ui?.locale ?? 'en';

  const isDark = resolvedTheme === 'dark';
  const fg = isDark ? '#FFFFFF' : '#000000';
  const isArabic = resolvedLocale === 'ar';
  const resolvedLabel = label ?? (isArabic ? 'ادفع بواسطة' : 'Pay with');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Samsung Pay"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isDark ? styles.dark : styles.light,
        resolvedEdges === 'curved' ? styles.curved : styles.flat,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        children ?? (
          <View style={[styles.row, isArabic && styles.rowRtl]}>
            {resolvedLabel ? (
              <Text style={[styles.label, { color: fg }]}>
                {resolvedLabel}{' '}
              </Text>
            ) : null}
            <Text style={[styles.brand, { color: fg }]}>Samsung Pay</Text>
          </View>
        )
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // Samsung's guidelines require the button to stay legible and tappable:
    // 48dp matches the SDK's native button minimum and Android touch targets.
    minHeight: 48,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  // Approved variants: black button with white wordmark, or white button
  // with black wordmark and a black keyline so it works on light surfaces.
  dark: { backgroundColor: '#000000' },
  light: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
  // Pill for 'curved' (radius always exceeds half the height), small radius
  // for 'flat' — mirroring the Tap web SDK's edge options.
  curved: { borderRadius: 999 },
  flat: { borderRadius: 8 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { fontSize: 15, fontWeight: '400' },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
});
