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
