import type * as React from 'react';
import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent, codegenNativeCommands } from 'react-native';
// @ts-ignore – no .d.ts for this path; codegen requires this exact import
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeSamsungPayViewProps extends ViewProps {
  configuration: string;
  onSamsungPayReady?: DirectEventHandler<Readonly<{}>>;
  onSamsungPayClick?: DirectEventHandler<Readonly<{}>>;
  onSamsungPaySuccess?: DirectEventHandler<Readonly<{ data: string }>>;
  onSamsungPayChargeCreated?: DirectEventHandler<Readonly<{ data: string }>>;
  onSamsungPayOrderCreated?: DirectEventHandler<Readonly<{ data: string }>>;
  onSamsungPayCancel?: DirectEventHandler<Readonly<{}>>;
  onSamsungPayError?: DirectEventHandler<Readonly<{ error: string }>>;
}

type NativeSamsungPayViewComponent = HostComponent<NativeSamsungPayViewProps>;

interface NativeCommands {
  /**
   * Programmatically presses the Samsung Pay button inside the (possibly hidden)
   * native WebView. Only valid after onSamsungPayReady has fired.
   */
  triggerPayment: (
    viewRef: React.ElementRef<NativeSamsungPayViewComponent>
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['triggerPayment'],
});

export default codegenNativeComponent<NativeSamsungPayViewProps>(
  'NativeSamsungPayView'
) as NativeSamsungPayViewComponent;
