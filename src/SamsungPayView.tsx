import React, { useRef, useCallback } from 'react';
import {
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import NativeSamsungPayView from './NativeSamsungPayView';
import type { SamsungPayConfiguration } from './types';

export interface TapSamsungPayProps {
  configuration: SamsungPayConfiguration;
  style?: StyleProp<ViewStyle>;
  onSamsungPayReady?: () => void;
  onSamsungPayClick?: () => void;
  onSamsungPaySuccess?: (data: string) => void;
  onSamsungPayChargeCreated?: (data: string) => void;
  onSamsungPayOrderCreated?: (data: string) => void;
  onSamsungPayCancel?: () => void;
  onSamsungPayError?: (error: string) => void;
}

export function TapSamsungPay({
  configuration,
  style,
  onSamsungPayReady,
  onSamsungPayClick,
  onSamsungPaySuccess,
  onSamsungPayChargeCreated,
  onSamsungPayOrderCreated,
  onSamsungPayCancel,
  onSamsungPayError,
}: Readonly<TapSamsungPayProps>): React.ReactElement | null {
  const inProgress = useRef(false);

  const handleReady = useCallback(() => {
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
      onSamsungPaySuccess?.(event.nativeEvent.data);
    },
    [onSamsungPaySuccess]
  );

  const handleChargeCreated = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      onSamsungPayChargeCreated?.(event.nativeEvent.data);
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

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <NativeSamsungPayView
      style={[style, styles.minHeight]}
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
}

const styles = StyleSheet.create({
  minHeight: { minHeight: 48 },
});
