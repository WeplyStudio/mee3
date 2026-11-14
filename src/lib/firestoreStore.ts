import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const ADMIN_EMAIL = 'matchboxdevelopment@gmail.com';
export const ADMIN_EMAILS = ['matchboxdevelopment@gmail.com', 'weply.my.id@gmail.com'];

export const TEN_MINUTES_MS = 10 * 60 * 1000; // 600,000 ms (10 menit cooldown anti-fraud)
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 259,200,000 ms (3 hari batas klaim)

export const LEGACY_FAKE_PRODUCT_IDS = [
  'prod_netflix_uhd',
  'prod_spotify_ind',
  'prod_chatgpt_plus',
  'prod_canva_pro',
  'prod_youtube_prem',
];

export type WijayapayMethodCode = 'QRIS' | 'BCAVA' | 'BNIVA' | 'ALFAMART' | 'INDOMARET';
export type ProductDeliveryType = 'account' | 'redeem';
export type RefundSolutionType = 'refund_money' | 'replace_item';
export type RefundTicketStatus = 'open' | 'approved_refund' | 'approved_replace' | 'rejected';

export interface WijayapayPaymentMethodOption {
  id: WijayapayMethodCode;
  label: string;
  shortLabel: string;
  category: 'qris' | 'va' | 'retail';
  feeLabel: string;
}

export const WIJAYAPAY_PAYMENT_METHODS: WijayapayPaymentMethodOption[] = [
  {
    id: 'QRIS',
    label: 'QRIS (Semua E-Wallet & Mobile Banking)',
    shortLabel: 'QRIS',
    category: 'qris',
    feeLabel: 'Verifikasi Otomatis Instan',
  },
  {
    id: 'BCAVA',
    label: 'BCA Virtual Account',
    shortLabel: 'BCA VA',
    category: 'va',
    feeLabel: 'Nomor VA Otomatis',
  },
  {
    id: 'BNIVA',
    label: 'BNI Virtual Account',
    shortLabel: 'BNI VA',
    category: 'va',
    feeLabel: 'Nomor VA Otomatis',
  },
  {
    id: 'ALFAMART',
    label: 'Alfamart / Alfamidi Retail',
    shortLabel: 'Alfamart',
    category: 'retail',
    feeLabel: 'Kode Pembayaran Gerai',
  },
  {
    id: 'INDOMARET',
    label: 'Indomaret Retail',
    shortLabel: 'Indomaret',
    category: 'retail',
    feeLabel: 'Kode Pembayaran Gerai',
  },
];

export interface WijayapayTransactionData {
  payment_name: string;
  payment_method: WijayapayMethodCode | string;
  total_bayar: number;
  total_fee: number;
  total_diterima: number;
  ref_id: string;
  trx_reference: string;
  expired: string;
  callback_url: string;
  tutorial_pembayaran?: string;
  qr_image?: string;
  qr_string?: string;
  pay_code?: string;
  nomor_va?: string;
  nomor_pembayaran?: string;
}

export interface ProductVariantOption {
  id: string;
  label: string;
  durationLabel: string;
  price: number;
  deliveryType?: ProductDeliveryType;
}

export interface StructuredStockRowInput {
  accountEmail: string;
  accountPassword: string;
  accountNotes: string;
}

export interface RefundChatMessage {
  id: string;
  senderRole: 'admin' | 'user';
  senderName: string;
  text: string;
  sentAtMs: number;
}

// ==========================================
// TOXIC FILTER (Exact character length masking)
// ==========================================
const TOXIC_WORDS_LIST = [
  'anjing',
  'anjir',
  'anjrit',
  'anjay',
  'bangsat',
  'bgst',
  'babi',
  'monyet',
  'kampret',
  'kontol',
  'kntl',
  'memek',
  'mmk',
  'ngentot',
  'entot',
  'jancok',
  'jancuk',
  'dancok',
  'cok',
  'asu',
  'bajingan',
  'tolol',
  'goblok',
  'goblog',
  'bodoh',
  'bego',
  'idiot',
  'setan',
  'iblis',
  'tai',
  'taik',
  'tahi',
  'perek',
  'lonte',
  'pelacur',
  'sialan',
  'keparat',
  'brengsek',
  'pantek',
  'puki',
  'pukimak',
  'kimak',
  'fuck',
  'fck',
  'fucking',
  'fucker',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'motherfucker',
  'penipu',
  'nipu',
  'sampah',
  'cacat',
  'laknat',
];

const TOXIC_REGEX = new RegExp(
  `\\b(${TOXIC_WORDS_LIST.slice()
    .sort((a, b) => b.length - a.length)
    .join('|')})\\b`,
  'gi'
);

export function censorToxicWords(input: string): string {
  if (!input) return '';
  return input.replace(TOXIC_REGEX, (matchedWord) => '*'.repeat(matchedWord.length));
}

// ==========================================
// REFUND COOLDOWN (10 MIN) & EXPIRY (3 DAYS)
// ==========================================
export function evaluateOrderRefundEligibility(
  purchasedAtMs: number,
  nowMs: number = Date.now()
): {
  state: 'cooldown' | 'eligible' | 'expired';
  eligible: boolean;
  waitRemainingMs: number;
  expiryRemainingMs: number;
  label: string;
} {
  const elapsedMs = Math.max(0, nowMs - purchasedAtMs);

  if (elapsedMs < TEN_MINUTES_MS) {
    const waitRemainingMs = TEN_MINUTES_MS - elapsedMs;
    const waitMin = Math.floor(waitRemainingMs / 60000);
    const waitSec = Math.ceil((waitRemainingMs % 60000) / 1000);
    return {
      state: 'cooldown',
      eligible: false,
      waitRemainingMs,
      expiryRemainingMs: THREE_DAYS_MS - elapsedMs,
      label: `Menunggu ${waitMin > 0 ? `${waitMin}m ` : ''}${waitSec}d (wajib tunggu 10 menit setelah transaksi)`,
    };
  }

  if (elapsedMs > THREE_DAYS_MS) {
    return {
      state: 'expired',
      eligible: false,
      waitRemainingMs: 0,
      expiryRemainingMs: 0,
      label: 'Masa klaim garansi 3 hari telah berakhir',
    };
  }

  const expiryRemainingMs = THREE_DAYS_MS - elapsedMs;
  const totalHours = Math.floor(expiryRemainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return {
    state: 'eligible',
    eligible: true,
    waitRemainingMs: 0,
    expiryRemainingMs,
    label: `Bisa diajukan refund (sisa waktu ${days}h ${hours}j)`,
  };
}

// ==========================================
// AUTO-COMPRESS PROOF IMAGE (< 1MB, Firestore safe)
// ==========================================
export async function compressRefundProofImage(file: File): Promise<{
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  wasCompressed: boolean;
}> {
  const originalBytes = file.size;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Format gambar tidak valid.'));
    image.src = rawDataUrl;
  });

  // Target <= 280KB per image in base64 so 2 photos fit safely in Firestore (< 900KB total) and < 1MB
  const MAX_TARGET_CHARS = 360000;
  const maxDimension = originalBytes > 1024 * 1024 ? 1100 : 1280;

  let width = img.width;
  let height = img.height;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal menginisialisasi kompresi gambar.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = originalBytes > 1024 * 1024 ? 0.72 : 0.82;
  let outputDataUrl = canvas.toDataURL('image/jpeg', quality);

  while (outputDataUrl.length > MAX_TARGET_CHARS && quality > 0.32) {
    quality -= 0.1;
    outputDataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (outputDataUrl.length > MAX_TARGET_CHARS) {
    const smallerCanvas = document.createElement('canvas');
    smallerCanvas.width = Math.max(1, Math.round(width * 0.7));
    smallerCanvas.height = Math.max(1, Math.round(height * 0.7));
    const sCtx = smallerCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#ffffff';
      sCtx.fillRect(0, 0, smallerCanvas.width, smallerCanvas.height);
      sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
      outputDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.65);
    }
  }

  const compressedBytes = Math.round((outputDataUrl.length * 3) / 4);
  return {
    dataUrl: outputDataUrl,
    originalBytes,
    compressedBytes,
    wasCompressed: originalBytes > 1024 * 1024 || compressedBytes < originalBytes,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned.length > 0 && ID_REGEX.test(cleaned) ? cleaned : `id_${Date.now()}`;
}

export function clampString(val: string, maxLength: number, fallback = ''): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed && fallback) return fallback.slice(0, maxLength);
  return trimmed.slice(0, maxLength);
}

// Entity Interfaces
export interface StoreProductRecord {
  id: string;
  title: string;
  category: string;
  description: string;
  usageGuide: string;
  variantsJson: string;
  price: number;
  durationLabel: string;
  stockCount: number;
  ratingAvg: number;
  ratingCount: number;
  badge: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StoreStockItemRecord {
  id: string;
  productId: string;
  productTitle: string;
  variantId: string;
  variantLabel: string;
  accountEmail: string;
  accountPassword: string;
  accountNotes: string;
  status: 'available' | 'sold' | 'refunded';
  buyerUid: string;
  orderId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StoreOrderRecord {
  id: string;
  invoiceCode: string;
  trxReference: string;
  productId: string;
  productTitle: string;
  variantId: string;
  variantLabel: string;
  durationLabel: string;
  price: number;
  paymentMethod: string;
  status: 'paid' | 'refund_requested' | 'refunded' | 'refund_rejected';
  stockId: string;
  deliveredEmail: string;
  deliveredPassword: string;
  deliveredNotes: string;
  usageGuide: string;
  buyerUid: string;
  buyerEmail: string;
  buyerName: string;
  purchasedAtMs: number;
  rating: number;
  reviewComment: string;
  refundReason: string;
  refundRequestedAtMs: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StoreRefundTicketRecord {
  id: string;
  orderId: string;
  invoiceCode: string;
  productId: string;
  productTitle: string;
  price: number;
  buyerUid: string;
  buyerEmail: string;
  buyerName: string;
  reason: string;
  solutionType: RefundSolutionType;
  status: RefundTicketStatus;
  canUserReply: boolean;
  proofImagesJson: string;
  messagesJson: string;
  replacementCredentials: string;
  createdAtMs: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StoreReviewRecord {
  id: string;
  productId: string;
  productTitle: string;
  orderId: string;
  buyerUid: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt?: Timestamp | null;
}

export interface StoreRestockAlertRecord {
  id: string;
  productId: string;
  productTitle: string;
  userUid: string;
  userEmail: string;
  status: 'waiting' | 'notified';
  notifiedAtMs: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export function serializeVariants(
  variants: ProductVariantOption[],
  deliveryType: ProductDeliveryType = 'account'
): string {
  const sanitized: ProductVariantOption[] = (variants || [])
    .filter((v) => v && v.label && v.label.trim().length > 0)
    .map((v, idx) => ({
      id: sanitizeId(v.id || `var_${idx + 1}`),
      label: clampString(v.label, 80, `Variasi ${idx + 1}`),
      durationLabel: clampString(v.durationLabel, 60, '30 Hari'),
      price: Math.max(0, Math.min(1000000000, Math.round(Number(v.price) || 0))),
      deliveryType: v.deliveryType || deliveryType,
    }));

  if (sanitized.length === 0) {
    sanitized.push({
      id: 'var_reguler',
      label: 'Paket Reguler',
      durationLabel: '30 Hari',
      price: 0,
      deliveryType,
    });
  }

  return JSON.stringify(sanitized).slice(0, 4000);
}

export function getVariantsForProduct(product: {
  id: string;
  variantsJson?: string;
  durationLabel: string;
  price: number;
}): ProductVariantOption[] {
  if (product.variantsJson) {
    try {
      const parsed = JSON.parse(product.variantsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((v: any, idx: number) => ({
          id: sanitizeId(String(v.id || `var_${idx + 1}`)),
          label: clampString(String(v.label || `Variasi ${idx + 1}`), 80, `Variasi ${idx + 1}`),
          durationLabel: clampString(
            String(v.durationLabel || product.durationLabel || '30 Hari'),
            60,
            '30 Hari'
          ),
          price: Math.max(0, Math.round(Number(v.price ?? product.price) || 0)),
          deliveryType: v.deliveryType === 'redeem' ? 'redeem' : 'account',
        }));
      }
    } catch {
      // Fallback below
    }
  }
  return [
    {
      id: sanitizeId(`${product.id}_reguler`),
      label: `Paket Reguler (${product.durationLabel || '30 Hari'})`,
      durationLabel: product.durationLabel || '30 Hari',
      price: product.price,
      deliveryType: 'account',
    },
  ];
}

export function getProductDeliveryType(product: {
  id: string;
  variantsJson?: string;
  durationLabel: string;
  price: number;
}): ProductDeliveryType {
  const vars = getVariantsForProduct(product);
  return vars[0]?.deliveryType === 'redeem' ? 'redeem' : 'account';
}

export function parseTicketProofImages(proofImagesJson: string): string[] {
  try {
    const parsed = JSON.parse(proofImagesJson || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string' && item.startsWith('data:image/'));
    }
  } catch {}
  return [];
}

export function parseTicketMessages(messagesJson: string): RefundChatMessage[] {
  try {
    const parsed = JSON.parse(messagesJson || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map((m: any, idx: number) => ({
        id: String(m.id || `msg_${idx}`),
        senderRole: m.senderRole === 'admin' ? 'admin' : 'user',
        senderName: String(m.senderName || 'Pengguna'),
        text: String(m.text || ''),
        sentAtMs: Number(m.sentAtMs || 0),
      }));
    }
  } catch {}
  return [];
}

export function isUserAdmin(user: User | null): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutStoreUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

// Real-time Subscriptions
export function subscribeStoreProducts(
  onData: (products: StoreProductRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'storeProducts';
  const q = query(collection(db, path), where('price', '>=', 0));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoreProductRecord[] = snapshot.docs
        .map((d) => {
          const raw = d.data() as any;
          return {
            id: d.id,
            title: String(raw.title || ''),
            category: String(raw.category || 'Premium'),
            description: String(raw.description || ''),
            usageGuide: String(raw.usageGuide || ''),
            variantsJson: String(raw.variantsJson || '[]'),
            price: Number(raw.price || 0),
            durationLabel: String(raw.durationLabel || '30 Hari'),
            stockCount: Number(raw.stockCount || 0),
            ratingAvg: Number(raw.ratingAvg ?? 5),
            ratingCount: Number(raw.ratingCount || 0),
            badge: String(raw.badge || ''),
            createdAt: raw.createdAt || null,
            updatedAt: raw.updatedAt || null,
          };
        })
        .filter((item) => !LEGACY_FAKE_PRODUCT_IDS.includes(item.id));
      items.sort((a, b) => a.title.localeCompare(b.title));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeStoreReviews(
  onData: (reviews: StoreReviewRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'storeReviews';
  const q = query(collection(db, path), where('rating', '>=', 1));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoreReviewRecord[] = snapshot.docs.map((d) => {
        const raw = d.data() as Omit<StoreReviewRecord, 'id'>;
        return {
          id: d.id,
          ...raw,
          comment: censorToxicWords(String(raw.comment || '')),
        };
      });
      items.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() ?? 0;
        const tB = b.createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserOrders(
  userUid: string,
  adminMode: boolean,
  onData: (orders: StoreOrderRecord[]) => void
) {
  const path = 'storeOrders';
  const q = adminMode
    ? query(collection(db, path))
    : query(collection(db, path), where('buyerUid', '==', userUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoreOrderRecord[] = snapshot.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          invoiceCode: String(raw.invoiceCode || d.id),
          trxReference: String(raw.trxReference || ''),
          productId: String(raw.productId || ''),
          productTitle: String(raw.productTitle || ''),
          variantId: String(raw.variantId || 'var_reguler'),
          variantLabel: String(raw.variantLabel || raw.durationLabel || 'Reguler'),
          durationLabel: String(raw.durationLabel || '30 Hari'),
          price: Number(raw.price || 0),
          paymentMethod: String(raw.paymentMethod || 'QRIS'),
          status: raw.status || 'paid',
          stockId: String(raw.stockId || ''),
          deliveredEmail: String(raw.deliveredEmail || ''),
          deliveredPassword: String(raw.deliveredPassword || ''),
          deliveredNotes: String(raw.deliveredNotes || ''),
          usageGuide: String(raw.usageGuide || ''),
          buyerUid: String(raw.buyerUid || ''),
          buyerEmail: String(raw.buyerEmail || ''),
          buyerName: String(raw.buyerName || ''),
          purchasedAtMs: Number(raw.purchasedAtMs || 0),
          rating: Number(raw.rating || 0),
          reviewComment: censorToxicWords(String(raw.reviewComment || '')),
          refundReason: String(raw.refundReason || ''),
          refundRequestedAtMs: Number(raw.refundRequestedAtMs || 0),
          createdAt: raw.createdAt || null,
          updatedAt: raw.updatedAt || null,
        };
      });
      items.sort((a, b) => b.purchasedAtMs - a.purchasedAtMs);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeRefundTickets(
  userUid: string,
  adminMode: boolean,
  onData: (tickets: StoreRefundTicketRecord[]) => void
) {
  const path = 'storeRefundTickets';
  const q = adminMode
    ? query(collection(db, path))
    : query(collection(db, path), where('buyerUid', '==', userUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoreRefundTicketRecord[] = snapshot.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          orderId: String(raw.orderId || ''),
          invoiceCode: String(raw.invoiceCode || ''),
          productId: String(raw.productId || ''),
          productTitle: String(raw.productTitle || ''),
          price: Number(raw.price || 0),
          buyerUid: String(raw.buyerUid || ''),
          buyerEmail: String(raw.buyerEmail || ''),
          buyerName: String(raw.buyerName || ''),
          reason: String(raw.reason || ''),
          solutionType: raw.solutionType === 'replace_item' ? 'replace_item' : 'refund_money',
          status: raw.status || 'open',
          canUserReply: Boolean(raw.canUserReply),
          proofImagesJson: String(raw.proofImagesJson || '[]'),
          messagesJson: String(raw.messagesJson || '[]'),
          replacementCredentials: String(raw.replacementCredentials || ''),
          createdAtMs: Number(raw.createdAtMs || 0),
          createdAt: raw.createdAt || null,
          updatedAt: raw.updatedAt || null,
        };
      });
      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAdminStock(onData: (stock: StoreStockItemRecord[]) => void) {
  const path = 'storeStock';
  const q = query(collection(db, path));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoreStockItemRecord[] = snapshot.docs
        .map((d) => {
          const raw = d.data() as any;
          return {
            id: d.id,
            productId: String(raw.productId || ''),
            productTitle: String(raw.productTitle || ''),
            variantId: String(raw.variantId || 'var_reguler'),
            variantLabel: String(raw.variantLabel || 'Paket Reguler'),
            accountEmail: String(raw.accountEmail || ''),
            accountPassword: String(raw.accountPassword || ''),
            accountNotes: String(raw.accountNotes || ''),
            status: raw.status || 'available',
            buyerUid: String(raw.buyerUid || ''),
            orderId: String(raw.orderId || ''),
            createdAt: raw.createdAt || null,
            updatedAt: raw.updatedAt || null,
          };
        })
        .filter(
          (stk) =>
            !LEGACY_FAKE_PRODUCT_IDS.includes(stk.productId) &&
            !stk.accountEmail.endsWith('@jayss-vault.id')
        );
      items.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() ?? 0;
        const tB = b.createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAvailableStockByVariant(
  onData: (countsByVariantKey: Record<string, number>) => void
) {
  const path = 'storeStock';
  const q = query(collection(db, path), where('status', '==', 'available'));
  return onSnapshot(
    q,
    (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach((d) => {
        const raw = d.data() as any;
        const prodId = String(raw.productId || '');
        const varId = String(raw.variantId || 'var_reguler');
        if (!prodId || LEGACY_FAKE_PRODUCT_IDS.includes(prodId)) return;
        const key = `${prodId}__${varId}`;
        counts[key] = (counts[key] || 0) + 1;
        counts[`${prodId}__total`] = (counts[`${prodId}__total`] || 0) + 1;
      });
      onData(counts);
    },
    () => {
      onData({});
    }
  );
}

export function subscribeUserRestockAlerts(
  userUid: string,
  adminMode: boolean,
  onData: (alerts: StoreRestockAlertRecord[]) => void
) {
  const path = 'storeRestockAlerts';
  const q = adminMode
    ? query(collection(db, path))
    : query(collection(db, path), where('userUid', '==', userUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoreRestockAlertRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StoreRestockAlertRecord, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Purge any legacy starter fake products and fake stock from Firestore
export async function purgeLegacyFakeStoreData(): Promise<number> {
  let deletedCount = 0;
  try {
    for (const fakeProdId of LEGACY_FAKE_PRODUCT_IDS) {
      const snap = await getDoc(doc(db, 'storeProducts', fakeProdId));
      if (snap.exists()) {
        await deleteDoc(doc(db, 'storeProducts', fakeProdId));
        deletedCount++;
      }
    }

    const stockSnap = await getDocs(collection(db, 'storeStock'));
    for (const stkDoc of stockSnap.docs) {
      const raw = stkDoc.data() as any;
      if (
        LEGACY_FAKE_PRODUCT_IDS.includes(String(raw.productId || '')) ||
        String(raw.accountEmail || '').endsWith('@jayss-vault.id')
      ) {
        await deleteDoc(doc(db, 'storeStock', stkDoc.id));
        deletedCount++;
      }
    }
  } catch (err) {
    console.warn('Purge legacy data warning:', err);
  }
  return deletedCount;
}

// Admin: Create Product with Variations, Delivery Type & Usage Guide
export async function createStoreProduct(input: {
  id?: string;
  title: string;
  category: string;
  description: string;
  usageGuide: string;
  deliveryType: ProductDeliveryType;
  variants: ProductVariantOption[];
  badge: string;
  stockCount?: number;
  ratingAvg?: number;
  ratingCount?: number;
}): Promise<StoreProductRecord> {
  const productId = sanitizeId(
    input.id || `prod_${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`
  );
  const path = `storeProducts/${productId}`;
  const variantsJson = serializeVariants(input.variants, input.deliveryType);
  const parsedVariants: ProductVariantOption[] = JSON.parse(variantsJson);
  const lowestVariant = parsedVariants.reduce(
    (min, v) => (v.price < min.price ? v : min),
    parsedVariants[0]
  );

  const payload = {
    title: clampString(input.title, 120, 'Produk Digital'),
    category: clampString(input.category, 60, 'Premium'),
    description: clampString(input.description, 600, 'Produk digital resmi bergaransi.'),
    usageGuide: clampString(
      input.usageGuide,
      2500,
      input.deliveryType === 'redeem'
        ? '1. Salin kode redeem yang diberikan di atas.\n2. Tukarkan kode pada halaman atau aplikasi resmi.'
        : '1. Masuk menggunakan email & password akun yang tertera di atas.\n2. Gunakan sesuai ketentuan variasi agar garansi tetap aktif.'
    ),
    variantsJson,
    price: Math.max(0, Math.min(1000000000, Math.round(Number(lowestVariant.price) || 0))),
    durationLabel: clampString(lowestVariant.durationLabel, 60, '30 Hari'),
    stockCount: Math.max(0, Math.min(100000, Math.round(Number(input.stockCount) || 0))),
    ratingAvg: Math.max(0, Math.min(5, Number(input.ratingAvg ?? 5))),
    ratingCount: Math.max(0, Math.min(1000000, Math.round(Number(input.ratingCount) || 0))),
    badge: clampString(input.badge, 40, ''),
  };

  try {
    await setDoc(doc(db, 'storeProducts', productId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: productId,
      ...payload,
      createdAt: null,
      updatedAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Admin: Edit / Update Existing Product, Variations, Delivery Type & Usage Guide
export async function updateStoreProduct(
  productId: string,
  input: {
    title: string;
    category: string;
    description: string;
    usageGuide: string;
    deliveryType: ProductDeliveryType;
    variants: ProductVariantOption[];
    badge: string;
  }
): Promise<StoreProductRecord> {
  const cleanId = sanitizeId(productId);
  const path = `storeProducts/${cleanId}`;
  const prodRef = doc(db, 'storeProducts', cleanId);
  const variantsJson = serializeVariants(input.variants, input.deliveryType);
  const parsedVariants: ProductVariantOption[] = JSON.parse(variantsJson);
  const lowestVariant = parsedVariants.reduce(
    (min, v) => (v.price < min.price ? v : min),
    parsedVariants[0]
  );

  try {
    const snap = await getDoc(prodRef);
    if (snap.exists()) {
      const existingData = snap.data();
      const updatedFields = {
        title: clampString(input.title, 120, 'Produk Digital'),
        category: clampString(input.category, 60, 'Premium'),
        description: clampString(input.description, 600, 'Produk digital resmi bergaransi.'),
        usageGuide: clampString(
          input.usageGuide,
          2500,
          input.deliveryType === 'redeem'
            ? '1. Salin kode redeem yang diberikan di atas.\n2. Tukarkan kode pada halaman atau aplikasi resmi.'
            : '1. Masuk menggunakan email & password akun yang tertera di atas.\n2. Gunakan sesuai ketentuan variasi agar garansi tetap aktif.'
        ),
        variantsJson,
        price: Math.max(0, Math.min(1000000000, Math.round(Number(lowestVariant.price) || 0))),
        durationLabel: clampString(lowestVariant.durationLabel, 60, '30 Hari'),
        badge: clampString(input.badge, 40, ''),
        stockCount: Math.max(0, Math.min(100000, Math.round(Number(existingData.stockCount) || 0))),
        ratingAvg: Math.max(0, Math.min(5, Number(existingData.ratingAvg ?? 5))),
        ratingCount: Math.max(0, Math.min(1000000, Math.round(Number(existingData.ratingCount) || 0))),
      };
      await updateDoc(prodRef, {
        ...updatedFields,
        createdAt: existingData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: cleanId,
        ...updatedFields,
        createdAt: existingData.createdAt || null,
        updatedAt: null,
      };
    } else {
      return await createStoreProduct({
        id: cleanId,
        ...input,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Admin: Delete Product & Its Stock
export async function deleteStoreProduct(productId: string): Promise<void> {
  const cleanId = sanitizeId(productId);
  const path = `storeProducts/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'storeProducts', cleanId));
    const stockSnap = await getDocs(
      query(collection(db, 'storeStock'), where('productId', '==', cleanId))
    );
    for (const stk of stockSnap.docs) {
      await deleteDoc(doc(db, 'storeStock', stk.id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Admin: Add Single Stock Item Bound to Specific Product & Variation
export async function addAdminStockAccount(input: {
  product: StoreProductRecord;
  variant?: ProductVariantOption;
  accountEmail: string;
  accountPassword: string;
  accountNotes: string;
}): Promise<void> {
  const cleanProductId = sanitizeId(input.product.id);
  const variants = getVariantsForProduct(input.product);
  const targetVariant = input.variant || variants[0];
  const cleanVariantId = sanitizeId(targetVariant?.id || 'var_reguler');
  const cleanVariantLabel = clampString(targetVariant?.label || 'Paket Reguler', 120, 'Paket Reguler');

  const stockId = sanitizeId(`stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
  const stockPath = `storeStock/${stockId}`;
  const productPath = `storeProducts/${cleanProductId}`;
  const prodRef = doc(db, 'storeProducts', cleanProductId);

  let currentStock = 0;
  let existingData: any = null;
  try {
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      existingData = prodSnap.data();
      currentStock = Number(existingData.stockCount || 0);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, productPath);
  }

  try {
    await setDoc(doc(db, 'storeStock', stockId), {
      productId: cleanProductId,
      productTitle: clampString(input.product.title, 120, 'Produk'),
      variantId: cleanVariantId,
      variantLabel: cleanVariantLabel,
      accountEmail: clampString(input.accountEmail, 180),
      accountPassword: clampString(input.accountPassword, 180),
      accountNotes: clampString(input.accountNotes, 300, ''),
      status: 'available',
      buyerUid: '',
      orderId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, stockPath);
  }

  try {
    await updateDoc(prodRef, {
      title: clampString(existingData?.title || input.product.title, 120, 'Produk'),
      category: clampString(existingData?.category || input.product.category, 60, 'Premium'),
      description: clampString(existingData?.description || input.product.description, 600, 'Deskripsi'),
      usageGuide: clampString(existingData?.usageGuide || input.product.usageGuide || '', 2500, ''),
      variantsJson:
        existingData?.variantsJson || input.product.variantsJson || serializeVariants(variants),
      price: Number(existingData?.price ?? input.product.price ?? 0),
      durationLabel: clampString(
        existingData?.durationLabel || input.product.durationLabel,
        60,
        '30 Hari'
      ),
      badge: clampString(existingData?.badge ?? input.product.badge ?? '', 40, ''),
      ratingAvg: Number(existingData?.ratingAvg ?? input.product.ratingAvg ?? 5),
      ratingCount: Number(existingData?.ratingCount ?? input.product.ratingCount ?? 0),
      createdAt: existingData?.createdAt || serverTimestamp(),
      stockCount: currentStock + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, productPath);
  }

  // Trigger automatic restock notifications for waiting subscribers of this product
  try {
    const alertsSnap = await getDocs(
      query(
        collection(db, 'storeRestockAlerts'),
        where('productId', '==', cleanProductId),
        where('status', '==', 'waiting')
      )
    );
    const nowMs = Date.now();
    await Promise.all(
      alertsSnap.docs.map((alertDoc) =>
        updateDoc(doc(db, 'storeRestockAlerts', alertDoc.id), {
          status: 'notified',
          notifiedAtMs: nowMs,
          updatedAt: serverTimestamp(),
        })
      )
    );
  } catch (error) {
    console.debug('Restock alert notification sync:', error);
  }
}

// Admin: Upload Structured Multi-Row Stock Items for a Product + Variation
export async function addBatchStructuredStockRows(input: {
  product: StoreProductRecord;
  variant: ProductVariantOption;
  deliveryType: ProductDeliveryType;
  rows: StructuredStockRowInput[];
}): Promise<number> {
  let added = 0;
  for (const row of input.rows) {
    const mainVal = (row.accountEmail || '').trim();
    const passVal = input.deliveryType === 'redeem' ? '' : (row.accountPassword || '').trim();
    const notesVal = (row.accountNotes || '').trim();
    if (!mainVal) continue;
    if (input.deliveryType === 'account' && !passVal) continue;

    await addAdminStockAccount({
      product: input.product,
      variant: input.variant,
      accountEmail: mainVal,
      accountPassword: passVal,
      accountNotes: notesVal,
    });
    added++;
  }
  return added;
}

// Admin: Delete Available Stock Item
export async function deleteAdminStockAccount(stock: StoreStockItemRecord): Promise<void> {
  const stockPath = `storeStock/${stock.id}`;
  try {
    await deleteDoc(doc(db, 'storeStock', stock.id));
    if (stock.status === 'available') {
      const prodRef = doc(db, 'storeProducts', stock.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const existingData = prodSnap.data();
        const currentStock = Math.max(0, Number(existingData.stockCount || 0) - 1);
        await updateDoc(prodRef, {
          title: clampString(existingData.title, 120, 'Produk'),
          category: clampString(existingData.category, 60, 'Premium'),
          description: clampString(existingData.description, 600, 'Deskripsi'),
          usageGuide: clampString(existingData.usageGuide || '', 2500, ''),
          variantsJson: existingData.variantsJson || '[]',
          price: Number(existingData.price || 0),
          durationLabel: clampString(existingData.durationLabel, 60, '30 Hari'),
          badge: clampString(existingData.badge || '', 40, ''),
          ratingAvg: Number(existingData.ratingAvg ?? 5),
          ratingCount: Number(existingData.ratingCount || 0),
          createdAt: existingData.createdAt || serverTimestamp(),
          stockCount: currentStock,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, stockPath);
  }
}

// Create Payment Transaction (QRIS, BCAVA, BNIVA, ALFAMART, INDOMARET)
export async function createWijayapayTransaction(input: {
  paymentMethod: WijayapayMethodCode;
  nominal: number;
  refId?: string;
}): Promise<WijayapayTransactionData> {
  const refId =
    input.refId ||
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const response = await fetch('/api/wijayapay/create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payment_method: input.paymentMethod,
      code_payment: input.paymentMethod,
      nominal: input.nominal,
      ref_id: refId,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json?.success || !json?.data) {
    throw new Error(json?.error || 'Gagal membuat kode pembayaran otomatis.');
  }

  const rawData = json.data as any;
  const resolvedCode = String(
    rawData.pay_code ||
      rawData.nomor_va ||
      rawData.nomor_pembayaran ||
      rawData.va_number ||
      rawData.kode_bayar ||
      ''
  ).trim();

  return {
    ...rawData,
    pay_code: resolvedCode,
    nomor_va: String(rawData.nomor_va || resolvedCode).trim(),
    nomor_pembayaran: String(rawData.nomor_pembayaran || resolvedCode).trim(),
  } as WijayapayTransactionData;
}

export async function checkWijayapayTransactionStatus(refId: string): Promise<{
  isPaid: boolean;
  status_pembayaran: string;
}> {
  const response = await fetch(
    `/api/wijayapay/check-status?ref_id=${encodeURIComponent(refId)}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
  );
  const json = await response.json();
  const rawStatus = String(json?.status_pembayaran || 'pending').toLowerCase().trim();
  const isPaid = ['paid', 'success', 'berhasil', 'lunas', 'settlement', 'completed'].includes(
    rawStatus
  );
  return {
    isPaid,
    status_pembayaran: rawStatus,
  };
}

// Customer: Complete Payment -> Automatic Credential Delivery + Usage Guide
export async function purchaseProductAutomatically(input: {
  product: StoreProductRecord;
  variant: ProductVariantOption;
  paymentMethod: WijayapayMethodCode | string;
  wijayapayData?: WijayapayTransactionData | null;
  buyer: User;
}): Promise<StoreOrderRecord> {
  const { product, variant, paymentMethod, wijayapayData, buyer } = input;
  const stockQueryPath = 'storeStock';
  const cleanVariantId = sanitizeId(variant.id);

  let availableDocs;
  try {
    const q = query(
      collection(db, 'storeStock'),
      where('productId', '==', product.id),
      where('status', '==', 'available')
    );
    const snap = await getDocs(q);
    const exactVariantDocs = snap.docs.filter(
      (d) => String(d.data().variantId || '') === cleanVariantId
    );
    availableDocs = exactVariantDocs.length > 0 ? exactVariantDocs : snap.docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, stockQueryPath);
  }

  if (!availableDocs || availableDocs.length === 0) {
    throw new Error(
      `Maaf, stok untuk variasi "${variant.label}" sedang habis. Silakan pilih variasi lain atau aktifkan pengingat stok.`
    );
  }

  const chosenStockDoc = availableDocs[0];
  const stockData = chosenStockDoc.data() as Omit<StoreStockItemRecord, 'id'>;
  const stockId = chosenStockDoc.id;
  const orderId = sanitizeId(`ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
  const invoiceCode =
    wijayapayData?.ref_id ||
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderId.slice(-5).toUpperCase()}`;
  const trxReference =
    wijayapayData?.trx_reference || `TRX${Math.floor(100000 + Math.random() * 900000)}`;
  const nowMs = Date.now();

  try {
    await updateDoc(doc(db, 'storeStock', stockId), {
      status: 'sold',
      buyerUid: buyer.uid,
      orderId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeStock/${stockId}`);
  }

  let freshUsageGuide = product.usageGuide || '';
  try {
    const freshProd = await getDoc(doc(db, 'storeProducts', product.id));
    if (freshProd.exists()) {
      const pData = freshProd.data();
      freshUsageGuide = String(pData.usageGuide || product.usageGuide || '');
      const existingCount = Number(pData.stockCount || 1);
      await updateDoc(doc(db, 'storeProducts', product.id), {
        stockCount: Math.max(0, existingCount - 1),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeProducts/${product.id}`);
  }

  const finalTitle = `${product.title} — ${variant.label}`;
  const finalDuration = variant.durationLabel || product.durationLabel;
  const finalPrice = wijayapayData?.total_bayar ?? variant.price ?? product.price;

  const newOrderPayload = {
    invoiceCode: clampString(invoiceCode, 60),
    trxReference: clampString(trxReference, 60),
    productId: sanitizeId(product.id),
    productTitle: clampString(finalTitle, 120),
    variantId: cleanVariantId,
    variantLabel: clampString(variant.label, 120),
    durationLabel: clampString(finalDuration, 60),
    price: Math.max(0, Math.round(finalPrice)),
    paymentMethod: clampString(String(paymentMethod), 60, 'QRIS'),
    status: 'paid' as const,
    stockId: sanitizeId(stockId),
    deliveredEmail: clampString(stockData.accountEmail, 180),
    deliveredPassword: clampString(stockData.accountPassword, 180),
    deliveredNotes: clampString(stockData.accountNotes || '', 300),
    usageGuide: clampString(
      freshUsageGuide,
      2500,
      stockData.accountPassword
        ? 'Silakan login menggunakan email dan password akun di atas.'
        : 'Silakan tukarkan (redeem) kode voucher di atas pada aplikasi/website resmi.'
    ),
    buyerUid: sanitizeId(buyer.uid),
    buyerEmail: clampString(buyer.email || 'user@jayss.id', 180),
    buyerName: clampString(buyer.displayName || buyer.email?.split('@')[0] || 'Pembeli', 100),
    purchasedAtMs: nowMs,
    rating: 0,
    reviewComment: '',
    refundReason: '',
    refundRequestedAtMs: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'storeOrders', orderId), newOrderPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `storeOrders/${orderId}`);
  }

  return {
    id: orderId,
    ...newOrderPayload,
    createdAt: null,
    updatedAt: null,
  };
}

// Customer: Submit Rating & Review after purchase (with automatic toxic word censoring)
export async function submitOrderRating(input: {
  order: StoreOrderRecord;
  rating: number;
  comment: string;
  buyer: User;
}): Promise<string> {
  const { order, buyer } = input;
  const cleanRating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const rawComment = clampString(
    input.comment,
    500,
    'Pengiriman otomatis sangat cepat dan produk berfungsi dengan baik.'
  );
  const censoredComment = censorToxicWords(rawComment);
  const reviewId = sanitizeId(`rev_${order.id}`);

  try {
    await updateDoc(doc(db, 'storeOrders', order.id), {
      rating: cleanRating,
      reviewComment: censoredComment,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeOrders/${order.id}`);
  }

  try {
    await setDoc(doc(db, 'storeReviews', reviewId), {
      productId: sanitizeId(order.productId),
      productTitle: clampString(order.productTitle, 120),
      orderId: sanitizeId(order.id),
      buyerUid: sanitizeId(buyer.uid),
      buyerName: clampString(
        buyer.displayName || buyer.email?.split('@')[0] || 'Pembeli Terverifikasi',
        100
      ),
      rating: cleanRating,
      comment: censoredComment,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `storeReviews/${reviewId}`);
  }

  try {
    const prodRef = doc(db, 'storeProducts', order.productId);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      const data = prodSnap.data();
      const oldCount = Number(data.ratingCount || 0);
      const oldAvg = Number(data.ratingAvg || 5);
      const newCount = oldCount + 1;
      const newAvg = Number(((oldAvg * oldCount + cleanRating) / newCount).toFixed(2));
      await updateDoc(prodRef, {
        ratingAvg: Math.max(1, Math.min(5, newAvg)),
        ratingCount: newCount,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeProducts/${order.productId}`);
  }

  return censoredComment;
}

// Customer: Submit Refund Ticket at /store/refund (Requires >= 10 mins wait, <= 3 days, 1-2 compressed photos)
export async function createRefundTicketWithProof(input: {
  order: StoreOrderRecord;
  reason: string;
  solutionType: RefundSolutionType;
  proofImagesDataUrls: string[];
  buyer: User;
}): Promise<StoreRefundTicketRecord> {
  const nowMs = Date.now();
  const elapsedMs = nowMs - input.order.purchasedAtMs;

  if (elapsedMs < TEN_MINUTES_MS) {
    const remainingMin = Math.ceil((TEN_MINUTES_MS - elapsedMs) / 60000);
    throw new Error(
      `Pengajuan refund baru dapat dilakukan minimal 10 menit setelah transaksi selesai (tunggu sekitar ${remainingMin} menit lagi).`
    );
  }

  if (elapsedMs > THREE_DAYS_MS) {
    throw new Error(
      'Batas waktu pengajuan refund maksimal 3 hari (72 jam) setelah pembelian telah berakhir.'
    );
  }

  const cleanReason = clampString(input.reason, 500);
  if (cleanReason.length < 3) {
    throw new Error('Mohon tuliskan alasan kendala / refund minimal 3 karakter.');
  }

  const validImages = (input.proofImagesDataUrls || [])
    .filter((img) => typeof img === 'string' && img.startsWith('data:image/'))
    .slice(0, 2);

  if (validImages.length < 1) {
    throw new Error('Wajib melampirkan minimal 1 foto bukti kendala (maksimal 2 foto).');
  }

  const proofImagesJson = JSON.stringify(validImages);
  if (proofImagesJson.length > 890000) {
    throw new Error('Ukuran gambar terlalu besar. Silakan gunakan gambar yang lebih ringkas.');
  }

  const ticketId = sanitizeId(`rfnd_${input.order.id}`);

  // 1. Update Order status to refund_requested
  try {
    await updateDoc(doc(db, 'storeOrders', input.order.id), {
      status: 'refund_requested',
      refundReason: cleanReason,
      refundRequestedAtMs: nowMs,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeOrders/${input.order.id}`);
  }

  // 2. Create StoreRefundTicket with canUserReply: false (User cannot start chat until Admin sends a message)
  const ticketPayload = {
    orderId: sanitizeId(input.order.id),
    invoiceCode: clampString(input.order.invoiceCode, 60),
    productId: sanitizeId(input.order.productId),
    productTitle: clampString(input.order.productTitle, 120),
    price: Math.max(0, Math.round(input.order.price)),
    buyerUid: sanitizeId(input.buyer.uid),
    buyerEmail: clampString(input.buyer.email || input.order.buyerEmail, 180),
    buyerName: clampString(
      input.buyer.displayName || input.order.buyerName || 'Pembeli',
      100
    ),
    reason: cleanReason,
    solutionType: input.solutionType,
    status: 'open' as const,
    canUserReply: false,
    proofImagesJson,
    messagesJson: '[]',
    replacementCredentials: '',
    createdAtMs: nowMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'storeRefundTickets', ticketId), ticketPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `storeRefundTickets/${ticketId}`);
  }

  return {
    id: ticketId,
    ...ticketPayload,
    createdAt: null,
    updatedAt: null,
  };
}

// Send Chat Message on /store/ticket/:refundId
// Admin can message anytime while open (which unlocks canUserReply = true for user).
// User can ONLY send a message when ticket.canUserReply === true!
export async function sendRefundTicketMessage(input: {
  ticket: StoreRefundTicketRecord;
  senderRole: 'admin' | 'user';
  senderName: string;
  text: string;
}): Promise<void> {
  const { ticket, senderRole, senderName } = input;
  const cleanText = clampString(input.text, 1000);
  if (!cleanText) return;

  if (ticket.status !== 'open') {
    throw new Error('Tiket refund ini sudah ditutup.');
  }

  if (senderRole === 'user' && !ticket.canUserReply) {
    throw new Error(
      'Anda belum dapat mengirim pesan sebelum Admin memulai percakapan pada tiket ini.'
    );
  }

  const ticketRef = doc(db, 'storeRefundTickets', ticket.id);
  const existingMessages = parseTicketMessages(ticket.messagesJson);
  const newMessage: RefundChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderRole,
    senderName: clampString(senderName, 80, senderRole === 'admin' ? 'Admin' : 'Pembeli'),
    text: cleanText,
    sentAtMs: Date.now(),
  };

  const updatedMessagesJson = JSON.stringify([...existingMessages, newMessage]).slice(0, 60000);

  try {
    if (senderRole === 'admin') {
      const snap = await getDoc(ticketRef);
      if (!snap.exists()) throw new Error('Tiket tidak ditemukan.');
      const d = snap.data();
      await updateDoc(ticketRef, {
        orderId: d.orderId,
        invoiceCode: d.invoiceCode,
        productId: d.productId,
        productTitle: d.productTitle,
        price: Number(d.price || 0),
        buyerUid: d.buyerUid,
        buyerEmail: d.buyerEmail,
        buyerName: d.buyerName,
        reason: d.reason,
        solutionType: d.solutionType,
        status: d.status,
        canUserReply: true, // Unlock chat for the user once Admin sends a message!
        proofImagesJson: d.proofImagesJson || '[]',
        messagesJson: updatedMessagesJson,
        replacementCredentials: d.replacementCredentials || '',
        createdAtMs: Number(d.createdAtMs || ticket.createdAtMs),
        createdAt: d.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ticketRef, {
        messagesJson: updatedMessagesJson,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeRefundTickets/${ticket.id}`);
  }
}

// Admin: Resolve & Close Refund Ticket -> Automatically Deletes Proof Images from Database!
export async function resolveRefundTicketByAdmin(input: {
  ticket: StoreRefundTicketRecord;
  order?: StoreOrderRecord | null;
  decision: 'approved_refund' | 'approved_replace' | 'rejected';
  replacementCredentials?: string;
  closingNote?: string;
}): Promise<void> {
  const { ticket, decision } = input;
  const ticketRef = doc(db, 'storeRefundTickets', ticket.id);

  try {
    const snap = await getDoc(ticketRef);
    if (snap.exists()) {
      const d = snap.data();
      const existingMessages = parseTicketMessages(String(d.messagesJson || '[]'));
      const resolutionLabel =
        decision === 'approved_refund'
          ? 'Refund disetujui (Pengembalian Dana). Tiket ditutup & foto bukti telah dihapus otomatis dari database.'
          : decision === 'approved_replace'
          ? `Refund disetujui (Pengiriman Barang Ulang)${
              input.replacementCredentials ? `: ${input.replacementCredentials}` : ''
            }. Tiket ditutup & foto bukti telah dihapus otomatis dari database.`
          : 'Pengajuan refund ditolak. Tiket ditutup & foto bukti telah dihapus otomatis dari database.';

      const finalNote = input.closingNote?.trim()
        ? `${resolutionLabel}\nCatatan Admin: ${input.closingNote.trim()}`
        : resolutionLabel;

      const closingMsg: RefundChatMessage = {
        id: `msg_close_${Date.now()}`,
        senderRole: 'admin',
        senderName: 'Admin',
        text: clampString(finalNote, 1000),
        sentAtMs: Date.now(),
      };

      const updatedMessagesJson = JSON.stringify([...existingMessages, closingMsg]).slice(
        0,
        60000
      );

      await updateDoc(ticketRef, {
        orderId: d.orderId,
        invoiceCode: d.invoiceCode,
        productId: d.productId,
        productTitle: d.productTitle,
        price: Number(d.price || 0),
        buyerUid: d.buyerUid,
        buyerEmail: d.buyerEmail,
        buyerName: d.buyerName,
        reason: d.reason,
        solutionType: d.solutionType,
        status: decision,
        canUserReply: false,
        proofImagesJson: '[]', // IMMEDIATELY DELETE PROOF PHOTOS FROM DATABASE WHEN CLOSED!
        messagesJson: updatedMessagesJson,
        replacementCredentials: clampString(input.replacementCredentials || '', 500),
        createdAtMs: Number(d.createdAtMs || ticket.createdAtMs),
        createdAt: d.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Sync corresponding StoreOrder status
    const orderStatus = decision === 'rejected' ? 'refund_rejected' : 'refunded';
    const orderRef = doc(db, 'storeOrders', ticket.orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const ord = orderSnap.data();
      await updateDoc(orderRef, {
        invoiceCode: ord.invoiceCode,
        trxReference: ord.trxReference || '',
        productId: ord.productId,
        productTitle: ord.productTitle,
        variantId: ord.variantId || 'var_reguler',
        variantLabel: ord.variantLabel || 'Reguler',
        durationLabel: ord.durationLabel,
        price: Number(ord.price || 0),
        paymentMethod: ord.paymentMethod,
        stockId: ord.stockId,
        deliveredEmail: ord.deliveredEmail,
        deliveredPassword: ord.deliveredPassword || '',
        deliveredNotes: ord.deliveredNotes || '',
        usageGuide: ord.usageGuide || '',
        buyerUid: ord.buyerUid,
        buyerEmail: ord.buyerEmail,
        buyerName: ord.buyerName,
        purchasedAtMs: Number(ord.purchasedAtMs || 0),
        rating: Number(ord.rating || 0),
        reviewComment: ord.reviewComment || '',
        refundReason: ord.refundReason || ticket.reason,
        refundRequestedAtMs: Number(ord.refundRequestedAtMs || ticket.createdAtMs),
        createdAt: ord.createdAt || serverTimestamp(),
        status: orderStatus,
        updatedAt: serverTimestamp(),
      });

      if (orderStatus === 'refunded' && ord.stockId) {
        const stkRef = doc(db, 'storeStock', ord.stockId);
        const stkSnap = await getDoc(stkRef);
        if (stkSnap.exists()) {
          const s = stkSnap.data();
          await updateDoc(stkRef, {
            productId: s.productId,
            productTitle: s.productTitle,
            variantId: s.variantId || 'var_reguler',
            variantLabel: s.variantLabel || 'Reguler',
            accountEmail: s.accountEmail,
            accountPassword: s.accountPassword || '',
            accountNotes: s.accountNotes || '',
            buyerUid: s.buyerUid || '',
            orderId: s.orderId || '',
            createdAt: s.createdAt || serverTimestamp(),
            status: 'refunded',
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeRefundTickets/${ticket.id}`);
  }
}

// Customer: Subscribe to Automatic Restock Notification when stock is 0
export async function subscribeProductRestockAlert(input: {
  product: StoreProductRecord;
  user: User;
}): Promise<void> {
  const alertId = sanitizeId(`alert_${input.product.id}_${input.user.uid}`);
  try {
    await setDoc(doc(db, 'storeRestockAlerts', alertId), {
      productId: sanitizeId(input.product.id),
      productTitle: clampString(input.product.title, 120),
      userUid: sanitizeId(input.user.uid),
      userEmail: clampString(input.user.email || 'user@jayss.id', 180),
      status: 'waiting',
      notifiedAtMs: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `storeRestockAlerts/${alertId}`);
  }
}

export async function dismissRestockAlert(alertId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'storeRestockAlerts', alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `storeRestockAlerts/${alertId}`);
  }
}
