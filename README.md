# Samsung Pay React Native Integration Guide

This guide demonstrates how to integrate the Samsung Pay SDK into your React Native application using the [Tap-Payments Samsung Pay Android SDK](https://github.com/Tap-Payments/SamsungPay-Android). Android only; the component renders nothing on iOS.

## Overview

The Samsung Pay React Native wrapper enables you to process Samsung Pay transactions in your React Native app. This guide covers installation, configuration (including hash string generation), implementation, and callback handling.

### Integration modes

Pick whichever fits your UI — all modes share the same configuration and lifecycle events:

| Mode | What you render | How the payment starts |
|------|-----------------|------------------------|
| **Native button** | `<TapSamsungPay />` | User taps the official Samsung Pay button |
| **Custom view** | `<TapSamsungPay useCustomView>` + your own view | Your press handler calls `ref.startPayment()` |
| **Headless (one call)** | Nothing — no component in the tree | Any JS function calls `await SamsungPay.pay(config)` |
| **Headless (granular)** | Nothing | `SamsungPay.init(config)` once, then `SamsungPay.startPayment()` from anywhere |
| **Branded button** | `<SamsungPayButton />` — a plain button with Samsung Pay styling | Your `onPress` callback (typically calls `SamsungPay.pay(config)`) |

Under the hood every mode drives the same hidden Tap SDK WebView; in the custom/headless modes it stays invisible (off-screen, alpha 0) and the SDK presses its button for you with a synthetic native tap.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Hash String Calculation](#hash-string-calculation)
5. [Implementation](#implementation)
6. [Callback Handling](#callback-handling)
7. [Configuration Parameters Reference](#configuration-parameters-reference)
8. [Complete Example](#complete-example)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Requirements

- **React Native**: 0.78+ (New Architecture / Fabric required)
- **Platform**: Android only (minimum SDK 24+, target 33+)
- **Dependencies**: [Tap-Payments Samsung Pay Android SDK](https://github.com/Tap-Payments/SamsungPay-Android) (pulled via JitPack)

---

## Installation

### Step 1: Install the package

```sh
npm install samsung-pay-react-native
# or
yarn add samsung-pay-react-native
```

### Step 2: Add JitPack repository

In your project-level `android/build.gradle`:

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}
```

### Step 3: Add permissions

In `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### Step 4: Minimum SDK

Ensure your app uses Android API 24 or higher:

```gradle
minSdkVersion 24
```

---

## Configuration

### 1. Define configuration object

Set up the configuration object matching the Tap SDK structure. The `operator.hashString` must be generated for request validation (see [Hash String Calculation](#hash-string-calculation)).

```typescript
import type { SamsungPayConfiguration } from 'samsung-pay-react-native';

const config: SamsungPayConfiguration = {
  operator: {
    publicKey: 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX',
    hashString: '', // Generate server-side; see Hash String Calculation
  },
  order: {
    id: '',
    amount: 0.1,
    currency: 'KWD',
  },
  merchant: { id: '' },
  customer: {
    id: '',
    contact: {
      email: 'email@example.com',
      phone: { countryCode: '965', number: '6617090' },
    },
    name: [{ lang: 'en', first: 'TAP', middle: '', last: 'PAYMENTS' }],
  },
  interface: { locale: 'en', edges: 'curved' },
  reference: { transaction: '', order: '' },
  post: { url: '' },
  scope: 'charge',
  redirect: 'tappaybuttonwebsdk://',
  metadata: '',
  paymentMethod: 'samsungpay',
  platform: 'mobile',
  debug: true,
};
```

---

## Hash String Calculation

The `operator.hashString` is an **HMAC-SHA256** hash used for request validation. For security, **generate it on your server** (never put the secret key in the app), then pass it in the configuration.

### Message format

Concatenate the following in order (no separators):

| Part        | Value              | Example                    |
|------------|--------------------|----------------------------|
| `x_publickey` | `operator.publicKey` | `pk_test_xxx`              |
| `x_amount`   | amount (e.g. 3 decimal places) | `0.100`                    |
| `x_currency` | `order.currency`    | `KWD`                      |
| `x_transaction` | `reference.transaction` | ``                         |
| `x_post`    | `post.url`          | ``                         |

**Example message string:**

```
x_publickeypk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXx_amount0.100x_currencyKWDx_transactionx_post
```

### Algorithm: HMAC-SHA256

- **Key**: Your public key (same as `operator.publicKey`) — for production, Tap may require a separate secret; refer to [Tap Payments Documentation](https://tap.company/).
- **Message**: The string above.
- **Output**: Hexadecimal string (lowercase).

### Server-side example (Node.js)

```javascript
const crypto = require('crypto');

function getHashString(publicKey, amount, currency, transactionRef, postUrl) {
  const amountStr = Number(amount).toFixed(3);
  const msg = `x_publickey${publicKey}x_amount${amountStr}x_currency${currency}x_transaction${transactionRef || ''}x_post${postUrl || ''}`;
  return crypto.createHmac('sha256', publicKey).update(msg).digest('hex');
}

// Usage: generate on your backend and send to the app
const hashString = getHashString(
  'pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX',
  0.1,
  'KWD',
  '',
  ''
);
// Pass hashString in config.operator.hashString
```

### Kotlin reference (Android / backend)

If your backend is in Kotlin, you can use the same format as the [Samsung Pay Android README](https://github.com/Tap-Payments/SamsungPay-Android):

```kotlin
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.util.Formatter

object Hmac {
    fun digest(msg: String, key: String, alg: String = "HmacSHA256"): String {
        val signingKey = SecretKeySpec(key.toByteArray(), alg)
        val mac = Mac.getInstance(alg)
        mac.init(signingKey)
        val bytes = mac.doFinal(msg.toByteArray())
        val formatter = Formatter()
        bytes.forEach { formatter.format("%02x", it) }
        return formatter.toString()
    }
}

val amountStr = "%.3f".format(amount)
val stringMsg = "x_publickey${publicKey}x_amount${amountStr}x_currency${currency}x_transaction${transactionReference}x_post$postUrl"
val hashString = Hmac.digest(msg = stringMsg, key = publicKey)
```

---

## Implementation

### Step 1: Import the component

```tsx
import { TapSamsungPay } from 'samsung-pay-react-native';
import type { SamsungPayConfiguration } from 'samsung-pay-react-native';
```

### Step 2: Render the button

Use the `TapSamsungPay` component with your configuration and callbacks. The component enforces a minimum height of 48pt so the native button is not clipped.

```tsx
<TapSamsungPay
  style={{ width: '100%', height: 56 }}
  configuration={config}
  onSamsungPayReady={() => console.log('Ready')}
  onSamsungPayClick={() => console.log('Click')}
  onSamsungPaySuccess={(data) => console.log('Success', data)}
  onSamsungPayChargeCreated={(data) => console.log('Charge', data)}
  onSamsungPayOrderCreated={(data) => console.log('Order', data)}
  onSamsungPayCancel={() => console.log('Cancel')}
  onSamsungPayError={(error) => console.error('Error', error)}
/>
```

### Step 3 (optional): Use your own custom button

The `useCustomView` boolean chooses between the two integration modes:

| `useCustomView` | Behavior |
|-----------------|----------|
| `false` (default) | Renders the default native Samsung Pay button |
| `true` | Hides the native button behind your own view (`children`); you trigger the payment via `ref.startPayment()` |

If `useCustomView` is omitted, the mode is inferred from whether `children` is provided.

In custom mode the native Samsung Pay button (a WebView) stays mounted but hidden behind your view, and you trigger the payment programmatically through the component ref.

`startPayment()` only works after `onSamsungPayReady` has fired — calls before that are ignored (it returns `false`). Disable your button until then.

```tsx
import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { TapSamsungPay } from 'samsung-pay-react-native';
import type { TapSamsungPayRef } from 'samsung-pay-react-native';

function Checkout() {
  const payRef = useRef<TapSamsungPayRef>(null);
  const [isReady, setIsReady] = useState(false);

  return (
    <TapSamsungPay
      ref={payRef}
      configuration={config}
      useCustomView={true}
      onSamsungPayReady={() => setIsReady(true)}
      onSamsungPaySuccess={(data) => console.log('Success', data)}
      onSamsungPayError={(error) => console.error('Error', error)}
    >
      {/* Your own view — rendered instead of the native button */}
      <Pressable
        disabled={!isReady}
        onPress={() => payRef.current?.startPayment()}
        style={{ height: 48, borderRadius: 24, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#fff' }}>Pay with Samsung Pay</Text>
      </Pressable>
    </TapSamsungPay>
  );
}
```

**Ref API:**

| Method | Returns | Description |
|--------|---------|-------------|
| `startPayment()` | `boolean` | Presses the hidden Samsung Pay button. Returns `true` if dispatched; `false` if not ready yet or a payment is already in progress |
| `isReady()` | `boolean` | Whether `onSamsungPayReady` has fired for the current button instance |

All lifecycle callbacks (`onSamsungPayClick`, `onSamsungPaySuccess`, etc.) fire exactly as they do in default mode.

### Step 4 (optional): Headless mode — no component at all

If you don't want anything in your component tree, use the `SamsungPay` module instead of the `TapSamsungPay` component. The SDK's WebView is created natively and attached invisibly off-screen, so any JS button anywhere can start a payment.

**One-call usage** — `pay()` handles everything (init if needed, wait for readiness, press, and resolve with the outcome):

```tsx
import { SamsungPay } from 'samsung-pay-react-native';

async function onPayPress() {
  try {
    const result = await SamsungPay.pay(config);
    // result: { status: 'success' | 'chargeCreated', data } or { status: 'cancelled' }
    if (result.status !== 'cancelled') {
      console.log(result.status, result.data);
    }
  } catch (e) {
    console.error('Samsung Pay error', e);
  }
}
```

Tip: also call `SamsungPay.init(config)` when your checkout screen mounts — `pay()` then skips initialization and fires instantly. Without it, the first `pay()` call initializes on demand (a couple of seconds before the payment sheet appears).

**Granular usage** — init once, listen to events, trigger when you choose:

```tsx
import { useEffect, useState } from 'react';
import { SamsungPay } from 'samsung-pay-react-native';

function AnyScreen() {
  const [canPay, setCanPay] = useState(false);

  useEffect(() => {
    SamsungPay.init(config); // safe to call again to reconfigure

    const subs = [
      SamsungPay.addListener('ready', () => setCanPay(true)),
      SamsungPay.addListener('success', (data) => console.log('Success', data)),
      SamsungPay.addListener('chargeCreated', (data) => console.log('Charge', data)),
      SamsungPay.addListener('cancel', () => console.log('Cancelled')),
      SamsungPay.addListener('error', (error) => console.error(error)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return (
    <Button
      title="Pay with Samsung Pay"
      disabled={!canPay}
      onPress={() => SamsungPay.startPayment()}
    />
  );
}
```

**Module API:**

| Method | Returns | Description |
|--------|---------|-------------|
| `pay(configuration)` | `Promise<SamsungPayResult>` | One call for the whole flow: initializes if needed, waits for readiness, presses the button, resolves with `{ status: 'success' \| 'chargeCreated', data }` or `{ status: 'cancelled' }`; rejects on errors. Re-calling while in flight returns the same promise |
| `init(configuration)` | `void` | Creates the hidden Samsung Pay WebView natively. Call after the app is visible. Re-calling disposes the previous instance and reconfigures |
| `startPayment()` | `boolean` | Presses the hidden button. Returns `false` (with a warning) before the `ready` event or while a payment is in progress |
| `isReady()` | `boolean` | Whether the button is ready for a press |
| `addListener(event, cb)` | `EventSubscription` | Events: `ready`, `click`, `success`, `chargeCreated`, `orderCreated`, `cancel`, `error`. Call `.remove()` on unmount |
| `dispose()` | `void` | Tears down the hidden WebView |

After `success`/`chargeCreated` the hidden button is recreated automatically, so the next `startPayment()` works once `ready` fires again.

**`SamsungPayResult` type:**

```ts
type SamsungPayResult =
  | { status: 'success'; data: string }        // scope 'taptoken'
  | { status: 'chargeCreated'; data: string }  // scope 'charge'
  | { status: 'cancelled' };
```

**Combining `pay()` with listeners** — they don't conflict. `pay()` gives you the *outcome* (one awaitable answer per attempt) while `addListener` gives you the *play-by-play* (every intermediate event, useful for analytics, logging, or enabling a pre-warmed button). Every event is delivered to both — your `success` listener fires *and* the `pay()` promise resolves:

```tsx
useEffect(() => {
  const subs = [
    SamsungPay.addListener('ready', () => console.log('warm')),
    SamsungPay.addListener('orderCreated', (data) => analytics.track('order', data)),
    SamsungPay.addListener('error', (err) => console.warn(err)),
  ];
  return () => subs.forEach((s) => s.remove());
}, []);

const onPay = async () => {
  const result = await SamsungPay.pay(config); // outcome still arrives here
};
```

### Step 5 (optional): The branded button component

`SamsungPayButton` is a standalone Samsung Pay–styled button that only fires a callback — it starts nothing by itself, so you can wire it to any flow (usually the one-call API):

The simplest form passes your existing configuration — the button styles itself from `configuration.interface` (`theme`, `locale`, `edges`), so it always matches the rest of your Samsung Pay setup:

```tsx
import { SamsungPay, SamsungPayButton } from 'samsung-pay-react-native';

<SamsungPayButton
  configuration={config}               // theme/locale/edges from config.interface
  onPress={() => SamsungPay.pay(config)}
/>
```

Every option can also be set (or overridden) individually:

```tsx
<SamsungPayButton
  onPress={() => SamsungPay.pay(config)}
  theme="dark"        // 'dark' (default) | 'light' — black vs white variant
  edges="curved"      // 'curved' (default) | 'flat' — pill vs small radius
  locale="en"         // 'en' (default) | 'ar' — Arabic prefix + RTL layout
  label="Pay with"    // overrides the locale default; pass '' for brand only
  loading={inFlight}  // spinner while pay() is pending
  disabled={false}
  style={{ marginTop: 16 }}
/>
```

Guideline alignment: the two approved color variants (black button/white wordmark, and white button/black wordmark with a black keyline), a 48dp minimum touch height, and an untranslated Samsung Pay wordmark — `locale="ar"` renders "ادفع بواسطة Samsung Pay" right-to-left while keeping the wordmark in Latin script, per Samsung's branding guidelines.

Unlike `<TapSamsungPay />` (which renders the official button from the Tap web SDK and starts the payment itself), `SamsungPayButton` is pure UI — no configuration, no WebView, works before `init()` is ever called.

Note on official branding: Samsung does not ship a native button widget in any SDK — they distribute [official button image assets and branding guidelines](https://developer.samsung.com/pay/downloads-and-resources/branding-guidelines.html) instead. For pixel-authentic branding either use `<TapSamsungPay />` (the Tap web SDK renders Samsung's real button), or download the official asset and pass it as `children`:

```tsx
<SamsungPayButton onPress={() => SamsungPay.pay(config)}>
  <Image source={require('./assets/samsung-pay-button.png')} style={{ height: 24 }} resizeMode="contain" />
</SamsungPayButton>
```

### Tip: building a payment-methods bottom sheet

A common pattern is a bottom sheet where the user picks Samsung Pay among other payment methods, optionally remembering the choice so later checkouts skip the sheet. Since the headless `SamsungPay` API needs no component in the tree, the sheet can be plain UI. See the working demo in [`example/src/PaymentSheet.tsx`](example/src/PaymentSheet.tsx) and its wiring in [`example/src/App.tsx`](example/src/App.tsx).

---

## Callback Handling

Implement the optional callbacks to handle payment lifecycle events:

| Callback | Payload | Description |
|----------|---------|-------------|
| `onSamsungPayReady` | — | SDK initialized, button visible and tappable |
| `onSamsungPayClick` | — | User tapped the payment button |
| `onSamsungPaySuccess` | `data: string` | Payment completed successfully; `data` contains transaction details |
| `onSamsungPayChargeCreated` | `data: string` | Charge created on Tap gateway |
| `onSamsungPayOrderCreated` | `data: string` | Order created on Tap gateway |
| `onSamsungPayCancel` | — | User cancelled or dismissed the payment sheet |
| `onSamsungPayError` | `error: string` | Error during init or payment |

**Example:**

```tsx
<TapSamsungPay
  configuration={config}
  onSamsungPayReady={() => setStatus('Ready')}
  onSamsungPayClick={() => setStatus('Processing...')}
  onSamsungPaySuccess={(data) => setStatus(`Success: ${data}`)}
  onSamsungPayChargeCreated={(data) => setStatus(`Charge: ${data}`)}
  onSamsungPayOrderCreated={(data) => setStatus(`Order: ${data}`)}
  onSamsungPayCancel={() => setStatus('Cancelled')}
  onSamsungPayError={(err) => setStatus(`Error: ${err}`)}
/>
```

---

## Configuration Parameters Reference

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **operator.publicKey** | string | Your merchant public key | `pk_test_xxx`, `pk_live_xxx` |
| **operator.hashString** | string | HMAC-SHA256 hash for validation | From [Hash String Calculation](#hash-string-calculation) |
| **order.id** | string | Unique order identifier | `order_123` |
| **order.amount** | number | Transaction amount | `0.1` |
| **order.currency** | string | Currency code | `KWD`, `USD`, `SAR` |
| **customer.name[0].lang** | string | Language code | `en`, `ar` |
| **customer.name[0].first** | string | Customer first name | `John` |
| **customer.contact.email** | string | Customer email | `customer@example.com` |
| **customer.contact.phone.countryCode** | string | Phone country code | `965`, `966` |
| **customer.contact.phone.number** | string | Phone number | `6617090` |
| **interface.locale** | string | UI language | `en`, `ar` |
| **interface.edges** | string | Button edge style | `curved`, `flat` |
| **scope** | string | Transaction scope | `charge` |
| **paymentMethod** | string | Payment method | `samsungpay` |
| **platform** | string | Platform type | `mobile` |
| **debug** | boolean | Debug mode | `true`, `false` |

---

## Complete Example

```tsx
import { useState } from 'react';
import { StyleSheet, Text, ScrollView } from 'react-native';
import { TapSamsungPay } from 'samsung-pay-react-native';
import type { SamsungPayConfiguration } from 'samsung-pay-react-native';

const config: SamsungPayConfiguration = {
  operator: {
    publicKey: 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX',
    hashString: '', // Generate server-side before rendering
  },
  order: { id: '', amount: 0.1, currency: 'KWD' },
  merchant: { id: '' },
  customer: {
    id: '',
    contact: {
      email: 'test@example.com',
      phone: { countryCode: '965', number: '6617090' },
    },
    name: [{ lang: 'en', first: 'TAP', middle: '', last: 'PAYMENTS' }],
  },
  interface: { locale: 'en', edges: 'curved' },
  reference: { transaction: '', order: '' },
  post: { url: '' },
  scope: 'charge',
  redirect: 'tappaybuttonwebsdk://',
  metadata: '',
  paymentMethod: 'samsungpay',
  platform: 'mobile',
  debug: true,
};

export default function App() {
  const [lastEvent, setLastEvent] = useState('Waiting...');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Samsung Pay Demo</Text>
      <Text style={styles.eventLabel}>Last event:</Text>
      <Text style={styles.event}>{lastEvent}</Text>
      <TapSamsungPay
        style={styles.button}
        configuration={config}
        onSamsungPayReady={() => setLastEvent('onSamsungPayReady')}
        onSamsungPayClick={() => setLastEvent('onSamsungPayClick')}
        onSamsungPaySuccess={(data) => setLastEvent(`onSamsungPaySuccess:\n${data}`)}
        onSamsungPayChargeCreated={(data) => setLastEvent(`onSamsungPayChargeCreated:\n${data}`)}
        onSamsungPayOrderCreated={(data) => setLastEvent(`onSamsungPayOrderCreated:\n${data}`)}
        onSamsungPayCancel={() => setLastEvent('onSamsungPayCancel')}
        onSamsungPayError={(error) => setLastEvent(`onSamsungPayError:\n${error}`)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 24 },
  eventLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  event: { fontSize: 13, color: '#333', marginBottom: 32, textAlign: 'center' },
  button: { width: '100%', height: 56 },
});
```

---

## Best Practices

1. **API keys**: Use environment-specific keys (e.g. `pk_test_*` for development, `pk_live_*` for production).
2. **Hash string**: Generate `operator.hashString` on your server; do not embed the signing secret in the app.
3. **Error handling**: Implement all callbacks, especially `onSamsungPayError`, and surface errors to the user.
4. **Testing**: Test with test keys and a real Samsung Pay–capable device or emulator before going live.
5. **User experience**: Show loading or status text during payment (e.g. in `onSamsungPayClick` / `onSamsungPaySuccess`).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `TurboModuleRegistry.getEnforcing(...): 'SamsungPayModule' could not be found` | The app binary predates the headless module — rebuild and reinstall the Android app (`npx expo run:android` / `gradlew installDebug`); a JS/Metro reload is not enough |
| `startPayment()` returns `false` / warns | It was called before the `ready` event (or while a payment is in flight). Wait for `ready`, or use `SamsungPay.pay()` which handles readiness itself |
| First `pay()` is slow (~2s) | Without pre-warming, `pay()` initializes on demand. Call `SamsungPay.init(config)` when the checkout screen mounts to make the first press instant |
| SDK not initializing | Check `operator.publicKey`, JitPack in `build.gradle`, and INTERNET permission |
| HMAC hash mismatch | Ensure message format and key match server-side; use the exact concatenation order |
| Button not visible / clipped | Use at least 48pt height (e.g. `height: 56`); the component enforces `minHeight: 48` |
| Payment fails silently | Implement `onSamsungPayError` and check logs |
| Network errors | Confirm INTERNET permission and device connectivity |

---

## Support

- [Tap Payments Documentation](https://tap.company/)
- [Samsung Pay Android SDK (GitHub)](https://github.com/Tap-Payments/SamsungPay-Android)
- [Samsung Pay RN SDK (GitHub)](https://github.com/Tap-Payments/samsung-pay-react-native)
---

## License

This React Native wrapper and the underlying Samsung Pay Android SDK are provided by Tap Payments.
