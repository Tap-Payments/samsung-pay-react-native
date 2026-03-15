import type { ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';
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

export default codegenNativeComponent<NativeSamsungPayViewProps>(
  'NativeSamsungPayView'
);
