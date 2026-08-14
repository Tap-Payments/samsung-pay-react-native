import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
// @ts-ignore – no .d.ts for this path; codegen requires this exact import
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  /**
   * Initializes Samsung Pay headlessly: the SDK's WebView is created natively
   * and attached invisibly (off-screen) to the current activity's window — no
   * component needs to be rendered in the React tree.
   * Calling init again disposes the previous instance and reconfigures.
   */
  init(configuration: string): void;

  /**
   * Programmatically presses the hidden Samsung Pay button.
   * Returns false when not initialized or not ready yet (before onSamsungPayReady).
   */
  startPayment(): boolean;

  /** Whether the hidden button is ready to accept a press. */
  isReady(): boolean;

  /** Tears down the hidden WebView and releases the SDK instance. */
  dispose(): void;

  readonly onSamsungPayReady: EventEmitter<void>;
  readonly onSamsungPayClick: EventEmitter<void>;
  readonly onSamsungPaySuccess: EventEmitter<string>;
  readonly onSamsungPayChargeCreated: EventEmitter<string>;
  readonly onSamsungPayOrderCreated: EventEmitter<string>;
  readonly onSamsungPayCancel: EventEmitter<void>;
  readonly onSamsungPayError: EventEmitter<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SamsungPayModule');
