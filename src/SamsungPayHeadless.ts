import { Platform } from 'react-native';
import type { EventSubscription } from 'react-native';
import type { SamsungPayConfiguration } from './types';

export interface SamsungPayEvents {
  ready: () => void;
  click: () => void;
  success: (data: string) => void;
  chargeCreated: (data: string) => void;
  orderCreated: (data: string) => void;
  cancel: () => void;
  error: (error: string) => void;
}

/** Outcome of a `SamsungPay.pay()` call. */
export type SamsungPayResult =
  | { status: 'success'; data: string }
  | { status: 'chargeCreated'; data: string }
  | { status: 'cancelled' };

// Lazily loaded so importing the library on iOS (where the module doesn't
// exist) never throws — TapSamsungPay renders null there and SamsungPay
// becomes a no-op.
function getModule() {
  if (Platform.OS !== 'android') return null;
  try {
    return require('./NativeSamsungPayModule').default;
  } catch (e) {
    console.error(
      '[SamsungPay] Native module not found. The app binary was built before ' +
        'samsung-pay-react-native added SamsungPayModule — rebuild and reinstall ' +
        'the Android app (a JS reload is not enough).',
      e
    );
    return null;
  }
}

// --- internal state driving the one-call pay() flow ---
let initializedConfigJson: string | null = null;
let awaitingReady = false;
let internalSubsAttached = false;
let pending: {
  promise: Promise<SamsungPayResult>;
  resolve: (result: SamsungPayResult) => void;
  reject: (error: Error) => void;
} | null = null;

function settle(result: SamsungPayResult) {
  if (pending) {
    const p = pending;
    pending = null;
    p.resolve(result);
  }
}

/**
 * One set of module-level subscriptions that drives pay(): auto-presses the
 * button once ready, and settles the pending promise on a terminal event.
 * User listeners via addListener() are independent and unaffected.
 */
function ensureInternalSubscriptions(
  module: NonNullable<ReturnType<typeof getModule>>
) {
  if (internalSubsAttached) return;
  internalSubsAttached = true;
  module.onSamsungPayReady(() => {
    if (awaitingReady && pending) {
      awaitingReady = false;
      module.startPayment();
    }
  });
  module.onSamsungPaySuccess((data: string) =>
    settle({ status: 'success', data })
  );
  module.onSamsungPayChargeCreated((data: string) =>
    settle({ status: 'chargeCreated', data })
  );
  module.onSamsungPayCancel(() => settle({ status: 'cancelled' }));
  module.onSamsungPayError((error: string) => {
    awaitingReady = false;
    // Force a fresh init on the next pay() — the current instance may be broken.
    initializedConfigJson = null;
    if (pending) {
      const p = pending;
      pending = null;
      p.reject(new Error(error));
    }
  });
}

/**
 * Headless Samsung Pay API — nothing to render in your component tree.
 *
 * One-call usage (init + ready + press handled internally):
 * ```ts
 * const result = await SamsungPay.pay(config);
 * if (result.status !== 'cancelled') console.log(result.data);
 * ```
 *
 * Or granular control:
 * ```ts
 * SamsungPay.init(config);
 * const sub = SamsungPay.addListener('ready', () => setCanPay(true));
 * // later, from any screen:
 * SamsungPay.startPayment();
 * ```
 */
export const SamsungPay = {
  /**
   * The one-call payment flow: initializes Samsung Pay if needed (skipped when
   * already initialized with the same configuration), waits for readiness,
   * presses the hidden button, and resolves with the outcome —
   * `{ status: 'success' | 'chargeCreated', data }` or `{ status: 'cancelled' }`.
   * Rejects on SDK errors (and on iOS, where Samsung Pay is unavailable).
   *
   * Calling it again while a payment is in flight returns the same promise.
   */
  pay(configuration: SamsungPayConfiguration): Promise<SamsungPayResult> {
    const module = getModule();
    if (!module) {
      return Promise.reject(
        new Error('Samsung Pay is only available on Android.')
      );
    }
    if (pending) return pending.promise;
    ensureInternalSubscriptions(module);

    let resolve!: (result: SamsungPayResult) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<SamsungPayResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    pending = { promise, resolve, reject };

    const json = JSON.stringify(configuration);
    if (json === initializedConfigJson && module.isReady()) {
      // Warm instance with the same configuration — pay immediately.
      module.startPayment();
    } else {
      awaitingReady = true;
      if (json !== initializedConfigJson) {
        initializedConfigJson = json;
        module.init(json);
      }
      // Same config but not ready yet: init is in flight; the internal
      // 'ready' listener presses the button when it lands.
    }
    return promise;
  },

  /**
   * Initializes Samsung Pay with the given configuration. The SDK's WebView is
   * created natively and kept hidden — no component in the React tree.
   * Safe to call again to reconfigure (the previous instance is disposed).
   * Optional when using `pay()`, but calling it early (e.g. when the checkout
   * screen mounts) pre-warms the flow so the first `pay()` is instant.
   */
  init(configuration: SamsungPayConfiguration): void {
    const module = getModule();
    if (!module) return;
    ensureInternalSubscriptions(module);
    initializedConfigJson = JSON.stringify(configuration);
    module.init(initializedConfigJson);
  },

  /**
   * Presses the hidden Samsung Pay button. Only valid after the `ready` event
   * has fired; returns false (and warns) otherwise.
   */
  startPayment(): boolean {
    const module = getModule();
    if (!module) return false;
    const dispatched = module.startPayment();
    if (!dispatched) {
      console.warn(
        '[SamsungPay] startPayment() ignored — call init() and wait for the "ready" event first.'
      );
    }
    return dispatched;
  },

  /** Whether the hidden button is ready to accept a press. */
  isReady(): boolean {
    return getModule()?.isReady() ?? false;
  },

  /** Tears down the hidden WebView. Call when payment flows are done. */
  dispose(): void {
    initializedConfigJson = null;
    awaitingReady = false;
    if (pending) {
      const p = pending;
      pending = null;
      p.reject(new Error('Samsung Pay was disposed.'));
    }
    getModule()?.dispose();
  },

  /**
   * Subscribes to a payment lifecycle event. Returns a subscription — call
   * `.remove()` on unmount.
   */
  addListener<K extends keyof SamsungPayEvents>(
    event: K,
    listener: SamsungPayEvents[K]
  ): EventSubscription {
    const module = getModule();
    if (!module) {
      return { remove: () => {} };
    }
    switch (event) {
      case 'ready':
        return module.onSamsungPayReady(listener as () => void);
      case 'click':
        return module.onSamsungPayClick(listener as () => void);
      case 'success':
        return module.onSamsungPaySuccess(listener as (data: string) => void);
      case 'chargeCreated':
        return module.onSamsungPayChargeCreated(
          listener as (data: string) => void
        );
      case 'orderCreated':
        return module.onSamsungPayOrderCreated(
          listener as (data: string) => void
        );
      case 'cancel':
        return module.onSamsungPayCancel(listener as () => void);
      case 'error':
        return module.onSamsungPayError(listener as (error: string) => void);
      default:
        return { remove: () => {} };
    }
  },
};
