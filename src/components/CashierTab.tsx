/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, ShoppingCart, Percent, Trash2, CreditCard, 
  ChevronRight, ChevronDown, Sparkles, Check, AlertTriangle, Coffee, 
  Utensils, CupSoda, Cookie, ShieldCheck, X, RefreshCcw,
  Maximize2, Minimize2, ScanBarcode, Monitor, ExternalLink, Tv, Users, Lock
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Transaction, TransactionItem, User, StoreSettings, Customer } from '../types';
import { getHighResImageUrl } from '../utils/syncService';
import CustomerDisplay from './CustomerDisplay';

interface CashierTabProps {
  products: Product[];
  categories: Category[];
  currentUser: User;
  customers: Customer[];
  onCheckoutSuccess: (tx: Transaction) => void;
  storeSettings: StoreSettings;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onLogActivity?: (action: string, details: string) => void;
}

export default function CashierTab({
  products,
  categories,
  currentUser,
  customers = [],
  onCheckoutSuccess,
  storeSettings,
  isFullscreen = false,
  onToggleFullscreen,
  onLogActivity
}: CashierTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Shopping Cart items state
  const [cartItems, setCartItems] = useState<{ product: Product; qty: number; discount: number; selectedTierIndex?: number }[]>([]);

  // Selected Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Held Carts (Pending Transaksi)
  const [heldCarts, setHeldCarts] = useState<{
    id: string;
    label: string;
    date: string;
    cartItems: { product: Product; qty: number; discount: number; selectedTierIndex?: number }[];
    selectedCustomer: Customer | null;
    couponDiscountPercent: number;
    couponDiscountNominal: number;
  }[]>(() => {
    const saved = localStorage.getItem('kp_held_carts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [isHoldOpen, setIsHoldOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [isHeldListOpen, setIsHeldListOpen] = useState(false);

  // Helper functions for tiered pricing
  const getItemPrice = (item: { product: Product; selectedTierIndex?: number }) => {
    const idx = item.selectedTierIndex ?? 0;
    const p = item.product;
    switch (idx) {
      case 0: return p.tier1Price && p.tier1Price > 0 ? p.tier1Price : p.price;
      case 1: return p.tier2Price && p.tier2Price > 0 ? p.tier2Price : p.price;
      case 2: return p.tier3Price && p.tier3Price > 0 ? p.tier3Price : p.price;
      case 3: return p.tier4Price && p.tier4Price > 0 ? p.tier4Price : p.price;
      case 4: return p.tier5Price && p.tier5Price > 0 ? p.tier5Price : p.price;
      default: return p.price;
    }
  };

  const getItemTierName = (item: { product: Product; selectedTierIndex?: number }) => {
    const idx = item.selectedTierIndex ?? 0;
    const p = item.product;
    switch (idx) {
      case 0: return p.tier1Name || 'Eceran';
      case 1: return p.tier2Name || 'Renceng';
      case 2: return p.tier3Name || 'Pak';
      case 3: return p.tier4Name || 'Dus';
      case 4: return p.tier5Name || 'Grosir';
      default: return 'Eceran';
    }
  };

  const getAvailableTiers = (p: Product) => {
    const list = [];
    list.push({ index: 0, name: p.tier1Name || 'Eceran', price: p.tier1Price && p.tier1Price > 0 ? p.tier1Price : p.price });
    if (p.tier2Price && p.tier2Price > 0) {
      list.push({ index: 1, name: p.tier2Name || 'Renceng', price: p.tier2Price });
    }
    if (p.tier3Price && p.tier3Price > 0) {
      list.push({ index: 2, name: p.tier3Name || 'Pak', price: p.tier3Price });
    }
    if (p.tier4Price && p.tier4Price > 0) {
      list.push({ index: 3, name: p.tier4Name || 'Dus', price: p.tier4Price });
    }
    if (p.tier5Price && p.tier5Price > 0) {
      list.push({ index: 4, name: p.tier5Name || 'Grosir', price: p.tier5Price });
    }
    return list;
  };

  const updateItemTier = (productId: string, tierIndex: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          return { ...item, selectedTierIndex: tierIndex };
        }
        return item;
      });
    });
  };
  
  // Discounts & Tax configurations
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(0);
  const [couponDiscountNominal, setCouponDiscountNominal] = useState<number>(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  
  // Checkout Modal States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  
  // Cash Payment field calculations
  const [cashAmount, setCashAmount] = useState<string>('');
  
  // QRIS Simulation
  const [qrisState, setQrisState] = useState<'waiting' | 'paid'>('waiting');

  // Customer Display Simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Visual & Auditory click feedback states
  const [clickedProductId, setClickedProductId] = useState<string | null>(null);
  const [activeTimeoutId, setActiveTimeoutId] = useState<any>(null);

  // --- Barcode Scanner States ---
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Handle scanner lifecycle
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isActive = true;

    if (isScannerActive) {
      // Fetch available cameras first
      Html5Qrcode.getCameras()
        .then(devices => {
          if (devices && devices.length > 0 && isActive) {
            setCameras(devices);
            if (!selectedCameraId) {
              // Prefer back/rear/environment cameras by searching labels
              const backCamera = devices.find(d => 
                d.label.toLowerCase().includes('back') || 
                d.label.toLowerCase().includes('rear') || 
                d.label.toLowerCase().includes('environment') ||
                d.label.toLowerCase().includes('belakang')
              );
              setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
            }
          }
        })
        .catch(err => {
          console.warn("Gagal mengambil daftar kamera:", err);
        });

      const timer = setTimeout(() => {
        if (!isActive) return;
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode;

          const config = { 
            fps: 15, 
            qrbox: { width: 260, height: 180 } 
          };

          // Use selected camera device ID if available, otherwise fallback to standard environment
          const cameraSource = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" };

          html5QrCode.start(
            cameraSource,
            config,
            (decodedText) => {
              handleBarcodeScanned(decodedText);
            },
            () => {
              // Ignore silent scanner updates
            }
          ).catch(err => {
            console.error("Gagal memulai scanner kamera:", err);
            // Fallback retry using standard environment if specific camera failed
            if (selectedCameraId && html5QrCode) {
              html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                  handleBarcodeScanned(decodedText);
                },
                () => {}
              ).catch(e2 => {
                console.error("Fallback start failed:", e2);
                showToast("Kamera tidak dapat diakses atau diblokir izinnya.", "warning");
                setIsScannerActive(false);
              });
            } else {
              showToast("Kamera tidak dapat diakses atau diblokir izinnya.", "warning");
              setIsScannerActive(false);
            }
          });
        } catch (e) {
          console.error("Scanner init exception:", e);
        }
      }, 150);

      return () => {
        isActive = false;
        clearTimeout(timer);
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(e => console.error("Error stopping qr-scanner:", e));
          }
        }
        scannerRef.current = null;
      };
    } else {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(e => console.error("Error stopping qr-scanner:", e));
        }
        scannerRef.current = null;
      }
    }
  }, [isScannerActive, selectedCameraId]);

  const playBeepSound = (type: 'add' | 'error' | 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'add') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, ctx.currentTime); // high pleasant ping
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);

        // Quick high second beep for elegant double ping
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(950, ctx.currentTime + 0.04);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc2.start(ctx.currentTime + 0.04);
        osc2.stop(ctx.currentTime + 0.15);
      } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, ctx.currentTime); // double error bonk
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'success') {
        // dynamic cash register double ding
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5 high pleasant register
        gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn("Audio Context blocked or unsupported:", err);
    }
  };

  // Custom Toast State (To replace window.alert which is blocked in sandboxed iframes)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'warning') => {
    setToast({ message, type });
    // auto dismiss after 3 seconds
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  };

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Helper matching category icons
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils': return <Utensils size={14} />;
      case 'Coffee': return <Coffee size={14} />;
      case 'CupSoda': return <CupSoda size={14} />;
      case 'Cookie': return <Cookie size={14} />;
      default: return <Utensils size={14} />;
    }
  };

  // Filter local POS catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Calculations
  const calculations = useMemo(() => {
    let subTotal = 0;
    
    // Total price of elements
    cartItems.forEach(item => {
      subTotal += (getItemPrice(item) - item.discount) * item.qty;
    });

    // Subtotal discounts
    let discountTotal = couponDiscountNominal;
    if (couponDiscountPercent > 0) {
      discountTotal += (subTotal * (couponDiscountPercent / 100));
    }

    // Auto Member Level Discount
    let memberDiscountPercent = 0;
    if (selectedCustomer) {
      if (selectedCustomer.memberLevel === 'gold') {
        memberDiscountPercent = 5; // 5% discount
      } else if (selectedCustomer.memberLevel === 'platinum') {
        memberDiscountPercent = 10; // 10% discount
      }
    }
    if (memberDiscountPercent > 0) {
      discountTotal += (subTotal * (memberDiscountPercent / 100));
    }

    // Points discount (1 Point = Rp 100)
    let pointDiscount = 0;
    if (selectedCustomer && pointsToRedeem > 0) {
      pointDiscount = Math.min(selectedCustomer.points, pointsToRedeem) * 100;
      discountTotal += pointDiscount;
    }

    const netSubtotal = Math.max(0, subTotal - discountTotal);
    const taxRate = storeSettings.isTaxEnabled ? (storeSettings.taxPercentage / 100) : 0;
    const taxTotal = Math.round(netSubtotal * taxRate);
    const total = netSubtotal + taxTotal;

    return {
      subTotal,
      discountTotal,
      taxTotal,
      total,
      memberDiscountPercent,
      pointDiscount
    };
  }, [cartItems, couponDiscountPercent, couponDiscountNominal, storeSettings, selectedCustomer, pointsToRedeem]);

  // Change amount for cash payments
  const changeAmount = useMemo(() => {
    const pay = parseFloat(cashAmount) || 0;
    return Math.max(0, pay - calculations.total);
  }, [cashAmount, calculations.total]);

  // --- Real-time Customer Display Synchronization ---
  useEffect(() => {
    const displayState = {
      type: 'cart_update',
      cartItems: cartItems.map(item => ({
        name: item.product.name + (item.selectedTierIndex ? ` (${getItemTierName(item)})` : ''),
        qty: item.qty,
        price: getItemPrice(item),
        subtotal: (getItemPrice(item) - item.discount) * item.qty
      })),
      subTotal: calculations.subTotal,
      discountTotal: calculations.discountTotal,
      taxTotal: calculations.taxTotal,
      total: calculations.total,
      isCheckoutOpen,
      paymentMethod,
      cashAmount,
      changeAmount,
      qrisState
    };

    // 1. Dual Sync Safeguard: Write state to localStorage
    try {
      localStorage.setItem('kp_customer_display_state', JSON.stringify(displayState));
    } catch (e) {
      console.warn("Gagal menyimpan data display ke localStorage:", e);
    }

    // 2. Dual Sync Safeguard: Broadcast via BroadcastChannel
    try {
      const channel = new BroadcastChannel('kp_customer_display_channel');
      channel.postMessage(displayState);
      channel.close();
    } catch (e) {
      // BroadcastChannel unsupported or blocked, ignore
    }
  }, [cartItems, calculations, isCheckoutOpen, paymentMethod, cashAmount, changeAmount, qrisState]);

  // Fast cash presets helper
  const CASH_PRESETS = [10000, 20000, 50000, 100000, 200000];

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      showToast(`Stok untuk "${product.name}" kosong!`, 'warning');
      playBeepSound('error');
      return;
    }

    // Set clicked product visual flash
    setClickedProductId(product.id);
    if (activeTimeoutId) clearTimeout(activeTimeoutId);
    const tId = setTimeout(() => {
      setClickedProductId(null);
    }, 450);
    setActiveTimeoutId(tId);

    // Play pleasant ping sound feedback
    playBeepSound('add');

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast(`Tidak dapat membeli melebihi stok yang tersedia (${product.stock} pcs).`, 'warning');
          playBeepSound('error');
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { product, qty: 1, discount: 0 }];
      }
    });
  };

  const handleBarcodeScanned = (decodedText: string) => {
    const now = Date.now();
    // 1.5 seconds cooldown per unique scan code
    if (decodedText === lastScannedRef.current.text && (now - lastScannedRef.current.time) < 1500) {
      return;
    }
    lastScannedRef.current = { text: decodedText, time: now };

    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    // Search product in catalog by sku (case-insensitive)
    const foundProduct = products.find(p => p.sku.toLowerCase() === cleanCode.toLowerCase());

    if (foundProduct) {
      addToCart(foundProduct);
      showToast(`Scan sukses: ${foundProduct.name} ditambahkan!`, 'success');
    } else {
      playBeepSound('error');
      showToast(`SKU / Barcode "${cleanCode}" tidak terdaftar!`, 'warning');
    }
  };

  const updateCartQty = (productId: string, val: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(1, item.qty + val);
          if (newQty > item.product.stock) {
            showToast(`Jumlah melebihi stok gudang (${item.product.stock} pcs)`, 'warning');
            return item;
          }
          return { ...item, qty: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setCouponDiscountPercent(0);
    setCouponDiscountNominal(0);
    setPointsToRedeem(0);
  };

  // Save current cart as held/pending
  const handleHoldCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast('Keranjang belanja kosong!', 'warning');
      return;
    }
    if (!holdLabel.trim()) {
      showToast('Keterangan penahan (Meja, Nama, dsb) wajib diisi!', 'warning');
      return;
    }

    const newHeld = {
      id: `held-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: holdLabel.trim(),
      date: new Date().toISOString(),
      cartItems,
      selectedCustomer,
      couponDiscountPercent,
      couponDiscountNominal
    };

    const updated = [newHeld, ...heldCarts];
    setHeldCarts(updated);
    localStorage.setItem('kp_held_carts', JSON.stringify(updated));

    onLogActivity?.('Hold Transaksi', `Menyimpan sementara transaksi "${newHeld.label}" dengan ${cartItems.length} barang belanjaan.`);

    // Clear current POS active states
    setCartItems([]);
    setSelectedCustomer(null);
    setCouponDiscountPercent(0);
    setCouponDiscountNominal(0);
    setHoldLabel('');
    setIsHoldOpen(false);

    showToast(`Transaksi "${newHeld.label}" berhasil di-pending!`, 'success');
    playBeepSound('add');
  };

  // Restore a held cart back to active
  const handleRecallCart = (heldId: string) => {
    const target = heldCarts.find(h => h.id === heldId);
    if (!target) return;

    // Load states back
    setCartItems(target.cartItems);
    setSelectedCustomer(target.selectedCustomer);
    setCouponDiscountPercent(target.couponDiscountPercent);
    setCouponDiscountNominal(target.couponDiscountNominal);

    // Remove from held carts list
    const updated = heldCarts.filter(h => h.id !== heldId);
    setHeldCarts(updated);
    localStorage.setItem('kp_held_carts', JSON.stringify(updated));

    onLogActivity?.('Muat Pending', `Memuat kembali pending transaksi "${target.label}" dengan ${target.cartItems.length} barang.`);

    setIsHeldListOpen(false);
    showToast(`Memuat kembali transaksi "${target.label}"!`, 'success');
    playBeepSound('add');
  };

  // Delete a held cart permanently
  const handleDeleteHeldCart = (heldId: string, label: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pending transaksi "${label}"?`)) {
      const updated = heldCarts.filter(h => h.id !== heldId);
      setHeldCarts(updated);
      localStorage.setItem('kp_held_carts', JSON.stringify(updated));
      onLogActivity?.('Hapus Pending', `Menghapus pending transaksi "${label}" secara permanen.`);
      showToast(`Transaksi pending "${label}" telah dihapus.`, 'warning');
    }
  };

  // Submit complete transaction
  const handleFinalPayment = () => {
    if (cartItems.length === 0) return;
    
    // Debt payment method validation
    if (paymentMethod === 'debt' && !selectedCustomer) {
      showToast("Untuk metode Piutang / Bon, Anda wajib memilih pelanggan terlebih dahulu!", 'warning');
      playBeepSound('error');
      return;
    }

    // Cash amount safety validation
    if (paymentMethod === 'cash') {
      const parsedPaid = parseFloat(cashAmount) || 0;
      if (parsedPaid < calculations.total) {
        showToast("Nominal uang tunai pembayaran tidak mencukupi nilai Grand Total!", 'warning');
        playBeepSound('error');
        return;
      }
    }

    // Play pleasant cash register checkout double chime
    playBeepSound('success');

    const itemsSold: TransactionItem[] = cartItems.map(item => {
      const activePrice = getItemPrice(item);
      const tierName = getItemTierName(item);
      return {
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name + (item.selectedTierIndex ? ` (${tierName})` : ''),
        price: activePrice,
        costPrice: item.product.costPrice,
        qty: item.qty,
        discount: item.discount,
        total: (activePrice - item.discount) * item.qty,
        selectedTierIndex: item.selectedTierIndex ?? 0,
        selectedTierName: tierName
      };
    });

    const invoiceNumber = `INV/${new Date().toISOString().slice(0,10).replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`;

    const newTx: Transaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber,
      date: new Date().toISOString(),
      items: itemsSold,
      subTotal: calculations.subTotal,
      discountTotal: calculations.discountTotal,
      taxTotal: calculations.taxTotal,
      total: calculations.total,
      paymentMethod,
      cashAmount: paymentMethod === 'cash' ? (parseFloat(cashAmount) || calculations.total) : undefined,
      changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      pointsRedeemed: pointsToRedeem,
      pointsEarned: Math.floor(calculations.total / 10000)
    };

    // Broadcast checkout success to Customer Display
    const successEvent = {
      type: 'checkout_success',
      lastSuccessTx: {
        invoiceNumber,
        total: calculations.total,
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? (parseFloat(cashAmount) || calculations.total) : undefined,
        changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
        items: itemsSold.map(i => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
          total: i.total
        }))
      }
    };

    try {
      localStorage.setItem('kp_customer_display_state', JSON.stringify(successEvent));
    } catch (e) {
      console.warn("Gagal menyimpan event sukses ke localStorage:", e);
    }

    try {
      const channel = new BroadcastChannel('kp_customer_display_channel');
      channel.postMessage(successEvent);
      channel.close();
    } catch (e) {
      // ignore
    }

    onCheckoutSuccess(newTx);
    clearCart();
    setIsCheckoutOpen(false);
    setCashAmount('');
    setQrisState('waiting');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch max-w-7xl mx-auto p-2 h-full min-h-[calc(100vh-160px)] animate-fade-in relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl shadow-xl border flex items-center gap-2.5 bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/40 text-slate-800 dark:text-slate-100 min-w-[300px]"
          >
            <div className="p-1 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-500 dark:text-amber-400 shrink-0">
              <AlertTriangle size={15} />
            </div>
            <span className="text-xs font-bold leading-normal">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Catalog Pane: 2/3 Width */}
      <div className="flex-1 flex flex-col space-y-4">
        
        {/* Filters and search blocks */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
          <div className="flex gap-2.5 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk di katalog kasir..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <button
              onClick={() => setIsScannerActive(!isScannerActive)}
              className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isScannerActive 
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' 
                  : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
              }`}
              title={isScannerActive ? "Matikan Scanner Kamera" : "Aktifkan Scanner Kamera"}
            >
              <ScanBarcode size={14} />
              <span className="hidden sm:inline font-sans">{isScannerActive ? "Batal Scan" : "Scan Barcode"}</span>
            </button>
            
            <button
              onClick={() => {
                const url = window.location.origin + window.location.pathname + '?display=customer';
                window.open(url, '_blank', 'width=1024,height=768,location=no,status=no');
              }}
              className="p-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Buka Tampilan Pelanggan di Jendela Terpisah (Sangat bagus untuk monitor sekunder)"
            >
              <Monitor size={14} className="text-[#ef4444]" />
              <span className="hidden sm:inline font-sans">Display Pelanggan</span>
              <ExternalLink size={10} className="opacity-60" />
            </button>

            <button
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isSimulatorOpen 
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              title="Tampilkan / Sembunyikan panel simulasi display pelanggan langsung di layar ini"
            >
              <Tv size={14} />
              <span className="hidden sm:inline font-sans">{isSimulatorOpen ? "Tutup Simulasi" : "Simulasi Display"}</span>
            </button>

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFullscreen 
                    ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={isFullscreen ? "Keluar Layar Penuh" : "Aktifkan Layar Penuh"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden sm:inline font-sans">{isFullscreen ? "Layar Normal" : "Layar Penuh (F11)"}</span>
              </button>
            )}
          </div>

          {/* Horizonal categories selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 select-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-1.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[#ef4444] text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              ⭐ Semua
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.name)}
                className={`p-1.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === c.name ? 'bg-[#ef4444] text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {getCategoryIcon(c.icon)}
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Animated Barcode Scanner Camera Module */}
        <AnimatePresence>
          {isScannerActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-slate-900 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl relative shrink-0"
            >
              <div className="p-4 flex flex-col items-center">
                {/* Dynamic Camera Selector for multi-lens devices */}
                {cameras.length > 1 && (
                  <div className="w-full max-w-md mb-3 flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-300 font-bold uppercase shrink-0">Pilih Sensor Kamera:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="flex-1 bg-slate-900 text-white text-xs p-1 border border-slate-700 rounded-lg outline-hidden cursor-pointer font-semibold"
                    >
                      {cameras.map(cam => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Kamera ${cam.id.substring(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="w-full max-w-md bg-black rounded-xl overflow-hidden relative border border-slate-800 shadow-inner">
                  {/* Camera Target Scan Area */}
                  <div id="qr-reader" className="w-full h-48 sm:h-64 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
                  
                  {/* Custom Scanner Frame HUD Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                    <div className="flex justify-between w-full">
                      <div className="border-t-2 border-l-2 border-[#ef4444] w-6 h-6 rounded-tl-sm"></div>
                      <div className="border-t-2 border-r-2 border-[#ef4444] w-6 h-6 rounded-tr-sm"></div>
                    </div>
                    
                    {/* Pulsing Laser Barcode Line */}
                    <div className="w-[calc(100%-24px)] h-0.5 bg-[#ef4444] opacity-80 animate-pulse self-center my-auto shadow-[0_0_8px_#ef4444]"></div>
                    
                    <div className="flex justify-between w-full">
                      <div className="border-b-2 border-l-2 border-[#ef4444] w-6 h-6 rounded-bl-sm"></div>
                      <div className="border-b-2 border-r-2 border-[#ef4444] w-6 h-6 rounded-br-sm"></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-center space-y-1">
                  <p className="text-white text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    Kamera Aktif: Arahkan Barcode atau SKU Produk ke Area Scan
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Sistem akan memindai SKU secara otomatis dan memasukkan produk langsung ke keranjang belanja.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master POS Catalog product cards grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1 transition-all duration-300 ${isFullscreen ? 'max-h-[calc(100vh-220px)] lg:max-h-[calc(100vh-170px)]' : 'max-h-[500px]'}`}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.stock === 0;
            const isLowStock = p.stock > 0 && p.stock <= p.minStock;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`group bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer text-left relative overflow-hidden ${
                  isOutOfStock 
                    ? 'opacity-65 cursor-not-allowed border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/20' 
                    : p.id === clickedProductId
                      ? 'border-[#ef4444] ring-2 ring-[#ef4444]/30 bg-emerald-50/10 scale-95 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-xs active:scale-98'
                }`}
              >
                {/* Visual feedback overlay chime on click */}
                <AnimatePresence>
                  {p.id === clickedProductId && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#ef4444]/15 flex items-center justify-center backdrop-blur-[1px] z-20 pointer-events-none"
                    >
                      <span className="bg-[#ef4444] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 scale-105">
                        <Check size={12} className="stroke-[3]" />
                        +1 Keranjang
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Product Card Image Container */}
                <div className="h-28 bg-slate-50 dark:bg-slate-950/40 relative border-b border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {p.imageUrl ? (
                    <img src={getHighResImageUrl(p.imageUrl)} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-contain p-2 bg-white dark:bg-slate-900 group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="text-slate-300 dark:text-slate-600 flex flex-col items-center gap-1.5">
                      <Coffee size={24} className="opacity-40" />
                      <span className="text-[9px] font-mono lowercase tracking-wide font-medium">no image</span>
                    </div>
                  )}

                  {/* Out Of Stock overlay info badge */}
                  {isOutOfStock && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-150 text-red-700 font-bold text-[8px] rounded-full uppercase tracking-wider z-10">
                      Sold Out
                    </span>
                  )}

                  {/* Low Stock badge */}
                  {isLowStock && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 font-bold text-[8px] rounded-full flex items-center gap-0.5 z-10">
                      <AlertTriangle size={8} /> Restock
                    </span>
                  )}
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[9px] text-slate-400 font-mono tracking-wider">{p.sku}</span>
                      {((p.tier2Price && p.tier2Price > 0) || (p.tier3Price && p.tier3Price > 0) || (p.tier4Price && p.tier4Price > 0) || (p.tier5Price && p.tier5Price > 0)) && (
                        <span className="px-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[8px] rounded uppercase tracking-wider scale-90 origin-top-right">
                          Bertingkat
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 font-sans leading-snug group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.category}</p>
                  </div>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                      {formatIDR(p.price)}
                    </span>
                    
                    {/* Stock helper counter tag */}
                    <span className={`text-[9px] font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-400'}`}>
                      Stok: {p.stock}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-slate-100 rounded-2xl py-14 text-center text-slate-400 text-xs">
              Tidak ada produk kasir yang cocok dengan pencarian Anda.
            </div>
          )}
        </div>

        {/* Customer Display Live Simulator Device Frame */}
        <AnimatePresence>
          {isSimulatorOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="mt-6 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-900 overflow-hidden relative shadow-2xl p-4 lg:p-6 shrink-0"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">SIMULATOR DISPLAY PELANGGAN (LIVE)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-slate-800 text-slate-400 p-1 px-2.5 rounded-full font-bold">Sinkronisasi Instan</span>
                  <button
                    onClick={() => setIsSimulatorOpen(false)}
                    className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              
              {/* Live CustomerDisplay frame viewport */}
              <div className="rounded-2xl border border-slate-800 bg-black overflow-hidden relative shadow-inner max-h-[480px] overflow-y-auto">
                <CustomerDisplay storeSettings={storeSettings} />
              </div>
              
              <div className="mt-3 text-center text-[10px] text-slate-400">
                Panel ini menampilkan rincian belanja, metode pembayaran (QRIS/Tunai), rincian kembalian, serta promo berjalan secara real-time.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shopping Cart Sidebar Panel: 1/3 Width */}
      <div id="cart-section" className="w-full lg:w-[350px] bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs h-full min-h-[500px]">
        
        {/* Cart items list section */}
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-slate-800 dark:text-slate-200" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Keranjang Belanja</h3>
            </div>
            
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer transition-colors"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {/* Pending Transaksi Action Panel */}
          <div className="flex gap-2 select-none text-xs">
            {cartItems.length > 0 && (
              <button
                onClick={() => { setHoldLabel(''); setIsHoldOpen(true); }}
                className="flex-1 p-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Tahan keranjang transaksi ini"
              >
                <Lock size={12} /> Pending (Hold)
              </button>
            )}
            
            {heldCarts.length > 0 && (
              <button
                onClick={() => setIsHeldListOpen(true)}
                className="flex-1 p-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors animate-pulse"
                title="Buka daftar transaksi tertahan"
              >
                <RefreshCcw size={12} /> Muat Pending ({heldCarts.length})
              </button>
            )}
          </div>

          {/* Customer Selection Block */}
          <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-850 rounded-xl p-2.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Users size={13} className="text-[#ef4444]" /> Pelanggan / Member:
              </span>
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setPointsToRedeem(0); showToast('Pelanggan dilepas (Walk-in)', 'warning'); }}
                  className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md"
                  title="Ganti ke Pelanggan Umum"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-850 dark:text-slate-100">{selectedCustomer.name}</span>
                  <span className={`px-1.5 py-0.5 text-[8.5px] uppercase font-black rounded-full ${
                    selectedCustomer.memberLevel === 'platinum' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                    selectedCustomer.memberLevel === 'gold' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {selectedCustomer.memberLevel}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Poin: {selectedCustomer.points} pts</span>
                  {selectedCustomer.debt > 0 && <span className="text-red-600 dark:text-red-400 font-bold">Utang: Rp {selectedCustomer.debt.toLocaleString('id-ID')}</span>}
                </div>
                {calculations.memberDiscountPercent > 0 && (
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    🎉 Auto-diskon member {calculations.memberDiscountPercent}% diterapkan!
                  </p>
                )}
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  const found = customers.find(c => c.id === val);
                  if (found) {
                    setSelectedCustomer(found);
                    setPointsToRedeem(0);
                    showToast(`Pelanggan "${found.name}" terpilih!`, 'success');
                  }
                }}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold focus:outline-hidden"
              >
                <option value="">-- Pelanggan Umum (Walk-in) --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.memberLevel.toUpperCase()} - {c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-y-auto max-h-[250px] pr-1">
            <AnimatePresence initial={false}>
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, height: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9, y: -15, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    className="py-2.5 flex items-center justify-between text-xs gap-3 border-b border-slate-100 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug truncate">{item.product.name}</p>
                      {getAvailableTiers(item.product).length > 1 ? (
                        <select
                          value={item.selectedTierIndex ?? 0}
                          onChange={(e) => {
                            const idx = parseInt(e.target.value);
                            updateItemTier(item.product.id, idx);
                          }}
                          className="text-[10px] bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-md p-1 mt-1 font-bold cursor-pointer focus:outline-hidden max-w-full"
                        >
                          {getAvailableTiers(item.product).map((t) => (
                            <option key={t.index} value={t.index}>
                              {t.name}: {formatIDR(t.price)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatIDR(getItemPrice(item))} / pcs</p>
                      )}
                    </div>
                    
                    {/* Quantity and manipulation buttons */}
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => updateCartQty(item.product.id, -1)}
                        className="w-5 h-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors text-xs"
                      >
                        -
                      </button>
                      <span className="font-bold text-slate-800 dark:text-slate-200 min-w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, 1)}
                        className="w-5 h-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors text-xs"
                      >
                        +
                      </button>

                      {/* Delete Item from cart */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer transition-colors ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-14 text-slate-400 text-xs text-center"
                >
                  <ShoppingCart className="text-slate-300 mb-2" size={32} />
                  <p>Keranjang belanja kosong.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Tap produk pada katalog untuk ditambahkan.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Calculations and coupon section */}
        <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
          
          {/* Coupon discount input toggle */}
          {cartItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Percent size={12} className="text-blue-500" /> Diskon Potongan Nota
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 p-1 px-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/45">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">%</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={couponDiscountPercent || ''}
                    onChange={(e) => setCouponDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 px-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/45">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={couponDiscountNominal || ''}
                    onChange={(e) => setCouponDiscountNominal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Points Redemption block */}
          {cartItems.length > 0 && selectedCustomer && selectedCustomer.points > 0 && (
            <div className="space-y-1.5 p-2.5 bg-emerald-50/40 dark:bg-slate-950/20 border border-emerald-150/40 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 dark:text-[#ef4444] flex items-center gap-1">
                ⭐ Tukar Poin (Tersedia: {selectedCustomer.points} Pts)
              </span>
              <div className="flex gap-2 items-center text-xs">
                <input
                  type="number"
                  min="0"
                  max={selectedCustomer.points}
                  placeholder="Jumlah poin ditukar"
                  value={pointsToRedeem || ''}
                  onChange={(e) => {
                    const val = Math.min(selectedCustomer.points, Math.max(0, parseInt(e.target.value) || 0));
                    setPointsToRedeem(val);
                  }}
                  className="flex-1 p-1 px-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                />
                <div className="text-[10px] font-bold text-slate-500 shrink-0">
                  = {formatIDR(pointsToRedeem * 100)} diskon
                </div>
              </div>
              <div className="text-[8.5px] text-slate-400 dark:text-slate-500 italic">
                Setiap 1 Poin ditukar = potongan Rp 100 dari total bayar.
              </div>
            </div>
          )}

          {/* Pricing calculations metrics list */}
          <div className="space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-slate-800 dark:text-slate-200">{formatIDR(calculations.subTotal)}</span>
            </div>
            {calculations.discountTotal > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Total Diskon:</span>
                <span>-{formatIDR(calculations.discountTotal)}</span>
              </div>
            )}
            {calculations.pointDiscount !== undefined && calculations.pointDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-[#42a825] font-semibold">
                <span>Potongan Poin Loyalty:</span>
                <span>-{formatIDR(calculations.pointDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Pajak PPN (11%):</span>
              <span className="text-slate-800 dark:text-slate-200">{formatIDR(calculations.taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-black border-t border-slate-100 dark:border-slate-800 pt-2 grid-cols-2 text-slate-800 dark:text-slate-100">
              <span>GRAND TOTAL:</span>
              <span className="text-blue-600 dark:text-blue-400 text-lg">{formatIDR(calculations.total)}</span>
            </div>
          </div>

          <button
            onClick={() => cartItems.length > 0 && setIsCheckoutOpen(true)}
            disabled={cartItems.length === 0}
            className="w-full p-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:disabled:bg-slate-950/45 dark:disabled:text-slate-600"
          >
            <CreditCard size={16} />
            Metode Pembayaran & Bayar
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Global checkout drawer modal */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
            <div 
              id="checkout-payment-modal"
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col md:flex-row border border-slate-100 dark:border-slate-800 animate-fade-in"
            >
              
              {/* Left Column: Choose Payment Options */}
              <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 w-full md:w-[190px]">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Pilih Metode Bayar</h4>
                
                <div className="space-y-2">
                  <button
                    onClick={() => { setPaymentMethod('cash'); setCashAmount(''); }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${paymentMethod === 'cash' ? 'bg-slate-800 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <span>💵 Uang Tunai</span>
                    {paymentMethod === 'cash' && <Check size={12} />}
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('qris'); setQrisState('waiting'); }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${paymentMethod === 'qris' ? 'bg-slate-800 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <span>📊 QRIS Dinamis</span>
                    {paymentMethod === 'qris' && <Check size={12} />}
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('debt'); }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${paymentMethod === 'debt' ? 'bg-slate-800 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    title={selectedCustomer ? undefined : 'Pilih pelanggan terlebih dahulu untuk mencatat Piutang / Bon'}
                  >
                    <span>📓 Piutang / Bon</span>
                    {paymentMethod === 'debt' && <Check size={12} />}
                  </button>
                </div>
              </div>

              {/* Right Column: Checkout interactive dashboard */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Total Pembayaran</span>
                    <span className="font-black text-slate-800 dark:text-slate-100 text-base text-blue-600 dark:text-blue-400">{formatIDR(calculations.total)}</span>
                  </div>

                  {/* Cash Payment Mode details */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Nominal Uang Diterima</label>
                        <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-xl">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">IDR</span>
                          <input
                            type="number"
                            required
                            placeholder="Ketik jumlah uang..."
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            className="bg-transparent w-full text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Cash presets pills */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Uang Pas & Preset Cepat:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Exact Cash button */}
                          <button
                            onClick={() => setCashAmount(calculations.total.toString())}
                            className="p-1 px-2.5 bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-emerald-800 text-[10px] rounded-lg font-bold border border-[#ef4444]/20 transition-colors cursor-pointer"
                          >
                            Tepat Pas
                          </button>
                          {CASH_PRESETS.map((val) => {
                            if (val >= calculations.total) {
                              return (
                                <button
                                  key={val}
                                  onClick={() => setCashAmount(val.toString())}
                                  className="p-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded-lg font-semibold transition-colors cursor-pointer"
                                >
                                  {val.toLocaleString('id-ID')}
                                </button>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>

                      {/* Change calculation */}
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                          <span>Kembalian:</span>
                        </div>
                        <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                          {formatIDR(changeAmount)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* QRIS mode screen */}
                  {paymentMethod === 'qris' && (
                    <div className="flex flex-col items-center justify-center p-3 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-3.5">
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 relative flex flex-col items-center justify-center shadow-inner">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris://mitra-mandiri-kasir?amount=${calculations.total}`} 
                          alt="Dynamic QRIS Code" 
                          className="w-[110px] h-[110px] border border-slate-100 dark:border-slate-800"
                        />
                        <div className="text-[8px] tracking-wide text-slate-400 dark:text-slate-500 mt-2 font-mono uppercase font-bold text-center">
                          DYNAMIC QRIS SCANNER | EXPIRED IN 5:00
                        </div>
                      </div>

                      {/* Simulate Payment status buttons */}
                      {qrisState === 'waiting' ? (
                        <div className="text-center w-full space-y-2">
                          <p className="text-[10px] text-slate-500 italic block">Menunggu pelanggan memindai...</p>
                          <button
                            onClick={() => setQrisState('paid')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 px-4 text-[10px] rounded-lg font-bold cursor-pointer transition-colors w-full"
                          >
                            Simulasikan Bayar Sukses !
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-emerald-700 font-medium text-xs flex items-center justify-center gap-1">
                          <ShieldCheck size={16} />
                          <span>Dana QRIS Diterima! Nota siap dicetak.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Debt / Piutang Mode Details */}
                  {paymentMethod === 'debt' && (
                    <div className="p-3.5 border border-amber-100 dark:border-amber-950/55 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl space-y-2 text-xs">
                      <p className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Pencatatan Piutang / Bon Toko
                      </p>
                      {selectedCustomer ? (
                        <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                          <p>
                            Pelanggan terpilih: <strong className="text-slate-900 dark:text-slate-100">{selectedCustomer.name}</strong>
                          </p>
                          <p>
                            Metode ini akan mencatat piutang baru pada pelanggan sebesar <strong className="text-blue-600 dark:text-blue-400">{formatIDR(calculations.total)}</strong>.
                          </p>
                          <p className="text-[10px] text-slate-500 italic">
                            Loyalty points sebesar <strong>{Math.floor(calculations.total / 10000)} pts</strong> tetap akan diakumulasikan setelah transaksi dikonfirmasi.
                          </p>
                        </div>
                      ) : (
                        <p className="text-red-500 font-bold animate-pulse">
                          ⚠️ Peringatan: Anda belum memilih Pelanggan! Silakan pilih pelanggan di panel keranjang terlebih dahulu.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-850 pt-4 mt-6">
                  {/* Close payment button */}
                  <button
                    onClick={() => { setIsCheckoutOpen(false); setQrisState('waiting'); }}
                    className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>

                  {/* Confirm payoff checkout button */}
                  <button
                    onClick={handleFinalPayment}
                    disabled={paymentMethod === 'qris' && qrisState === 'waiting'}
                    className="flex-1 p-2.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-100 transition-all"
                  >
                    <ShieldCheck size={14} />
                    Konfirmasi Bayar Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: PENDING HOLD LABELLING DIALOG */}
      {isHoldOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-sm shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Lock size={15} className="text-amber-500" /> Pending Transaksi
              </h4>
              <button 
                onClick={() => setIsHoldOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleHoldCart} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Keterangan / Label Penahan</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Meja 4, Atas nama Roni, dsb..."
                  value={holdLabel}
                  onChange={(e) => setHoldLabel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-150 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400">Digunakan untuk memudahkan pencarian kembali saat transaksi dilanjutkan.</p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsHoldOpen(false)}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Simpan Pending
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECALL HELD CARTS LIST */}
      {isHeldListOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-lg shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <RefreshCcw size={15} className="text-blue-500 animate-spin" /> Daftar Transaksi Tertahan (Pending)
              </h4>
              <button 
                onClick={() => setIsHeldListOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {heldCarts.map((held) => {
                const totalQty = held.cartItems.reduce((acc, i) => acc + i.qty, 0);
                const totalAmount = held.cartItems.reduce((acc, item) => {
                  const idx = item.selectedTierIndex ?? 0;
                  const p = item.product;
                  let price = p.price;
                  if (idx === 1 && p.tier2Price) price = p.tier2Price;
                  else if (idx === 2 && p.tier3Price) price = p.tier3Price;
                  else if (idx === 3 && p.tier4Price) price = p.tier4Price;
                  else if (idx === 4 && p.tier5Price) price = p.tier5Price;
                  return acc + (price - item.discount) * item.qty;
                }, 0);

                return (
                  <div 
                    key={held.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between gap-4 hover:border-blue-400 dark:hover:border-blue-800/65 transition-colors text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-850 dark:text-slate-100 text-sm">{held.label}</span>
                        {held.selectedCustomer && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8.5px] rounded-full font-bold">
                            👤 {held.selectedCustomer.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Disimpan: {new Date(held.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({totalQty} pcs)
                      </p>
                      <p className="font-bold text-slate-600 dark:text-slate-400 text-[10px]">
                        Rincian: {held.cartItems.map(i => `${i.product.name} (x${i.qty})`).join(', ')}
                      </p>
                    </div>

                    <div className="text-right space-y-2 shrink-0">
                      <p className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{formatIDR(totalAmount)}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleDeleteHeldCart(held.id, held.label)}
                          className="p-1 px-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => handleRecallCart(held.id)}
                          className="p-1 px-3 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Muat Ulang
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsHeldListOpen(false)}
                className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Summary Indicator */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => {
              const cartElement = document.getElementById('cart-section');
              if (cartElement) {
                cartElement.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="w-full p-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded-2xl shadow-xl flex items-center justify-between transition-all active:scale-98 cursor-pointer border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 bg-white/20 rounded-xl shrink-0">
                <ShoppingCart size={18} />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs font-black">Keranjang Belanja</p>
                <p className="text-[10px] text-emerald-100 font-medium">Klik untuk checkout pesanan</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-xs font-black">{formatIDR(calculations.total)}</span>
              <ChevronDown size={14} className="animate-bounce" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
