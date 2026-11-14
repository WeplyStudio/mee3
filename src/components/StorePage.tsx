import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Language } from '../types';
import { uiSfx } from '../utils/audio';
import {
  auth,
  User,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutStoreUser,
  isUserAdmin,
  StoreProductRecord,
  StorePromoRecord,
  StoreStockItemRecord,
  StoreOrderRecord,
  StoreRefundTicketRecord,
  StoreReviewRecord,
  StoreRestockAlertRecord,
  ProductVariantOption,
  ProductDeliveryType,
  RefundSolutionType,
  StructuredStockRowInput,
  WijayapayMethodCode,
  WijayapayTransactionData,
  WIJAYAPAY_PAYMENT_METHODS,
  THESVG_POPULAR_ICONS,
  TheSvgIconEntry,
  getVariantsForProduct,
  getVariantDiscountInfo,
  getProductDeliveryType,
  getProductIconUrl,
  getDefaultProductTemplate,
  getProductBenefits,
  getProductBenefitsText,
  parseBenefitsText,
  normalizeTheSvgIconUrl,
  inferTheSvgIconFromTitle,
  parseTicketProofImages,
  parseTicketMessages,
  censorToxicWords,
  evaluateOrderRefundEligibility,
  compressRefundProofImage,
  subscribeStoreProducts,
  subscribeStorePromos,
  subscribeStoreReviews,
  subscribeUserOrders,
  subscribeRefundTickets,
  subscribeAdminStock,
  subscribeAvailableStockByVariant,
  subscribeUserRestockAlerts,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
  createStorePromo,
  updateStorePromo,
  deleteStorePromo,
  addBatchStructuredStockRows,
  deleteAdminStockAccount,
  createWijayapayTransaction,
  checkWijayapayTransactionStatus,
  purchaseProductAutomatically,
  submitOrderRating,
  createRefundTicketWithProof,
  sendRefundTicketMessage,
  resolveRefundTicketByAdmin,
  subscribeProductRestockAlert,
  dismissRestockAlert,
  purgeLegacyFakeStoreData,
  sanitizeId,
} from '../lib/firestoreStore';

interface StorePageProps {
  lang: Language;
  onNavigateHome: () => void;
}

export type StoreRoutePage =
  | 'catalog'
  | 'product'
  | 'cart'
  | 'pay'
  | 'receipt'
  | 'transactions'
  | 'reviews'
  | 'refund'
  | 'ticket'
  | 'dashboard'
  | 'new-product'
  | 'promo';

interface ParsedStoreLocation {
  routePage: StoreRoutePage;
  paramId: string;
}

export function toProductSlug(input: string): string {
  return (
    String(input || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'produk'
  );
}

interface StockDraftRow {
  rowId: string;
  accountEmail: string;
  accountPassword: string;
  accountNotes: string;
}

interface BenefitDraftRow {
  id: string;
  title: string;
  desc: string;
}

interface VariantDraftRow {
  id: string;
  label: string;
  durationLabel: string;
  originalPrice: string;
  price: string;
  stockRows: StockDraftRow[];
}

interface CompressedPhotoDraft {
  id: string;
  name: string;
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  wasCompressed: boolean;
}

function createEmptyStockDraftRow(): StockDraftRow {
  return {
    rowId: `srow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    accountEmail: '',
    accountPassword: '',
    accountNotes: '',
  };
}

function createBenefitDraftRow(title = '', desc = '', index = 0): BenefitDraftRow {
  return {
    id: `ben_${index}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    title,
    desc,
  };
}

function parseTemplateToBenefitRows(benefitsText: string): BenefitDraftRow[] {
  const lines = String(benefitsText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (lines.length === 0) {
    return [createBenefitDraftRow('Pengiriman Instan Otomatis', 'Akun / kode langsung muncul di receipt setelah pembayaran berhasil.', 0)];
  }
  return lines.map((line, idx) => {
    const parts = line.split('|');
    return createBenefitDraftRow((parts[0] || '').trim(), parts.slice(1).join('|').trim(), idx);
  });
}

function serializeBenefitRows(rows: BenefitDraftRow[]): string {
  return rows
    .slice(0, 10)
    .filter((r) => r.title.trim() || r.desc.trim())
    .map((r) => `${r.title.trim() || 'Keunggulan Produk'} | ${r.desc.trim()}`)
    .join('\n');
}

function createDefaultVariantDraft(index: number): VariantDraftRow {
  return {
    id: `var_${index}_${Date.now().toString(36)}`,
    label: index === 1 ? 'Paket Reguler' : `Variasi ${index}`,
    durationLabel: '30 Hari',
    originalPrice: '',
    price: '35000',
    stockRows: [],
  };
}

function parseStorePathname(pathname: string): ParsedStoreLocation {
  const clean = pathname.replace(/\/+$/, '') || '/store';

  const productMatch = clean.match(/^(?:\/store)?\/produk\/([^/]+)$/i);
  if (productMatch) {
    return { routePage: 'product', paramId: decodeURIComponent(productMatch[1]) };
  }

  if (/^(?:\/store)?\/cart$/i.test(clean)) {
    return { routePage: 'cart', paramId: '' };
  }

  const payMatch = clean.match(/^(?:\/store)?\/pay\/([^/]+)$/i);
  if (payMatch) {
    return { routePage: 'pay', paramId: decodeURIComponent(payMatch[1]) };
  }

  const receiptMatch = clean.match(/^(?:\/store)?\/receipt\/([^/]+)$/i);
  if (receiptMatch) {
    return { routePage: 'receipt', paramId: decodeURIComponent(receiptMatch[1]) };
  }

  const ticketMatch = clean.match(/^(?:\/store)?\/ticket\/([^/]+)$/i);
  if (ticketMatch) {
    return { routePage: 'ticket', paramId: decodeURIComponent(ticketMatch[1]) };
  }

  if (/^(?:\/store)?\/transaksi$/i.test(clean)) {
    return { routePage: 'transactions', paramId: '' };
  }

  if (/^(?:\/store)?\/ulasan$/i.test(clean)) {
    return { routePage: 'reviews', paramId: '' };
  }

  if (/^(?:\/store)?\/refund$/i.test(clean)) {
    return { routePage: 'refund', paramId: '' };
  }

  if (/^(?:\/store)?\/new\/product$/i.test(clean)) {
    return { routePage: 'new-product', paramId: '' };
  }

  if (/^(?:\/store)?\/promo$/i.test(clean)) {
    return { routePage: 'promo', paramId: '' };
  }

  if (/^(?:\/store)?\/dashboard$/i.test(clean)) {
    return { routePage: 'dashboard', paramId: '' };
  }

  return { routePage: 'catalog', paramId: '' };
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDateTime(ms: number): string {
  if (!ms) return '-';
  return new Date(ms).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(ms: number): string {
  if (!ms) return '-';
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  const parts = String(name || 'Pembeli')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'PB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

const ProductBrandIcon: React.FC<{
  iconUrl?: string;
  title?: string;
  size?: number;
  className?: string;
}> = ({ iconUrl, title, size = 24, className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedUrl = useMemo(() => {
    if (iconUrl) return normalizeTheSvgIconUrl(iconUrl);
    return inferTheSvgIconFromTitle(title || '');
  }, [iconUrl, title]);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedUrl]);

  if (!resolvedUrl || imgFailed) {
    return <Sparkles size={size} className={className} />;
  }

  return (
    <img
      src={resolvedUrl}
      alt={title || 'Product Icon'}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={() => setImgFailed(true)}
      className={`object-contain select-none ${className}`}
    />
  );
};

export const StorePage: React.FC<StorePageProps> = ({ onNavigateHome }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // URL-Driven Multi-Page Router for /store, /produk/:slug, /cart, /pay/:id, /receipt/:id, etc.
  const [storeLocation, setStoreLocation] = useState<ParsedStoreLocation>(() =>
    typeof window !== 'undefined'
      ? parseStorePathname(window.location.pathname)
      : { routePage: 'catalog', paramId: '' }
  );

  const navigateStorePath = (targetPath: string, options?: { replace?: boolean }) => {
    uiSfx.playClick();
    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState({ page: 'store' }, '', targetPath);
      } else if (window.location.pathname !== targetPath) {
        window.history.pushState({ page: 'store' }, '', targetPath);
      }
      setStoreLocation(parseStorePathname(targetPath));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const onPopState = () => {
      if (typeof window !== 'undefined') {
        setStoreLocation(parseStorePathname(window.location.pathname));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Product Selection, Buyer Data, Cart & Promo Voucher State
  const [checkoutMode, setCheckoutMode] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProductRecord | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantOption | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<WijayapayMethodCode>('QRIS');
  const [productInfoTab, setProductInfoTab] = useState<'benefit' | 'garansi' | 'deskripsi'>('benefit');

  // Buyer Form Inputs on /produk/:nama-produk & /cart
  const [buyerFullName, setBuyerFullName] = useState<string>('');
  const [buyerEmailInput, setBuyerEmailInput] = useState<string>('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState<string>('');

  // Promo Voucher State on /cart
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [showVoucherList, setShowVoucherList] = useState<boolean>(false);

  // Active Payment Invoice State on /pay/:id-transaksi
  const [paymentTx, setPaymentTx] = useState<WijayapayTransactionData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem('jays_active_payment_tx_v1');
        if (raw) return JSON.parse(raw) as WijayapayTransactionData;
      } catch {}
    }
    return null;
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState<boolean>(false);

  // Real-time Firestore Data
  const [products, setProducts] = useState<StoreProductRecord[]>([]);
  const [storePromos, setStorePromos] = useState<StorePromoRecord[]>([]);
  const [reviews, setReviews] = useState<StoreReviewRecord[]>([]);
  const [orders, setOrders] = useState<StoreOrderRecord[]>([]);
  const [refundTickets, setRefundTickets] = useState<StoreRefundTicketRecord[]>([]);
  const [adminStock, setAdminStock] = useState<StoreStockItemRecord[]>([]);
  const [variantStockCounts, setVariantStockCounts] = useState<Record<string, number>>({});
  const [restockAlerts, setRestockAlerts] = useState<StoreRestockAlertRecord[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'sold' | 'refunded'>('all');

  // Password visibility & copy state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Review Pagination (Per 10 reviews)
  const [productReviewPage, setProductReviewPage] = useState<number>(1);
  const [globalReviewLimit, setGlobalReviewLimit] = useState<number>(10);

  const displayedGlobalReviews = useMemo(() => {
    return reviews.slice(0, globalReviewLimit);
  }, [reviews, globalReviewLimit]);

  // Rating Form State per order
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingRatingOrderId, setSubmittingRatingOrderId] = useState<string | null>(null);

  // Dedicated /store/refund Form State
  const [refundSelectedOrderId, setRefundSelectedOrderId] = useState<string>('');
  const [refundReasonInput, setRefundReasonInput] = useState<string>('');
  const [refundSolutionInput, setRefundSolutionInput] = useState<RefundSolutionType>('refund_money');
  const [refundPhotos, setRefundPhotos] = useState<CompressedPhotoDraft[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dedicated /store/ticket/:refundId Chat State
  const [ticketMessageInput, setTicketMessageInput] = useState<string>('');
  const [isSendingTicketMsg, setIsSendingTicketMsg] = useState<boolean>(false);
  const [adminReplacementInput, setAdminReplacementInput] = useState<string>('');
  const [adminClosingNoteInput, setAdminClosingNoteInput] = useState<string>('');
  const [isResolvingTicket, setIsResolvingTicket] = useState<boolean>(false);

  // Admin Product CRUD + Delivery Type + Icon (thesvg.org) + Pre-filled Template + Variations + Stock State
  const initialProductTemplate = useMemo(
    () => getDefaultProductTemplate('', 'account'),
    []
  );
  const adminProductFormRef = useRef<HTMLDivElement | null>(null);
  const adminStockFormRef = useRef<HTMLDivElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [adminDashboardSearch, setAdminDashboardSearch] = useState<string>('');
  const [isTemplateAutoSync, setIsTemplateAutoSync] = useState<boolean>(true);
  const [adminFormFeedback, setAdminFormFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [newProdTitle, setNewProdTitle] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>(
    initialProductTemplate.category
  );
  const [newProdBadge, setNewProdBadge] = useState<string>(initialProductTemplate.badge);
  const [newProdIconUrl, setNewProdIconUrl] = useState<string>('');
  const [iconSearchQuery, setIconSearchQuery] = useState<string>('');
  const [theSvgCatalog, setTheSvgCatalog] = useState<TheSvgIconEntry[]>(THESVG_POPULAR_ICONS);
  const [isLoadingTheSvgCatalog, setIsLoadingTheSvgCatalog] = useState<boolean>(false);
  const [theSvgCatalogLoaded, setTheSvgCatalogLoaded] = useState<boolean>(false);
  const [newProdDeliveryType, setNewProdDeliveryType] = useState<ProductDeliveryType>('account');
  const [newProdDesc, setNewProdDesc] = useState<string>(initialProductTemplate.description);
  const [benefitDrafts, setBenefitDrafts] = useState<BenefitDraftRow[]>(() =>
    parseTemplateToBenefitRows(initialProductTemplate.benefitsText)
  );
  const [newProdUsageGuide, setNewProdUsageGuide] = useState<string>(
    initialProductTemplate.usageGuide
  );
  const [variantDrafts, setVariantDrafts] = useState<VariantDraftRow[]>(() => [
    createDefaultVariantDraft(1),
  ]);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Admin Promo Code CRUD State (/promo)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoCodeForm, setPromoCodeForm] = useState<string>('');
  const [promoTitleForm, setPromoTitleForm] = useState<string>('');
  const [promoDescForm, setPromoDescForm] = useState<string>('');
  const [promoDiscountTypeForm, setPromoDiscountTypeForm] = useState<'percent' | 'fixed'>('percent');
  const [promoDiscountValueForm, setPromoDiscountValueForm] = useState<string>('10');
  const [promoMinPurchaseForm, setPromoMinPurchaseForm] = useState<string>('0');
  const [promoIsActiveForm, setPromoIsActiveForm] = useState<boolean>(true);
  const [isSavingPromo, setIsSavingPromo] = useState<boolean>(false);
  const [confirmDeletePromoId, setConfirmDeletePromoId] = useState<string | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);

  // Admin Standalone Structured Row Stock Form (Adapts automatically to Product's deliveryType!)
  const [selectedStockProductId, setSelectedStockProductId] = useState<string>('');
  const [selectedStockVariantId, setSelectedStockVariantId] = useState<string>('');
  const [standaloneStockRows, setStandaloneStockRows] = useState<StockDraftRow[]>(() => [
    createEmptyStockDraftRow(),
  ]);
  const [isSavingStock, setIsSavingStock] = useState<boolean>(false);

  // Auto-sync template description, benefits & usage guide as admin types Product Name in create mode
  useEffect(() => {
    if (editingProductId || !isTemplateAutoSync) return;
    const tpl = getDefaultProductTemplate(newProdTitle, newProdDeliveryType);
    setNewProdDesc(tpl.description);
    setBenefitDrafts(parseTemplateToBenefitRows(tpl.benefitsText));
    setNewProdUsageGuide(tpl.usageGuide);
  }, [newProdTitle, newProdDeliveryType, editingProductId, isTemplateAutoSync]);

  // Status feedback & 1-second live timer for 10-minute refund cooldown accuracy
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const adminMode = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Convert qr_string into a scannable QR code Data URL whenever paymentTx changes
  useEffect(() => {
    let active = true;
    if (paymentTx && paymentTx.qr_string) {
      QRCode.toDataURL(paymentTx.qr_string, {
        width: 260,
        margin: 1,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      })
        .then((url) => {
          if (active) setQrCodeDataUrl(url);
        })
        .catch(() => {
          if (active) setQrCodeDataUrl('');
        });
    } else {
      setQrCodeDataUrl('');
    }
    return () => {
      active = false;
    };
  }, [paymentTx]);

  // Auth listener & prefill buyer info
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        setBuyerFullName((prev) => prev || user.displayName || user.email?.split('@')[0] || '');
        setBuyerEmailInput((prev) => prev || user.email || '');
      }
    });
    return () => unsub();
  }, []);

  // Purge legacy fake starter products/stock when Admin is signed in
  useEffect(() => {
    if (authReady && adminMode) {
      purgeLegacyFakeStoreData().catch(() => {});
    }
  }, [authReady, adminMode]);

  // Public listeners: Real Products & Reviews
  useEffect(() => {
    const unsubProducts = subscribeStoreProducts(
      (items) => {
        setProducts(items);
        setLoadingProducts(false);
        if (items.length > 0 && !selectedStockProductId) {
          const firstProd = items[0];
          const firstVars = getVariantsForProduct(firstProd);
          setSelectedStockProductId(firstProd.id);
          setSelectedStockVariantId(firstVars[0]?.id || '');
        }
      },
      () => setLoadingProducts(false)
    );
    const unsubReviews = subscribeStoreReviews((items) => {
      setReviews(items);
    });
    const unsubPromos = subscribeStorePromos((items) => {
      setStorePromos(items);
    });
    return () => {
      unsubProducts();
      unsubReviews();
      unsubPromos();
    };
  }, []);

  // Restore saved cart draft from sessionStorage when products arrive
  useEffect(() => {
    if (products.length === 0) return;
    if (typeof window === 'undefined') return;
    try {
      const rawCart = window.sessionStorage.getItem('jays_cart_draft_v1');
      if (rawCart && !selectedProduct) {
        const parsed = JSON.parse(rawCart);
        const foundProd = products.find((p) => p.id === parsed.productId);
        if (foundProd) {
          const vars = getVariantsForProduct(foundProd);
          const foundVar = vars.find((v) => v.id === parsed.variantId) || vars[0] || null;
          setSelectedProduct(foundProd);
          setSelectedVariant(foundVar);
          if (parsed.selectedPayment) setSelectedPayment(parsed.selectedPayment);
          if (parsed.buyerFullName) setBuyerFullName((prev) => prev || parsed.buyerFullName);
          if (parsed.buyerEmailInput) setBuyerEmailInput((prev) => prev || parsed.buyerEmailInput);
          if (parsed.buyerWhatsapp) setBuyerWhatsapp((prev) => prev || parsed.buyerWhatsapp);
          if (parsed.appliedPromoCode) setAppliedPromoCode(parsed.appliedPromoCode);
        }
      }
    } catch {}
  }, [products]);

  // Resolve active product when on /produk/:nama-produk (or fallback to selectedProduct on /cart & /pay)
  const activeProduct = useMemo<StoreProductRecord | null>(() => {
    if (storeLocation.routePage === 'product' && storeLocation.paramId) {
      const targetSlug = toProductSlug(storeLocation.paramId);
      const targetRaw = storeLocation.paramId.toLowerCase().trim();
      const matched = products.find(
        (p) =>
          toProductSlug(p.title) === targetSlug ||
          p.id.toLowerCase() === targetRaw ||
          toProductSlug(p.id) === targetSlug
      );
      if (matched) return matched;
    }
    return selectedProduct || products[0] || null;
  }, [storeLocation, products, selectedProduct]);

  // Sync selectedProduct & selectedVariant when activeProduct changes on /produk/:nama-produk
  useEffect(() => {
    if (activeProduct && (!selectedProduct || selectedProduct.id !== activeProduct.id)) {
      const vars = getVariantsForProduct(activeProduct);
      setSelectedProduct(activeProduct);
      setSelectedVariant(vars[0] || null);
      setProductReviewPage(1);
    }
  }, [activeProduct, selectedProduct]);

  // Persist cart draft to sessionStorage whenever selection changes
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedProduct) return;
    try {
      window.sessionStorage.setItem(
        'jays_cart_draft_v1',
        JSON.stringify({
          productId: selectedProduct.id,
          variantId: selectedVariant?.id || '',
          selectedPayment,
          buyerFullName,
          buyerEmailInput,
          buyerWhatsapp,
          appliedPromoCode,
        })
      );
    } catch {}
  }, [
    selectedProduct,
    selectedVariant,
    selectedPayment,
    buyerFullName,
    buyerEmailInput,
    buyerWhatsapp,
    appliedPromoCode,
  ]);

  // Product-specific reviews & per-10 pagination for /produk/:nama-produk
  const productReviews = useMemo(() => {
    const targetProd = activeProduct || selectedProduct;
    if (!targetProd) return [];
    return reviews.filter((r) => r.productId === targetProd.id);
  }, [reviews, activeProduct, selectedProduct]);

  const totalProductReviewPages = useMemo(
    () => Math.max(1, Math.ceil(productReviews.length / 10)),
    [productReviews.length]
  );

  const displayedProductReviews = useMemo(() => {
    const safePage = Math.max(1, Math.min(productReviewPage, totalProductReviewPages));
    const startIdx = (safePage - 1) * 10;
    return productReviews.slice(startIdx, startIdx + 10);
  }, [productReviews, productReviewPage, totalProductReviewPages]);

  // Active Promo Vouchers & Live Calculation for /cart
  const activeStorePromos = useMemo(
    () => storePromos.filter((p) => p.isActive),
    [storePromos]
  );

  const activePromoVoucher = useMemo<StorePromoRecord | null>(() => {
    if (!appliedPromoCode) return null;
    return (
      activeStorePromos.find(
        (v) => v.code.toUpperCase() === appliedPromoCode.trim().toUpperCase()
      ) || null
    );
  }, [appliedPromoCode, activeStorePromos]);

  const cartPricing = useMemo(() => {
    const basePrice = selectedVariant?.price ?? activeProduct?.price ?? 0;
    const varDiscount = getVariantDiscountInfo(basePrice, selectedVariant?.originalPrice);
    let promoDiscountAmount = 0;
    if (activePromoVoucher && basePrice > 0) {
      if (basePrice >= (activePromoVoucher.minPurchase || 0)) {
        if (activePromoVoucher.discountType === 'percent') {
          promoDiscountAmount = Math.round((basePrice * activePromoVoucher.discountValue) / 100);
        } else {
          promoDiscountAmount = Math.min(Math.max(0, basePrice - 1000), activePromoVoucher.discountValue);
        }
        promoDiscountAmount = Math.max(0, promoDiscountAmount);
      }
    }
    const subtotal = Math.max(1000, basePrice - promoDiscountAmount);
    const estimatedFee =
      selectedPayment === 'QRIS'
        ? Math.max(500, Math.round(subtotal * 0.007))
        : selectedPayment === 'BCAVA' || selectedPayment === 'BNIVA'
        ? 4700
        : 3000;
    const totalEstimate = subtotal + estimatedFee;
    return {
      basePrice,
      originalPrice: varDiscount.originalPrice,
      productSavingsAmount: varDiscount.savingsAmount,
      productDiscountPercent: varDiscount.discountPercent,
      discountAmount: promoDiscountAmount,
      subtotal,
      estimatedFee,
      totalEstimate,
    };
  }, [selectedVariant, activeProduct, activePromoVoucher, selectedPayment]);

  const handleApplyPromoCode = (codeOverride?: string) => {
    uiSfx.playClick();
    const candidate = (codeOverride ?? promoCodeInput).trim().toUpperCase();
    if (!candidate) {
      showToast('error', 'Masukkan kode promo terlebih dahulu.');
      return;
    }
    const matched = activeStorePromos.find((v) => v.code.toUpperCase() === candidate);
    if (!matched) {
      showToast('error', `Kode promo "${candidate}" tidak ditemukan atau sedang nonaktif.`);
      return;
    }
    const currentBasePrice = selectedVariant?.price ?? activeProduct?.price ?? 0;
    if (matched.minPurchase > 0 && currentBasePrice < matched.minPurchase) {
      showToast(
        'error',
        `Kode promo ${matched.code} membutuhkan minimal pembelian ${formatRupiah(matched.minPurchase)}.`
      );
      return;
    }
    setPromoCodeInput(matched.code);
    setAppliedPromoCode(matched.code);
    setShowVoucherList(false);
    showToast('success', `Voucher ${matched.code} (${matched.title}) berhasil diterapkan!`);
  };

  const selectedStockProductObj = useMemo(
    () => products.find((p) => p.id === selectedStockProductId) || null,
    [products, selectedStockProductId]
  );

  const selectedStockProductDeliveryType = useMemo<ProductDeliveryType>(
    () => (selectedStockProductObj ? getProductDeliveryType(selectedStockProductObj) : 'account'),
    [selectedStockProductObj]
  );

  const selectedStockProductVariants = useMemo(
    () => (selectedStockProductObj ? getVariantsForProduct(selectedStockProductObj) : []),
    [selectedStockProductObj]
  );

  useEffect(() => {
    if (selectedStockProductVariants.length > 0) {
      const exists = selectedStockProductVariants.some((v) => v.id === selectedStockVariantId);
      if (!exists) {
        setSelectedStockVariantId(selectedStockProductVariants[0].id);
      }
    } else {
      setSelectedStockVariantId('');
    }
  }, [selectedStockProductVariants, selectedStockVariantId]);

  // Authenticated listeners: Orders, Refund Tickets, Restock Alerts, Variant Stock Counts, and Admin Stock Vault
  useEffect(() => {
    if (!authReady || !currentUser) {
      setOrders([]);
      setRefundTickets([]);
      setRestockAlerts([]);
      setAdminStock([]);
      setVariantStockCounts({});
      return;
    }

    const unsubOrders = subscribeUserOrders(currentUser.uid, adminMode, (items) => {
      setOrders(items);
    });

    const unsubTickets = subscribeRefundTickets(currentUser.uid, adminMode, (items) => {
      setRefundTickets(items);
    });

    const unsubAlerts = subscribeUserRestockAlerts(currentUser.uid, adminMode, (items) => {
      setRestockAlerts(items);
    });

    const unsubVarCounts = subscribeAvailableStockByVariant((counts) => {
      setVariantStockCounts(counts);
    });

    let unsubStock: (() => void) | undefined;
    if (adminMode) {
      unsubStock = subscribeAdminStock((items) => {
        setAdminStock(items);
      });
    }

    return () => {
      unsubOrders();
      unsubTickets();
      unsubAlerts();
      unsubVarCounts();
      if (unsubStock) unsubStock();
    };
  }, [authReady, currentUser, adminMode]);

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter((o) => o.buyerUid === currentUser.uid);
  }, [orders, currentUser]);

  const myTickets = useMemo(() => {
    if (!currentUser) return [];
    if (adminMode) return refundTickets;
    return refundTickets.filter((t) => t.buyerUid === currentUser.uid);
  }, [refundTickets, currentUser, adminMode]);

  // Auto-select first order in /store/refund if not selected yet
  useEffect(() => {
    if (myOrders.length > 0 && !refundSelectedOrderId) {
      const paidOrder = myOrders.find((o) => o.status === 'paid') || myOrders[0];
      if (paidOrder) setRefundSelectedOrderId(paidOrder.id);
    }
  }, [myOrders, refundSelectedOrderId]);

  const categories = useMemo(() => {
    const set = new Set<string>(['semua']);
    products.forEach((p) => {
      if (p.category) set.add(p.category.toLowerCase());
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === 'semua' || p.category.toLowerCase() === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const triggeredRestockNotifications = useMemo(() => {
    if (!currentUser) return [];
    return restockAlerts.filter((alert) => {
      if (alert.userUid !== currentUser.uid) return false;
      const prod = products.find((p) => p.id === alert.productId);
      return alert.status === 'notified' || (prod && prod.stockCount > 0);
    });
  }, [restockAlerts, products, currentUser]);

  const getVariantAvailableCount = (product: StoreProductRecord, variantId: string): number => {
    const key = `${product.id}__${sanitizeId(variantId)}`;
    if (key in variantStockCounts) {
      return variantStockCounts[key];
    }
    const totalTracked = variantStockCounts[`${product.id}__total`];
    if (typeof totalTracked === 'number') {
      return 0;
    }
    return product.stockCount;
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleLogin = async (): Promise<User | null> => {
    try {
      uiSfx.playClick();
      const user = await signInWithGooglePopup();
      showToast('success', `Berhasil masuk sebagai ${user.email}.`);
      return user;
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal masuk dengan Google.');
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      uiSfx.playClick();
      await signOutStoreUser();
      setCheckoutMode(false);
      setPaymentTx(null);
      navigateStorePath('/store');
      showToast('success', 'Berhasil keluar dari sesi.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal keluar.');
    }
  };

  // 1. Open Product Detail Page (/produk/:nama-produk) — Works even when out of stock!
  const handleSelectProductForCheckout = (product: StoreProductRecord) => {
    uiSfx.playClick();
    const variants = getVariantsForProduct(product);
    setSelectedProduct(product);
    setSelectedVariant(variants[0] || null);
    setProductInfoTab('benefit');
    setProductReviewPage(1);
    navigateStorePath(`/produk/${toProductSlug(product.title)}`);
  };

  // 2. Proceed from /produk/:nama-produk to /cart (Only active when in stock)
  const handleProceedToCart = () => {
    const targetProd = activeProduct || selectedProduct;
    if (!targetProd) return;
    const vars = getVariantsForProduct(targetProd);
    const targetVar = selectedVariant || vars[0] || null;
    if (!targetVar) return;

    const varStock = getVariantAvailableCount(targetProd, targetVar.id);
    if (targetProd.stockCount <= 0 || varStock <= 0) {
      showToast('error', 'Stok variasi produk ini sedang habis.');
      return;
    }

    setSelectedProduct(targetProd);
    setSelectedVariant(targetVar);
    navigateStorePath('/cart');
  };

  // 3. Checkout on /cart -> Create Payment Code / QRIS & Redirect to /pay/:id-transaksi
  const handleCreatePaymentInvoice = async () => {
    const targetProd = selectedProduct || activeProduct;
    if (!targetProd || !selectedVariant) return;

    const varStock = getVariantAvailableCount(targetProd, selectedVariant.id);
    if (targetProd.stockCount <= 0 || varStock <= 0) {
      showToast('error', 'Stok variasi produk ini sudah habis.');
      return;
    }

    let activeUser = currentUser;
    if (!activeUser) {
      activeUser = await handleLogin();
      if (!activeUser) return;
    }

    setIsCreatingInvoice(true);
    try {
      const txData = await createWijayapayTransaction({
        paymentMethod: selectedPayment,
        nominal: cartPricing.subtotal,
      });
      setPaymentTx(txData);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('jays_active_payment_tx_v1', JSON.stringify(txData));
        } catch {}
      }
      navigateStorePath(`/pay/${encodeURIComponent(txData.ref_id)}`);
      showToast('success', `Tagihan ${txData.payment_name} (${txData.ref_id}) berhasil dibuat.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal membuat kode pembayaran.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // 4. Deliver Purchased Account / Redeem Code & Navigate to /receipt/:id-transaksi
  const deliverPurchasedItem = async () => {
    const targetProd = selectedProduct || activeProduct;
    if (!targetProd || !selectedVariant) return;
    let activeUser = currentUser;
    if (!activeUser) {
      activeUser = await handleLogin();
      if (!activeUser) return;
    }

    setIsCompletingPayment(true);
    try {
      const createdOrder = await purchaseProductAutomatically({
        product: targetProd,
        variant: selectedVariant,
        paymentMethod: paymentTx?.payment_method || selectedPayment,
        wijayapayData: paymentTx,
        buyer: activeUser,
      });
      setPaymentTx(null);
      setCheckoutMode(false);
      setAppliedPromoCode('');
      setPromoCodeInput('');
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem('jays_active_payment_tx_v1');
        } catch {}
      }
      navigateStorePath(`/receipt/${createdOrder.id}`);
      showToast(
        'success',
        'Pembayaran terverifikasi! Produk & panduan penggunaan telah dikirim otomatis.'
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memproses pengiriman otomatis.');
    } finally {
      setIsCompletingPayment(false);
    }
  };

  // Manual Check Payment Status on /pay/:id-transaksi
  const handleVerifyPaymentStatus = async () => {
    if (!paymentTx) return;
    setIsCompletingPayment(true);
    try {
      const statusRes = await checkWijayapayTransactionStatus(paymentTx.ref_id);
      if (statusRes.isPaid) {
        await deliverPurchasedItem();
      } else {
        showToast(
          'error',
          `Status pembayaran saat ini masih "${statusRes.status_pembayaran}". Silakan selesaikan pembayaran terlebih dahulu.`
        );
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengecek status pembayaran.');
    } finally {
      setIsCompletingPayment(false);
    }
  };

  // Background polling every 6 seconds while on /pay/:id-transaksi
  useEffect(() => {
    if (!paymentTx || storeLocation.routePage !== 'pay' || isCompletingPayment) return;
    const interval = window.setInterval(async () => {
      try {
        const res = await checkWijayapayTransactionStatus(paymentTx.ref_id);
        if (res.isPaid) {
          window.clearInterval(interval);
          deliverPurchasedItem();
        }
      } catch {
        // Ignore transient network errors
      }
    }, 6000);
    return () => window.clearInterval(interval);
  }, [paymentTx, storeLocation.routePage, isCompletingPayment]);

  // Subscribe to Restock Alert
  const handleSubscribeRestock = async (product: StoreProductRecord) => {
    let activeUser = currentUser;
    if (!activeUser) {
      activeUser = await handleLogin();
      if (!activeUser) return;
    }
    try {
      await subscribeProductRestockAlert({ product, user: activeUser });
      showToast('success', `Pengingat stok otomatis diaktifkan untuk ${product.title}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengaktifkan pengingat stok.');
    }
  };

  // Submit Rating (with automatic Toxic Filter)
  const handleRatingSubmit = async (order: StoreOrderRecord) => {
    if (!currentUser) return;
    const draft = ratingDrafts[order.id] || { rating: 5, comment: '' };
    setSubmittingRatingOrderId(order.id);
    try {
      const finalComment =
        draft.comment.trim() ||
        'Pengiriman instan dan produk berfungsi dengan sangat baik.';
      await submitOrderRating({
        order,
        rating: draft.rating,
        comment: finalComment,
        buyer: currentUser,
      });
      showToast('success', 'Terima kasih! Rating & ulasan Anda telah dipublikasikan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengirim ulasan.');
    } finally {
      setSubmittingRatingOrderId(null);
    }
  };

  // Handle Refund Photo Upload (Max 2 photos, Auto-compress if > 1MB)
  const handleRefundPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const remainingSlots = 2 - refundPhotos.length;
    if (remainingSlots <= 0) {
      showToast('error', 'Maksimal melampirkan 2 foto bukti.');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setIsCompressingPhoto(true);
    try {
      const processed: CompressedPhotoDraft[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) {
          showToast('error', `File "${file.name}" bukan gambar.`);
          continue;
        }
        const result = await compressRefundProofImage(file);
        processed.push({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          dataUrl: result.dataUrl,
          originalBytes: result.originalBytes,
          compressedBytes: result.compressedBytes,
          wasCompressed: result.wasCompressed,
        });
      }
      setRefundPhotos((prev) => [...prev, ...processed].slice(0, 2));
      if (processed.some((p) => p.originalBytes > 1024 * 1024)) {
        showToast(
          'success',
          'Foto di atas 1MB berhasil dikompres otomatis agar memenuhi batas ukuran.'
        );
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memproses foto bukti.');
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveRefundPhoto = (id: string) => {
    setRefundPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Submit Refund Form at /store/refund -> Redirects to /store/ticket/:refundId
  const handleSubmitRefundPageForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      await handleLogin();
      return;
    }
    const targetOrder = myOrders.find((o) => o.id === refundSelectedOrderId);
    if (!targetOrder) {
      showToast('error', 'Pilih transaksi yang ingin diajukan refund.');
      return;
    }

    const existingTicket = refundTickets.find((t) => t.orderId === targetOrder.id);
    if (existingTicket) {
      navigateStorePath(`/store/ticket/${existingTicket.id}`);
      return;
    }

    const eligibility = evaluateOrderRefundEligibility(targetOrder.purchasedAtMs, nowMs);
    if (!eligibility.eligible) {
      showToast('error', eligibility.label);
      return;
    }

    if (refundPhotos.length < 1) {
      showToast('error', 'Wajib mengupload minimal 1 foto bukti kendala (maksimal 2 foto).');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const createdTicket = await createRefundTicketWithProof({
        order: targetOrder,
        reason: refundReasonInput,
        solutionType: refundSolutionInput,
        proofImagesDataUrls: refundPhotos.map((p) => p.dataUrl),
        buyer: currentUser,
      });
      setRefundReasonInput('');
      setRefundPhotos([]);
      showToast(
        'success',
        'Tiket refund berhasil dibuat! Sesi chat telah dibuat dan menunggu pesan dari Admin.'
      );
      navigateStorePath(`/store/ticket/${createdTicket.id}`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengajukan klaim refund.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  // Send Chat Message on /store/ticket/:refundId
  const handleSendTicketChatMessage = async (
    e: React.FormEvent,
    ticket: StoreRefundTicketRecord
  ) => {
    e.preventDefault();
    if (!currentUser || !ticketMessageInput.trim()) return;

    const senderRole: 'admin' | 'user' = adminMode ? 'admin' : 'user';
    if (senderRole === 'user' && !ticket.canUserReply) {
      showToast(
        'error',
        'Anda hanya dapat mengirim pesan setelah Admin memulai percakapan pada tiket ini.'
      );
      return;
    }

    setIsSendingTicketMsg(true);
    try {
      await sendRefundTicketMessage({
        ticket,
        senderRole,
        senderName: adminMode
          ? 'Admin Store'
          : currentUser.displayName || currentUser.email?.split('@')[0] || 'Pembeli',
        text: ticketMessageInput,
      });
      setTicketMessageInput('');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengirim pesan.');
    } finally {
      setIsSendingTicketMsg(false);
    }
  };

  // Admin: Resolve & Close Ticket on /store/ticket/:refundId (Deletes proof photos from DB automatically)
  const handleAdminResolveTicket = async (
    ticket: StoreRefundTicketRecord,
    decision: 'approved_refund' | 'approved_replace' | 'rejected'
  ) => {
    setIsResolvingTicket(true);
    try {
      const relatedOrder = orders.find((o) => o.id === ticket.orderId) || null;
      await resolveRefundTicketByAdmin({
        ticket,
        order: relatedOrder,
        decision,
        replacementCredentials: adminReplacementInput,
        closingNote: adminClosingNoteInput,
      });
      setAdminReplacementInput('');
      setAdminClosingNoteInput('');
      showToast(
        'success',
        'Tiket refund berhasil diselesaikan & foto bukti telah dihapus otomatis dari database.'
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyelesaikan tiket refund.');
    } finally {
      setIsResolvingTicket(false);
    }
  };

  // Admin: Variant, Benefit (Max 10) & Structured Stock Row Helpers inside /new/product Form
  const handleAddBenefitRow = () => {
    setIsTemplateAutoSync(false);
    setBenefitDrafts((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, createBenefitDraftRow('', '', prev.length)];
    });
  };

  const handleRemoveBenefitRow = (id: string) => {
    setIsTemplateAutoSync(false);
    setBenefitDrafts((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleUpdateBenefitField = (
    id: string,
    field: 'title' | 'desc',
    value: string
  ) => {
    setIsTemplateAutoSync(false);
    setBenefitDrafts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddVariantRow = () => {
    setVariantDrafts((prev) => [...prev, createDefaultVariantDraft(prev.length + 1)]);
  };

  const handleRemoveVariantRow = (id: string) => {
    setVariantDrafts((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleUpdateVariantField = (
    id: string,
    field: 'label' | 'durationLabel' | 'originalPrice' | 'price',
    value: string
  ) => {
    setVariantDrafts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddVariantStockRow = (variantDraftId: string) => {
    setVariantDrafts((prev) =>
      prev.map((row) =>
        row.id === variantDraftId
          ? { ...row, stockRows: [...row.stockRows, createEmptyStockDraftRow()] }
          : row
      )
    );
  };

  const handleRemoveVariantStockRow = (variantDraftId: string, stockRowId: string) => {
    setVariantDrafts((prev) =>
      prev.map((row) =>
        row.id === variantDraftId
          ? { ...row, stockRows: row.stockRows.filter((s) => s.rowId !== stockRowId) }
          : row
      )
    );
  };

  const handleUpdateVariantStockRow = (
    variantDraftId: string,
    stockRowId: string,
    field: keyof StructuredStockRowInput,
    value: string
  ) => {
    setVariantDrafts((prev) =>
      prev.map((row) =>
        row.id === variantDraftId
          ? {
              ...row,
              stockRows: row.stockRows.map((s) =>
                s.rowId === stockRowId ? { ...s, [field]: value } : s
              ),
            }
          : row
      )
    );
  };

  // Load full 7,900+ icons index from thesvg.org when Admin opens /new/product or /store/dashboard
  useEffect(() => {
    if (
      !adminMode ||
      (storeLocation.routePage !== 'new-product' && storeLocation.routePage !== 'dashboard') ||
      theSvgCatalogLoaded
    ) {
      return;
    }
    let active = true;
    setIsLoadingTheSvgCatalog(true);
    fetch('https://thesvg.org/api/icons-full.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load thesvg'))))
      .then((data: any[]) => {
        if (!active || !Array.isArray(data)) return;
        const parsed: TheSvgIconEntry[] = data
          .filter((item) => item && item.slug && item.variants)
          .map((item) => {
            const vars = item.variants || {};
            const defaultPath =
              vars.default ||
              vars.color ||
              vars.mono ||
              Object.values(vars)[0] ||
              `/icons/${item.slug}/default.svg`;
            return {
              slug: String(item.slug),
              title: String(item.title || item.slug),
              categories: Array.isArray(item.categories) ? item.categories : [],
              defaultPath: String(defaultPath),
              variants: vars,
            };
          });
        if (parsed.length > 0) {
          setTheSvgCatalog(parsed);
          setTheSvgCatalogLoaded(true);
        }
      })
      .catch(() => {
        // Keep THESVG_POPULAR_ICONS fallback
      })
      .finally(() => {
        if (active) setIsLoadingTheSvgCatalog(false);
      });
    return () => {
      active = false;
    };
  }, [adminMode, storeLocation.routePage, theSvgCatalogLoaded]);

  const filteredTheSvgIcons = useMemo(() => {
    const q = iconSearchQuery.trim().toLowerCase();
    if (!q) {
      return THESVG_POPULAR_ICONS.slice(0, 36);
    }
    const matches = theSvgCatalog.filter(
      (item) =>
        item.slug.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.categories.some((c) => c.toLowerCase().includes(q))
    );
    matches.sort((a, b) => {
      const aExact = a.slug === q || a.title.toLowerCase() === q ? 0 : a.slug.startsWith(q) ? 1 : 2;
      const bExact = b.slug === q || b.title.toLowerCase() === q ? 0 : b.slug.startsWith(q) ? 1 : 2;
      return aExact - bExact;
    });
    return matches.slice(0, 48);
  }, [iconSearchQuery, theSvgCatalog]);

  const activeSelectedTheSvgEntry = useMemo(() => {
    if (!newProdIconUrl) return null;
    const matchSlug = newProdIconUrl.match(/\/icons\/([^/]+)\//)?.[1];
    if (!matchSlug) return null;
    return (
      theSvgCatalog.find((i) => i.slug === matchSlug) ||
      THESVG_POPULAR_ICONS.find((i) => i.slug === matchSlug) ||
      null
    );
  }, [newProdIconUrl, theSvgCatalog]);

  const filteredAdminProducts = useMemo(() => {
    const q = adminDashboardSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.badge || '').toLowerCase().includes(q)
    );
  }, [products, adminDashboardSearch]);

  const previewBenefitsList = useMemo(
    () =>
      parseBenefitsText(
        serializeBenefitRows(benefitDrafts),
        newProdTitle.trim() || 'Produk Digital',
        newProdDeliveryType,
        newProdDesc
      ),
    [benefitDrafts, newProdTitle, newProdDeliveryType, newProdDesc]
  );

  // Admin: Apply / Reset Template with current Product Name & Delivery Type
  const handleApplyTemplateToProductForm = (overrideDeliveryType?: ProductDeliveryType) => {
    uiSfx.playClick();
    const targetDeliv = overrideDeliveryType || newProdDeliveryType;
    const tpl = getDefaultProductTemplate(newProdTitle, targetDeliv);
    if (!newProdCategory.trim()) setNewProdCategory(tpl.category);
    if (!newProdBadge.trim()) setNewProdBadge(tpl.badge);
    setNewProdDesc(tpl.description);
    setBenefitDrafts(parseTemplateToBenefitRows(tpl.benefitsText));
    setNewProdUsageGuide(tpl.usageGuide);
    if (!editingProductId) {
      setIsTemplateAutoSync(true);
    }
    setAdminFormFeedback({
      type: 'success',
      text: `Template berhasil diterapkan${newProdTitle.trim() ? ` untuk "${newProdTitle.trim()}"` : ''}. Tinggal sesuaikan poin benefit & harga sesuai kebutuhan.`,
    });
  };

  // Admin: Start Editing Product -> Navigates to /new/product
  const handleStartEditProduct = (product: StoreProductRecord) => {
    uiSfx.playClick();
    const existingVars = getVariantsForProduct(product);
    const delivType = getProductDeliveryType(product);
    const existingIcon = getProductIconUrl(product);
    const existingBenefits = getProductBenefitsText(product);
    const fallbackTpl = getDefaultProductTemplate(product.title, delivType);

    setIsTemplateAutoSync(false);
    setEditingProductId(product.id);
    setAdminFormFeedback(null);
    setConfirmDeleteProductId(null);
    setNewProdTitle(product.title);
    setNewProdCategory(product.category);
    setNewProdBadge(product.badge || '');
    setNewProdIconUrl(existingIcon || '');
    setIconSearchQuery('');
    setNewProdDeliveryType(delivType);
    setNewProdDesc(product.description || fallbackTpl.description);
    setBenefitDrafts(parseTemplateToBenefitRows(existingBenefits || fallbackTpl.benefitsText));
    setNewProdUsageGuide(product.usageGuide || fallbackTpl.usageGuide);
    setVariantDrafts(
      existingVars.map((v) => ({
        id: v.id,
        label: v.label,
        durationLabel: v.durationLabel,
        originalPrice:
          typeof v.originalPrice === 'number' && v.originalPrice > v.price
            ? String(v.originalPrice)
            : '',
        price: String(v.price),
        stockRows: [],
      }))
    );
    navigateStorePath('/new/product');
  };

  const handleCancelEditProduct = () => {
    const freshTpl = getDefaultProductTemplate('', 'account');
    setEditingProductId(null);
    setIsTemplateAutoSync(true);
    setAdminFormFeedback(null);
    setNewProdTitle('');
    setNewProdCategory(freshTpl.category);
    setNewProdBadge(freshTpl.badge);
    setNewProdIconUrl('');
    setIconSearchQuery('');
    setNewProdDeliveryType('account');
    setNewProdDesc(freshTpl.description);
    setBenefitDrafts(parseTemplateToBenefitRows(freshTpl.benefitsText));
    setNewProdUsageGuide(freshTpl.usageGuide);
    setVariantDrafts([createDefaultVariantDraft(1)]);
  };

  const handleStartCreateNewProduct = () => {
    uiSfx.playClick();
    handleCancelEditProduct();
    navigateStorePath('/new/product');
  };

  const handleJumpToAddStock = (product: StoreProductRecord) => {
    uiSfx.playClick();
    const vars = getVariantsForProduct(product);
    setSelectedStockProductId(product.id);
    setSelectedStockVariantId(vars[0]?.id || '');
    navigateStorePath('/store/dashboard');
    window.setTimeout(() => {
      adminStockFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
  };

  // Admin: Save Product + Variations (with Optional Discount Price) + Structured Stock Rows
  const handleAdminSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newProdTitle.trim();
    if (!cleanTitle) {
      const msg = 'Nama produk wajib diisi terlebih dahulu.';
      setAdminFormFeedback({ type: 'error', text: msg });
      showToast('error', msg);
      return;
    }

    setIsSavingProduct(true);
    setAdminFormFeedback(null);
    try {
      const fallbackTpl = getDefaultProductTemplate(cleanTitle, newProdDeliveryType);
      const resolvedIcon =
        normalizeTheSvgIconUrl(newProdIconUrl) || inferTheSvgIconFromTitle(cleanTitle);
      const finalDesc = newProdDesc.trim() || fallbackTpl.description;
      const serializedBenefits = serializeBenefitRows(benefitDrafts);
      const finalBenefits = serializedBenefits || fallbackTpl.benefitsText;
      const finalUsageGuide = newProdUsageGuide.trim() || fallbackTpl.usageGuide;

      const cleanVariants: ProductVariantOption[] = variantDrafts.map((row, idx) => {
        const finalPrice = Math.max(0, Math.round(Number(row.price) || 0));
        const rawOrig = Math.max(0, Math.round(Number(row.originalPrice) || 0));
        return {
          id: sanitizeId(row.id || `var_${idx + 1}`),
          label: row.label.trim() || `Variasi ${idx + 1}`,
          durationLabel: row.durationLabel.trim() || '30 Hari',
          price: finalPrice,
          ...(rawOrig > finalPrice ? { originalPrice: rawOrig } : {}),
          deliveryType: newProdDeliveryType,
          ...(idx === 0 && resolvedIcon ? { iconUrl: resolvedIcon } : {}),
          ...(idx === 0 && finalBenefits ? { benefitsText: finalBenefits } : {}),
        };
      });

      const payload = {
        title: cleanTitle,
        category: newProdCategory.trim() || 'Premium Apps',
        description: finalDesc,
        benefitsText: finalBenefits,
        usageGuide: finalUsageGuide,
        deliveryType: newProdDeliveryType,
        variants: cleanVariants,
        badge: newProdBadge.trim(),
        iconUrl: resolvedIcon,
      };

      let savedProduct: StoreProductRecord;
      if (editingProductId) {
        savedProduct = await updateStoreProduct(editingProductId, payload);
      } else {
        savedProduct = await createStoreProduct(payload);
      }

      // Upload structured stock rows entered inside each variation
      let totalUploadedItems = 0;
      for (let i = 0; i < variantDrafts.length; i++) {
        const draftRow = variantDrafts[i];
        const targetVar = cleanVariants[i];
        if (draftRow.stockRows.length > 0 && targetVar) {
          const count = await addBatchStructuredStockRows({
            product: savedProduct,
            variant: targetVar,
            deliveryType: newProdDeliveryType,
            rows: draftRow.stockRows,
          });
          totalUploadedItems += count;
        }
      }

      setSelectedStockProductId(savedProduct.id);
      if (cleanVariants[0]) {
        setSelectedStockVariantId(cleanVariants[0].id);
      }

      const successMsg = editingProductId
        ? `Produk "${savedProduct.title}" berhasil diperbarui${
            totalUploadedItems > 0 ? ` (+${totalUploadedItems} stok baru)` : ''
          }.`
        : `Produk "${savedProduct.title}" berhasil dibuat${
            totalUploadedItems > 0 ? ` beserta ${totalUploadedItems} stok awal` : ''
          }.`;

      showToast('success', successMsg);
      handleCancelEditProduct();
      navigateStorePath('/store/dashboard');
    } catch (err: any) {
      let readableErr = err?.message || 'Gagal menyimpan produk.';
      try {
        const parsed = JSON.parse(readableErr);
        if (parsed?.error) readableErr = parsed.error;
      } catch {}
      setAdminFormFeedback({ type: 'error', text: readableErr });
      showToast('error', readableErr);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Admin: Promo CRUD Handlers (/promo)
  const handleResetPromoForm = () => {
    setEditingPromoId(null);
    setPromoCodeForm('');
    setPromoTitleForm('');
    setPromoDescForm('');
    setPromoDiscountTypeForm('percent');
    setPromoDiscountValueForm('10');
    setPromoMinPurchaseForm('0');
    setPromoIsActiveForm(true);
    setConfirmDeletePromoId(null);
  };

  const handleStartEditPromo = (promo: StorePromoRecord) => {
    uiSfx.playClick();
    setEditingPromoId(promo.id);
    setPromoCodeForm(promo.code);
    setPromoTitleForm(promo.title);
    setPromoDescForm(promo.description);
    setPromoDiscountTypeForm(promo.discountType);
    setPromoDiscountValueForm(String(promo.discountValue));
    setPromoMinPurchaseForm(String(promo.minPurchase || 0));
    setPromoIsActiveForm(promo.isActive);
    setConfirmDeletePromoId(null);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCodeForm.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode || cleanCode.length < 3) {
      showToast('error', 'Kode promo minimal 3 karakter huruf/angka.');
      return;
    }
    const cleanVal = Math.max(1, Math.round(Number(promoDiscountValueForm) || 0));
    if (promoDiscountTypeForm === 'percent' && cleanVal > 95) {
      showToast('error', 'Diskon persentase maksimal 95%.');
      return;
    }
    setIsSavingPromo(true);
    try {
      const payload = {
        code: cleanCode,
        title:
          promoTitleForm.trim() ||
          (promoDiscountTypeForm === 'percent'
            ? `Diskon ${cleanVal}%`
            : `Potongan ${formatRupiah(cleanVal)}`),
        description:
          promoDescForm.trim() ||
          (promoDiscountTypeForm === 'percent'
            ? `Potongan harga ${cleanVal}% berlaku di halaman checkout /cart.`
            : `Potongan langsung ${formatRupiah(cleanVal)} berlaku di halaman checkout /cart.`),
        discountType: promoDiscountTypeForm,
        discountValue: cleanVal,
        minPurchase: Math.max(0, Math.round(Number(promoMinPurchaseForm) || 0)),
        isActive: promoIsActiveForm,
      };
      if (editingPromoId) {
        await updateStorePromo(editingPromoId, payload);
        showToast('success', `Kode promo ${cleanCode} berhasil diperbarui.`);
      } else {
        await createStorePromo(payload);
        showToast('success', `Kode promo ${cleanCode} berhasil ditambahkan.`);
      }
      handleResetPromoForm();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan kode promo.');
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleTogglePromoActive = async (promo: StorePromoRecord) => {
    uiSfx.playClick();
    try {
      await updateStorePromo(promo.id, {
        code: promo.code,
        title: promo.title,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minPurchase: promo.minPurchase,
        isActive: !promo.isActive,
      });
      showToast(
        'success',
        `Promo ${promo.code} ${!promo.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengubah status promo.');
    }
  };

  const handleDeletePromo = async (promo: StorePromoRecord) => {
    uiSfx.playClick();
    setDeletingPromoId(promo.id);
    setConfirmDeletePromoId(null);
    try {
      await deleteStorePromo(promo.id);
      if (editingPromoId === promo.id) handleResetPromoForm();
      showToast('success', `Kode promo ${promo.code} berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus kode promo.');
    } finally {
      setDeletingPromoId(null);
    }
  };

  const handleSeedStarterPromos = async () => {
    uiSfx.playClick();
    setIsSavingPromo(true);
    try {
      await createStorePromo({
        code: 'HEMAT10',
        title: 'Diskon 10%',
        description: 'Potongan 10% untuk semua produk digital tanpa minimum pembelian.',
        discountType: 'percent',
        discountValue: 10,
        minPurchase: 0,
        isActive: true,
      });
      await createStorePromo({
        code: 'POTONGAN5K',
        title: 'Potongan Rp 5.000',
        description: 'Potongan langsung Rp 5.000 untuk transaksi minimal Rp 20.000.',
        discountType: 'fixed',
        discountValue: 5000,
        minPurchase: 20000,
        isActive: true,
      });
      showToast('success', '2 kode promo awal (HEMAT10 & POTONGAN5K) berhasil dibuat.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal membuat promo awal.');
    } finally {
      setIsSavingPromo(false);
    }
  };

  // Admin: Delete Product
  const handleAdminDeleteProduct = async (product: StoreProductRecord) => {
    uiSfx.playClick();
    setDeletingProductId(product.id);
    setConfirmDeleteProductId(null);
    try {
      await deleteStoreProduct(product.id);
      if (editingProductId === product.id) {
        handleCancelEditProduct();
      }
      if (selectedStockProductId === product.id) {
        const remaining = products.filter((p) => p.id !== product.id);
        setSelectedStockProductId(remaining[0]?.id || '');
      }
      const msg = `Produk "${product.title}" beserta stoknya berhasil dihapus.`;
      showToast('success', msg);
      setAdminFormFeedback({ type: 'success', text: msg });
    } catch (err: any) {
      let readableErr = err?.message || 'Gagal menghapus produk.';
      try {
        const parsed = JSON.parse(readableErr);
        if (parsed?.error) readableErr = parsed.error;
      } catch {}
      showToast('error', readableErr);
      setAdminFormFeedback({ type: 'error', text: readableErr });
    } finally {
      setDeletingProductId(null);
    }
  };

  // Admin: Standalone Multi-Row Stock Upload Form Handlers
  const handleAddStandaloneStockRow = () => {
    setStandaloneStockRows((prev) => [...prev, createEmptyStockDraftRow()]);
  };

  const handleRemoveStandaloneStockRow = (rowId: string) => {
    setStandaloneStockRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev
    );
  };

  const handleUpdateStandaloneStockRow = (
    rowId: string,
    field: keyof StructuredStockRowInput,
    value: string
  ) => {
    setStandaloneStockRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  const handleAdminSaveStandaloneStockRows = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProduct = products.find((p) => p.id === selectedStockProductId);
    if (!targetProduct) {
      showToast('error', 'Pilih produk terlebih dahulu.');
      return;
    }
    const targetVariant =
      selectedStockProductVariants.find((v) => v.id === selectedStockVariantId) ||
      selectedStockProductVariants[0];
    if (!targetVariant) {
      showToast('error', 'Pilih variasi produk terlebih dahulu.');
      return;
    }

    const delivType = getProductDeliveryType(targetProduct);
    const validRows = standaloneStockRows.filter((r) => {
      if (!r.accountEmail.trim()) return false;
      if (delivType === 'account' && !r.accountPassword.trim()) return false;
      return true;
    });

    if (validRows.length === 0) {
      showToast(
        'error',
        delivType === 'redeem'
          ? 'Isi minimal 1 baris Kode Redeem.'
          : 'Isi minimal 1 baris Email & Password akun.'
      );
      return;
    }

    setIsSavingStock(true);
    try {
      const addedCount = await addBatchStructuredStockRows({
        product: targetProduct,
        variant: targetVariant,
        deliveryType: delivType,
        rows: validRows,
      });
      setStandaloneStockRows([createEmptyStockDraftRow()]);
      showToast(
        'success',
        `Berhasil menambahkan ${addedCount} stok ${
          delivType === 'redeem' ? 'kode redeem' : 'akun'
        } ke variasi "${targetVariant.label}".`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan stok.');
    } finally {
      setIsSavingStock(false);
    }
  };

  const filteredAdminStock = useMemo(() => {
    return adminStock.filter((item) => {
      if (stockFilter !== 'all' && item.status !== stockFilter) return false;
      return true;
    });
  }, [adminStock, stockFilter]);

  // Active Receipt Order when on /store/receipt/:receiptId
  const activeReceiptOrder = useMemo(() => {
    if (storeLocation.routePage !== 'receipt' || !storeLocation.paramId) return null;
    return (
      orders.find(
        (o) => o.id === storeLocation.paramId || o.invoiceCode === storeLocation.paramId
      ) || null
    );
  }, [storeLocation, orders]);

  // Active Refund Ticket when on /store/ticket/:refundId
  const activeRefundTicket = useMemo(() => {
    if (storeLocation.routePage !== 'ticket' || !storeLocation.paramId) return null;
    return (
      refundTickets.find(
        (t) => t.id === storeLocation.paramId || t.orderId === storeLocation.paramId
      ) || null
    );
  }, [storeLocation, refundTickets]);

  // Resolved Payment Code for VA / Retail
  const activePaymentCode = useMemo(() => {
    if (!paymentTx) return '';
    return String(
      paymentTx.pay_code || paymentTx.nomor_va || paymentTx.nomor_pembayaran || ''
    ).trim();
  }, [paymentTx]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 pt-24 sm:pt-28 pb-28 px-4 sm:px-8 lg:px-12">
      <div className="max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
        {/* ============================================================= */}
        {/* STORE HEADER & MULTI-PAGE NAVIGATION BAR */}
        {/* ============================================================= */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-zinc-100">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-zinc-950">
                Digital Store
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-3xl font-light leading-relaxed">
                Layanan produk digital dengan verifikasi pembayaran otomatis (QRIS, BCA/BNI Virtual Account, Alfamart, Indomaret), pengiriman instan akun maupun kode redeem, serta jaminan garansi resmi 3 hari.
              </p>
            </div>

            {/* Unified User / Admin Account Box */}
            <div className="flex items-center gap-4 self-start lg:self-end bg-zinc-50 border border-zinc-200/80 rounded-xl px-4 py-3 text-xs shrink-0">
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-900 truncate max-w-[220px]">
                      {currentUser.email}
                    </div>
                    <div className="text-[11px] font-mono-code text-zinc-500 lowercase mt-0.5">
                      {adminMode ? 'akses: administrator' : 'akses: pembeli terverifikasi'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:border-zinc-950 text-zinc-700 hover:text-zinc-950 font-mono-code text-[11px] transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0"
                  >
                    keluar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-zinc-500 whitespace-nowrap">Belum masuk sesi</span>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0"
                  >
                    masuk dengan google
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Multi-Page Route Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs font-mono-code">
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode(false);
                  navigateStorePath('/store');
                }}
                className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                  storeLocation.routePage === 'catalog' || storeLocation.routePage === 'product'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                katalog ({products.length})
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/cart')}
                className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                  storeLocation.routePage === 'cart' || storeLocation.routePage === 'pay'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                keranjang {selectedProduct ? '(1)' : ''}
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/store/transaksi')}
                className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                  storeLocation.routePage === 'transactions' || storeLocation.routePage === 'receipt'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                transaksi ({myOrders.length})
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/ulasan')}
                className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                  storeLocation.routePage === 'reviews'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                ulasan ({reviews.length})
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/store/refund')}
                className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                  storeLocation.routePage === 'refund' || storeLocation.routePage === 'ticket'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                refund {myTickets.length > 0 ? `(${myTickets.length})` : ''}
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/store/dashboard')}
                className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                  storeLocation.routePage === 'dashboard'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                {adminMode ? 'dashboard admin' : 'dashboard user'}
              </button>

              {adminMode && (
                <>
                  <button
                    type="button"
                    onClick={handleStartCreateNewProduct}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                      storeLocation.routePage === 'new-product'
                        ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:border-zinc-950'
                    }`}
                  >
                    <Plus size={13} />
                    <span>produk baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateStorePath('/promo')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap shrink-0 ${
                      storeLocation.routePage === 'promo'
                        ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:border-zinc-950'
                    }`}
                  >
                    <Tag size={13} />
                    <span>kode promo ({storePromos.length})</span>
                  </button>
                </>
              )}
            </nav>

            <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono-code text-zinc-400 lowercase whitespace-nowrap">
              <ShieldCheck size={14} className="text-emerald-700" />
              <span>pengiriman instan · klaim refund 10 menit – 3 hari</span>
            </div>
          </div>
        </div>

        {/* Status Toast Notification */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between gap-3 px-5 py-3.5 border text-xs ${
              statusMessage.type === 'success'
                ? 'bg-white border-zinc-900 text-zinc-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <span className="font-medium">{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-zinc-400 hover:text-zinc-900 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Automatic Restock Notification Banner */}
        {triggeredRestockNotifications.length > 0 && (
          <div className="bg-white border border-zinc-900 p-5 space-y-3">
            <div className="text-[11px] font-mono-code text-emerald-700 lowercase">
              [pemberitahuan otomatis • stok produk kembali tersedia]
            </div>
            <div className="divide-y divide-zinc-100">
              {triggeredRestockNotifications.map((alert) => {
                const prod = products.find((p) => p.id === alert.productId);
                return (
                  <div
                    key={alert.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="text-zinc-800">
                      Stok untuk <span className="font-medium text-zinc-950">{alert.productTitle}</span> telah tersedia kembali
                      {prod ? ` (${prod.stockCount} tersedia)` : ''}.
                    </div>
                    <div className="flex items-center gap-4 font-mono-code">
                      {prod && (
                        <button
                          type="button"
                          onClick={() => handleSelectProductForCheckout(prod)}
                          className="text-zinc-950 underline underline-offset-4 cursor-pointer lowercase"
                        >
                          [lihat produk →]
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissRestockAlert(alert.id)}
                        className="text-zinc-400 hover:text-zinc-800 cursor-pointer lowercase"
                      >
                        [tutup]
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 1A: /store — KATALOG PRODUK (KLIK CARD -> /produk/:slug) */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'catalog' && (
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Category Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-lg border transition-colors cursor-pointer lowercase whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {adminMode && (
                  <button
                    type="button"
                    onClick={handleStartCreateNewProduct}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code cursor-pointer lowercase shrink-0 whitespace-nowrap"
                  >
                    <Plus size={13} />
                    <span>produk baru</span>
                  </button>
                )}
                <div className="relative flex-1 md:w-72">
                  <Search
                    size={14}
                    className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari produk atau kategori..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {loadingProducts ? (
              <div className="py-16 text-center text-xs font-mono-code text-zinc-400 lowercase">
                memuat daftar produk digital...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-dashed border-zinc-200 rounded-xl p-8">
                <div className="text-sm font-medium text-zinc-900">
                  Belum ada produk digital yang tersedia.
                </div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  {adminMode
                    ? 'Tambahkan produk pertama Anda melalui halaman /new/product.'
                    : 'Silakan kembali lagi nanti saat produk baru telah ditambahkan.'}
                </p>
                {adminMode && (
                  <button
                    type="button"
                    onClick={handleStartCreateNewProduct}
                    className="mt-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                  >
                    buat produk baru (/new/product) →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const inStock = product.stockCount > 0;
                  const prodVariants = getVariantsForProduct(product);
                  const delivType = getProductDeliveryType(product);
                  const cheapestVar =
                    prodVariants.length > 0
                      ? prodVariants.reduce((minV, v) => (v.price < minV.price ? v : minV), prodVariants[0])
                      : null;
                  const lowestDiscount = getVariantDiscountInfo(
                    cheapestVar?.price ?? product.price,
                    cheapestVar?.originalPrice
                  );
                  const maxDiscountPct = prodVariants.reduce((best, v) => {
                    const info = getVariantDiscountInfo(v.price, v.originalPrice);
                    return info.discountPercent > best ? info.discountPercent : best;
                  }, 0);
                  const existingAlert = currentUser
                    ? restockAlerts.find(
                        (a) =>
                          a.productId === product.id &&
                          a.userUid === currentUser.uid &&
                          a.status === 'waiting'
                      )
                    : undefined;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProductForCheckout(product)}
                      className="border border-zinc-200/90 rounded-2xl p-6 flex flex-col justify-between gap-6 hover:border-zinc-950 transition-all bg-white cursor-pointer group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono-code">
                          <span className="text-zinc-500 lowercase truncate">
                            {product.category} · {delivType === 'redeem' ? 'kode redeem' : 'akun'}
                            {product.badge ? ` · ${product.badge}` : ''}
                          </span>
                          <span
                            className={`whitespace-nowrap shrink-0 font-medium ${
                              inStock ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {inStock ? `stok ${product.stockCount}` : 'habis'}
                          </span>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-900">
                            <ProductBrandIcon
                              iconUrl={getProductIconUrl(product)}
                              title={product.title}
                              size={26}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-zinc-950 tracking-tight group-hover:underline underline-offset-4 truncate">
                                {product.title}
                              </h3>
                              {maxDiscountPct > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono-code font-medium shrink-0">
                                  -{maxDiscountPct}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 font-light leading-relaxed mt-1.5 line-clamp-2">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        {/* Variations preview */}
                        <div className="space-y-2 pt-3 border-t border-zinc-100">
                          <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                            pilihan variasi ({prodVariants.length}):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {prodVariants.map((v) => {
                              const vCount = getVariantAvailableCount(product, v.id);
                              const vDisc = getVariantDiscountInfo(v.price, v.originalPrice);
                              return (
                                <span
                                  key={v.id}
                                  className="text-[11px] font-mono-code bg-zinc-50 border border-zinc-200/80 rounded-md px-2.5 py-1 text-zinc-700 tabular-nums"
                                >
                                  {v.label} ({v.durationLabel}) ·{' '}
                                  {vDisc.hasDiscount && (
                                    <span className="line-through text-zinc-400 mr-1">
                                      {formatRupiah(vDisc.originalPrice)}
                                    </span>
                                  )}
                                  {formatRupiah(v.price)} [{vCount}]
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                            mulai dari
                          </div>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xl font-semibold text-zinc-950 tabular-nums">
                              {formatRupiah(lowestDiscount.finalPrice || product.price)}
                            </span>
                            {lowestDiscount.hasDiscount && (
                              <span className="text-xs text-zinc-400 line-through tabular-nums">
                                {formatRupiah(lowestDiscount.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {adminMode && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditProduct(product)}
                                className="px-3 py-2 rounded-lg border border-zinc-200 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 cursor-pointer lowercase whitespace-nowrap"
                              >
                                edit
                              </button>
                              {confirmDeleteProductId === product.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminDeleteProduct(product)}
                                    disabled={deletingProductId === product.id}
                                    className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-mono-code cursor-pointer lowercase disabled:opacity-40 whitespace-nowrap"
                                  >
                                    {deletingProductId === product.id ? 'hapus...' : 'yakin'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProductId(null)}
                                    className="px-2.5 py-2 rounded-lg border border-zinc-200 text-xs font-mono-code text-zinc-500 cursor-pointer lowercase whitespace-nowrap"
                                  >
                                    batal
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProductId(product.id)}
                                  className="px-3 py-2 rounded-lg border border-red-200 hover:border-red-600 text-xs font-mono-code text-red-600 cursor-pointer lowercase whitespace-nowrap"
                                >
                                  hapus
                                </button>
                              )}
                            </>
                          )}

                          {!inStock && (
                            existingAlert ? (
                              <span className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-mono-code lowercase whitespace-nowrap">
                                pengingat aktif
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSubscribeRestock(product)}
                                className="px-3 py-2 rounded-lg border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 cursor-pointer lowercase whitespace-nowrap"
                              >
                                ingatkan stok
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() => handleSelectProductForCheckout(product)}
                            className="px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                          >
                            {inStock ? 'pilih produk →' : 'lihat detail →'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 1B: /produk/:nama-produk — DETAIL PRODUK, VARIASI & ULASAN */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'product' && (
          <div className="space-y-8">
            {!activeProduct ? (
              <div className="bg-white border border-zinc-200 p-10 text-center space-y-4">
                <div className="text-sm font-medium text-zinc-900">
                  Produk tidak ditemukan ({storeLocation.paramId})
                </div>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store')}
                  className="px-4 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  ← kembali ke katalog produk
                </button>
              </div>
            ) : (
              (() => {
                const prodVariants = getVariantsForProduct(activeProduct);
                const currentVar = selectedVariant || prodVariants[0] || null;
                const delivType = getProductDeliveryType(activeProduct);
                const totalStock = activeProduct.stockCount;
                const selectedVarStock = currentVar
                  ? getVariantAvailableCount(activeProduct, currentVar.id)
                  : totalStock;
                const isProductInStock = totalStock > 0 && selectedVarStock > 0;
                const avgRating =
                  activeProduct.ratingAvg && activeProduct.ratingAvg > 0
                    ? activeProduct.ratingAvg.toFixed(1)
                    : '5.0';
                const soldCount = Math.max(
                  productReviews.length,
                  activeProduct.ratingCount || 0
                );
                const existingAlert = currentUser
                  ? restockAlerts.find(
                      (a) =>
                        a.productId === activeProduct.id &&
                        a.userUid === currentUser.uid &&
                        a.status === 'waiting'
                    )
                  : undefined;

                const benefitList = getProductBenefits(activeProduct);

                return (
                  <>
                    {/* Top Breadcrumb matching reference UI */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <button
                        type="button"
                        onClick={onNavigateHome}
                        className="hover:text-zinc-950 cursor-pointer"
                      >
                        Beranda
                      </button>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => navigateStorePath('/store')}
                        className="hover:text-zinc-950 cursor-pointer"
                      >
                        Semua Produk
                      </button>
                      <span>/</span>
                      <span className="font-medium text-zinc-950">{activeProduct.title}</span>
                    </div>

                    {/* Main 2-Column Product Detail Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* LEFT COLUMN: Product Summary Card + Benefit/Garansi/Deskripsi Tabs */}
                      <div className="lg:col-span-4 space-y-5">
                        {/* Card 1: Product Identity & Status */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
                          <div className="w-14 h-14 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-900">
                            <ProductBrandIcon
                              iconUrl={getProductIconUrl(activeProduct)}
                              title={activeProduct.title}
                              size={30}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <h2 className="text-xl font-semibold text-zinc-950 tracking-tight">
                              {activeProduct.title}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-zinc-600">
                              <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                                <Star size={13} className="fill-amber-500 text-amber-500" />
                                {avgRating}
                              </span>
                              <span>•</span>
                              <span>
                                {soldCount > 0 ? `${soldCount} Ulasan Terverifikasi` : 'Produk Resmi'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {totalStock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                                <Check size={12} />
                                Ready ({totalStock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium">
                                Stok Habis (0)
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                              <ShieldCheck size={12} />
                              Garansi 3 Hari
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-mono-code lowercase">
                              {delivType === 'redeem' ? 'kode redeem' : 'akun email & password'}
                            </span>
                          </div>

                          {totalStock <= 0 && (
                            <div className="pt-3 border-t border-zinc-100">
                              {existingAlert ? (
                                <div className="w-full py-2 px-3 bg-zinc-100 text-zinc-600 text-xs font-mono-code text-center rounded-lg lowercase">
                                  pengingat stok aktif untuk produk ini
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSubscribeRestock(activeProduct)}
                                  className="w-full py-2 px-3 border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-800 rounded-lg cursor-pointer lowercase transition-colors"
                                >
                                  + ingatkan saya saat stok tersedia
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card 2: Benefit / Garansi / Deskripsi Tabs */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
                          <div className="flex items-center gap-5 border-b border-zinc-200 text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => setProductInfoTab('benefit')}
                              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                                productInfoTab === 'benefit'
                                  ? 'border-zinc-950 text-zinc-950 font-semibold'
                                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
                              }`}
                            >
                              Benefit
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductInfoTab('garansi')}
                              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                                productInfoTab === 'garansi'
                                  ? 'border-zinc-950 text-zinc-950 font-semibold'
                                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
                              }`}
                            >
                              Garansi
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductInfoTab('deskripsi')}
                              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                                productInfoTab === 'deskripsi'
                                  ? 'border-zinc-950 text-zinc-950 font-semibold'
                                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
                              }`}
                            >
                              Deskripsi
                            </button>
                          </div>

                          {productInfoTab === 'benefit' && (
                            <div className="space-y-4">
                              {benefitList.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <Check
                                    size={15}
                                    className="text-emerald-600 shrink-0 mt-0.5"
                                  />
                                  <div className="space-y-0.5 text-xs">
                                    <div className="font-semibold text-zinc-900">
                                      {item.title}
                                    </div>
                                    <p className="text-zinc-500 font-light leading-relaxed">
                                      {item.desc}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {productInfoTab === 'garansi' && (
                            <div className="space-y-4 text-xs">
                              <div className="flex items-start gap-3">
                                <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-zinc-900">
                                    Garansi Penuh 3 Hari (72 Jam)
                                  </div>
                                  <p className="text-zinc-500 font-light leading-relaxed mt-0.5">
                                    Setiap pembelian dilindungi garansi selama 3 hari sejak waktu transaksi selesai.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-zinc-900">
                                    Opsi Penggantian Produk atau Pengembalian Dana
                                  </div>
                                  <p className="text-zinc-500 font-light leading-relaxed mt-0.5">
                                    Anda dapat memilih pengiriman barang ulang (penggantian akun/kode baru) atau refund dana penuh disertai foto bukti kendala.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-zinc-900">
                                    Klaim Mulai 10 Menit Setelah Transaksi
                                  </div>
                                  <p className="text-zinc-500 font-light leading-relaxed mt-0.5">
                                    Untuk keamanan sistem, form klaim garansi/refund dapat diajukan setelah 10 menit sejak transaksi berhasil.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {productInfoTab === 'deskripsi' && (
                            <div className="space-y-4 text-xs text-zinc-600 leading-relaxed">
                              <p className="whitespace-pre-line">{activeProduct.description}</p>
                              {activeProduct.usageGuide && (
                                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                                  <div className="font-mono-code text-[11px] text-zinc-900 uppercase">
                                    Ringkasan Cara Pakai:
                                  </div>
                                  <p className="whitespace-pre-line text-zinc-500 font-light">
                                    {activeProduct.usageGuide}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card 3: Safe Checkout Guarantee Box */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3 text-xs text-zinc-600">
                          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                          <span>
                            Checkout aman dengan pengiriman otomatis & jaminan garansi resmi 100%.
                          </span>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Step 1 (Pilih Varian) + Step 2 (Data Pembeli) + Tombol Beli */}
                      <div className="lg:col-span-8 space-y-5">
                        {/* Step 1: Pilih Nominal / Varian */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
                          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-semibold flex items-center justify-center">
                              1
                            </span>
                            <h3 className="text-sm sm:text-base font-semibold text-zinc-950">
                              Pilih Nominal / Varian
                            </h3>
                          </div>

                          {/* Paket */}
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-zinc-700">Paket</div>
                            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-2 border-zinc-950 bg-zinc-50 text-xs font-semibold text-zinc-950">
                              <ProductBrandIcon
                                iconUrl={getProductIconUrl(activeProduct)}
                                title={activeProduct.title}
                                size={16}
                              />
                              <span>{activeProduct.title}</span>
                              <Check size={14} className="text-zinc-950" />
                            </div>
                          </div>

                          {/* Tipe Pengiriman */}
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-zinc-700">Tipe Produk</div>
                            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-zinc-950 bg-zinc-50 text-xs font-semibold text-zinc-950">
                              <span>
                                {delivType === 'redeem'
                                  ? 'Kode Redeem / Voucher'
                                  : 'Akun (Email & Password)'}
                              </span>
                              <Check size={14} className="text-zinc-950" />
                            </div>
                          </div>

                          {/* Duration / Variasi */}
                          <div className="space-y-2.5">
                            <div className="text-xs font-medium text-zinc-700">
                              Pilih Variasi & Durasi
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {prodVariants.map((variant) => {
                                const isSelected = currentVar?.id === variant.id;
                                const varStock = getVariantAvailableCount(
                                  activeProduct,
                                  variant.id
                                );
                                const disc = getVariantDiscountInfo(
                                  variant.price,
                                  variant.originalPrice
                                );
                                return (
                                  <button
                                    key={variant.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedVariant(variant);
                                    }}
                                    className={`p-3.5 rounded-lg border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                                      isSelected
                                        ? 'border-zinc-950 bg-zinc-50/80'
                                        : 'border-zinc-200 bg-white hover:border-zinc-400'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="text-xs font-semibold text-zinc-950">
                                          {variant.label}
                                        </div>
                                        <div className="text-[11px] text-zinc-500">
                                          {variant.durationLabel}
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                                          varStock > 0
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-red-50 text-red-600 border border-red-200'
                                        }`}
                                      >
                                        {varStock > 0 ? `Stok ${varStock}` : 'Habis'}
                                      </span>
                                    </div>

                                    <div className="flex items-end justify-between gap-2 pt-1">
                                      <div>
                                        {disc.hasDiscount && (
                                          <div className="flex items-center gap-1.5 text-[10px]">
                                            <span className="line-through text-zinc-400 tabular-nums">
                                              {formatRupiah(disc.originalPrice)}
                                            </span>
                                            <span className="text-emerald-700 font-semibold">
                                              -{disc.discountPercent}%
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-xs sm:text-sm font-semibold text-zinc-950 tabular-nums">
                                          {formatRupiah(variant.price)}
                                        </span>
                                      </div>
                                      {isSelected && (
                                        <span className="w-4 h-4 rounded-full bg-zinc-950 text-white flex items-center justify-center shrink-0">
                                          <Check size={10} />
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Masukkan Data Pembeli */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
                          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-semibold flex items-center justify-center">
                              2
                            </span>
                            <h3 className="text-sm sm:text-base font-semibold text-zinc-950">
                              Masukkan Data Pembeli
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800">
                                Nama Lengkap
                              </label>
                              <input
                                type="text"
                                value={buyerFullName}
                                onChange={(e) => setBuyerFullName(e.target.value)}
                                placeholder="Masukkan nama lengkap"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                              />
                              <p className="text-[11px] text-zinc-400">
                                Gunakan nama penerima pesanan agar transaksi mudah dikenali.
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800">
                                Alamat Email
                              </label>
                              <input
                                type="email"
                                value={buyerEmailInput}
                                onChange={(e) => setBuyerEmailInput(e.target.value)}
                                placeholder="pembeli@email.com"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                              />
                              <p className="text-[11px] text-zinc-400">
                                Invoice dan info akun dikirim otomatis ke halaman receipt.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-zinc-800">
                              No. WhatsApp (Opsional)
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-zinc-50 text-xs font-mono-code text-zinc-700 shrink-0">
                                +62
                              </div>
                              <input
                                type="tel"
                                value={buyerWhatsapp}
                                onChange={(e) => setBuyerWhatsapp(e.target.value)}
                                placeholder="8123456789"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                              />
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              Dipakai untuk notifikasi pesanan dan bantuan jika ada kendala.
                            </p>
                          </div>
                        </div>

                        {/* Action Box: Selected Price & Beli Sekarang Button (Disabled if Out of Stock!) */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-zinc-500">
                                Variasi dipilih:{' '}
                                <span className="font-medium text-zinc-900">
                                  {currentVar
                                    ? `${currentVar.label} (${currentVar.durationLabel})`
                                    : activeProduct.title}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono-code text-zinc-400 mt-0.5">
                                Stok tersedia: {selectedVarStock}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-zinc-500">Harga Paket</div>
                              {(() => {
                                const curDisc = getVariantDiscountInfo(
                                  currentVar?.price ?? activeProduct.price,
                                  currentVar?.originalPrice
                                );
                                return (
                                  <div className="flex items-baseline justify-end gap-2">
                                    {curDisc.hasDiscount && (
                                      <span className="text-xs text-zinc-400 line-through tabular-nums">
                                        {formatRupiah(curDisc.originalPrice)}
                                      </span>
                                    )}
                                    <span className="text-2xl font-bold text-zinc-950 tabular-nums">
                                      {formatRupiah(curDisc.finalPrice)}
                                    </span>
                                    {curDisc.hasDiscount && (
                                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                        Hemat {curDisc.discountPercent}%
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleProceedToCart}
                            disabled={!isProductInStock}
                            className={`w-full py-3.5 px-6 rounded-lg text-xs font-mono-code uppercase tracking-wider transition-colors ${
                              isProductInStock
                                ? 'bg-zinc-950 hover:bg-zinc-800 text-white cursor-pointer'
                                : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {isProductInStock
                              ? 'BELI SEKARANG — LANJUT KE KERANJANG →'
                              : 'STOK HABIS — TIDAK DAPAT DIBELI'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM FULL-WIDTH SECTION: ULASAN PRODUK (PER 10 ULASAN) */}
                    <div className="pt-8 border-t border-zinc-200 space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-zinc-950">Ulasan</h3>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                          <span>{avgRating}</span>
                          <span className="text-amber-500">★★★★★</span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          ({productReviews.length} ulasan pada produk ini)
                        </span>
                      </div>

                      {productReviews.length === 0 ? (
                        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-xs text-zinc-400 font-mono-code lowercase">
                          [belum ada ulasan untuk produk {activeProduct.title}]
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedProductReviews.map((rev) => (
                              <div
                                key={rev.id}
                                className="bg-white border border-zinc-200 rounded-xl p-5 flex items-start gap-3.5"
                              >
                                <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700 shrink-0">
                                  {getInitials(rev.buyerName)}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-zinc-900 truncate">
                                      {rev.buyerName}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 shrink-0">
                                      {formatShortDate(rev.createdAtMs)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-amber-500 leading-none">
                                    {'★'.repeat(Math.max(1, Math.min(5, rev.rating)))}
                                  </div>
                                  <p className="text-xs text-zinc-600 font-light leading-relaxed pt-1">
                                    {censorToxicWords(rev.comment)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Per-10 Pagination Bar matching reference screenshot */}
                          <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
                            <span>
                              {(productReviewPage - 1) * 10 + 1}–
                              {Math.min(productReviewPage * 10, productReviews.length)} dari{' '}
                              {productReviews.length}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={productReviewPage <= 1}
                                onClick={() =>
                                  setProductReviewPage((p) => Math.max(1, p - 1))
                                }
                                className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-950 disabled:opacity-40 cursor-pointer flex items-center justify-center"
                              >
                                ‹
                              </button>
                              {Array.from(
                                { length: totalProductReviewPages },
                                (_, i) => i + 1
                              ).map((pageNum) => (
                                <button
                                  key={pageNum}
                                  type="button"
                                  onClick={() => setProductReviewPage(pageNum)}
                                  className={`w-8 h-8 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center ${
                                    productReviewPage === pageNum
                                      ? 'bg-zinc-950 text-white'
                                      : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              ))}
                              <button
                                type="button"
                                disabled={productReviewPage >= totalProductReviewPages}
                                onClick={() =>
                                  setProductReviewPage((p) =>
                                    Math.min(totalProductReviewPages, p + 1)
                                  )
                                }
                                className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-950 disabled:opacity-40 cursor-pointer flex items-center justify-center"
                              >
                                ›
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 1C: /cart — PILIH METODE PEMBAYARAN, VOUCHER PROMO & CHECKOUT */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'cart' && (
          <div className="space-y-6">
            {!selectedProduct && !activeProduct ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center space-y-4">
                <div className="text-sm font-medium text-zinc-900">
                  Keranjang belanja Anda masih kosong.
                </div>
                <p className="text-xs text-zinc-500">
                  Silakan pilih produk dan variasi terlebih dahulu di katalog.
                </p>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store')}
                  className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  lihat katalog produk →
                </button>
              </div>
            ) : (
              (() => {
                const cartProd = selectedProduct || activeProduct!;
                const cartVars = getVariantsForProduct(cartProd);
                const cartVar = selectedVariant || cartVars[0] || null;
                const delivType = getProductDeliveryType(cartProd);
                const varStock = cartVar
                  ? getVariantAvailableCount(cartProd, cartVar.id)
                  : cartProd.stockCount;
                const isCartItemAvailable = cartProd.stockCount > 0 && varStock > 0;

                return (
                  <>
                    {/* Breadcrumb */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <button
                        type="button"
                        onClick={() => navigateStorePath('/store')}
                        className="hover:text-zinc-950 cursor-pointer"
                      >
                        Semua Produk
                      </button>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() =>
                          navigateStorePath(`/produk/${toProductSlug(cartProd.title)}`)
                        }
                        className="hover:text-zinc-950 cursor-pointer"
                      >
                        {cartProd.title}
                      </button>
                      <span>/</span>
                      <span className="font-medium text-zinc-950">Keranjang & Checkout</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column: Selected Product & Buyer Info Summary */}
                      <div className="lg:col-span-4 space-y-5">
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                            <span className="text-xs font-mono-code text-zinc-500 uppercase">
                              Item di Keranjang
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                navigateStorePath(`/produk/${toProductSlug(cartProd.title)}`)
                              }
                              className="text-xs font-mono-code text-zinc-900 underline cursor-pointer lowercase"
                            >
                              ubah varian
                            </button>
                          </div>

                          <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-900">
                              <ProductBrandIcon
                                iconUrl={getProductIconUrl(cartProd)}
                                title={cartProd.title}
                                size={24}
                              />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="text-lg font-semibold text-zinc-950 truncate">
                                {cartProd.title}
                              </div>
                              <div className="text-xs text-zinc-600">
                                Variasi:{' '}
                                <span className="font-medium text-zinc-900">
                                  {cartVar
                                    ? `${cartVar.label} (${cartVar.durationLabel})`
                                    : '-'}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-500">
                                Tipe:{' '}
                                {delivType === 'redeem'
                                  ? 'Kode Redeem / Voucher'
                                  : 'Akun Email & Password'}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 space-y-1.5 text-xs">
                            <div className="text-[11px] font-mono-code text-zinc-400 uppercase">
                              Data Pembeli
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Nama:</span>
                              <span className="text-zinc-900 font-medium">
                                {buyerFullName || currentUser?.displayName || 'Pembeli'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Email:</span>
                              <span className="text-zinc-900 truncate max-w-[180px]">
                                {buyerEmailInput || currentUser?.email || '-'}
                              </span>
                            </div>
                            {buyerWhatsapp && (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">WhatsApp:</span>
                                <span className="text-zinc-900">+62{buyerWhatsapp}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3 text-xs text-zinc-600">
                          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                          <span>
                            Setelah klik Checkout, Anda akan diarahkan ke halaman kode bayar (/pay/id-transaksi).
                          </span>
                        </div>
                      </div>

                      {/* Right Column: Step 3 (Pilih Metode Pembayaran) + Step 4 (Voucher & Ringkasan Pembayaran) */}
                      <div className="lg:col-span-8 space-y-5">
                        {/* Step 3: Pilih Metode Pembayaran */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
                          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-semibold flex items-center justify-center">
                              3
                            </span>
                            <h3 className="text-sm sm:text-base font-semibold text-zinc-950">
                              Pilih Metode Pembayaran
                            </h3>
                          </div>

                          {/* QRIS */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-mono-code text-zinc-500 uppercase tracking-wider">
                              QRIS (Instan Semua E-Wallet & m-Banking)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {WIJAYAPAY_PAYMENT_METHODS.filter((m) => m.id === 'QRIS').map(
                                (pm) => {
                                  const isSelected = selectedPayment === pm.id;
                                  return (
                                    <button
                                      key={pm.id}
                                      type="button"
                                      onClick={() => setSelectedPayment(pm.id)}
                                      className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        isSelected
                                          ? 'border-zinc-950 bg-zinc-50'
                                          : 'border-zinc-200 bg-white hover:border-zinc-400'
                                      }`}
                                    >
                                      <div>
                                        <div className="text-xs font-bold text-zinc-950">
                                          {pm.shortLabel}
                                        </div>
                                        <div className="text-[11px] text-zinc-500 mt-0.5">
                                          {pm.label}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <span className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center shrink-0">
                                          <Check size={12} />
                                        </span>
                                      )}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          {/* VIRTUAL ACCOUNT */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-mono-code text-zinc-500 uppercase tracking-wider">
                              Virtual Account Bank
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {WIJAYAPAY_PAYMENT_METHODS.filter(
                                (m) => m.id === 'BCAVA' || m.id === 'BNIVA'
                              ).map((pm) => {
                                const isSelected = selectedPayment === pm.id;
                                return (
                                  <button
                                    key={pm.id}
                                    type="button"
                                    onClick={() => setSelectedPayment(pm.id)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                      isSelected
                                        ? 'border-zinc-950 bg-zinc-50'
                                        : 'border-zinc-200 bg-white hover:border-zinc-400'
                                    }`}
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-zinc-950">
                                        {pm.shortLabel}
                                      </div>
                                      <div className="text-[11px] text-zinc-500 mt-0.5">
                                        {pm.label}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <span className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center shrink-0">
                                        <Check size={12} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* RETAIL OUTLET */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-mono-code text-zinc-500 uppercase tracking-wider">
                              Retail Outlet (Minimarket)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {WIJAYAPAY_PAYMENT_METHODS.filter(
                                (m) => m.id === 'ALFAMART' || m.id === 'INDOMARET'
                              ).map((pm) => {
                                const isSelected = selectedPayment === pm.id;
                                return (
                                  <button
                                    key={pm.id}
                                    type="button"
                                    onClick={() => setSelectedPayment(pm.id)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                      isSelected
                                        ? 'border-zinc-950 bg-zinc-50'
                                        : 'border-zinc-200 bg-white hover:border-zinc-400'
                                    }`}
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-zinc-950">
                                        {pm.shortLabel}
                                      </div>
                                      <div className="text-[11px] text-zinc-500 mt-0.5">
                                        {pm.label}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <span className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center shrink-0">
                                        <Check size={12} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Step 4: Voucher & Ringkasan Pembayaran */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
                          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-semibold flex items-center justify-center">
                              4
                            </span>
                            <h3 className="text-sm sm:text-base font-semibold text-zinc-950">
                              Voucher & Ringkasan Pembayaran
                            </h3>
                          </div>

                          {/* Promo Voucher Input */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono-code text-zinc-600 uppercase">
                                Kode Promo / Voucher
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowVoucherList((prev) => !prev)}
                                className="text-zinc-900 underline cursor-pointer text-xs font-medium"
                              >
                                {showVoucherList ? 'Tutup Daftar Voucher' : 'Lihat Semua Voucher'}
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={promoCodeInput}
                                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                                placeholder="MASUKKAN KODE VOUCHER"
                                className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-300 text-xs font-mono-code uppercase focus:outline-none focus:border-zinc-950"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyPromoCode()}
                                className="px-5 py-2.5 rounded-lg border border-zinc-300 hover:border-zinc-950 bg-zinc-50 hover:bg-zinc-950 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                              >
                                Gunakan
                              </button>
                            </div>

                            {activePromoVoucher && (
                              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                                <span>
                                  Voucher <strong>{activePromoVoucher.code}</strong> aktif ({activePromoVoucher.title})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedPromoCode('');
                                    setPromoCodeInput('');
                                  }}
                                  className="text-emerald-900 underline text-[11px] cursor-pointer"
                                >
                                  hapus
                                </button>
                              </div>
                            )}

                            {showVoucherList && (
                              <div className="pt-2">
                                {activeStorePromos.length === 0 ? (
                                  <div className="p-4 rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 text-center">
                                    Belum ada kode promo aktif saat ini.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {activeStorePromos.map((v) => (
                                      <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => handleApplyPromoCode(v.code)}
                                        className="p-3 rounded-lg border border-dashed border-zinc-300 hover:border-zinc-950 text-left bg-zinc-50/60 cursor-pointer space-y-1"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-mono-code font-bold text-zinc-950">
                                            {v.code}
                                          </span>
                                          <span className="text-[11px] font-medium text-emerald-700">
                                            {v.discountType === 'percent'
                                              ? `${v.discountValue}%`
                                              : formatRupiah(v.discountValue)}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-medium text-zinc-800">
                                          {v.title}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 leading-snug">
                                          {v.description}
                                          {v.minPurchase > 0
                                            ? ` (Min. ${formatRupiah(v.minPurchase)})`
                                            : ''}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Price Breakdown */}
                          <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
                            {cartPricing.productSavingsAmount > 0 && (
                              <>
                                <div className="flex justify-between text-zinc-400">
                                  <span>Harga Normal ({cartVar?.label || cartProd.title})</span>
                                  <span className="line-through tabular-nums">
                                    {formatRupiah(cartPricing.originalPrice)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-medium">
                                  <span>Diskon Produk (-{cartPricing.productDiscountPercent}%)</span>
                                  <span className="tabular-nums">
                                    -{formatRupiah(cartPricing.productSavingsAmount)}
                                  </span>
                                </div>
                              </>
                            )}

                            <div className="flex justify-between text-zinc-500">
                              <span>Harga Produk ({cartVar?.label || cartProd.title})</span>
                              <span className="text-zinc-900 font-medium tabular-nums">
                                {formatRupiah(cartPricing.basePrice)}
                              </span>
                            </div>

                            {cartPricing.discountAmount > 0 && (
                              <div className="flex justify-between text-emerald-700 font-medium">
                                <span>Hemat (Voucher {activePromoVoucher?.code})</span>
                                <span className="tabular-nums">
                                  -{formatRupiah(cartPricing.discountAmount)}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between text-zinc-500">
                              <span>Subtotal</span>
                              <span className="text-zinc-900 font-medium tabular-nums">
                                {formatRupiah(cartPricing.subtotal)}
                              </span>
                            </div>

                            <div className="flex justify-between text-zinc-500">
                              <span>Biaya Layanan ({selectedPayment})</span>
                              <span className="text-zinc-900 tabular-nums">
                                {formatRupiah(cartPricing.estimatedFee)}
                              </span>
                            </div>

                            <div className="pt-3 border-t border-zinc-200 flex items-baseline justify-between">
                              <span className="text-sm font-semibold text-zinc-950">
                                Total Pembayaran
                              </span>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                                  {formatRupiah(cartPricing.totalEstimate)}
                                </div>
                                {cartPricing.discountAmount + cartPricing.productSavingsAmount >
                                  0 && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                                    Total Hemat{' '}
                                    {formatRupiah(
                                      cartPricing.discountAmount + cartPricing.productSavingsAmount
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCreatePaymentInvoice}
                            disabled={isCreatingInvoice || !isCartItemAvailable}
                            className={`w-full py-3.5 px-6 rounded-lg text-xs font-mono-code uppercase tracking-wider transition-colors ${
                              isCartItemAvailable
                                ? 'bg-zinc-950 hover:bg-zinc-800 text-white cursor-pointer'
                                : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                            } disabled:opacity-50`}
                          >
                            {isCreatingInvoice
                              ? 'Membuat Kode Pembayaran...'
                              : isCartItemAvailable
                              ? `CHECKOUT & BAYAR SEKARANG (${selectedPayment}) →`
                              : 'STOK HABIS — TIDAK DAPAT CHECKOUT'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 1D: /pay/:id-transaksi — INSTRUKSI BAYAR QRIS / VA / RETAIL */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'pay' && (
          <div className="bg-white border border-zinc-200 rounded-xl p-6 sm:p-10 max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <button
                type="button"
                onClick={() => navigateStorePath('/cart')}
                className="inline-flex items-center gap-2 text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
              >
                <ArrowLeft size={14} />
                <span>[kembali ke keranjang (/cart)]</span>
              </button>
              <span className="text-xs font-mono-code text-zinc-400">
                /pay/{storeLocation.paramId || paymentTx?.ref_id || ''}
              </span>
            </div>

            {!paymentTx ? (
              <div className="py-12 text-center space-y-4">
                <div className="text-sm font-medium text-zinc-900">
                  Data tagihan pembayaran ({storeLocation.paramId}) tidak ditemukan atau sudah selesai.
                </div>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store')}
                  className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  kembali ke katalog produk →
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
                  <div className="space-y-1">
                    <div className="text-xs font-mono-code text-amber-700 uppercase">
                      Menunggu Pembayaran • {paymentTx.payment_name}
                    </div>
                    <h2 className="text-2xl font-semibold text-zinc-950">
                      Selesaikan Pembayaran Anda
                    </h2>
                    <div className="text-xs font-mono-code text-zinc-400">
                      ID Transaksi: {paymentTx.ref_id} • Batas Waktu: {paymentTx.expired}
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-5 py-3 text-left sm:text-right">
                    <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                      total harus dibayar
                    </div>
                    <div className="text-2xl font-bold text-zinc-950 mt-0.5">
                      {formatRupiah(paymentTx.total_bayar)}
                    </div>
                  </div>
                </div>

                {/* QRIS VIEW: Clean QR Image ONLY (NO copy qr_string box!) */}
                {paymentTx.payment_method === 'QRIS' && (
                  <div className="flex flex-col items-center text-center space-y-4 py-4 bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                    <div className="border border-zinc-200 p-4 bg-white rounded-xl">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="QRIS Code"
                          width={240}
                          height={240}
                          className="w-56 h-56 object-contain"
                        />
                      ) : (
                        <div className="w-56 h-56 flex items-center justify-center text-xs font-mono-code text-zinc-400">
                          [memuat kode qr...]
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 max-w-md">
                      <div className="text-sm font-semibold text-zinc-900">
                        Scan QRIS untuk Membayar
                      </div>
                      <p className="text-xs text-zinc-500 font-light leading-relaxed">
                        Buka aplikasi m-Banking atau E-Wallet (GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, BRI) lalu scan kode QRIS di atas sebesar{' '}
                        <span className="font-semibold text-zinc-900">
                          {formatRupiah(paymentTx.total_bayar)}
                        </span>.
                      </p>
                    </div>
                  </div>
                )}

                {/* VIRTUAL ACCOUNT (BCAVA / BNIVA) OR RETAIL (ALFAMART / INDOMARET): Prominent VA / Payment Number */}
                {paymentTx.payment_method !== 'QRIS' && (
                  <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                    <div className="text-xs font-mono-code text-zinc-500 uppercase tracking-wider">
                      {paymentTx.payment_method === 'BCAVA' ||
                      paymentTx.payment_method === 'BNIVA'
                        ? `Nomor ${paymentTx.payment_name}:`
                        : `Kode Pembayaran ${paymentTx.payment_name}:`}
                    </div>

                    <div className="p-4 bg-zinc-950 text-white rounded-lg flex items-center justify-between gap-3">
                      <span className="text-lg sm:text-2xl font-mono-code tracking-wider select-all break-all">
                        {activePaymentCode || '-'}
                      </span>
                      {activePaymentCode && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activePaymentCode, 'copy_va_code')}
                          className="px-3.5 py-2 bg-white text-zinc-950 rounded text-xs font-mono-code cursor-pointer shrink-0 lowercase"
                        >
                          {copiedKey === 'copy_va_code' ? 'tersalin ✓' : 'salin kode'}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 font-light leading-relaxed">
                      Bayar tepat sebesar{' '}
                      <span className="font-semibold text-zinc-900">
                        {formatRupiah(paymentTx.total_bayar)}
                      </span>{' '}
                      menggunakan nomor/kode di atas sebelum{' '}
                      <span className="font-mono-code text-zinc-800">{paymentTx.expired}</span>.
                    </p>
                  </div>
                )}

                {paymentTx.tutorial_pembayaran && (
                  <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs">
                    <div className="font-mono-code text-zinc-700 uppercase">
                      Panduan Langkah Pembayaran:
                    </div>
                    <div className="text-zinc-600 font-light whitespace-pre-line leading-relaxed">
                      {paymentTx.tutorial_pembayaran}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-200 space-y-3">
                  <button
                    type="button"
                    onClick={handleVerifyPaymentStatus}
                    disabled={isCompletingPayment}
                    className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono-code uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {isCompletingPayment
                      ? 'Memverifikasi Pembayaran & Mengirim Produk...'
                      : 'Cek Status Pembayaran Otomatis →'}
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigateStorePath('/cart')}
                      className="text-xs font-mono-code text-zinc-500 hover:text-zinc-900 cursor-pointer lowercase"
                    >
                      ← ganti metode pembayaran di /cart
                    </button>

                    {adminMode && (
                      <button
                        type="button"
                        onClick={deliverPurchasedItem}
                        disabled={isCompletingPayment}
                        className="text-xs font-mono-code text-blue-600 hover:text-blue-800 underline underline-offset-4 cursor-pointer lowercase"
                      >
                        [simulasi lunas admin → ke /receipt/{paymentTx.ref_id}]
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 2: /receipt/:receiptId — HALAMAN RECEIPT & KREDENSIAL */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'receipt' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <button
                type="button"
                onClick={() => navigateStorePath('/store/transaksi')}
                className="inline-flex items-center gap-2 text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
              >
                <ArrowLeft size={14} />
                <span>[ke histori transaksi]</span>
              </button>
              <span className="text-xs font-mono-code text-zinc-400">
                /receipt/{storeLocation.paramId}
              </span>
            </div>

            {!currentUser ? (
              <div className="py-12 text-center space-y-4">
                <div className="text-sm text-zinc-800">
                  Silakan masuk untuk membuka halaman receipt transaksi Anda.
                </div>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  masuk dengan google
                </button>
              </div>
            ) : !activeReceiptOrder ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-sm font-medium text-zinc-900">
                  Receipt tidak ditemukan ({storeLocation.paramId})
                </div>
                <p className="text-xs text-zinc-500">
                  Pastikan Anda masuk menggunakan akun pembeli yang sesuai atau buka melalui halaman histori transaksi.
                </p>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store/transaksi')}
                  className="px-4 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  lihat histori transaksi →
                </button>
              </div>
            ) : (
              <>
                {/* Receipt Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-200">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono-code lowercase">
                      <Check size={12} />
                      <span>pembayaran selesai • pengiriman otomatis berhasil</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-light text-zinc-950 tracking-tight pt-1">
                      Receipt & Informasi Produk
                    </h2>
                    <div className="text-xs font-mono-code text-zinc-400">
                      ID Receipt: {activeReceiptOrder.id} • Invoice: {activeReceiptOrder.invoiceCode} •{' '}
                      {formatDateTime(activeReceiptOrder.purchasedAtMs)}
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 px-5 py-3 text-left sm:text-right">
                    <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                      total dibayar ({activeReceiptOrder.paymentMethod})
                    </div>
                    <div className="text-xl font-medium text-zinc-950 mt-0.5">
                      {formatRupiah(activeReceiptOrder.price)}
                    </div>
                  </div>
                </div>

                {/* Order Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pb-6 border-b border-zinc-100">
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200">
                    <div className="text-zinc-400 font-mono-code lowercase">produk & variasi</div>
                    <div className="text-zinc-950 font-medium mt-1">
                      {activeReceiptOrder.productTitle}
                    </div>
                  </div>
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200">
                    <div className="text-zinc-400 font-mono-code lowercase">durasi paket</div>
                    <div className="text-zinc-950 font-medium mt-1">
                      {activeReceiptOrder.durationLabel}
                    </div>
                  </div>
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200">
                    <div className="text-zinc-400 font-mono-code lowercase">email penerima</div>
                    <div className="text-zinc-950 font-medium mt-1 truncate">
                      {activeReceiptOrder.buyerEmail}
                    </div>
                  </div>
                </div>

                {/* Delivered Account (Email + Password) OR Redeem Code */}
                <div className="bg-zinc-950 text-white p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                    <div className="text-xs font-mono-code text-zinc-300 lowercase">
                      {activeReceiptOrder.deliveredPassword
                        ? '[kredensial akun (email & password)]'
                        : '[kode redeem / voucher produk]'}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          activeReceiptOrder.deliveredPassword
                            ? `Email: ${activeReceiptOrder.deliveredEmail}\nPassword: ${activeReceiptOrder.deliveredPassword}${
                                activeReceiptOrder.deliveredNotes
                                  ? `\nCatatan: ${activeReceiptOrder.deliveredNotes}`
                                  : ''
                              }`
                            : `${activeReceiptOrder.deliveredEmail}${
                                activeReceiptOrder.deliveredNotes
                                  ? `\nCatatan: ${activeReceiptOrder.deliveredNotes}`
                                  : ''
                              }`,
                          `receipt_all_${activeReceiptOrder.id}`
                        )
                      }
                      className="px-3 py-1 bg-white text-zinc-950 text-xs font-mono-code cursor-pointer lowercase self-start sm:self-auto"
                    >
                      {copiedKey === `receipt_all_${activeReceiptOrder.id}`
                        ? 'tersalin ✓'
                        : activeReceiptOrder.deliveredPassword
                        ? 'salin semua kredensial'
                        : 'salin kode redeem'}
                    </button>
                  </div>

                  {activeReceiptOrder.deliveredPassword ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono-code text-zinc-400 lowercase">
                            email / username akun
                          </div>
                          <div className="text-sm sm:text-base font-mono-code text-white truncate mt-1 select-all">
                            {activeReceiptOrder.deliveredEmail}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              activeReceiptOrder.deliveredEmail,
                              `receipt_email_${activeReceiptOrder.id}`
                            )
                          }
                          className="px-2.5 py-1 border border-zinc-700 hover:border-white text-xs font-mono-code text-zinc-200 cursor-pointer lowercase shrink-0"
                        >
                          {copiedKey === `receipt_email_${activeReceiptOrder.id}`
                            ? 'copied'
                            : 'salin'}
                        </button>
                      </div>

                      <div className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono-code text-zinc-400 lowercase">
                            password akun
                          </div>
                          <div className="text-sm sm:text-base font-mono-code text-white truncate mt-1 select-all">
                            {activeReceiptOrder.deliveredPassword}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              activeReceiptOrder.deliveredPassword,
                              `receipt_pass_${activeReceiptOrder.id}`
                            )
                          }
                          className="px-2.5 py-1 border border-zinc-700 hover:border-white text-xs font-mono-code text-zinc-200 cursor-pointer lowercase shrink-0"
                        >
                          {copiedKey === `receipt_pass_${activeReceiptOrder.id}`
                            ? 'copied'
                            : 'salin'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono-code text-zinc-400 lowercase">
                          kode redeem / voucher / license key
                        </div>
                        <div className="text-lg sm:text-xl font-mono-code text-white tracking-wider break-all mt-1 select-all">
                          {activeReceiptOrder.deliveredEmail}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            activeReceiptOrder.deliveredEmail,
                            `receipt_email_${activeReceiptOrder.id}`
                          )
                        }
                        className="px-3 py-1.5 bg-white text-zinc-950 text-xs font-mono-code cursor-pointer lowercase shrink-0"
                      >
                        {copiedKey === `receipt_email_${activeReceiptOrder.id}`
                          ? 'tersalin ✓'
                          : 'salin kode'}
                      </button>
                    </div>
                  )}

                  {activeReceiptOrder.deliveredNotes && (
                    <div className="bg-zinc-900 border border-zinc-800 p-3.5 text-xs text-zinc-300">
                      <span className="font-mono-code text-zinc-400 lowercase">
                        catatan / profil / pin:{' '}
                      </span>
                      <span>{activeReceiptOrder.deliveredNotes}</span>
                    </div>
                  )}
                </div>

                {/* CARA MENGGUNAKAN PRODUK (Displayed directly below credentials) */}
                <div className="border border-zinc-200 p-6 space-y-3 bg-zinc-50">
                  <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider">
                    Cara Menggunakan Produk — {activeReceiptOrder.productTitle}
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-700 font-light whitespace-pre-line leading-relaxed">
                    {activeReceiptOrder.usageGuide ||
                      (activeReceiptOrder.deliveredPassword
                        ? '1. Masuk menggunakan email dan password akun di atas.\n2. Gunakan sesuai variasi yang dipilih.'
                        : '1. Salin kode redeem di atas.\n2. Tukarkan kode pada halaman atau aplikasi resmi produk.')}
                  </div>
                </div>

                {/* Rating Form on Receipt (with Toxic Filter note) */}
                <div className="border border-zinc-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider">
                      Berikan Rating & Ulasan Pembelian
                    </div>
                    <span className="text-[11px] font-mono-code text-zinc-400 lowercase">
                      [filter kata kasar aktif otomatis]
                    </span>
                  </div>

                  {activeReceiptOrder.rating > 0 ? (
                    <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs text-zinc-800">
                      Ulasan Anda: ★ {activeReceiptOrder.rating}/5 — &ldquo;
                      {censorToxicWords(activeReceiptOrder.reviewComment)}&rdquo;
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const currentRating =
                            ratingDrafts[activeReceiptOrder.id]?.rating ?? 5;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setRatingDrafts((prev) => ({
                                  ...prev,
                                  [activeReceiptOrder.id]: {
                                    rating: star,
                                    comment: prev[activeReceiptOrder.id]?.comment ?? '',
                                  },
                                }))
                              }
                              className="cursor-pointer p-1"
                            >
                              <Star
                                size={18}
                                className={
                                  star <= currentRating
                                    ? 'fill-zinc-950 text-zinc-950'
                                    : 'text-zinc-300'
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={ratingDrafts[activeReceiptOrder.id]?.comment ?? ''}
                          onChange={(e) =>
                            setRatingDrafts((prev) => ({
                              ...prev,
                              [activeReceiptOrder.id]: {
                                rating: prev[activeReceiptOrder.id]?.rating ?? 5,
                                comment: e.target.value,
                              },
                            }))
                          }
                          placeholder="Tulis pengalaman pembelian Anda..."
                          className="flex-1 px-3.5 py-2 border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                        />
                        <button
                          type="button"
                          onClick={() => handleRatingSubmit(activeReceiptOrder)}
                          disabled={submittingRatingOrderId === activeReceiptOrder.id}
                          className="px-5 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                        >
                          {submittingRatingOrderId === activeReceiptOrder.id
                            ? 'mengirim...'
                            : 'kirim ulasan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs font-mono-code">
                  <button
                    type="button"
                    onClick={() => navigateStorePath('/store')}
                    className="text-zinc-600 hover:text-zinc-950 cursor-pointer lowercase"
                  >
                    ← kembali belanja di /store
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRefundSelectedOrderId(activeReceiptOrder.id);
                      navigateStorePath('/store/refund');
                    }}
                    className="text-zinc-950 underline underline-offset-4 cursor-pointer lowercase"
                  >
                    butuh bantuan / ajukan refund di /store/refund →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 3: /store/transaksi — HISTORI TRANSAKSI LENGKAP */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'transactions' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
              <div>
                <div className="text-xs font-mono-code text-zinc-400 lowercase">
                  [/store/transaksi]
                </div>
                <h2 className="text-xl sm:text-2xl font-normal text-zinc-950 mt-0.5">
                  Histori Transaksi & Kredensial Produk
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigateStorePath('/store/refund')}
                className="px-4 py-2 border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-800 cursor-pointer lowercase self-start sm:self-auto"
              >
                form pengajuan refund (/store/refund) →
              </button>
            </div>

            {!currentUser ? (
              <div className="py-12 text-center space-y-4">
                <div className="text-sm text-zinc-800">
                  Masuk dengan Google untuk melihat histori transaksi dan kredensial produk Anda.
                </div>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  masuk dengan google
                </button>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-sm text-zinc-700">
                  Belum ada histori transaksi pada akun ini.
                </div>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store')}
                  className="px-4 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  lihat katalog produk →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => {
                  const refundEligibility = evaluateOrderRefundEligibility(
                    order.purchasedAtMs,
                    nowMs
                  );
                  const showPass = Boolean(visiblePasswords[order.id]);
                  const linkedTicket = refundTickets.find((t) => t.orderId === order.id);

                  return (
                    <div
                      key={order.id}
                      className="border border-zinc-200 p-5 sm:p-6 space-y-4 hover:border-zinc-400 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-zinc-100">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-code text-zinc-400">
                            <span>{order.invoiceCode}</span>
                            <span>•</span>
                            <span>{formatDateTime(order.purchasedAtMs)}</span>
                            <span>•</span>
                            <span>{order.paymentMethod}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-medium text-zinc-950">
                            {order.productTitle} ({order.durationLabel})
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 font-mono-code text-xs">
                          <span className="text-base font-medium text-zinc-950">
                            {formatRupiah(order.price)}
                          </span>
                          <span
                            className={`px-2.5 py-1 border text-[11px] lowercase ${
                              order.status === 'paid'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : order.status === 'refund_requested'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : order.status === 'refunded'
                                ? 'bg-zinc-100 border-zinc-300 text-zinc-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                          >
                            {order.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigateStorePath(`/store/receipt/${order.id}`)}
                            className="px-3 py-1 bg-zinc-950 text-white text-[11px] cursor-pointer lowercase"
                          >
                            buka receipt →
                          </button>
                        </div>
                      </div>

                      {/* Delivered Credentials Preview */}
                      {order.deliveredPassword ? (
                        <div className="bg-zinc-50 border border-zinc-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-zinc-400 font-mono-code block lowercase">
                                email / username akun:
                              </span>
                              <span className="font-mono-code text-zinc-950 truncate block mt-0.5">
                                {order.deliveredEmail}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(order.deliveredEmail, `hist_email_${order.id}`)
                              }
                              className="font-mono-code text-zinc-600 hover:text-zinc-950 underline cursor-pointer lowercase"
                            >
                              {copiedKey === `hist_email_${order.id}` ? 'copied' : 'salin'}
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-zinc-400 font-mono-code block lowercase">
                                password akun:
                              </span>
                              <span className="font-mono-code text-zinc-950 truncate block mt-0.5">
                                {showPass ? order.deliveredPassword : '••••••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 font-mono-code">
                              <button
                                type="button"
                                onClick={() =>
                                  setVisiblePasswords((prev) => ({
                                    ...prev,
                                    [order.id]: !prev[order.id],
                                  }))
                                }
                                className="text-zinc-500 hover:text-zinc-950 cursor-pointer"
                              >
                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(order.deliveredPassword, `hist_pass_${order.id}`)
                                }
                                className="text-zinc-600 hover:text-zinc-950 underline cursor-pointer lowercase"
                              >
                                {copiedKey === `hist_pass_${order.id}` ? 'copied' : 'salin'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 border border-zinc-200 p-4 flex items-center justify-between gap-4 text-xs">
                          <div className="min-w-0">
                            <span className="text-zinc-400 font-mono-code block lowercase">
                              kode redeem / voucher:
                            </span>
                            <span className="font-mono-code text-sm text-zinc-950 break-all block mt-0.5">
                              {order.deliveredEmail}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(order.deliveredEmail, `hist_email_${order.id}`)
                            }
                            className="font-mono-code text-zinc-950 underline cursor-pointer lowercase shrink-0"
                          >
                            {copiedKey === `hist_email_${order.id}` ? 'copied' : 'salin kode'}
                          </button>
                        </div>
                      )}

                      {/* Footer Row: Refund Cooldown/Eligibility & Ticket Link */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono-code">
                        <span className="text-zinc-500">{refundEligibility.label}</span>

                        <div className="flex items-center gap-4">
                          {linkedTicket ? (
                            <button
                              type="button"
                              onClick={() => navigateStorePath(`/store/ticket/${linkedTicket.id}`)}
                              className="px-3.5 py-1.5 bg-zinc-950 text-white cursor-pointer lowercase"
                            >
                              buka chat tiket refund (/store/ticket/{linkedTicket.id}) →
                            </button>
                          ) : (
                            order.status === 'paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRefundSelectedOrderId(order.id);
                                  navigateStorePath('/store/refund');
                                }}
                                className="text-red-700 hover:text-red-900 underline underline-offset-4 cursor-pointer lowercase"
                              >
                                [ajukan refund di /store/refund]
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 4: /store/ulasan — ULASAN PEMBELI DENGAN TOXIC FILTER */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'reviews' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
              <div>
                <div className="text-xs font-mono-code text-zinc-400 lowercase">
                  [/store/ulasan • toxic filter aktif]
                </div>
                <h2 className="text-xl sm:text-2xl font-normal text-zinc-950 mt-0.5">
                  Ulasan & Rating Pembeli Terverifikasi ({reviews.length})
                </h2>
              </div>
              <div className="text-xs font-mono-code text-zinc-500">
                Setiap kata kasar/toxic otomatis disensor menjadi tanda bintang (*) sesuai panjang karakter.
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono-code text-zinc-400 lowercase">
                [belum ada ulasan pembeli]
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedGlobalReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="border border-zinc-200 p-5 space-y-2.5 bg-zinc-50/40"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-950">{rev.buyerName}</span>
                        <span className="font-mono-code text-zinc-900 bg-white px-2 py-0.5 border border-zinc-200">
                          {'★'.repeat(Math.max(1, Math.min(5, rev.rating)))} ({rev.rating}/5)
                        </span>
                      </div>
                      <div className="text-[11px] font-mono-code text-zinc-400">
                        Produk: {rev.productTitle}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-700 font-light leading-relaxed pt-1">
                        &ldquo;{censorToxicWords(rev.comment)}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>

                {reviews.length > globalReviewLimit && (
                  <button
                    type="button"
                    onClick={() => setGlobalReviewLimit((prev) => prev + 10)}
                    className="w-full py-3 border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer lowercase"
                  >
                    [muat 10 ulasan berikutnya...]
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 5: /store/refund — FORM PENGAJUAN REFUND (10M WAIT + 1-2 PHOTOS) */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'refund' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 max-w-3xl mx-auto space-y-8">
            <div className="space-y-1.5 pb-5 border-b border-zinc-200">
              <div className="text-xs font-mono-code text-zinc-400 lowercase">
                [/store/refund • garansi 3 hari • minimal 10 menit setelah transaksi]
              </div>
              <h2 className="text-2xl font-normal text-zinc-950">
                Form Pengajuan Refund & Klaim Garansi
              </h2>
              <p className="text-xs text-zinc-500 font-light leading-relaxed">
                Untuk mencegah penyalahgunaan sistem, pengajuan refund baru dapat dikirimkan minimal <strong>10 menit</strong> setelah transaksi selesai dan maksimal <strong>3 hari (72 jam)</strong> setelah pembelian, dengan melampirkan 1–2 foto bukti kendala.
              </p>
            </div>

            {!currentUser ? (
              <div className="py-12 text-center space-y-4">
                <div className="text-sm text-zinc-800">
                  Silakan masuk terlebih dahulu untuk memilih transaksi yang ingin di-refund.
                </div>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  masuk dengan google
                </button>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-sm text-zinc-700">
                  Anda belum memiliki transaksi yang dapat diajukan refund.
                </div>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store')}
                  className="px-4 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  kembali ke /store
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRefundPageForm} className="space-y-6 text-xs">
                {/* 1. Pilih Transaksi */}
                <div className="space-y-2">
                  <label className="block font-mono-code text-zinc-900 uppercase tracking-wider">
                    1. Pilih Transaksi yang Ingin Direfund *
                  </label>
                  <select
                    value={refundSelectedOrderId}
                    onChange={(e) => setRefundSelectedOrderId(e.target.value)}
                    className="w-full p-3 border border-zinc-300 bg-white text-xs focus:outline-none focus:border-zinc-950"
                  >
                    {myOrders.map((ord) => {
                      const elig = evaluateOrderRefundEligibility(ord.purchasedAtMs, nowMs);
                      return (
                        <option key={ord.id} value={ord.id}>
                          {ord.invoiceCode} — {ord.productTitle} ({formatRupiah(ord.price)}) • [{elig.label}]
                        </option>
                      );
                    })}
                  </select>

                  {(() => {
                    const selectedOrd = myOrders.find((o) => o.id === refundSelectedOrderId);
                    if (!selectedOrd) return null;
                    const existingTicket = refundTickets.find(
                      (t) => t.orderId === selectedOrd.id
                    );
                    const elig = evaluateOrderRefundEligibility(selectedOrd.purchasedAtMs, nowMs);

                    return (
                      <div
                        className={`p-3.5 border font-mono-code text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          existingTicket
                            ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                            : elig.eligible
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span>
                          Status transaksi {selectedOrd.invoiceCode}:{' '}
                          {existingTicket
                            ? `Tiket refund sudah ada (${existingTicket.id})`
                            : elig.label}
                        </span>
                        {existingTicket && (
                          <button
                            type="button"
                            onClick={() => navigateStorePath(`/store/ticket/${existingTicket.id}`)}
                            className="underline cursor-pointer lowercase font-medium"
                          >
                            buka sesi chat tiket →
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Solusi yang Diinginkan */}
                <div className="space-y-2">
                  <label className="block font-mono-code text-zinc-900 uppercase tracking-wider">
                    2. Pilih Solusi yang Diinginkan *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRefundSolutionInput('refund_money')}
                      className={`p-4 border text-left cursor-pointer transition-colors ${
                        refundSolutionInput === 'refund_money'
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="font-mono-code text-xs font-medium">
                        {refundSolutionInput === 'refund_money' ? '[●]' : '[ ]'} Pengembalian Dana
                      </div>
                      <p
                        className={`text-[11px] mt-1 ${
                          refundSolutionInput === 'refund_money' ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        Dana pembelian dikembalikan penuh apabila produk terbukti bermasalah.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRefundSolutionInput('replace_item')}
                      className={`p-4 border text-left cursor-pointer transition-colors ${
                        refundSolutionInput === 'replace_item'
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="font-mono-code text-xs font-medium">
                        {refundSolutionInput === 'replace_item' ? '[●]' : '[ ]'} Pengiriman Barang Ulang
                      </div>
                      <p
                        className={`text-[11px] mt-1 ${
                          refundSolutionInput === 'replace_item' ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        Penggantian akun atau kode redeem baru yang aktif sesuai variasi pesanan.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. Alasan Refund */}
                <div className="space-y-2">
                  <label className="block font-mono-code text-zinc-900 uppercase tracking-wider">
                    3. Jelaskan Alasan & Kendala yang Dialami *
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={3}
                    value={refundReasonInput}
                    onChange={(e) => setRefundReasonInput(e.target.value)}
                    placeholder="Jelaskan detail kendala pada akun atau kode redeem yang diterima..."
                    className="w-full p-3.5 border border-zinc-300 focus:outline-none focus:border-zinc-950"
                  />
                </div>

                {/* 4. Upload Foto Bukti (Wajib Min 1, Maks 2, Auto-compress > 1MB) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block font-mono-code text-zinc-900 uppercase tracking-wider">
                      4. Upload Foto Bukti Kendala * (Wajib Min. 1 Foto, Maks. 2 Foto)
                    </label>
                    <span className="text-[11px] font-mono-code text-zinc-400">
                      Maks 1MB/foto (Otomatis dikompres jika &gt; 1MB • Dihapus otomatis saat tiket ditutup)
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleRefundPhotoSelect}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {refundPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="border border-zinc-200 p-3 bg-zinc-50 space-y-2 relative"
                      >
                        <div className="aspect-video bg-zinc-900 overflow-hidden flex items-center justify-center">
                          <img
                            src={photo.dataUrl}
                            alt={`Bukti ${idx + 1}`}
                            width={320}
                            height={180}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono-code">
                          <div className="truncate text-zinc-600">
                            Foto #{idx + 1}: {formatBytes(photo.compressedBytes)}
                            {photo.wasCompressed && (
                              <span className="text-emerald-700">
                                {' '}
                                (dikompres dari {formatBytes(photo.originalBytes)})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRefundPhoto(photo.id)}
                            className="text-red-600 hover:text-red-800 cursor-pointer lowercase shrink-0"
                          >
                            [hapus]
                          </button>
                        </div>
                      </div>
                    ))}

                    {refundPhotos.length < 2 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressingPhoto}
                        className="border border-dashed border-zinc-300 hover:border-zinc-950 p-6 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-950 cursor-pointer min-h-[160px]"
                      >
                        <Upload size={18} />
                        <span className="font-mono-code text-xs lowercase">
                          {isCompressingPhoto
                            ? '[mengompres foto otomatis...]'
                            : `[+ pilih foto bukti (${refundPhotos.length}/2)]`}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          JPG / PNG / WebP • Auto-compress &lt; 1MB
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => navigateStorePath('/store/transaksi')}
                    className="text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
                  >
                    ← kembali ke transaksi
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingRefund || isCompressingPhoto}
                    className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingRefund
                      ? 'Membuat Tiket Refund...'
                      : 'Kirim Pengajuan Refund & Buka Tiket →'}
                  </button>
                </div>
              </form>
            )}

            {/* Existing Tickets List on /store/refund */}
            {myTickets.length > 0 && (
              <div className="pt-6 border-t border-zinc-200 space-y-3">
                <div className="text-xs font-mono-code text-zinc-500 uppercase tracking-wider">
                  Daftar Tiket Refund Anda ({myTickets.length})
                </div>
                <div className="divide-y divide-zinc-200 border border-zinc-200">
                  {myTickets.map((tkt) => (
                    <div
                      key={tkt.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono-code text-[11px] text-zinc-400">
                          Tiket: {tkt.id} • Invoice: {tkt.invoiceCode}
                        </div>
                        <div className="font-medium text-zinc-950">{tkt.productTitle}</div>
                        <div className="text-zinc-500">
                          Solusi:{' '}
                          {tkt.solutionType === 'replace_item'
                            ? 'Pengiriman Barang Ulang'
                            : 'Pengembalian Dana'}{' '}
                          • Status: <span className="font-mono-code">[{tkt.status}]</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateStorePath(`/store/ticket/${tkt.id}`)}
                        className="px-4 py-2 bg-zinc-950 text-white font-mono-code text-xs cursor-pointer lowercase self-start sm:self-center"
                      >
                        buka /store/ticket/{tkt.id} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 6: /store/ticket/:refundId — SESI CHAT TIKET REFUND */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'ticket' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <button
                type="button"
                onClick={() => navigateStorePath('/store/refund')}
                className="inline-flex items-center gap-2 text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
              >
                <ArrowLeft size={14} />
                <span>[kembali ke /store/refund]</span>
              </button>
              <span className="text-xs font-mono-code text-zinc-400">
                /store/ticket/{storeLocation.paramId}
              </span>
            </div>

            {!currentUser ? (
              <div className="py-12 text-center space-y-4">
                <div className="text-sm text-zinc-800">
                  Silakan masuk untuk mengakses sesi chat tiket refund ini.
                </div>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  masuk dengan google
                </button>
              </div>
            ) : !activeRefundTicket ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-sm font-medium text-zinc-900">
                  Tiket refund tidak ditemukan ({storeLocation.paramId})
                </div>
                <button
                  type="button"
                  onClick={() => navigateStorePath('/store/refund')}
                  className="px-4 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  ke halaman /store/refund →
                </button>
              </div>
            ) : (
              <>
                {/* Ticket Summary Header */}
                <div className="bg-zinc-50 border border-zinc-200 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-zinc-200">
                    <div className="space-y-1">
                      <div className="text-xs font-mono-code text-zinc-400">
                        Tiket #{activeRefundTicket.id} • Invoice: {activeRefundTicket.invoiceCode} •{' '}
                        {formatDateTime(activeRefundTicket.createdAtMs)}
                      </div>
                      <h2 className="text-xl font-medium text-zinc-950">
                        {activeRefundTicket.productTitle} — {formatRupiah(activeRefundTicket.price)}
                      </h2>
                      <div className="text-xs text-zinc-600">
                        Pembeli: {activeRefundTicket.buyerName} ({activeRefundTicket.buyerEmail})
                      </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-1.5 font-mono-code text-xs">
                      <span
                        className={`px-3 py-1 border ${
                          activeRefundTicket.status === 'open'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : activeRefundTicket.status === 'rejected'
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        }`}
                      >
                        status: {activeRefundTicket.status}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        solusi diminta:{' '}
                        {activeRefundTicket.solutionType === 'replace_item'
                          ? 'pengiriman barang ulang'
                          : 'pengembalian dana'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-mono-code text-zinc-400 lowercase">alasan klaim refund:</div>
                    <div className="text-zinc-800 leading-relaxed">{activeRefundTicket.reason}</div>
                  </div>

                  {activeRefundTicket.replacementCredentials && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="font-mono-code text-emerald-800 lowercase">
                        [barang / kredensial pengganti yang dikirim admin]:
                      </div>
                      <div className="font-mono-code text-zinc-950 select-all">
                        {activeRefundTicket.replacementCredentials}
                      </div>
                    </div>
                  )}

                  {/* Proof Photos (Automatically wiped from DB once ticket status !== 'open') */}
                  {(() => {
                    const photos = parseTicketProofImages(activeRefundTicket.proofImagesJson);
                    if (activeRefundTicket.status !== 'open') {
                      return (
                        <div className="p-3 bg-white border border-zinc-200 text-[11px] font-mono-code text-zinc-500">
                          [tiket telah ditutup • seluruh foto bukti telah dihapus otomatis dari database]
                        </div>
                      );
                    }
                    if (photos.length === 0) return null;
                    return (
                      <div className="space-y-2 pt-2 border-t border-zinc-200">
                        <div className="text-[11px] font-mono-code text-zinc-500 lowercase">
                          lampiran foto bukti ({photos.length} foto — akan dihapus otomatis dari database saat tiket ditutup):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {photos.map((src, idx) => (
                            <div
                              key={idx}
                              className="border border-zinc-200 bg-zinc-900 aspect-video overflow-hidden"
                            >
                              <img
                                src={src}
                                alt={`Bukti Refund ${idx + 1}`}
                                width={360}
                                height={202}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Chat Messages Stream */}
                <div className="border border-zinc-200 bg-white flex flex-col">
                  <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs font-mono-code">
                    <span>[sesi percakapan tiket refund]</span>
                    <span className="text-zinc-500">
                      {activeRefundTicket.canUserReply
                        ? 'sesi balasan pembeli: aktif'
                        : 'menunggu pesan pertama dari admin'}
                    </span>
                  </div>

                  <div className="p-5 space-y-4 min-h-[260px] max-h-[440px] overflow-y-auto">
                    {(() => {
                      const messages = parseTicketMessages(activeRefundTicket.messagesJson);
                      if (messages.length === 0) {
                        return (
                          <div className="py-12 text-center space-y-2 text-xs text-zinc-400 font-mono-code">
                            <Lock size={18} className="mx-auto text-zinc-400" />
                            <div>Belum ada percakapan pada tiket ini.</div>
                            <p className="text-[11px] text-zinc-500 max-w-md mx-auto font-sans">
                              {adminMode
                                ? 'Kirim pesan pertama di bawah untuk membuka akses balas pesan bagi pembeli.'
                                : 'Anda tidak dapat memulai chat terlebih dahulu. Kolom pesan akan terbuka otomatis saat Admin mengirimkan pesan kepada Anda.'}
                            </p>
                          </div>
                        );
                      }

                      return messages.map((msg) => {
                        const isFromAdmin = msg.senderRole === 'admin';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isFromAdmin ? 'items-start' : 'items-end'
                            }`}
                          >
                            <div
                              className={`max-w-lg p-4 border text-xs space-y-1.5 ${
                                isFromAdmin
                                  ? 'bg-zinc-950 text-white border-zinc-950'
                                  : 'bg-zinc-50 text-zinc-900 border-zinc-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-[10px] font-mono-code opacity-70">
                                <span>
                                  {isFromAdmin ? '[ADMIN]' : '[PEMBELI]'} {msg.senderName}
                                </span>
                                <span>{formatDateTime(msg.sentAtMs)}</span>
                              </div>
                              <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Chat Input Bar */}
                  <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                    {activeRefundTicket.status !== 'open' ? (
                      <div className="text-xs font-mono-code text-zinc-500 text-center py-2">
                        [tiket refund ini telah ditutup]
                      </div>
                    ) : !adminMode && !activeRefundTicket.canUserReply ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono-code">
                        <Lock size={13} />
                        <span>
                          Menunggu Admin mengirim pesan. Anda baru dapat membalas chat setelah Admin mengirim pesan.
                        </span>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => handleSendTicketChatMessage(e, activeRefundTicket)}
                        className="flex gap-3"
                      >
                        <input
                          type="text"
                          value={ticketMessageInput}
                          onChange={(e) => setTicketMessageInput(e.target.value)}
                          placeholder={
                            adminMode
                              ? 'Ketik pesan Admin (otomatis membuka kunci balasan untuk pembeli)...'
                              : 'Ketik balasan Anda untuk Admin...'
                          }
                          className="flex-1 px-4 py-2.5 bg-white border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                        />
                        <button
                          type="submit"
                          disabled={isSendingTicketMsg || !ticketMessageInput.trim()}
                          className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <Send size={13} />
                          <span>{isSendingTicketMsg ? 'mengirim...' : 'kirim pesan'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Admin Resolution Controls on /store/ticket/:refundId */}
                {adminMode && activeRefundTicket.status === 'open' && (
                  <div className="border border-zinc-900 p-5 bg-zinc-50 space-y-4 text-xs">
                    <div className="font-mono-code text-zinc-900 uppercase tracking-wider">
                      Keputusan Admin & Tutup Tiket (Otomatis Hapus Foto Bukti dari Database)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-zinc-500 mb-1">
                          Akun / Kode Redeem Pengganti (Jika Pengiriman Ulang)
                        </label>
                        <input
                          type="text"
                          value={adminReplacementInput}
                          onChange={(e) => setAdminReplacementInput(e.target.value)}
                          placeholder="Email & Password baru atau Kode Redeem baru..."
                          className="w-full px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 mb-1">
                          Catatan Penutup Admin (Opsional)
                        </label>
                        <input
                          type="text"
                          value={adminClosingNoteInput}
                          onChange={(e) => setAdminClosingNoteInput(e.target.value)}
                          placeholder="Dana telah dikembalikan / akun baru telah dikirim..."
                          className="w-full px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 font-mono-code">
                      <button
                        type="button"
                        disabled={isResolvingTicket}
                        onClick={() =>
                          handleAdminResolveTicket(activeRefundTicket, 'approved_refund')
                        }
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer lowercase disabled:opacity-50"
                      >
                        [setujui pengembalian dana & tutup tiket]
                      </button>
                      <button
                        type="button"
                        disabled={isResolvingTicket}
                        onClick={() =>
                          handleAdminResolveTicket(activeRefundTicket, 'approved_replace')
                        }
                        className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white cursor-pointer lowercase disabled:opacity-50"
                      >
                        [setujui pengiriman barang ulang & tutup tiket]
                      </button>
                      <button
                        type="button"
                        disabled={isResolvingTicket}
                        onClick={() => handleAdminResolveTicket(activeRefundTicket, 'rejected')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white cursor-pointer lowercase disabled:opacity-50"
                      >
                        [tolak refund & tutup tiket]
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 7: /store/dashboard — DASHBOARD USER & DASHBOARD ADMIN */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'dashboard' && (
          <div className="space-y-8">
            {!currentUser ? (
              <div className="bg-white border border-zinc-200 p-10 text-center space-y-4">
                <div className="text-base font-medium text-zinc-950">
                  Masuk untuk Mengakses Dashboard (/store/dashboard)
                </div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Halaman login disatukan untuk Pembeli dan Administrator. Jika Anda masuk dengan email Administrator, ruang kerja manajemen produk & stok akan terbuka otomatis.
                </p>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="px-6 py-2.5 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                >
                  masuk dengan google
                </button>
              </div>
            ) : !adminMode ? (
              /* MEMBER DASHBOARD (/store/dashboard for regular users) */
              <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
                  <div>
                    <div className="text-xs font-mono-code text-zinc-400 lowercase">
                      [/store/dashboard • member]
                    </div>
                    <h2 className="text-2xl font-normal text-zinc-950 mt-0.5">
                      Dashboard Akun — {currentUser.displayName || currentUser.email}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 font-mono-code text-xs">
                    <button
                      type="button"
                      onClick={() => navigateStorePath('/store/transaksi')}
                      className="px-3.5 py-2 border border-zinc-300 hover:border-zinc-950 cursor-pointer lowercase"
                    >
                      histori transaksi ({myOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateStorePath('/store/refund')}
                      className="px-3.5 py-2 bg-zinc-950 text-white cursor-pointer lowercase"
                    >
                      ajukan refund
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-zinc-200 p-5 bg-zinc-50">
                    <div className="text-xs font-mono-code text-zinc-400 lowercase">
                      total pembelian
                    </div>
                    <div className="text-2xl font-medium text-zinc-950 mt-1">
                      {myOrders.length} transaksi
                    </div>
                  </div>
                  <div className="border border-zinc-200 p-5 bg-zinc-50">
                    <div className="text-xs font-mono-code text-zinc-400 lowercase">
                      tiket refund
                    </div>
                    <div className="text-2xl font-medium text-zinc-950 mt-1">
                      {myTickets.length} tiket
                    </div>
                  </div>
                  <div className="border border-zinc-200 p-5 bg-zinc-50">
                    <div className="text-xs font-mono-code text-zinc-400 lowercase">
                      pengingat stok aktif
                    </div>
                    <div className="text-2xl font-medium text-zinc-950 mt-1">
                      {restockAlerts.filter((a) => a.userUid === currentUser.uid).length} produk
                    </div>
                  </div>
                </div>

                {/* Recent Orders & Active Tickets */}
                <div className="space-y-3">
                  <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider">
                    Transaksi Terakhir Anda
                  </div>
                  {myOrders.length === 0 ? (
                    <div className="p-6 border border-zinc-200 text-xs text-zinc-500">
                      Belum ada transaksi.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 border border-zinc-200">
                      {myOrders.slice(0, 5).map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-mono-code text-[11px] text-zinc-400">
                              {ord.invoiceCode} • {formatDateTime(ord.purchasedAtMs)}
                            </div>
                            <div className="font-medium text-zinc-950">{ord.productTitle}</div>
                          </div>
                          <div className="flex items-center gap-3 font-mono-code">
                            <span>{formatRupiah(ord.price)}</span>
                            <button
                              type="button"
                              onClick={() => navigateStorePath(`/store/receipt/${ord.id}`)}
                              className="px-3 py-1 bg-zinc-950 text-white cursor-pointer lowercase"
                            >
                              receipt →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ADMIN DASHBOARD (/store/dashboard for Admin) */
              <div className="space-y-8">
                {/* Admin Header Banner */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <div className="text-xs font-mono-code text-emerald-700 lowercase">
                      /store/dashboard · administrator workspace · {currentUser.email}
                    </div>
                    <h2 className="text-2xl font-medium tracking-tight text-zinc-950">
                      Kelola Card Produk, Stok &amp; Tiket Refund
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Tambah/edit produk melalui halaman khusus <span className="font-mono-code text-zinc-800">/new/product</span> dan kelola kode voucher promo di <span className="font-mono-code text-zinc-800">/promo</span>.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 font-mono-code text-xs">
                    <span className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 tabular-nums whitespace-nowrap">
                      produk: {products.length}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 tabular-nums whitespace-nowrap">
                      stok: {adminStock.filter((s) => s.status === 'available').length}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 tabular-nums whitespace-nowrap">
                      refund terbuka: {refundTickets.filter((t) => t.status === 'open').length}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateStorePath('/promo')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-300 hover:border-zinc-950 bg-white text-zinc-900 cursor-pointer lowercase whitespace-nowrap"
                    >
                      <Tag size={13} />
                      <span>kelola kode promo ({storePromos.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCreateNewProduct}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white cursor-pointer lowercase whitespace-nowrap"
                    >
                      <Plus size={14} />
                      <span>buat produk baru</span>
                    </button>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 01: CARD PRODUK TOKO (EDIT -> /new/product) */}
                {/* ========================================================= */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
                    <div>
                      <div className="text-xs font-mono-code text-zinc-400 lowercase">
                        01 · daftar card produk toko ({products.length} produk)
                      </div>
                      <h3 className="text-lg font-medium text-zinc-950 mt-0.5">
                        Card Produk Digital — Edit, Isi Stok, atau Hapus Langsung
                      </h3>
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-72">
                        <Search
                          size={14}
                          className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={adminDashboardSearch}
                          onChange={(e) => setAdminDashboardSearch(e.target.value)}
                          placeholder="Cari card produk..."
                          className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleStartCreateNewProduct}
                        className="px-3.5 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code cursor-pointer lowercase shrink-0 whitespace-nowrap"
                      >
                        + produk
                      </button>
                    </div>
                  </div>

                  {loadingProducts ? (
                    <div className="py-10 text-center text-xs font-mono-code text-zinc-400 lowercase">
                      memuat card produk dari database...
                    </div>
                  ) : filteredAdminProducts.length === 0 ? (
                    <div className="py-12 border border-dashed border-zinc-300 rounded-xl p-6 text-center space-y-3">
                      <div className="text-sm font-medium text-zinc-900">
                        {products.length === 0
                          ? 'Belum ada produk di toko.'
                          : `Tidak ada produk yang cocok dengan "${adminDashboardSearch}".`}
                      </div>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto">
                        Buat produk pertama melalui halaman khusus /new/product lengkap dengan icon thesvg.org, 1–10 poin benefit terpisah, dan harga diskon.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartCreateNewProduct}
                        className="px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                      >
                        buka /new/product →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredAdminProducts.map((product) => {
                        const vars = getVariantsForProduct(product);
                        const delivType = getProductDeliveryType(product);
                        const prodBenefits = getProductBenefits(product);
                        const inStock = product.stockCount > 0;
                        const cheapestVar =
                          vars.length > 0
                            ? vars.reduce((minV, v) => (v.price < minV.price ? v : minV), vars[0])
                            : null;
                        const lowestDiscount = getVariantDiscountInfo(
                          cheapestVar?.price ?? product.price,
                          cheapestVar?.originalPrice
                        );

                        return (
                          <div
                            key={product.id}
                            className="border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4 bg-white hover:border-zinc-950 transition-all"
                          >
                            <div className="space-y-3.5">
                              {/* Unboxed metadata row */}
                              <div className="flex items-center justify-between gap-2 text-[11px] font-mono-code">
                                <span className="text-zinc-500 lowercase truncate">
                                  {product.category} · {delivType === 'redeem' ? 'kode redeem' : 'akun'}
                                  {product.badge ? ` · ${product.badge}` : ''}
                                </span>
                                <span
                                  className={`whitespace-nowrap shrink-0 font-medium ${
                                    inStock ? 'text-emerald-700' : 'text-red-600'
                                  }`}
                                >
                                  {inStock ? `stok ${product.stockCount}` : 'habis'}
                                </span>
                              </div>

                              {/* Icon + Title + Price */}
                              <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                                  <ProductBrandIcon
                                    iconUrl={getProductIconUrl(product)}
                                    title={product.title}
                                    size={26}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-base font-semibold text-zinc-950 truncate">
                                      {product.title}
                                    </h4>
                                    <div className="text-right shrink-0">
                                      <div className="text-xs font-mono-code font-semibold text-zinc-950 tabular-nums">
                                        {formatRupiah(lowestDiscount.finalPrice || product.price)}
                                      </div>
                                      {lowestDiscount.hasDiscount && (
                                        <div className="text-[10px] font-mono-code text-zinc-400 line-through tabular-nums">
                                          {formatRupiah(lowestDiscount.originalPrice)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                                    {product.description}
                                  </p>
                                </div>
                              </div>

                              {/* Variations & Benefit Count */}
                              <div className="pt-2.5 border-t border-zinc-100 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono-code text-zinc-400">
                                  <span>{vars.length} variasi</span>
                                  <span>{prodBenefits.length} poin benefit</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {vars.map((v) => {
                                    const vCount = getVariantAvailableCount(product, v.id);
                                    const vDisc = getVariantDiscountInfo(v.price, v.originalPrice);
                                    return (
                                      <span
                                        key={v.id}
                                        className="px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200 text-[11px] font-mono-code text-zinc-700 tabular-nums"
                                      >
                                        {v.label} · {formatRupiah(v.price)}
                                        {vDisc.hasDiscount ? ` (-${vDisc.discountPercent}%)` : ''} [{vCount}]
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Card CRUD Buttons */}
                            <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProduct(product)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                >
                                  <Pencil size={12} />
                                  <span>edit produk</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleJumpToAddStock(product)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:border-emerald-700 text-emerald-800 text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                >
                                  <Plus size={12} />
                                  <span>isi stok</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectProductForCheckout(product)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-950 text-zinc-700 text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                >
                                  <span>lihat</span>
                                  <ArrowUpRight size={12} />
                                </button>
                              </div>

                              {confirmDeleteProductId === product.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAdminDeleteProduct(product)}
                                    disabled={deletingProductId === product.id}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-mono-code cursor-pointer lowercase disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {deletingProductId === product.id ? 'hapus...' : 'yakin?'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProductId(null)}
                                    className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                  >
                                    batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProductId(product.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-600 text-red-600 text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                >
                                  <Trash2 size={12} />
                                  <span>hapus</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 02: TAMBAH STOK MULTI-BARIS SESUAI TIPE PRODUK */}
                {/* ========================================================= */}
                <div
                  ref={adminStockFormRef}
                  className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100">
                    <div>
                      <div className="text-xs font-mono-code text-zinc-400 lowercase">
                        02 · tambah stok berdasarkan produk &amp; variasi
                      </div>
                      <h3 className="text-lg font-medium text-zinc-950 mt-0.5">
                        Form Input Stok (Otomatis Menyesuaikan Tipe Produk)
                      </h3>
                    </div>
                    {selectedStockProductObj && (
                      <span className="px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono-code">
                        tipe:{' '}
                        {selectedStockProductDeliveryType === 'redeem'
                          ? 'kode redeem / voucher'
                          : 'akun (email & password)'}
                      </span>
                    )}
                  </div>

                  {products.length === 0 ? (
                    <div className="py-6 text-xs text-zinc-400 font-mono-code">
                      Buat produk terlebih dahulu di halaman /new/product.
                    </div>
                  ) : (
                    <form onSubmit={handleAdminSaveStandaloneStockRows} className="space-y-5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-zinc-600 mb-1.5 font-medium">
                            1. Pilih Produk Digital
                          </label>
                          <select
                            value={selectedStockProductId}
                            onChange={(e) => setSelectedStockProductId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-zinc-950"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} — [
                                {getProductDeliveryType(p) === 'redeem'
                                  ? 'Kode Redeem'
                                  : 'Email & Password'}
                                ] (Stok: {p.stockCount})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-600 mb-1.5 font-medium">
                            2. Pilih Variasi Produk
                          </label>
                          <select
                            value={selectedStockVariantId}
                            onChange={(e) => setSelectedStockVariantId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-zinc-950"
                          >
                            {selectedStockProductVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label} ({v.durationLabel}) — {formatRupiah(v.price)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Structured Rows — Bulk upload */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-code text-zinc-700">
                            {selectedStockProductDeliveryType === 'redeem'
                              ? `Daftar Baris Kode Redeem (${standaloneStockRows.length} Baris)`
                              : `Daftar Baris Akun Email & Password (${standaloneStockRows.length} Baris)`}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddStandaloneStockRow}
                            className="px-3.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-300 hover:border-zinc-950 font-mono-code text-xs text-zinc-900 cursor-pointer lowercase whitespace-nowrap"
                          >
                            + tambah baris (bulk upload)
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {standaloneStockRows.map((row, idx) => (
                            <div
                              key={row.rowId}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200"
                            >
                              <span className="font-mono-code text-xs text-zinc-400 w-7 shrink-0">
                                #{idx + 1}
                              </span>

                              {selectedStockProductDeliveryType === 'account' ? (
                                <>
                                  <input
                                    type="text"
                                    required
                                    value={row.accountEmail}
                                    onChange={(e) =>
                                      handleUpdateStandaloneStockRow(
                                        row.rowId,
                                        'accountEmail',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Email / Username Akun *"
                                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                  />
                                  <input
                                    type="text"
                                    required
                                    value={row.accountPassword}
                                    onChange={(e) =>
                                      handleUpdateStandaloneStockRow(
                                        row.rowId,
                                        'accountPassword',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Password Akun *"
                                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                  />
                                </>
                              ) : (
                                <input
                                  type="text"
                                  required
                                  value={row.accountEmail}
                                  onChange={(e) =>
                                    handleUpdateStandaloneStockRow(
                                      row.rowId,
                                      'accountEmail',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Kode Redeem / Voucher / License Key *"
                                  className="flex-[2] px-3 py-2 rounded-lg bg-white border border-zinc-300 font-mono-code focus:outline-none focus:border-zinc-950"
                                />
                              )}

                              <input
                                type="text"
                                value={row.accountNotes}
                                onChange={(e) =>
                                  handleUpdateStandaloneStockRow(
                                    row.rowId,
                                    'accountNotes',
                                    e.target.value
                                  )
                                }
                                placeholder="Catatan / Profil / PIN (Opsional)"
                                className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                              />

                              {standaloneStockRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStandaloneStockRow(row.rowId)}
                                  className="px-2 py-1 text-red-600 hover:text-red-800 cursor-pointer self-end sm:self-center"
                                  title="Hapus baris"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSavingStock || !selectedStockProductId}
                          className="px-6 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                          {isSavingStock
                            ? 'Menyimpan Stok...'
                            : `Simpan ${standaloneStockRows.length} Baris Stok ke Variasi Ini`}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 03: DAFTAR TIKET REFUND & CHAT */}
                {/* ========================================================= */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-4">
                  <div className="text-xs font-mono-code text-zinc-400 lowercase">
                    03 · manajemen tiket refund &amp; sesi chat ({refundTickets.length})
                  </div>

                  {refundTickets.length === 0 ? (
                    <div className="py-6 text-xs text-zinc-400 font-mono-code">
                      Belum ada tiket klaim refund.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                      {refundTickets.map((tkt) => (
                        <div
                          key={tkt.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white"
                        >
                          <div className="space-y-1">
                            <div className="font-mono-code text-[11px] text-zinc-400">
                              {tkt.id} · Invoice: {tkt.invoiceCode} · Pembeli: {tkt.buyerEmail}
                            </div>
                            <div className="font-medium text-zinc-950">
                              {tkt.productTitle} — {formatRupiah(tkt.price)}
                            </div>
                            <div className="text-zinc-600">
                              Solusi diminta:{' '}
                              <span className="font-medium">
                                {tkt.solutionType === 'replace_item'
                                  ? 'Pengiriman Barang Ulang'
                                  : 'Pengembalian Dana'}
                              </span>{' '}
                              · Alasan: &ldquo;{tkt.reason}&rdquo;
                            </div>
                          </div>

                          <div className="flex items-center gap-3 font-mono-code shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-md border text-[11px] ${
                                tkt.status === 'open'
                                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                                  : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                              }`}
                            >
                              {tkt.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateStorePath(`/store/ticket/${tkt.id}`)}
                              className="px-4 py-2 rounded-lg bg-zinc-950 text-white cursor-pointer lowercase whitespace-nowrap"
                            >
                              buka chat →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 04: TABEL STOK VAULT */}
                {/* ========================================================= */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs font-mono-code text-zinc-400 lowercase">
                      04 · daftar stok per variasi ({adminStock.length})
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono-code">
                      {(['all', 'available', 'sold', 'refunded'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStockFilter(st)}
                          className={`px-3 py-1 rounded-lg border cursor-pointer lowercase whitespace-nowrap ${
                            stockFilter === st
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredAdminStock.length === 0 ? (
                    <div className="py-6 text-xs text-zinc-400 font-mono-code">
                      Belum ada data stok.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 text-zinc-400 font-mono-code">
                            <th className="py-2.5 pr-4 font-normal">produk</th>
                            <th className="py-2.5 px-4 font-normal">variasi</th>
                            <th className="py-2.5 px-4 font-normal">email / kode redeem</th>
                            <th className="py-2.5 px-4 font-normal">password / tipe</th>
                            <th className="py-2.5 px-4 font-normal">status</th>
                            <th className="py-2.5 pl-4 text-right font-normal">hapus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredAdminStock.map((stk) => (
                            <tr key={stk.id}>
                              <td className="py-3 pr-4 text-zinc-900 font-medium">
                                {stk.productTitle}
                              </td>
                              <td className="py-3 px-4 font-mono-code text-zinc-600">
                                {stk.variantLabel}
                              </td>
                              <td className="py-3 px-4 font-mono-code text-zinc-800">
                                {stk.accountEmail}
                              </td>
                              <td className="py-3 px-4 font-mono-code text-zinc-700">
                                {stk.accountPassword ? (
                                  stk.accountPassword
                                ) : (
                                  <span className="text-zinc-400">kode redeem</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono-code text-zinc-500">
                                {stk.status}
                              </td>
                              <td className="py-3 pl-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => deleteAdminStockAccount(stk)}
                                  className="text-zinc-400 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 8: /new/product — BUAT / EDIT PRODUK + 1-10 BENEFIT FORM + HARGA DISKON */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'new-product' && (
          <div className="space-y-6">
            {!currentUser || !adminMode ? (
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 text-center space-y-4">
                <div className="text-base font-medium text-zinc-950">
                  Akses Terbatas — Khusus Administrator (/new/product)
                </div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Silakan masuk menggunakan akun Google Administrator untuk membuat atau mengedit produk toko.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={handleLogin}
                      className="px-5 py-2.5 rounded-lg bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                    >
                      masuk dengan google
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigateStorePath('/store')}
                    className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-mono-code cursor-pointer lowercase"
                  >
                    kembali ke katalog
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={adminProductFormRef}
                className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 space-y-8"
              >
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => navigateStorePath('/store/dashboard')}
                      className="inline-flex items-center gap-1.5 text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
                    >
                      <ArrowLeft size={13} />
                      <span>kembali ke dashboard admin</span>
                    </button>
                    <h2 className="text-2xl font-medium tracking-tight text-zinc-950">
                      {editingProductId
                        ? `Edit Produk — ${newProdTitle || 'Tanpa Nama'}`
                        : 'Buat Produk Baru (/new/product)'}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Template sudah terisi otomatis. Atur logo thesvg.org, maksimal 10 poin benefit terpisah, deskripsi, serta harga normal &amp; harga diskon per variasi.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplateToProductForm()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-50 border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-800 cursor-pointer lowercase whitespace-nowrap"
                    >
                      <RefreshCw size={12} />
                      <span>
                        {newProdTitle.trim()
                          ? `terapkan "${newProdTitle.trim()}" ke template`
                          : 'muat ulang template'}
                      </span>
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={handleCancelEditProduct}
                        className="px-3.5 py-2 rounded-lg border border-zinc-300 text-xs font-mono-code text-zinc-700 hover:border-zinc-950 cursor-pointer lowercase whitespace-nowrap"
                      >
                        reset jadi produk baru
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleAdminSaveProduct} className="space-y-8 text-xs">
                  {/* 1. Product Delivery Type Selector */}
                  <div className="space-y-2.5">
                    <label className="block font-mono-code text-zinc-900 uppercase tracking-wider">
                      1 · Tipe Pengiriman Otomatis *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <button
                        type="button"
                        onClick={() => setNewProdDeliveryType('account')}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                          newProdDeliveryType === 'account'
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <div className="font-mono-code text-xs font-medium">
                          {newProdDeliveryType === 'account' ? '●' : '○'} Akun (Email / Username &amp; Password)
                        </div>
                        <p
                          className={`text-[11px] mt-1 ${
                            newProdDeliveryType === 'account' ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          Stok produk menggunakan kolom terpisah Email/Username dan Password per baris.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewProdDeliveryType('redeem')}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                          newProdDeliveryType === 'redeem'
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <div className="font-mono-code text-xs font-medium">
                          {newProdDeliveryType === 'redeem' ? '●' : '○'} Kode Redeem / Voucher / License Key
                        </div>
                        <p
                          className={`text-[11px] mt-1 ${
                            newProdDeliveryType === 'redeem' ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          Stok produk khusus menggunakan kolom Kode Redeem tanpa password.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* 2. Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-zinc-900 mb-1.5 font-semibold">
                        Nama Produk *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProdTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProdTitle(val);
                          if (!newProdIconUrl || (!editingProductId && isTemplateAutoSync)) {
                            const autoIcon = inferTheSvgIconFromTitle(val);
                            if (autoIcon) setNewProdIconUrl(autoIcon);
                          }
                        }}
                        placeholder="Google Gemini / Netflix / Canva Pro"
                        className="w-full px-3.5 py-2.5 rounded-lg border-2 border-zinc-300 focus:outline-none focus:border-zinc-950 font-medium"
                      />
                      {!editingProductId && isTemplateAutoSync && (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Deskripsi, Benefit &amp; Cara Pakai otomatis menyesuaikan Nama Produk.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-zinc-700 mb-1.5 font-medium">
                        Kategori *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        placeholder="Premium Apps / Streaming / AI"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 mb-1.5 font-medium">
                        Label Badge (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newProdBadge}
                        onChange={(e) => setNewProdBadge(e.target.value)}
                        placeholder="Best Seller / Bergaransi"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  {/* 3. thesvg.org Icon Picker */}
                  <div className="border border-zinc-200 rounded-2xl bg-zinc-50/70 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-white border border-zinc-300 flex items-center justify-center shrink-0">
                          <ProductBrandIcon
                            iconUrl={newProdIconUrl}
                            title={newProdTitle}
                            size={28}
                          />
                        </div>
                        <div>
                          <div className="font-mono-code text-xs font-semibold text-zinc-950 uppercase tracking-wider">
                            2 · Pilih Icon Produk (thesvg.org)
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {theSvgCatalogLoaded
                              ? `Terhubung ke thesvg.org (${theSvgCatalog.length.toLocaleString('id-ID')} logo siap dipilih).`
                              : isLoadingTheSvgCatalog
                              ? 'Memuat indeks logo dari thesvg.org...'
                              : 'Pilih logo aplikasi populer atau cari nama brand di bawah.'}
                          </p>
                        </div>
                      </div>

                      {newProdIconUrl && (
                        <button
                          type="button"
                          onClick={() => setNewProdIconUrl('')}
                          className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 hover:border-zinc-950 text-[11px] font-mono-code text-zinc-700 cursor-pointer lowercase self-start sm:self-auto"
                        >
                          reset icon
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono-code text-zinc-600 mb-1 lowercase">
                          cari nama aplikasi di thesvg.org:
                        </label>
                        <input
                          type="text"
                          value={iconSearchQuery}
                          onChange={(e) => setIconSearchQuery(e.target.value)}
                          placeholder="netflix, spotify, gemini, chatgpt, canva, capcut..."
                          className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono-code text-zinc-600 mb-1 lowercase">
                          slug / url icon terpilih:
                        </label>
                        <input
                          type="text"
                          value={newProdIconUrl}
                          onChange={(e) => setNewProdIconUrl(e.target.value)}
                          placeholder="netflix atau https://thesvg.org/icons/netflix/default.svg"
                          className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-mono-code focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                    </div>

                    {activeSelectedTheSvgEntry?.variants &&
                      Object.keys(activeSelectedTheSvgEntry.variants).length > 1 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-mono-code text-zinc-500 lowercase">
                            varian {activeSelectedTheSvgEntry.title}:
                          </span>
                          {Object.entries(activeSelectedTheSvgEntry.variants).map(
                            ([varKey, varPath]) => {
                              if (!varPath) return null;
                              const fullVarUrl = normalizeTheSvgIconUrl(String(varPath));
                              const isVarActive =
                                normalizeTheSvgIconUrl(newProdIconUrl) === fullVarUrl;
                              return (
                                <button
                                  key={varKey}
                                  type="button"
                                  onClick={() => setNewProdIconUrl(fullVarUrl)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono-code cursor-pointer lowercase ${
                                    isVarActive
                                      ? 'bg-zinc-950 text-white border-zinc-950'
                                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-950'
                                  }`}
                                >
                                  <img
                                    src={fullVarUrl}
                                    alt={varKey}
                                    className="w-3.5 h-3.5 object-contain bg-zinc-100 rounded-xs"
                                  />
                                  <span>{varKey}</span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}

                    <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-2 max-h-56 overflow-y-auto p-1">
                      {filteredTheSvgIcons.map((item) => {
                        const itemUrl = `https://thesvg.org${item.defaultPath}`;
                        const isSelected =
                          normalizeTheSvgIconUrl(newProdIconUrl) === itemUrl ||
                          newProdIconUrl.includes(`/icons/${item.slug}/`);
                        return (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => {
                              uiSfx.playClick();
                              setNewProdIconUrl(itemUrl);
                            }}
                            title={`${item.title} (${item.slug})`}
                            className={`p-2 border rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-zinc-950 bg-zinc-950 text-white'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-md bg-white border border-zinc-100 flex items-center justify-center p-1">
                              <img
                                src={itemUrl}
                                alt={item.title}
                                loading="lazy"
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                            <span className="text-[10px] font-medium leading-tight line-clamp-1 w-full">
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Multi-Row Benefit Form (1 Form = 1 Poin, Max 10) & Deskripsi */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Left: Multi-Row Benefit Builder */}
                    <div className="xl:col-span-7 border border-zinc-200 rounded-2xl p-5 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                        <div>
                          <div className="font-mono-code text-xs font-semibold text-zinc-950 uppercase tracking-wider">
                            3 · Benefit Produk (1 Form = 1 Poin, Maksimal 10 Poin)
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Setiap baris di bawah langsung menjadi 1 poin centang hijau di tab Benefit halaman produk.
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-mono-code text-[11px] text-zinc-700 tabular-nums">
                            {benefitDrafts.length}/10 poin
                          </span>
                          <button
                            type="button"
                            onClick={handleAddBenefitRow}
                            disabled={benefitDrafts.length >= 10}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-[11px] cursor-pointer lowercase disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <Plus size={12} />
                            <span>
                              {benefitDrafts.length >= 10 ? 'maksimal 10 poin' : 'tambah poin'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {benefitDrafts.map((bRow, bIdx) => (
                          <div
                            key={bRow.id}
                            className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono-code text-[11px] font-medium text-zinc-700">
                                Poin Benefit #{bIdx + 1}
                              </span>
                              {benefitDrafts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBenefitRow(bRow.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono-code text-red-600 hover:text-red-800 cursor-pointer lowercase"
                                >
                                  <Trash2 size={12} />
                                  <span>hapus poin</span>
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-5">
                                <input
                                  type="text"
                                  required
                                  value={bRow.title}
                                  onChange={(e) =>
                                    handleUpdateBenefitField(bRow.id, 'title', e.target.value)
                                  }
                                  placeholder="Judul Poin (cth: Pengiriman Instan)"
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                              <div className="sm:col-span-7">
                                <input
                                  type="text"
                                  value={bRow.desc}
                                  onChange={(e) =>
                                    handleUpdateBenefitField(bRow.id, 'desc', e.target.value)
                                  }
                                  placeholder="Penjelasan singkat benefit ini..."
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Deskripsi, Usage Guide & Preview */}
                    <div className="xl:col-span-5 space-y-4">
                      <div className="border border-zinc-200 rounded-2xl p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label className="text-zinc-800 font-semibold">
                              Deskripsi Produk *
                            </label>
                            <span className="text-[11px] font-mono-code text-zinc-400 tabular-nums">
                              {newProdDesc.length}/2000
                            </span>
                          </div>
                          <textarea
                            rows={5}
                            required
                            maxLength={2000}
                            value={newProdDesc}
                            onChange={(e) => {
                              setIsTemplateAutoSync(false);
                              setNewProdDesc(e.target.value);
                            }}
                            placeholder="Rincian keunggulan produk dan ketentuan garansi..."
                            className="w-full p-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950 leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-800 mb-1.5 font-semibold">
                            Cara Menggunakan Produk * (Di Halaman Receipt)
                          </label>
                          <textarea
                            rows={4}
                            required
                            maxLength={2500}
                            value={newProdUsageGuide}
                            onChange={(e) => {
                              setIsTemplateAutoSync(false);
                              setNewProdUsageGuide(e.target.value);
                            }}
                            placeholder={
                              newProdDeliveryType === 'redeem'
                                ? '1. Salin kode redeem...\n2. Buka menu Redeem...'
                                : '1. Buka aplikasi resmi...\n2. Login dengan Email & Password...'
                            }
                            className="w-full p-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950 leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-3">
                        <div className="text-[11px] font-mono-code text-zinc-500 lowercase">
                          preview tab benefit di /produk/{toProductSlug(newProdTitle || 'produk')}:
                        </div>
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                          {previewBenefitsList.map((bItem, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-2.5 text-xs">
                              <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-zinc-900">{bItem.title}</div>
                                {bItem.desc && (
                                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                                    {bItem.desc}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Variasi, Harga Normal (Coret) & Harga Jual/Diskon + Stok Awal */}
                  <div className="space-y-4 pt-4 border-t border-zinc-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-mono-code text-zinc-900 uppercase tracking-wider">
                          4 · Daftar Variasi, Harga Diskon &amp; Stok Awal ({variantDrafts.length} Variasi)
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Isi &ldquo;Harga Normal / Coret&rdquo; lebih tinggi dari Harga Jual untuk menampilkan label diskon persentase otomatis di katalog &amp; checkout.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVariantRow}
                        className="px-4 py-2 rounded-lg bg-zinc-950 text-white font-mono-code text-xs cursor-pointer lowercase whitespace-nowrap"
                      >
                        + tambah variasi
                      </button>
                    </div>

                    <div className="space-y-4">
                      {variantDrafts.map((vRow, idx) => {
                        const liveDisc = getVariantDiscountInfo(
                          Number(vRow.price) || 0,
                          Number(vRow.originalPrice) || undefined
                        );
                        return (
                          <div
                            key={vRow.id}
                            className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/70 space-y-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono-code text-xs font-semibold text-zinc-950">
                                  Variasi #{idx + 1}
                                </span>
                                {liveDisc.hasDiscount && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono-code font-medium">
                                    Diskon {liveDisc.discountPercent}% · Hemat{' '}
                                    {formatRupiah(liveDisc.savingsAmount)}
                                  </span>
                                )}
                              </div>
                              {variantDrafts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantRow(vRow.id)}
                                  className="font-mono-code text-xs text-red-600 hover:text-red-800 underline cursor-pointer lowercase"
                                >
                                  hapus variasi
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-zinc-600 mb-1">Nama Variasi *</label>
                                <input
                                  type="text"
                                  required
                                  value={vRow.label}
                                  onChange={(e) =>
                                    handleUpdateVariantField(vRow.id, 'label', e.target.value)
                                  }
                                  placeholder="Sharing 1 Bulan / Private"
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-600 mb-1">Durasi *</label>
                                <input
                                  type="text"
                                  required
                                  value={vRow.durationLabel}
                                  onChange={(e) =>
                                    handleUpdateVariantField(
                                      vRow.id,
                                      'durationLabel',
                                      e.target.value
                                    )
                                  }
                                  placeholder="30 Hari / 1 Tahun"
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-600 mb-1">
                                  Harga Normal / Coret (Opsional)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={vRow.originalPrice}
                                  onChange={(e) =>
                                    handleUpdateVariantField(
                                      vRow.id,
                                      'originalPrice',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Kosongkan jika tanpa diskon"
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-900 font-semibold mb-1">
                                  Harga Jual / Diskon (IDR) *
                                </label>
                                <input
                                  type="number"
                                  required
                                  min={0}
                                  value={vRow.price}
                                  onChange={(e) =>
                                    handleUpdateVariantField(vRow.id, 'price', e.target.value)
                                  }
                                  placeholder="35000"
                                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-zinc-300 focus:outline-none focus:border-zinc-950 font-semibold"
                                />
                              </div>
                            </div>

                            {/* Structured Stock Rows */}
                            <div className="pt-3 border-t border-zinc-200 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono-code text-zinc-600">
                                  Stok langsung untuk variasi &ldquo;{vRow.label || `#${idx + 1}`}&rdquo; ({vRow.stockRows.length} baris):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddVariantStockRow(vRow.id)}
                                  className="px-3 py-1 rounded-lg bg-white border border-zinc-300 hover:border-zinc-950 font-mono-code text-[11px] text-zinc-900 cursor-pointer lowercase whitespace-nowrap"
                                >
                                  + tambah baris{' '}
                                  {newProdDeliveryType === 'redeem' ? 'kode redeem' : 'akun'}
                                </button>
                              </div>

                              {vRow.stockRows.length > 0 && (
                                <div className="space-y-2">
                                  {vRow.stockRows.map((sRow, sIdx) => (
                                    <div
                                      key={sRow.rowId}
                                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-zinc-200"
                                    >
                                      <span className="font-mono-code text-[11px] text-zinc-400 w-7 shrink-0">
                                        #{sIdx + 1}
                                      </span>
                                      {newProdDeliveryType === 'account' ? (
                                        <>
                                          <input
                                            type="text"
                                            value={sRow.accountEmail}
                                            onChange={(e) =>
                                              handleUpdateVariantStockRow(
                                                vRow.id,
                                                sRow.rowId,
                                                'accountEmail',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Email / Username Akun"
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                                          />
                                          <input
                                            type="text"
                                            value={sRow.accountPassword}
                                            onChange={(e) =>
                                              handleUpdateVariantStockRow(
                                                vRow.id,
                                                sRow.rowId,
                                                'accountPassword',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Password Akun"
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                                          />
                                        </>
                                      ) : (
                                        <input
                                          type="text"
                                          value={sRow.accountEmail}
                                          onChange={(e) =>
                                            handleUpdateVariantStockRow(
                                              vRow.id,
                                              sRow.rowId,
                                              'accountEmail',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Kode Redeem / Voucher / License Key"
                                          className="flex-[2] px-3 py-1.5 rounded-lg border border-zinc-300 font-mono-code text-xs focus:outline-none focus:border-zinc-950"
                                        />
                                      )}
                                      <input
                                        type="text"
                                        value={sRow.accountNotes}
                                        onChange={(e) =>
                                          handleUpdateVariantStockRow(
                                            vRow.id,
                                            sRow.rowId,
                                            'accountNotes',
                                            e.target.value
                                          )
                                        }
                                        placeholder="Catatan / PIN (Opsional)"
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveVariantStockRow(vRow.id, sRow.rowId)
                                        }
                                        className="px-2 py-1 text-red-600 hover:text-red-800 cursor-pointer self-end sm:self-center"
                                        title="Hapus baris"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {adminFormFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs font-medium ${
                        adminFormFeedback.type === 'success'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-red-50 border-red-300 text-red-900'
                      }`}
                    >
                      {adminFormFeedback.text}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProduct}
                      className="px-6 py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProduct
                        ? 'Menyimpan Produk & Stok...'
                        : editingProductId
                        ? 'Simpan Perubahan Produk'
                        : 'Simpan Produk Baru'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCancelEditProduct();
                        navigateStorePath('/store/dashboard');
                      }}
                      className="px-5 py-3 rounded-xl border border-zinc-300 hover:border-zinc-950 text-zinc-700 font-mono-code text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Batal &amp; Kembali
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 9: /promo — MANAJEMEN KODE PROMO & VOUCHER CHECKOUT */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'promo' && (
          <div className="space-y-6">
            {!currentUser || !adminMode ? (
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 text-center space-y-4">
                <div className="text-base font-medium text-zinc-950">
                  Akses Terbatas — Khusus Administrator (/promo)
                </div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Silakan masuk menggunakan akun Google Administrator untuk menambah, mengubah, atau menghapus kode promo toko.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={handleLogin}
                      className="px-5 py-2.5 rounded-lg bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                    >
                      masuk dengan google
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigateStorePath('/store')}
                    className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-mono-code cursor-pointer lowercase"
                  >
                    kembali ke katalog
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => navigateStorePath('/store/dashboard')}
                      className="inline-flex items-center gap-1.5 text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
                    >
                      <ArrowLeft size={13} />
                      <span>kembali ke dashboard admin</span>
                    </button>
                    <h2 className="text-2xl font-medium tracking-tight text-zinc-950">
                      Kelola Kode Promo &amp; Voucher (/promo)
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Semua kode promo aktif di sini otomatis bisa dipakai pembeli di halaman <span className="font-mono-code text-zinc-800">/cart</span>.
                    </p>
                  </div>
                  {storePromos.length === 0 && (
                    <button
                      type="button"
                      onClick={handleSeedStarterPromos}
                      disabled={isSavingPromo}
                      className="px-4 py-2.5 rounded-lg border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-800 cursor-pointer lowercase whitespace-nowrap disabled:opacity-50"
                    >
                      + muat 2 promo starter (HEMAT10 &amp; POTONGAN5K)
                    </button>
                  )}
                </div>

                {/* Main Split: Form + Promo Cards List */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Create / Update Form */}
                  <div className="lg:col-span-5 bg-white border border-zinc-200/90 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <h3 className="text-base font-semibold text-zinc-950">
                        {editingPromoId
                          ? `Edit Kode Promo (${promoCodeForm})`
                          : 'Buat Kode Promo Baru'}
                      </h3>
                      {editingPromoId && (
                        <button
                          type="button"
                          onClick={handleResetPromoForm}
                          className="text-xs font-mono-code text-zinc-500 hover:text-zinc-950 underline cursor-pointer lowercase"
                        >
                          batal edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSavePromo} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-zinc-700 font-medium mb-1">
                          Kode Promo * (Huruf Kapital / Angka)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={32}
                          value={promoCodeForm}
                          onChange={(e) => setPromoCodeForm(e.target.value.toUpperCase())}
                          placeholder="HEMAT20 / WEEKEND5K"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 font-mono-code uppercase focus:outline-none focus:border-zinc-950"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-700 font-medium mb-1">
                          Judul Singkat Promo
                        </label>
                        <input
                          type="text"
                          maxLength={120}
                          value={promoTitleForm}
                          onChange={(e) => setPromoTitleForm(e.target.value)}
                          placeholder="Diskon Akhir Pekan 20%"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-700 font-medium mb-1">
                            Tipe Potongan *
                          </label>
                          <select
                            value={promoDiscountTypeForm}
                            onChange={(e) =>
                              setPromoDiscountTypeForm(
                                e.target.value === 'fixed' ? 'fixed' : 'percent'
                              )
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-zinc-950"
                          >
                            <option value="percent">Persentase (%)</option>
                            <option value="fixed">Nominal Tetap (IDR)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-700 font-medium mb-1">
                            {promoDiscountTypeForm === 'percent'
                              ? 'Nilai Diskon (%) *'
                              : 'Nominal Potongan (Rp) *'}
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={promoDiscountTypeForm === 'percent' ? 95 : 10000000}
                            value={promoDiscountValueForm}
                            onChange={(e) => setPromoDiscountValueForm(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-zinc-700 font-medium mb-1">
                          Minimal Pembelian (IDR, 0 = Tanpa Minimum)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={promoMinPurchaseForm}
                          onChange={(e) => setPromoMinPurchaseForm(e.target.value)}
                          placeholder="0"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-700 font-medium mb-1">
                          Deskripsi Ketentuan Promo
                        </label>
                        <textarea
                          rows={3}
                          maxLength={400}
                          value={promoDescForm}
                          onChange={(e) => setPromoDescForm(e.target.value)}
                          placeholder="Berlaku untuk seluruh produk digital di Digital Store..."
                          className="w-full p-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-950 leading-relaxed"
                        />
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={promoIsActiveForm}
                          onChange={(e) => setPromoIsActiveForm(e.target.checked)}
                          className="w-4 h-4 accent-zinc-950"
                        />
                        <span className="text-zinc-800 font-medium">
                          Aktifkan promo langsung untuk halaman checkout
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingPromo}
                        className="w-full py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        {isSavingPromo
                          ? 'Menyimpan Promo...'
                          : editingPromoId
                          ? 'Simpan Perubahan Promo'
                          : '+ Simpan Kode Promo'}
                      </button>
                    </form>
                  </div>

                  {/* Right: Promo Codes List */}
                  <div className="lg:col-span-7 bg-white border border-zinc-200/90 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <h3 className="text-base font-semibold text-zinc-950">
                        Daftar Kode Promo Tersimpan ({storePromos.length})
                      </h3>
                      <span className="text-xs font-mono-code text-zinc-400">
                        {activeStorePromos.length} aktif
                      </span>
                    </div>

                    {storePromos.length === 0 ? (
                      <div className="py-12 border border-dashed border-zinc-300 rounded-xl p-6 text-center space-y-3">
                        <div className="text-sm font-medium text-zinc-900">
                          Belum ada kode promo di toko.
                        </div>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">
                          Buat kode promo melalui form di samping agar pembeli bisa mengklaim potongan harga di halaman /cart.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {storePromos.map((promo) => (
                          <div
                            key={promo.id}
                            className={`p-5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              editingPromoId === promo.id
                                ? 'border-zinc-950 bg-zinc-50'
                                : 'border-zinc-200 bg-white'
                            }`}
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md bg-zinc-950 text-white font-mono-code text-xs font-semibold">
                                  {promo.code}
                                </span>
                                <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono-code text-[11px] font-medium">
                                  {promo.discountType === 'percent'
                                    ? `Diskon ${promo.discountValue}%`
                                    : `Potongan ${formatRupiah(promo.discountValue)}`}
                                </span>
                                <span
                                  className={`text-[11px] font-mono-code ${
                                    promo.isActive ? 'text-emerald-700' : 'text-zinc-400'
                                  }`}
                                >
                                  {promo.isActive ? '● aktif' : '○ nonaktif'}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-zinc-950">
                                {promo.title}
                              </div>
                              <p className="text-xs text-zinc-500 leading-relaxed">
                                {promo.description}
                                {promo.minPurchase > 0
                                  ? ` · Minimal belanja ${formatRupiah(promo.minPurchase)}`
                                  : ''}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTogglePromoActive(promo)}
                                className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 cursor-pointer lowercase whitespace-nowrap"
                              >
                                {promo.isActive ? 'nonaktifkan' : 'aktifkan'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditPromo(promo)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                              >
                                edit
                              </button>
                              {confirmDeletePromoId === promo.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePromo(promo)}
                                    disabled={deletingPromoId === promo.id}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-mono-code cursor-pointer lowercase disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {deletingPromoId === promo.id ? 'hapus...' : 'yakin?'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeletePromoId(null)}
                                    className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                  >
                                    batal
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeletePromoId(promo.id)}
                                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-600 text-red-600 text-xs font-mono-code cursor-pointer lowercase whitespace-nowrap"
                                >
                                  hapus
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
