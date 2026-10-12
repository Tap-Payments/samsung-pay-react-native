export {};

const mockNative = {
  isSamsungPayAvailable: jest.fn(),
  isReady: jest.fn(() => false),
  init: jest.fn(),
  startPayment: jest.fn(() => false),
  dispose: jest.fn(),
  onSamsungPayReady: jest.fn(() => ({ remove: jest.fn() })),
  onSamsungPayClick: jest.fn(() => ({ remove: jest.fn() })),
  onSamsungPaySuccess: jest.fn(() => ({ remove: jest.fn() })),
  onSamsungPayChargeCreated: jest.fn(() => ({ remove: jest.fn() })),
  onSamsungPayOrderCreated: jest.fn(() => ({ remove: jest.fn() })),
  onSamsungPayCancel: jest.fn(() => ({ remove: jest.fn() })),
  onSamsungPayError: jest.fn(() => ({ remove: jest.fn() })),
};

jest.mock('../NativeSamsungPayModule', () => ({
  __esModule: true,
  default: mockNative,
}));

function loadWithPlatform(os: 'android' | 'ios') {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
  }));
  return require('../SamsungPayHeadless')
    .SamsungPay as typeof import('../SamsungPayHeadless').SamsungPay;
}

describe('SamsungPay.isAvailable', () => {
  beforeEach(() => mockNative.isSamsungPayAvailable.mockReset());

  it('returns the native result on Android', () => {
    const SamsungPay = loadWithPlatform('android');
    mockNative.isSamsungPayAvailable.mockReturnValue(true);
    expect(SamsungPay.isAvailable()).toBe(true);
    mockNative.isSamsungPayAvailable.mockReturnValue(false);
    expect(SamsungPay.isAvailable()).toBe(false);
  });

  it('is always false on iOS without touching the native module', () => {
    const SamsungPay = loadWithPlatform('ios');
    expect(SamsungPay.isAvailable()).toBe(false);
    expect(mockNative.isSamsungPayAvailable).not.toHaveBeenCalled();
  });
});

describe('SamsungPay.pay recovery', () => {
  const config = { debug: true } as any;
  let readyCb: (() => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    readyCb = undefined;
    mockNative.init.mockReset();
    mockNative.isReady.mockReset().mockReturnValue(false);
    mockNative.startPayment.mockReset().mockReturnValue(false);
    (mockNative.onSamsungPayReady as jest.Mock)
      .mockReset()
      .mockImplementation((cb: () => void) => {
        readyCb = cb;
        return { remove: jest.fn() };
      });
  });

  afterEach(() => jest.useRealTimers());

  it('rejects when the SDK never becomes ready, and re-inits on the next pay()', async () => {
    const SamsungPay = loadWithPlatform('android');
    const first = SamsungPay.pay(config);
    jest.advanceTimersByTime(20000);
    await expect(first).rejects.toThrow(/did not become ready/);

    // Not stuck: a new pay() starts a fresh init instead of reusing the promise.
    SamsungPay.pay(config).catch(() => {});
    expect(mockNative.init).toHaveBeenCalledTimes(2);
  });

  it('presses the button when ready arrives and clears the timeout', async () => {
    const SamsungPay = loadWithPlatform('android');
    mockNative.startPayment.mockReturnValue(true);
    const result = SamsungPay.pay(config);
    readyCb?.();
    expect(mockNative.startPayment).toHaveBeenCalledTimes(1);
    // The ready deadline must not fire after readiness.
    jest.advanceTimersByTime(30000);
    let settled = false;
    result.then(() => (settled = true)).catch(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // still waiting for the payment outcome
  });

  it('rejects instead of hanging when ready fires but the press is refused', async () => {
    const SamsungPay = loadWithPlatform('android');
    const result = SamsungPay.pay(config);
    mockNative.startPayment.mockReturnValue(false);
    readyCb?.();
    await expect(result).rejects.toThrow(/could not start/);
  });

  it('re-initializes and waits for ready when a warm startPayment() is refused', async () => {
    const SamsungPay = loadWithPlatform('android');
    SamsungPay.init(config);
    mockNative.init.mockClear();
    mockNative.isReady.mockReturnValue(true);
    mockNative.startPayment.mockReturnValue(false);

    const result = SamsungPay.pay(config);
    expect(mockNative.init).toHaveBeenCalledTimes(1);

    mockNative.startPayment.mockReturnValue(true);
    readyCb?.();
    expect(mockNative.startPayment).toHaveBeenCalledTimes(2);
    let settled = false;
    result.then(() => (settled = true)).catch(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
  });
});
