import { useState } from 'react';
import { StyleSheet, Text, ScrollView } from 'react-native';
import { TapSamsungPay } from 'samsung-pay-react-native';
import type { SamsungPayConfiguration } from 'samsung-pay-react-native';

const config: SamsungPayConfiguration = {
  operator: {
    publicKey: 'pk_live_3zIsCFeStGLv8DNd9m054bYc',
    hashString: '', // generate server-side before rendering
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
      email: 'test@example.com',
      phone: { countryCode: '965', number: '6617090' },
    },
    name: [{ lang: 'en', first: 'TAP', middle: '', last: 'PAYMENTS' }],
  },
  interface: { locale: 'en', edges: 'curved', theme: 'light' },
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
        onSamsungPayReady={() =>
          setLastEvent('onSamsungPayReady — button ready')
        }
        onSamsungPayClick={() =>
          setLastEvent('onSamsungPayClick — sheet launching')
        }
        onSamsungPaySuccess={(data) =>
          setLastEvent(`onSamsungPaySuccess:\n${data}`)
        }
        onSamsungPayChargeCreated={(data) =>
          setLastEvent(`onSamsungPayChargeCreated:\n${data}`)
        }
        onSamsungPayOrderCreated={(data) =>
          setLastEvent(`onSamsungPayOrderCreated:\n${data}`)
        }
        onSamsungPayCancel={() =>
          setLastEvent('onSamsungPayCancel — user cancelled')
        }
        onSamsungPayError={(error) =>
          setLastEvent(`onSamsungPayError:\n${error}`)
        }
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  eventLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  event: {
    fontSize: 13,
    color: '#333',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 43,
    overflow: 'visible',
  },
});
