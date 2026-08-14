import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import NativeSamsungPayView, { Commands } from './NativeSamsungPayView';
import type { SamsungPayConfiguration } from './types';

// Exact values from the Lottie JSONs:
// - 30fps, 21 frames total = 700ms per loop
// - Frames 0-3: hold position (100ms)
// - Frames 3-21: sweep left-to-right (600ms, linear)
// - Shape: 180px wide rect with a 3-stop linear gradient
// - Gradient edges match the background color exactly (invisible seam)
const SHIMMER_HOLD = 100;
const SHIMMER_SWEEP = 600;
const BAND_WIDTH = 180;
const STRIP_COUNT = 20;

const ShimmerBackground = ({ theme }: { theme: 'light' | 'dark' }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  const isLight = theme === 'light';
  const bgColor = isLight ? '#F2F2F2' : '#6B6B6B';

  // Gradient edge RGB (matches background), center RGB (slightly darker)
  // Light: edges #F2F2F2 (242), center #E9E9E9 (233)
  // Dark:  edges #6B6B6B (107), center #5F5F5F (95)
  const edgeVal = isLight ? 242 : 107;
  const centerVal = isLight ? 233 : 95;

  // Position: Lottie anchor [90, ~180], position moves from [-60,y]/[-114,y] to [476,y]
  // Left edge of band = position.x - anchor.x
  // Light: -60-90 = -150  →  476-90 = 386
  // Dark:  -114-90 = -204  →  476-90 = 386
  const startX = isLight ? -150 : -204;

  // Build smooth gradient strips: edge color → center color → edge color
  const strips = useMemo(() => {
    return Array.from({ length: STRIP_COUNT }, (_, i) => {
      const t = i / (STRIP_COUNT - 1);
      const val = Math.round(
        edgeVal + (centerVal - edgeVal) * Math.sin(t * Math.PI)
      );
      return `rgb(${val},${val},${val})`;
    });
  }, [edgeVal, centerVal]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(SHIMMER_HOLD),
        Animated.timing(animValue, {
          toValue: 1,
          duration: SHIMMER_SWEEP,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Reset is invisible: gradient edges = background color
        Animated.timing(animValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animValue]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, 386],
  });

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.shimmerBg,
        { backgroundColor: bgColor },
      ]}
    >
      <Animated.View
        style={[styles.shimmerBand, { transform: [{ translateX }] }]}
      >
        {strips.map((color, i) => (
          <View
            key={i}
            style={[styles.shimmerStrip, { backgroundColor: color }]}
          />
        ))}
      </Animated.View>
    </View>
  );
};

export interface TapSamsungPayProps {
  configuration: SamsungPayConfiguration;
  style?: StyleProp<ViewStyle>;
  /**
   * Chooses the integration mode:
   * - `false` (default) — renders the native Samsung Pay button (WebView).
   * - `true` — hides the native button behind your own view (`children`);
   *   trigger the payment by calling `ref.startPayment()` after
   *   `onSamsungPayReady` has fired.
   *
   * When omitted, the mode is inferred from whether `children` is provided.
   */
  useCustomView?: boolean;
  /**
   * Your own button/view, rendered instead of the native Samsung Pay button
   * when `useCustomView` is true. Trigger the payment from your own press
   * handler by calling `ref.startPayment()` — only after `onSamsungPayReady`.
   */
  children?: React.ReactNode;
  onSamsungPayReady?: () => void;
  onSamsungPayClick?: () => void;
  onSamsungPaySuccess?: (data: string) => void;
  onSamsungPayChargeCreated?: (data: string) => void;
  onSamsungPayOrderCreated?: (data: string) => void;
  onSamsungPayCancel?: () => void;
  onSamsungPayError?: (error: string) => void;
}

export interface TapSamsungPayRef {
  /**
   * Programmatically presses the (hidden) Samsung Pay button.
   * Returns true if the press was dispatched, false if the button is not
   * ready yet (`onSamsungPayReady` has not fired) or a payment is in progress.
   */
  startPayment: () => boolean;
  /** Whether the Samsung Pay button is ready to accept a press. */
  isReady: () => boolean;
}

export const TapSamsungPay = forwardRef<TapSamsungPayRef, TapSamsungPayProps>(
  function TapSamsungPay(
    {
      configuration,
      style,
      useCustomView,
      children,
      onSamsungPayReady,
      onSamsungPayClick,
      onSamsungPaySuccess,
      onSamsungPayChargeCreated,
      onSamsungPayOrderCreated,
      onSamsungPayCancel,
      onSamsungPayError,
    },
    ref
  ): React.ReactElement | null {
    const inProgress = useRef(false);
    const isReadyRef = useRef(false);
    const nativeRef =
      useRef<React.ElementRef<typeof NativeSamsungPayView>>(null);
    // Bumping this key remounts the native view, giving a fresh button identical to first launch.
    const [reloadKey, setReloadKey] = useState(0);

    const handleReady = useCallback(() => {
      isReadyRef.current = true;
      onSamsungPayReady?.();
    }, [onSamsungPayReady]);

    const handleClick = useCallback(
      (_event: { nativeEvent: object }) => {
        if (inProgress.current) return;
        inProgress.current = true;
        onSamsungPayClick?.();
      },
      [onSamsungPayClick]
    );

    const handleSuccess = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        inProgress.current = false;
        isReadyRef.current = false;
        onSamsungPaySuccess?.(event.nativeEvent.data);
        setReloadKey((k) => k + 1);
      },
      [onSamsungPaySuccess]
    );

    const handleChargeCreated = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        onSamsungPayChargeCreated?.(event.nativeEvent.data);
        // Reset the button to its first-launch state by remounting the native view.
        inProgress.current = false;
        isReadyRef.current = false;
        setReloadKey((k) => k + 1);
      },
      [onSamsungPayChargeCreated]
    );

    const handleOrderCreated = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        onSamsungPayOrderCreated?.(event.nativeEvent.data);
      },
      [onSamsungPayOrderCreated]
    );

    const handleCancel = useCallback(
      (_event: { nativeEvent: object }) => {
        inProgress.current = false;
        onSamsungPayCancel?.();
      },
      [onSamsungPayCancel]
    );

    const handleError = useCallback(
      (event: { nativeEvent: { error: string } }) => {
        inProgress.current = false;
        onSamsungPayError?.(event.nativeEvent.error);
      },
      [onSamsungPayError]
    );

    const startPayment = useCallback((): boolean => {
      if (!isReadyRef.current) {
        console.warn(
          '[TapSamsungPay] startPayment() called before onSamsungPayReady — ignored.'
        );
        return false;
      }
      if (inProgress.current) {
        return false;
      }
      if (!nativeRef.current) {
        return false;
      }
      Commands.triggerPayment(nativeRef.current);
      return true;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        startPayment,
        isReady: () => isReadyRef.current,
      }),
      [startPayment]
    );

    if (Platform.OS !== 'android') {
      return null;
    }

    // Explicit boolean wins; when omitted, infer from the presence of children.
    const hasCustomView = useCustomView ?? children != null;

    const nativeView = (
      <NativeSamsungPayView
        key={reloadKey}
        ref={nativeRef}
        style={styles.nativeView}
        configuration={JSON.stringify(configuration)}
        onSamsungPayReady={handleReady}
        onSamsungPayClick={handleClick}
        onSamsungPaySuccess={handleSuccess}
        onSamsungPayChargeCreated={handleChargeCreated}
        onSamsungPayOrderCreated={handleOrderCreated}
        onSamsungPayCancel={handleCancel}
        onSamsungPayError={handleError}
      />
    );

    if (hasCustomView) {
      // Custom-view mode: the native button (WebView) stays mounted and laid out
      // behind the user's view, but invisible and untouchable. Payment is
      // triggered programmatically via ref.startPayment().
      return (
        <View style={[style, styles.customContainer]}>
          <View style={styles.hiddenNative} pointerEvents="none">
            {nativeView}
          </View>
          {children}
        </View>
      );
    }

    return (
      <View style={[style, styles.container]}>
        <ShimmerBackground theme={configuration.interface?.theme ?? 'light'} />
        {nativeView}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { minHeight: 48, borderRadius: 8, overflow: 'hidden' },
  // Custom-view mode: the user's view sizes the container; no forced radius.
  customContainer: { minHeight: 48 },
  // Keeps the WebView attached and laid out (it must have a real size to
  // receive the synthetic press) while staying invisible under the custom view.
  hiddenNative: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  nativeView: { flex: 1 },
  shimmerBg: { overflow: 'hidden', borderRadius: 8 },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: BAND_WIDTH,
    flexDirection: 'row',
  },
  shimmerStrip: { flex: 1 },
});
