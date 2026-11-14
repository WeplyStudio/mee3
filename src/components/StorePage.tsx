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
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
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
  getVariantsForProduct,
  getProductDeliveryType,
  parseTicketProofImages,
  parseTicketMessages,
  censorToxicWords,
  evaluateOrderRefundEligibility,
  compressRefundProofImage,
  subscribeStoreProducts,
  subscribeStoreReviews,
  subscribeUserOrders,
  subscribeRefundTickets,
  subscribeAdminStock,
  subscribeAvailableStockByVariant,
  subscribeUserRestockAlerts,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
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
  | 'receipt'
  | 'transactions'
  | 'reviews'
  | 'refund'
  | 'ticket'
  | 'dashboard';

interface ParsedStoreLocation {
  routePage: StoreRoutePage;
  paramId: string;
}

interface StockDraftRow {
  rowId: string;
  accountEmail: string;
  accountPassword: string;
  accountNotes: string;
}

interface VariantDraftRow {
  id: string;
  label: string;
  durationLabel: string;
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

function createDefaultVariantDraft(index: number): VariantDraftRow {
  return {
    id: `var_${index}_${Date.now().toString(36)}`,
    label: index === 1 ? 'Paket Reguler' : `Variasi ${index}`,
    durationLabel: '30 Hari',
    price: '35000',
    stockRows: [],
  };
}

function parseStorePathname(pathname: string): ParsedStoreLocation {
  const clean = pathname.replace(/\/+$/, '') || '/store';
  const receiptMatch = clean.match(/^\/store\/receipt\/([^/]+)$/i);
  if (receiptMatch) {
    return { routePage: 'receipt', paramId: decodeURIComponent(receiptMatch[1]) };
  }
  const ticketMatch = clean.match(/^\/store\/ticket\/([^/]+)$/i);
  if (ticketMatch) {
    return { routePage: 'ticket', paramId: decodeURIComponent(ticketMatch[1]) };
  }
  if (/^\/store\/transaksi$/i.test(clean)) {
    return { routePage: 'transactions', paramId: '' };
  }
  if (/^\/store\/ulasan$/i.test(clean)) {
    return { routePage: 'reviews', paramId: '' };
  }
  if (/^\/store\/refund$/i.test(clean)) {
    return { routePage: 'refund', paramId: '' };
  }
  if (/^\/store\/dashboard$/i.test(clean)) {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export const StorePage: React.FC<StorePageProps> = ({ onNavigateHome }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // URL-Driven Multi-Page Router for /store/*
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

  // Checkout Flow State inside /store
  const [checkoutMode, setCheckoutMode] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProductRecord | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantOption | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<WijayapayMethodCode>('QRIS');

  // Active Payment Invoice State
  const [paymentTx, setPaymentTx] = useState<WijayapayTransactionData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState<boolean>(false);

  // Real-time Firestore Data
  const [products, setProducts] = useState<StoreProductRecord[]>([]);
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

  // Review Pagination Limits (Per 10 reviews)
  const [productReviewLimit, setProductReviewLimit] = useState<number>(10);
  const [globalReviewLimit, setGlobalReviewLimit] = useState<number>(10);

  const productReviews = useMemo(() => {
    if (!selectedProduct) return [];
    return reviews.filter((r) => r.productId === selectedProduct.id);
  }, [reviews, selectedProduct]);

  const displayedProductReviews = useMemo(() => {
    return productReviews.slice(0, productReviewLimit);
  }, [productReviews, productReviewLimit]);

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

  // Admin Product CRUD + Delivery Type + Variations + Structured Row Stock State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [newProdTitle, setNewProdTitle] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('');
  const [newProdBadge, setNewProdBadge] = useState<string>('');
  const [newProdDeliveryType, setNewProdDeliveryType] = useState<ProductDeliveryType>('account');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [newProdUsageGuide, setNewProdUsageGuide] = useState<string>('');
  const [variantDrafts, setVariantDrafts] = useState<VariantDraftRow[]>(() => [
    createDefaultVariantDraft(1),
  ]);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Admin Standalone Structured Row Stock Form (Adapts automatically to Product's deliveryType!)
  const [selectedStockProductId, setSelectedStockProductId] = useState<string>('');
  const [selectedStockVariantId, setSelectedStockVariantId] = useState<string>('');
  const [standaloneStockRows, setStandaloneStockRows] = useState<StockDraftRow[]>(() => [
    createEmptyStockDraftRow(),
  ]);
  const [isSavingStock, setIsSavingStock] = useState<boolean>(false);

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

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
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
    return () => {
      unsubProducts();
      unsubReviews();
    };
  }, []);

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

  // Select Product for Checkout
  const handleSelectProductForCheckout = (product: StoreProductRecord) => {
    uiSfx.playClick();
    const variants = getVariantsForProduct(product);
    setSelectedProduct(product);
    setSelectedVariant(variants[0] || null);
    setSelectedPayment('QRIS');
    setPaymentTx(null);
    setCheckoutMode(true);
    setProductReviewLimit(10);
    if (storeLocation.routePage !== 'catalog') {
      navigateStorePath('/store');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Create Payment Code / QRIS
  const handleCreatePaymentInvoice = async () => {
    if (!selectedProduct || !selectedVariant) return;
    let activeUser = currentUser;
    if (!activeUser) {
      activeUser = await handleLogin();
      if (!activeUser) return;
    }

    setIsCreatingInvoice(true);
    try {
      const txData = await createWijayapayTransaction({
        paymentMethod: selectedPayment,
        nominal: selectedVariant.price,
      });
      setPaymentTx(txData);
      showToast('success', `Tagihan ${txData.payment_name} berhasil dibuat.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal membuat kode pembayaran.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Deliver Purchased Account / Redeem Code & Navigate to /store/receipt/:receiptId
  const deliverPurchasedItem = async () => {
    if (!selectedProduct || !selectedVariant) return;
    let activeUser = currentUser;
    if (!activeUser) {
      activeUser = await handleLogin();
      if (!activeUser) return;
    }

    setIsCompletingPayment(true);
    try {
      const createdOrder = await purchaseProductAutomatically({
        product: selectedProduct,
        variant: selectedVariant,
        paymentMethod: paymentTx?.payment_method || selectedPayment,
        wijayapayData: paymentTx,
        buyer: activeUser,
      });
      setPaymentTx(null);
      setCheckoutMode(false);
      navigateStorePath(`/store/receipt/${createdOrder.id}`);
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

  // Manual Check Payment Status
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

  // Background polling every 6 seconds while invoice is open
  useEffect(() => {
    if (!paymentTx || !checkoutMode || isCompletingPayment) return;
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
  }, [paymentTx, checkoutMode, isCompletingPayment]);

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

  // Admin: Variant & Structured Stock Row Helpers inside Product Form
  const handleAddVariantRow = () => {
    setVariantDrafts((prev) => [...prev, createDefaultVariantDraft(prev.length + 1)]);
  };

  const handleRemoveVariantRow = (id: string) => {
    setVariantDrafts((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleUpdateVariantField = (
    id: string,
    field: 'label' | 'durationLabel' | 'price',
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

  // Admin: Start Editing Product
  const handleStartEditProduct = (product: StoreProductRecord) => {
    uiSfx.playClick();
    const existingVars = getVariantsForProduct(product);
    const delivType = getProductDeliveryType(product);
    setEditingProductId(product.id);
    setNewProdTitle(product.title);
    setNewProdCategory(product.category);
    setNewProdBadge(product.badge || '');
    setNewProdDeliveryType(delivType);
    setNewProdDesc(product.description);
    setNewProdUsageGuide(product.usageGuide || '');
    setVariantDrafts(
      existingVars.map((v) => ({
        id: v.id,
        label: v.label,
        durationLabel: v.durationLabel,
        price: String(v.price),
        stockRows: [],
      }))
    );
    navigateStorePath('/store/dashboard');
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setNewProdTitle('');
    setNewProdCategory('');
    setNewProdBadge('');
    setNewProdDeliveryType('account');
    setNewProdDesc('');
    setNewProdUsageGuide('');
    setVariantDrafts([createDefaultVariantDraft(1)]);
  };

  // Admin: Save Product + Variations + Structured Stock Rows per Variation
  const handleAdminSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle.trim()) return;
    setIsSavingProduct(true);
    try {
      const cleanVariants: ProductVariantOption[] = variantDrafts.map((row, idx) => ({
        id: sanitizeId(row.id || `var_${idx + 1}`),
        label: row.label.trim() || `Variasi ${idx + 1}`,
        durationLabel: row.durationLabel.trim() || '30 Hari',
        price: Math.max(0, Math.round(Number(row.price) || 0)),
        deliveryType: newProdDeliveryType,
      }));

      const payload = {
        title: newProdTitle.trim(),
        category: newProdCategory.trim() || 'Digital Product',
        description: newProdDesc.trim() || `Produk ${newProdTitle.trim()} resmi bergaransi.`,
        usageGuide:
          newProdUsageGuide.trim() ||
          (newProdDeliveryType === 'redeem'
            ? '1. Salin kode redeem yang diberikan di atas.\n2. Tukarkan kode pada halaman atau aplikasi resmi.'
            : '1. Login menggunakan email dan password akun yang diberikan di atas.\n2. Gunakan sesuai variasi yang dipilih.'),
        deliveryType: newProdDeliveryType,
        variants: cleanVariants,
        badge: newProdBadge.trim(),
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

      showToast(
        'success',
        editingProductId
          ? `Produk "${savedProduct.title}" berhasil diperbarui${
              totalUploadedItems > 0 ? ` (+${totalUploadedItems} stok baru)` : ''
            }.`
          : `Produk "${savedProduct.title}" berhasil dibuat${
              totalUploadedItems > 0 ? ` beserta ${totalUploadedItems} stok awal` : ''
            }.`
      );
      handleCancelEditProduct();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan produk.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Admin: Delete Product
  const handleAdminDeleteProduct = async (product: StoreProductRecord) => {
    uiSfx.playClick();
    setDeletingProductId(product.id);
    try {
      await deleteStoreProduct(product.id);
      if (editingProductId === product.id) {
        handleCancelEditProduct();
      }
      if (selectedStockProductId === product.id) {
        const remaining = products.filter((p) => p.id !== product.id);
        setSelectedStockProductId(remaining[0]?.id || '');
      }
      showToast('success', `Produk "${product.title}" beserta stoknya berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus produk.');
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
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 pt-24 sm:pt-28 pb-28 px-4 sm:px-8 md:px-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ============================================================= */}
        {/* STORE HEADER & MULTI-PAGE NAVIGATION BAR */}
        {/* ============================================================= */}
        <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-100">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs font-mono-code text-zinc-400">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="inline-flex items-center gap-1.5 hover:text-zinc-950 transition-colors cursor-pointer lowercase"
                >
                  <ArrowLeft size={13} />
                  <span>[beranda]</span>
                </button>
                <span>/</span>
                <span className="text-zinc-700 lowercase">{window.location.pathname}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-zinc-950">
                Digital Store
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl font-light leading-relaxed">
                Layanan produk digital dengan verifikasi pembayaran otomatis (QRIS, BCA Virtual Account, BNI Virtual Account, Alfamart, Indomaret), pengiriman instan akun maupun kode redeem, serta jaminan klaim garansi 3 hari.
              </p>
            </div>

            {/* Unified User / Admin Account Box */}
            <div className="flex items-center gap-4 self-start md:self-end bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs">
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium text-zinc-900">{currentUser.email}</div>
                    <div className="text-[11px] font-mono-code text-zinc-500 lowercase mt-0.5">
                      {adminMode ? 'akses: administrator' : 'akses: pembeli terverifikasi'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 border border-zinc-300 hover:border-zinc-950 text-zinc-700 hover:text-zinc-950 font-mono-code text-[11px] transition-colors cursor-pointer lowercase"
                  >
                    keluar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-zinc-500">Belum masuk sesi</span>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs transition-colors cursor-pointer lowercase"
                  >
                    masuk dengan google
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Multi-Page Route Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono-code">
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode(false);
                  setPaymentTx(null);
                  navigateStorePath('/store');
                }}
                className={`px-3.5 py-2 border transition-colors cursor-pointer lowercase ${
                  storeLocation.routePage === 'catalog'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                katalog ({products.length})
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/store/transaksi')}
                className={`px-3.5 py-2 border transition-colors cursor-pointer lowercase ${
                  storeLocation.routePage === 'transactions' || storeLocation.routePage === 'receipt'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                transaksi ({myOrders.length})
              </button>

              <button
                type="button"
                onClick={() => navigateStorePath('/store/ulasan')}
                className={`px-3.5 py-2 border transition-colors cursor-pointer lowercase ${
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
                className={`px-3.5 py-2 border transition-colors cursor-pointer lowercase ${
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
                className={`px-3.5 py-2 border transition-colors cursor-pointer lowercase ${
                  storeLocation.routePage === 'dashboard'
                    ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                {adminMode ? 'dashboard admin' : 'dashboard user'}
              </button>
            </nav>

            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono-code text-zinc-400 lowercase">
              <ShieldCheck size={14} className="text-emerald-700" />
              <span>pengiriman instan • klaim refund 10 menit – 3 hari</span>
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
                      {prod && prod.stockCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectProductForCheckout(prod)}
                          className="text-zinc-950 underline underline-offset-4 cursor-pointer lowercase"
                        >
                          [beli sekarang →]
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
        {/* PAGE 1: /store — KATALOG PRODUK & CHECKOUT PEMBAYARAN */}
        {/* ============================================================= */}
        {storeLocation.routePage === 'catalog' && (
          <div className="space-y-6">
            {!checkoutMode ? (
              <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
                {/* Category Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 border transition-colors cursor-pointer lowercase ${
                          selectedCategory === cat
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {adminMode && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCancelEditProduct();
                          navigateStorePath('/store/dashboard');
                        }}
                        className="px-3.5 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase shrink-0"
                      >
                        + produk baru
                      </button>
                    )}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama produk atau kategori..."
                      className="w-full sm:w-64 px-3.5 py-2 border border-zinc-200 text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50"
                    />
                  </div>
                </div>

                {/* Product Grid / List */}
                {loadingProducts ? (
                  <div className="py-16 text-center text-xs font-mono-code text-zinc-400 lowercase">
                    [memuat daftar produk digital...]
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-16 text-center space-y-3 border border-dashed border-zinc-200 p-8">
                    <div className="text-sm font-medium text-zinc-900">
                      Belum ada produk digital yang tersedia.
                    </div>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      {adminMode
                        ? 'Tambahkan produk pertama Anda beserta tipe pengiriman (Akun Email & Password atau Kode Redeem) di halaman /store/dashboard.'
                        : 'Silakan kembali lagi nanti saat produk baru telah ditambahkan.'}
                    </p>
                    {adminMode && (
                      <button
                        type="button"
                        onClick={() => navigateStorePath('/store/dashboard')}
                        className="mt-2 px-4 py-2 bg-zinc-950 text-white text-xs font-mono-code cursor-pointer lowercase"
                      >
                        buka dashboard admin →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredProducts.map((product) => {
                      const inStock = product.stockCount > 0;
                      const prodVariants = getVariantsForProduct(product);
                      const delivType = getProductDeliveryType(product);
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
                          className="border border-zinc-200 p-6 flex flex-col justify-between gap-6 hover:border-zinc-950 transition-colors bg-white"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-code">
                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 lowercase">
                                  {product.category}
                                </span>
                                <span className="px-2 py-0.5 border border-zinc-200 text-zinc-600 lowercase">
                                  {delivType === 'redeem' ? 'kode redeem' : 'akun email & password'}
                                </span>
                                {product.badge && (
                                  <span className="px-2 py-0.5 bg-zinc-950 text-white lowercase">
                                    {product.badge}
                                  </span>
                                )}
                              </div>

                              <span
                                className={`text-[11px] font-mono-code ${
                                  inStock ? 'text-emerald-700 font-medium' : 'text-red-600'
                                }`}
                              >
                                {inStock ? `stok: ${product.stockCount}` : 'stok habis (0)'}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-lg font-medium text-zinc-950 tracking-tight">
                                {product.title}
                              </h3>
                              <p className="text-xs text-zinc-500 font-light leading-relaxed mt-1">
                                {product.description}
                              </p>
                            </div>

                            {/* Variations preview */}
                            <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                              <div className="text-[10px] font-mono-code text-zinc-400 lowercase">
                                pilihan variasi ({prodVariants.length}):
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {prodVariants.map((v) => {
                                  const vCount = getVariantAvailableCount(product, v.id);
                                  return (
                                    <span
                                      key={v.id}
                                      className="text-[11px] font-mono-code bg-zinc-50 border border-zinc-200 px-2.5 py-1 text-zinc-700"
                                    >
                                      {v.label} ({v.durationLabel}) • {formatRupiah(v.price)} [{vCount}]
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-mono-code text-zinc-400 lowercase">
                                mulai dari
                              </div>
                              <div className="text-xl font-medium text-zinc-950">
                                {formatRupiah(product.price)}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {adminMode && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditProduct(product)}
                                    className="px-3 py-2 border border-zinc-200 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 cursor-pointer lowercase"
                                  >
                                    edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminDeleteProduct(product)}
                                    disabled={deletingProductId === product.id}
                                    className="px-3 py-2 border border-red-200 hover:border-red-600 text-xs font-mono-code text-red-600 cursor-pointer lowercase disabled:opacity-40"
                                  >
                                    hapus
                                  </button>
                                </>
                              )}

                              {inStock ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectProductForCheckout(product)}
                                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code cursor-pointer lowercase"
                                >
                                  pilih produk →
                                </button>
                              ) : existingAlert ? (
                                <span className="px-3 py-2 bg-zinc-100 text-zinc-600 text-xs font-mono-code lowercase">
                                  pengingat aktif
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSubscribeRestock(product)}
                                  className="px-3.5 py-2 border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 cursor-pointer lowercase"
                                >
                                  ingatkan saat stok ada
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* CHECKOUT VIEW INSIDE /store */
              selectedProduct && (
                <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-8">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutMode(false);
                        setPaymentTx(null);
                      }}
                      className="inline-flex items-center gap-2 text-xs font-mono-code text-zinc-500 hover:text-zinc-950 cursor-pointer lowercase"
                    >
                      <ArrowLeft size={14} />
                      <span>[kembali ke katalog produk]</span>
                    </button>
                    <span className="text-xs font-mono-code text-zinc-400 lowercase">
                      tipe pengiriman:{' '}
                      {getProductDeliveryType(selectedProduct) === 'redeem'
                        ? 'kode redeem / voucher'
                        : 'akun (email & password)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Product Info, Variation Selector & Payment Method Selector */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-2">
                        <div className="text-xs font-mono-code text-zinc-400 lowercase">
                          [{selectedProduct.category}] • stok total: {selectedProduct.stockCount}
                        </div>
                        <h2 className="text-2xl font-normal text-zinc-950">
                          {selectedProduct.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-500 font-light leading-relaxed">
                          {selectedProduct.description}
                        </p>
                      </div>

                      {/* 1. Pilih Variasi */}
                      <div className="space-y-3">
                        <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider">
                          1. Pilih Variasi Paket
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {getVariantsForProduct(selectedProduct).map((variant) => {
                            const isSelected = selectedVariant?.id === variant.id;
                            const varStock = getVariantAvailableCount(selectedProduct, variant.id);
                            return (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => {
                                  setSelectedVariant(variant);
                                  setPaymentTx(null);
                                }}
                                className={`p-4 border text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                                  isSelected
                                    ? 'border-zinc-950 bg-zinc-950 text-white'
                                    : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium">{variant.label}</span>
                                  <span
                                    className={`text-[11px] font-mono-code ${
                                      isSelected ? 'text-zinc-300' : 'text-zinc-400'
                                    }`}
                                  >
                                    {variant.durationLabel}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between pt-2 border-t border-current/10">
                                  <span className="text-sm font-mono-code">
                                    {formatRupiah(variant.price)}
                                  </span>
                                  <span
                                    className={`text-[11px] font-mono-code ${
                                      isSelected
                                        ? 'text-emerald-300'
                                        : varStock > 0
                                        ? 'text-emerald-700'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    stok: {varStock}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Pilih Metode Pembayaran */}
                      <div className="space-y-3">
                        <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider">
                          2. Pilih Metode Pembayaran Otomatis
                        </div>
                        <div className="divide-y divide-zinc-200 border border-zinc-200">
                          {WIJAYAPAY_PAYMENT_METHODS.map((pm) => {
                            const isSelected = selectedPayment === pm.id;
                            return (
                              <button
                                key={pm.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPayment(pm.id);
                                  setPaymentTx(null);
                                }}
                                className={`w-full px-4 py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-950 text-white'
                                    : 'bg-white text-zinc-700 hover:bg-zinc-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono-code text-xs">
                                    {isSelected ? '[●]' : '[ ]'}
                                  </span>
                                  <div>
                                    <div className="text-xs sm:text-sm font-medium">{pm.label}</div>
                                    <div
                                      className={`text-[11px] font-mono-code ${
                                        isSelected ? 'text-zinc-300' : 'text-zinc-400'
                                      }`}
                                    >
                                      {pm.feeLabel}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`text-xs font-mono-code px-2 py-0.5 border ${
                                    isSelected
                                      ? 'border-zinc-700 text-zinc-200'
                                      : 'border-zinc-200 text-zinc-500'
                                  }`}
                                >
                                  {pm.shortLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Product-Specific Reviews (Per 10 items pagination) */}
                      <div className="space-y-4 pt-6 border-t border-zinc-200">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider">
                            Ulasan Pembeli untuk Produk Ini ({productReviews.length})
                          </div>
                        </div>
                        {productReviews.length === 0 ? (
                          <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs font-mono-code text-zinc-400 lowercase">
                            [belum ada ulasan untuk produk ini]
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {displayedProductReviews.map((rev) => (
                              <div key={rev.id} className="border border-zinc-200 p-4 space-y-2 bg-zinc-50/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-zinc-950">{rev.buyerName}</span>
                                  <span className="font-mono-code text-zinc-900 bg-white px-2 py-0.5 border border-zinc-200 text-[11px]">
                                    {'★'.repeat(Math.max(1, Math.min(5, rev.rating)))} ({rev.rating}/5)
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-700 font-light leading-relaxed">
                                  &ldquo;{censorToxicWords(rev.comment)}&rdquo;
                                </p>
                                <div className="text-[10px] font-mono-code text-zinc-400">
                                  {formatDateTime(rev.createdAtMs)}
                                </div>
                              </div>
                            ))}

                            {productReviews.length > productReviewLimit && (
                              <button
                                type="button"
                                onClick={() => setProductReviewLimit((prev) => prev + 10)}
                                className="w-full py-2.5 border border-zinc-300 hover:border-zinc-950 text-xs font-mono-code text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer lowercase"
                              >
                                [muat 10 ulasan berikutnya...]
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Payment Summary, VA / Retail Code or QRIS */}
                    <div className="lg:col-span-5">
                      <div className="bg-zinc-50 border border-zinc-200 p-6 space-y-6 sticky top-28">
                        <div className="text-xs font-mono-code text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-200">
                          Ringkasan & Instruksi Pembayaran
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between text-zinc-500">
                            <span>Produk</span>
                            <span className="text-zinc-900 font-medium text-right">
                              {selectedProduct.title}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>Variasi</span>
                            <span className="text-zinc-900">
                              {selectedVariant
                                ? `${selectedVariant.label} (${selectedVariant.durationLabel})`
                                : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>Metode Pembayaran</span>
                            <span className="text-zinc-900 font-mono-code">{selectedPayment}</span>
                          </div>
                          {paymentTx && (
                            <>
                              <div className="flex justify-between text-zinc-500">
                                <span>Biaya Layanan</span>
                                <span className="text-zinc-900">
                                  {formatRupiah(paymentTx.total_fee)}
                                </span>
                              </div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Batas Waktu Bayar</span>
                                <span className="text-zinc-900 font-mono-code">
                                  {paymentTx.expired}
                                </span>
                              </div>
                            </>
                          )}

                          <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                            <span className="text-xs font-medium text-zinc-900">Total Tagihan</span>
                            <span className="text-2xl font-medium text-zinc-950">
                              {formatRupiah(
                                paymentTx
                                  ? paymentTx.total_bayar
                                  : selectedVariant
                                  ? selectedVariant.price
                                  : selectedProduct.price
                              )}
                            </span>
                          </div>
                        </div>

                        {!paymentTx ? (
                          <div className="space-y-3 pt-2 border-t border-zinc-200">
                            <button
                              type="button"
                              onClick={handleCreatePaymentInvoice}
                              disabled={isCreatingInvoice || !selectedVariant}
                              className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code uppercase tracking-wider cursor-pointer disabled:opacity-50"
                            >
                              {isCreatingInvoice
                                ? 'Membuat Tagihan Pembayaran...'
                                : `Lanjutkan Pembayaran (${selectedPayment}) →`}
                            </button>
                            <div className="text-[11px] font-mono-code text-zinc-400 text-center">
                              {currentUser
                                ? `Terdaftar atas: ${currentUser.email}`
                                : 'Anda akan diminta login Google sebelum tagihan dibuat'}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white border border-zinc-200 p-5 space-y-5">
                            <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 text-xs font-mono-code">
                              <span className="text-zinc-950 font-medium">
                                {paymentTx.payment_name}
                              </span>
                              <span className="text-zinc-400">{paymentTx.ref_id}</span>
                            </div>

                            {/* QRIS VIEW: Clean QR Image ONLY (NO copy qr_string box!) */}
                            {paymentTx.payment_method === 'QRIS' && (
                              <div className="flex flex-col items-center text-center space-y-4 py-2">
                                <div className="border border-zinc-200 p-3 bg-white">
                                  {qrCodeDataUrl ? (
                                    <img
                                      src={qrCodeDataUrl}
                                      alt="QRIS Code"
                                      width={220}
                                      height={220}
                                      className="w-52 h-52 object-contain"
                                    />
                                  ) : (
                                    <div className="w-52 h-52 flex items-center justify-center text-xs font-mono-code text-zinc-400">
                                      [memuat kode qr...]
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1 max-w-xs">
                                  <div className="text-xs font-medium text-zinc-900">
                                    Scan QRIS untuk Membayar
                                  </div>
                                  <p className="text-[11px] text-zinc-500 font-light">
                                    Buka aplikasi m-Banking atau E-Wallet (GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, BRI) lalu scan QR di atas sebesar{' '}
                                    <span className="font-medium text-zinc-900">
                                      {formatRupiah(paymentTx.total_bayar)}
                                    </span>.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* VIRTUAL ACCOUNT (BCAVA / BNIVA) OR RETAIL (ALFAMART / INDOMARET): Prominent VA / Payment Number */}
                            {paymentTx.payment_method !== 'QRIS' && (
                              <div className="space-y-3">
                                <div className="text-[11px] font-mono-code text-zinc-500 uppercase tracking-wider">
                                  {paymentTx.payment_method === 'BCAVA' ||
                                  paymentTx.payment_method === 'BNIVA'
                                    ? `Nomor ${paymentTx.payment_name}:`
                                    : `Kode Pembayaran ${paymentTx.payment_name}:`}
                                </div>

                                <div className="p-4 bg-zinc-950 text-white flex items-center justify-between gap-3">
                                  <span className="text-lg sm:text-xl font-mono-code tracking-wider select-all break-all">
                                    {activePaymentCode || '-'}
                                  </span>
                                  {activePaymentCode && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        copyToClipboard(activePaymentCode, 'copy_va_code')
                                      }
                                      className="px-3 py-1.5 bg-white text-zinc-950 text-xs font-mono-code cursor-pointer shrink-0 lowercase"
                                    >
                                      {copiedKey === 'copy_va_code' ? 'tersalin ✓' : 'salin nomor'}
                                    </button>
                                  )}
                                </div>

                                <p className="text-xs text-zinc-500 font-light leading-relaxed">
                                  Bayar tepat sebesar{' '}
                                  <span className="font-medium text-zinc-900">
                                    {formatRupiah(paymentTx.total_bayar)}
                                  </span>{' '}
                                  menggunakan nomor di atas sebelum{' '}
                                  <span className="font-mono-code text-zinc-800">
                                    {paymentTx.expired}
                                  </span>.
                                </p>
                              </div>
                            )}

                            {paymentTx.tutorial_pembayaran && (
                              <div className="p-3.5 bg-zinc-50 border border-zinc-200 space-y-1.5 text-xs">
                                <div className="text-[11px] font-mono-code text-zinc-500 lowercase">
                                  langkah pembayaran:
                                </div>
                                <div className="text-zinc-600 font-light whitespace-pre-line leading-relaxed">
                                  {paymentTx.tutorial_pembayaran}
                                </div>
                              </div>
                            )}

                            <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                              <button
                                type="button"
                                onClick={handleVerifyPaymentStatus}
                                disabled={isCompletingPayment}
                                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono-code uppercase tracking-wider cursor-pointer disabled:opacity-50"
                              >
                                {isCompletingPayment
                                  ? 'Memverifikasi Pembayaran...'
                                  : 'Cek Status Pembayaran Otomatis →'}
                              </button>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setPaymentTx(null)}
                                  className="text-xs font-mono-code text-zinc-400 hover:text-zinc-900 cursor-pointer lowercase"
                                >
                                  ← ganti metode bayar
                                </button>

                                {adminMode && (
                                  <button
                                    type="button"
                                    onClick={deliverPurchasedItem}
                                    disabled={isCompletingPayment}
                                    className="text-xs font-mono-code text-blue-600 hover:text-blue-800 underline underline-offset-4 cursor-pointer lowercase"
                                  >
                                    [simulasi lunas admin]
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PAGE 2: /store/receipt/:receiptId — HALAMAN RECEIPT & KREDENSIAL */}
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
                /store/receipt/{storeLocation.paramId}
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
                <div className="bg-white border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono-code text-emerald-700 lowercase">
                      [/store/dashboard • administrator workspace • {currentUser.email}]
                    </div>
                    <h2 className="text-2xl font-normal text-zinc-950 mt-0.5">
                      Manajemen Produk, Tipe Kredensial, Baris Stok & Tiket Refund
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono-code text-xs">
                    <span className="px-3 py-1.5 bg-zinc-100 border border-zinc-200">
                      produk: {products.length}
                    </span>
                    <span className="px-3 py-1.5 bg-zinc-100 border border-zinc-200">
                      stok tersedia: {adminStock.filter((s) => s.status === 'available').length}
                    </span>
                    <span className="px-3 py-1.5 bg-zinc-100 border border-zinc-200">
                      tiket refund terbuka: {refundTickets.filter((t) => t.status === 'open').length}
                    </span>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 01: BUAT / EDIT PRODUK + TIPE KREDENSIAL + VARIASI */}
                {/* ========================================================= */}
                <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-200">
                    <div>
                      <div className="text-xs font-mono-code text-zinc-400 lowercase">
                        {editingProductId
                          ? '[01. mode edit produk digital]'
                          : '[01. tambah produk digital baru]'}
                      </div>
                      <h3 className="text-lg font-medium text-zinc-950 mt-0.5">
                        {editingProductId
                          ? 'Perbarui Produk, Tipe Pengiriman & Variasi'
                          : 'Buat Produk Baru, Pilih Tipe Pengiriman & Variasi'}
                      </h3>
                    </div>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={handleCancelEditProduct}
                        className="px-3 py-1.5 border border-zinc-300 text-xs font-mono-code text-zinc-700 hover:border-zinc-950 cursor-pointer lowercase"
                      >
                        batal edit
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleAdminSaveProduct} className="space-y-6 text-xs">
                    {/* Product Delivery Type Selector: Akun (Email & Password) OR Kode Redeem */}
                    <div className="space-y-2">
                      <label className="block font-mono-code text-zinc-900 uppercase tracking-wider">
                        Pilih Jenis Produk yang Dikirim Saat Pembeli Selesai Membayar *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewProdDeliveryType('account')}
                          className={`p-4 border text-left cursor-pointer transition-colors ${
                            newProdDeliveryType === 'account'
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          <div className="font-mono-code text-xs font-medium">
                            {newProdDeliveryType === 'account' ? '[●]' : '[ ]'} Akun (Email / Username & Password)
                          </div>
                          <p
                            className={`text-[11px] mt-1 ${
                              newProdDeliveryType === 'account' ? 'text-zinc-300' : 'text-zinc-500'
                            }`}
                          >
                            Form stok produk ini menggunakan kolom terpisah Email/Username dan Password per baris.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNewProdDeliveryType('redeem')}
                          className={`p-4 border text-left cursor-pointer transition-colors ${
                            newProdDeliveryType === 'redeem'
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          <div className="font-mono-code text-xs font-medium">
                            {newProdDeliveryType === 'redeem' ? '[●]' : '[ ]'} Kode Redeem / Voucher / License Key
                          </div>
                          <p
                            className={`text-[11px] mt-1 ${
                              newProdDeliveryType === 'redeem' ? 'text-zinc-300' : 'text-zinc-500'
                            }`}
                          >
                            Form stok produk ini khusus menggunakan kolom Kode Redeem tanpa kolom password.
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-zinc-600 mb-1.5 font-medium">
                          Nama Produk *
                        </label>
                        <input
                          type="text"
                          required
                          value={newProdTitle}
                          onChange={(e) => setNewProdTitle(e.target.value)}
                          placeholder="Contoh: Netflix UHD / Spotify / Voucher Steam"
                          className="w-full px-3.5 py-2.5 border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-600 mb-1.5 font-medium">
                          Kategori *
                        </label>
                        <input
                          type="text"
                          required
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          placeholder="Streaming / AI / Voucher / Productivity"
                          className="w-full px-3.5 py-2.5 border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-600 mb-1.5 font-medium">
                          Label Badge (Opsional)
                        </label>
                        <input
                          type="text"
                          value={newProdBadge}
                          onChange={(e) => setNewProdBadge(e.target.value)}
                          placeholder="Best Seller / Bergaransi"
                          className="w-full px-3.5 py-2.5 border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-zinc-600 mb-1.5 font-medium">
                          Deskripsi Produk *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={newProdDesc}
                          onChange={(e) => setNewProdDesc(e.target.value)}
                          placeholder="Rincian keunggulan produk dan ketentuan garansi..."
                          className="w-full p-3 border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-600 mb-1.5 font-medium">
                          Cara Menggunakan Produk * (Muncul di Bawah Info Akun/Kode pada Receipt)
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={newProdUsageGuide}
                          onChange={(e) => setNewProdUsageGuide(e.target.value)}
                          placeholder={
                            newProdDeliveryType === 'redeem'
                              ? '1. Salin kode redeem yang muncul di halaman receipt.\n2. Buka menu Redeem pada aplikasi/website resmi.\n3. Tempelkan kode untuk mengaktifkan paket.'
                              : '1. Buka aplikasi atau website resmi.\n2. Masuk menggunakan Email dan Password di halaman receipt.\n3. Dilarang mengubah password agar garansi tetap berlaku.'
                          }
                          className="w-full p-3 border border-zinc-300 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                    </div>

                    {/* Variations & Structured Row-by-Row Stock Upload */}
                    <div className="space-y-4 pt-4 border-t border-zinc-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono-code text-zinc-900 uppercase tracking-wider">
                            Daftar Variasi & Baris Stok Awal ({variantDrafts.length} Variasi)
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Klik &ldquo;+ Tambah Baris Stok&rdquo; pada masing-masing variasi jika ingin langsung mengupload banyak stok sekaligus secara rapi.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddVariantRow}
                          className="px-3.5 py-2 bg-zinc-950 text-white font-mono-code text-xs cursor-pointer lowercase"
                        >
                          + tambah variasi
                        </button>
                      </div>

                      <div className="space-y-4">
                        {variantDrafts.map((vRow, idx) => (
                          <div
                            key={vRow.id}
                            className="border border-zinc-200 p-5 bg-zinc-50/70 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono-code text-xs font-medium text-zinc-900">
                                Variasi #{idx + 1}
                              </span>
                              {variantDrafts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantRow(vRow.id)}
                                  className="font-mono-code text-xs text-red-600 hover:text-red-800 underline cursor-pointer lowercase"
                                >
                                  [hapus variasi]
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-zinc-500 mb-1">Nama Variasi *</label>
                                <input
                                  type="text"
                                  required
                                  value={vRow.label}
                                  onChange={(e) =>
                                    handleUpdateVariantField(vRow.id, 'label', e.target.value)
                                  }
                                  placeholder="Sharing 1 Bulan / Private"
                                  className="w-full px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-500 mb-1">Durasi *</label>
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
                                  className="w-full px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-500 mb-1">
                                  Harga Variasi (IDR) *
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
                                  className="w-full px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
                                />
                              </div>
                            </div>

                            {/* Structured Stock Rows for this Variation */}
                            <div className="pt-3 border-t border-zinc-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono-code text-zinc-600">
                                  Stok langsung untuk variasi &ldquo;{vRow.label || `#${idx + 1}`}&rdquo; ({vRow.stockRows.length} baris):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddVariantStockRow(vRow.id)}
                                  className="px-3 py-1 bg-white border border-zinc-300 hover:border-zinc-950 font-mono-code text-[11px] text-zinc-900 cursor-pointer lowercase"
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
                                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 border border-zinc-200"
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
                                            className="flex-1 px-3 py-1.5 border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
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
                                            className="flex-1 px-3 py-1.5 border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
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
                                          className="flex-[2] px-3 py-1.5 border border-zinc-300 font-mono-code text-xs focus:outline-none focus:border-zinc-950"
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
                                        className="flex-1 px-3 py-1.5 border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
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
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingProduct}
                        className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        {isSavingProduct
                          ? 'Menyimpan Produk & Stok...'
                          : editingProductId
                          ? 'Simpan Perubahan Produk'
                          : '+ Simpan Produk & Variasi'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 02: TAMBAH STOK MULTI-BARIS SESUAI TIPE PRODUK */}
                {/* ========================================================= */}
                <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-200">
                    <div>
                      <div className="text-xs font-mono-code text-zinc-400 lowercase">
                        [02. tambah stok berdasarkan produk & variasi]
                      </div>
                      <h3 className="text-lg font-medium text-zinc-950 mt-0.5">
                        Form Input Stok (Otomatis Menyesuaikan Tipe Produk)
                      </h3>
                    </div>
                    {selectedStockProductObj && (
                      <span className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-xs font-mono-code">
                        tipe produk terpilih:{' '}
                        {selectedStockProductDeliveryType === 'redeem'
                          ? 'kode redeem / voucher'
                          : 'akun (email & password)'}
                      </span>
                    )}
                  </div>

                  {products.length === 0 ? (
                    <div className="py-6 text-xs text-zinc-400 font-mono-code">
                      [buat produk terlebih dahulu pada bagian 01 di atas]
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
                            className="w-full px-3.5 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:border-zinc-950"
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
                            className="w-full px-3.5 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:border-zinc-950"
                          >
                            {selectedStockProductVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label} ({v.durationLabel}) — {formatRupiah(v.price)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Structured Rows — Bulk upload by adding new rows! */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono-code text-zinc-700">
                            {selectedStockProductDeliveryType === 'redeem'
                              ? `Daftar Baris Kode Redeem (${standaloneStockRows.length} Baris)`
                              : `Daftar Baris Akun Email & Password (${standaloneStockRows.length} Baris)`}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddStandaloneStockRow}
                            className="px-3.5 py-1.5 bg-zinc-100 border border-zinc-300 hover:border-zinc-950 font-mono-code text-xs text-zinc-900 cursor-pointer lowercase"
                          >
                            + tambah baris baru (bulk upload)
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {standaloneStockRows.map((row, idx) => (
                            <div
                              key={row.rowId}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 bg-zinc-50 border border-zinc-200"
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
                                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
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
                                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
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
                                  className="flex-[2] px-3 py-2 bg-white border border-zinc-300 font-mono-code focus:outline-none focus:border-zinc-950"
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
                                className="flex-1 px-3 py-2 bg-white border border-zinc-300 focus:outline-none focus:border-zinc-950"
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
                          className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-mono-code text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
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
                <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-4">
                  <div className="text-xs font-mono-code text-zinc-400 lowercase">
                    [03. manajemen tiket refund & sesi chat ({refundTickets.length})]
                  </div>

                  {refundTickets.length === 0 ? (
                    <div className="py-6 text-xs text-zinc-400 font-mono-code">
                      [belum ada tiket klaim refund]
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 border border-zinc-200">
                      {refundTickets.map((tkt) => (
                        <div
                          key={tkt.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-mono-code text-[11px] text-zinc-400">
                              {tkt.id} • Invoice: {tkt.invoiceCode} • Pembeli: {tkt.buyerEmail}
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
                              • Alasan: &ldquo;{tkt.reason}&rdquo;
                            </div>
                          </div>

                          <div className="flex items-center gap-3 font-mono-code">
                            <span
                              className={`px-2.5 py-1 border text-[11px] ${
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
                              className="px-4 py-2 bg-zinc-950 text-white cursor-pointer lowercase"
                            >
                              buka chat & proses tiket →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* ADMIN SECTION 04: DAFTAR PRODUK & TABEL STOK VAULT */}
                {/* ========================================================= */}
                <div className="bg-white border border-zinc-200 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs font-mono-code text-zinc-400 lowercase">
                      [04. daftar stok per variasi ({adminStock.length})]
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono-code">
                      {(['all', 'available', 'sold', 'refunded'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStockFilter(st)}
                          className={`px-2.5 py-1 border cursor-pointer lowercase ${
                            stockFilter === st
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-white text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredAdminStock.length === 0 ? (
                    <div className="py-6 text-xs text-zinc-400 font-mono-code">
                      [belum ada data stok]
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
                                  <span className="text-zinc-400">[kode redeem]</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono-code text-zinc-500">
                                [{stk.status}]
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
      </div>
    </div>
  );
};
