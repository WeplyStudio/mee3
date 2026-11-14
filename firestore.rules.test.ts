/**
 * Security Rules Dirty Dozen Verification Suite (`firestore.rules.test.ts`)
 * Verifies all 12 adversarial payloads defined in `security_spec.md` are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on StoreProduct',
    collectionPath: '/storeProducts/prod_netflix',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'weply.my.id@gmail.com', email_verified: true },
    payload: {
      title: 'Netflix Premium 4K',
      category: 'Streaming',
      description: 'Full 30 days UHD warranty',
      price: 35000,
      durationLabel: '30 Hari',
      stockCount: 5,
      ratingAvg: 5,
      ratingCount: 1,
      badge: 'Best Seller',
      isFeaturedHack: true, // Ghost field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof on Admin Product Create',
    collectionPath: '/storeProducts/prod_netflix',
    operation: 'create',
    auth: { uid: 'spoof_admin', email: 'weply.my.id@gmail.com', email_verified: false },
    payload: {
      title: 'Netflix Premium 4K',
      category: 'Streaming',
      description: 'Full 30 days UHD warranty',
      price: 35000,
      durationLabel: '30 Hari',
      stockCount: 5,
      ratingAvg: 5,
      ratingCount: 1,
      badge: 'Best Seller',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on StoreOrder Create',
    collectionPath: '/storeOrders/ord_spoof',
    operation: 'create',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      buyerUid: 'uid_victim',
      status: 'paid',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unfiltered PII Scraping on StoreOrder List',
    collectionPath: '/storeOrders',
    operation: 'list',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Client Timestamp Forgery on StoreOrder Create',
    collectionPath: '/storeOrders/ord_forged_time',
    operation: 'create',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      buyerUid: 'uid_buyer',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Poisoning Attack with Invalid Characters',
    collectionPath: '/storeOrders/ord_invalid$id!',
    operation: 'create',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      buyerUid: 'uid_buyer',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Value Poisoning on StoreOrder Rating Update (Out of Range > 5)',
    collectionPath: '/storeOrders/ord_valid',
    operation: 'update',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      rating: 999,
      reviewComment: 'Poisoned rating',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Price Tampering on StoreProduct by Non-Admin Buyer',
    collectionPath: '/storeProducts/prod_netflix',
    operation: 'update',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      price: 1,
      stockCount: 4,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Refund Window Bypass (> 3 Days / 259,200,000 ms after purchase)',
    collectionPath: '/storeOrders/ord_expired_refund',
    operation: 'update',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      status: 'refund_requested',
      refundReason: 'Requesting refund after 5 days',
      refundRequestedAtMs: 1700500000000, // > 3 days after purchasedAtMs (1700000000000)
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned StoreReview Creation without Existing Order',
    collectionPath: '/storeReviews/rev_orphan',
    operation: 'create',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      productId: 'prod_nonexistent',
      orderId: 'ord_nonexistent',
      buyerUid: 'uid_buyer',
      rating: 5,
      comment: 'Fake review',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Credential Overwrite Attack on StoreStockItem by Buyer',
    collectionPath: '/storeStock/stk_1',
    operation: 'update',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      status: 'sold',
      buyerUid: 'uid_buyer',
      accountPassword: 'hacked_password',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-User PII Read on StoreRestockAlert',
    collectionPath: '/storeRestockAlerts/alert_victim',
    operation: 'get',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
