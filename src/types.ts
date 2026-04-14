export interface SamsungPayPhone {
  countryCode: string;
  number: string;
}

export interface SamsungPayContact {
  email: string;
  phone: SamsungPayPhone;
}

export interface SamsungPayName {
  lang: 'en' | 'ar';
  first: string;
  middle?: string;
  last: string;
}

export interface SamsungPayCustomer {
  id?: string;
  contact: SamsungPayContact;
  name: SamsungPayName[];
}

export interface SamsungPayOperator {
  publicKey: string;
  hashString: string;
}

export interface SamsungPayOrder {
  id?: string;
  amount: number;
  currency: string;
}

export interface SamsungPayMerchant {
  id?: string;
}

export interface SamsungPayInterface {
  locale: 'en' | 'ar';
  edges: 'curved' | 'flat';
  theme: 'light' | 'dark';
}

export interface SamsungPayReference {
  transaction?: string;
  order?: string;
}

export interface SamsungPayPost {
  url?: string;
}

export interface SamsungPayConfiguration {
  operator: SamsungPayOperator;
  order: SamsungPayOrder;
  merchant: SamsungPayMerchant;
  customer: SamsungPayCustomer;
  interface: SamsungPayInterface;
  reference?: SamsungPayReference;
  post?: SamsungPayPost;
  scope: 'charge';
  redirect: string;
  metadata?: string;
  paymentMethod: 'samsungpay';
  platform: 'mobile';
  debug?: boolean;
}
