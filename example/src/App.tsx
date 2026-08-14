import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { SamsungPay, SamsungPayButton } from 'samsung-pay-react-native';
import type { SamsungPayConfiguration } from 'samsung-pay-react-native';
import { PaymentSheet } from './PaymentSheet';
import type { PaymentMethod } from './PaymentSheet';

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
  scope: 'taptoken',
  redirect: 'tappaybuttonwebsdk://',
  metadata: '',
  paymentMethod: 'samsungpay',
  platform: 'mobile',
  debug: true,
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  samsungpay: 'Samsung Pay',
  card: 'Credit / Debit Card',
  knet: 'KNET',
};

export default function App() {
  const [events, setEvents] = useState<string[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  // Demo-only "saved method": kept in memory. Persist it (e.g. AsyncStorage)
  // in a real app.
  const savedMethod = useRef<PaymentMethod | null>(null);

  useEffect(() => {
    // Optional: observe the lifecycle (analytics, logging, UI state...)
    const subs = [
      SamsungPay.addListener('ready', () => addEvent('warm')),
      SamsungPay.addListener('click', () => addEvent('sheet launching')),
      SamsungPay.addListener('orderCreated', (data) =>
        addEvent(`order: ${JSON.stringify(data)}`)
      ),
      SamsungPay.addListener('success', (data) =>
        addEvent(`success: ${JSON.stringify(data)}`)
      ),
      SamsungPay.addListener('chargeCreated', (data) =>
        addEvent(`charge: ${JSON.stringify(data)}`)
      ),
      SamsungPay.addListener('cancel', () => addEvent('cancelled')),
      SamsungPay.addListener('error', (err) =>
        addEvent(`error: ${JSON.stringify(err)}`)
      ),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const addEvent = (message: string) => {
    setEvents((prev) => [...prev, message]);
  };

  // Selecting in the sheet doesn't pay — it puts a labeled pay button on
  // the screen; that button starts the actual payment.
  const handleSelect = (method: PaymentMethod, remember: boolean) => {
    setSheetVisible(false);
    setSelectedMethod(method);
    if (remember) {
      savedMethod.current = method;
      addEvent(`saved "${METHOD_LABELS[method]}" as payment method`);
    }
  };

  const payWith = (method: PaymentMethod) => {
    if (method === 'samsungpay') {
      // The whole Samsung Pay integration is this ONE call: it initializes
      // on demand, waits for readiness, presses the hidden button, and
      // settles with the outcome. (Optionally call SamsungPay.init(config)
      // earlier to pre-warm so this fires instantly.)
      addEvent('pay() started…');
      SamsungPay.pay(config)
        .then((result) =>
          addEvent(
            `pay() resolved: ${result.status}` +
              ('data' in result ? `\n${result.data}` : '')
          )
        )
        .catch((e: Error) => addEvent(`pay() rejected: ${e.message}`));
    } else {
      // Dummy methods — wire up your real payment flows here.
      addEvent(`paying with "${METHOD_LABELS[method]}" (demo only)`);
    }
  };

  const handleCheckout = () => {
    const saved = savedMethod.current;
    // Saved method: skip the sheet and show its pay button directly.
    if (saved) {
      addEvent(`using saved method "${METHOD_LABELS[saved]}" — no sheet`);
      setSelectedMethod(saved);
      return;
    }
    setSheetVisible(true);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Samsung Pay Demo</Text>

      <Pressable style={styles.checkoutButton} onPress={handleCheckout}>
        <Text style={styles.checkoutButtonText}>Checkout — 0.100 KWD</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          savedMethod.current = null;
          setSelectedMethod(null);
          addEvent('saved payment method cleared');
        }}
      >
        <Text style={styles.forgetLink}>Forget saved payment method</Text>
      </Pressable>

      {/* Pay button for the method picked in the sheet. For Samsung Pay we
          use the SDK's branded button — just a button with a callback. */}
      {selectedMethod === 'samsungpay' ? (
        <SamsungPayButton
          configuration={config} // theme/locale/edges follow config.interface
          style={styles.samsungPayButton}
          onPress={() => payWith('samsungpay')}
        />
      ) : selectedMethod ? (
        <Pressable
          style={styles.payButton}
          onPress={() => payWith(selectedMethod)}
        >
          <Text style={styles.payButtonText}>
            Pay 0.100 KWD with {METHOD_LABELS[selectedMethod]}
          </Text>
        </Pressable>
      ) : null}

      <PaymentSheet
        visible={sheetVisible}
        subtitle="Total: 0.100 KWD"
        onSelect={handleSelect}
        onClose={() => setSheetVisible(false)}
      />

      <Text style={styles.eventLabel}>Events ({events.length}):</Text>
      {events.length === 0 ? (
        <Text style={styles.event}>Waiting...</Text>
      ) : (
        events.map((event, index) => (
          <Text key={index} style={styles.event}>
            {index + 1}. {event}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    color: 'white',
  },
  checkoutButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgetLink: {
    color: '#8A8A8E',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    textDecorationLine: 'underline',
  },
  samsungPayButton: {
    marginTop: 16,
    height: 52,
  },
  payButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 32,
    marginBottom: 12,
    fontWeight: '600',
  },
  event: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'left',
    lineHeight: 20,
    color: 'white',
  },
});
