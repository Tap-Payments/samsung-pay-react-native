# Samsung Pay React Native Integration Guide

This guide demonstrates how to integrate the Samsung Pay SDK into your React Native application using the [Tap-Payments Samsung Pay Android SDK](https://github.com/Tap-Payments/SamsungPay-Android). Android only; the component renders nothing on iOS.

## Overview

The Samsung Pay React Native wrapper enables you to process Samsung Pay transactions in your React Native app. This guide covers installation, configuration (including hash string generation), implementation, and callback handling.

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
| SDK not initializing | Check `operator.publicKey`, JitPack in `build.gradle`, and INTERNET permission |
| HMAC hash mismatch | Ensure message format and key match server-side; use the exact concatenation order |
| Button not visible / clipped | Use at least 48pt height (e.g. `height: 56`); the component enforces `minHeight: 48` |
| Payment fails silently | Implement `onSamsungPayError` and check logs |
| Network errors | Confirm INTERNET permission and device connectivity |

---

## Support

- [Tap Payments Documentation](https://tap.company/)
- [Samsung Pay Android SDK (GitHub)](https://github.com/Tap-Payments/SamsungPay-Android)

---

## License

This React Native wrapper and the underlying Samsung Pay Android SDK are provided by Tap Payments.
