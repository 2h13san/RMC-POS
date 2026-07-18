/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coffee, Sparkles, CheckCircle, CreditCard, ShoppingBag, 
  Smile, Coins, Clock, ArrowRight, Store, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreSettings } from '../types';

interface CustomerDisplayProps {
  storeSettings: StoreSettings;
}

interface DisplayState {
  type: 'cart_update' | 'checkout_success';
  cartItems: {
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }[];
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  isCheckoutOpen: boolean;
  paymentMethod: 'cash' | 'qris';
  cashAmount: string;
  changeAmount: number;
  qrisState: 'waiting' | 'paid';
  lastSuccessTx?: {
    invoiceNumber: string;
    total: number;
    paymentMethod: 'cash' | 'qris';
    cashAmount?: number;
    changeAmount?: number;
    items: { name: string; qty: number; price: number; total: number }[];
  };
}

export default function CustomerDisplay({ storeSettings }: CustomerDisplayProps) {
  const [state, setState] = useState<DisplayState | null>(null);
  const [successTx, setSuccessTx] = useState<DisplayState['lastSuccessTx'] | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [successCountdown, setSuccessCountdown] = useState<number>(0);

  // Rotate welcome greeting/promos on idle screen
  const [promoIndex, setPromoIndex] = useState(0);
  const promos = useMemo(() => [
    { title: "Kopi Terbaik Untuk Hari Anda", text: "Dibuat langsung dari biji kopi pilihan nusantara beraroma tinggi." },
    { title: "Diskon 10% Untuk Pelanggan Setia", text: "Dapatkan promo menarik di hari ulang tahun Anda dengan menunjukkan kartu identitas." },
    { title: "Cobain Cemilan Baru Kami!", text: "Padukan kopi hangat Anda dengan Croissant gurih yang dipanggang segar setiap pagi." },
    { title: "Bayar Praktis via QRIS", text: "Mendukung semua pembayaran e-wallet dan mobile banking kesayangan Anda." }
  ], []);

  // Update Clock & Promos
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const promoTimer = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % promos.length);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(promoTimer);
    };
  }, [promos.length]);

  // Sync mechanisms: BroadcastChannel + LocalStorage Dual Sync Safeguard
  useEffect(() => {
    // 1. Listen via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kp_customer_display_channel');
      channel.onmessage = (event) => {
        const data = event.data as DisplayState;
        if (data) {
          handleReceivedState(data);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported or blocked, relying on storage fallback:", e);
    }

    // 2. Listen via LocalStorage fallback (storage event triggers across different tabs)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'kp_customer_display_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as DisplayState;
          if (parsed) {
            handleReceivedState(parsed);
          }
        } catch (err) {
          console.error("Failed to parse storage synced display state:", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Initial check on load
    const saved = localStorage.getItem('kp_customer_display_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DisplayState;
        if (parsed) {
          handleReceivedState(parsed);
        }
      } catch (err) {
        // ignore
      }
    }

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const handleReceivedState = (data: DisplayState) => {
    if (data.type === 'checkout_success' && data.lastSuccessTx) {
      setSuccessTx(data.lastSuccessTx);
      setSuccessCountdown(8); // Show checkout success card for 8 seconds
      // Clear local state cart elements so next screens start fresh
      setState(null);
    } else {
      setState(data);
      // If we are getting active updates, dismiss success screen immediately
      setSuccessTx(null);
      setSuccessCountdown(0);
    }
  };

  // Checkout Success Countdown timer
  useEffect(() => {
    if (successCountdown > 0) {
      const timer = setTimeout(() => {
        setSuccessCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (successCountdown === 0 && successTx) {
      // Revert to welcome screen after countdown finishes
      setSuccessTx(null);
    }
  }, [successCountdown, successTx]);

  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Render variables helper
  const storeName = storeSettings?.name || "KASIR PINTAR";
  const hasItemsInCart = state && state.cartItems && state.cartItems.length > 0;
  const isCheckoutMode = state?.isCheckoutOpen;

  // --- RENDERING 1: CHECKOUT SUCCESS SCREEN ---
  if (successTx) {
    const received = successTx.cashAmount || successTx.total;
    const change = successTx.changeAmount || 0;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Accents */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center"
        >
          {/* Header check icon */}
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-6 animate-bounce">
            <CheckCircle size={44} />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">TRANSAKSI BERHASIL!</h2>
          <p className="text-slate-400 text-sm mt-1">Terima kasih atas pesanan dan kunjungan Anda di <strong className="text-slate-200">{storeName}</strong></p>

          <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-6 my-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">No. Invoice</span>
              <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{successTx.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Metode Pembayaran</span>
              <p className="text-sm font-bold text-slate-200 mt-0.5 uppercase">
                {successTx.paymentMethod === 'cash' ? '💵 Uang Tunai' : '📊 QRIS Dinamis'}
              </p>
            </div>
            
            <div className="border-t border-slate-800/80 pt-3 md:col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Belanja</span>
                <p className="text-xl font-extrabold text-blue-400">{formatIDR(successTx.total)}</p>
              </div>

              {successTx.paymentMethod === 'cash' && (
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Kembalian</span>
                  <p className="text-2xl font-black text-emerald-400">{formatIDR(change)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 w-full">
            <p className="text-xs text-slate-500 font-medium">Harap ambil struk bukti pembayaran fisik Anda di kasir.</p>
            
            {/* Visual Progress Countdown */}
            <div className="w-full max-w-xs mx-auto bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 8, ease: "linear" }}
                className="bg-emerald-500 h-full"
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-bold font-mono">
              Kembali ke Layar Utama dalam {successCountdown} detik
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- RENDERING 2: ACTIVE CHECKOUT SCREEN ---
  if (hasItemsInCart && isCheckoutMode) {
    const totalAmount = state?.total || 0;
    const isQris = state?.paymentMethod === 'qris';
    const parsedPaid = parseFloat(state?.cashAmount || '') || 0;
    const changeDue = Math.max(0, parsedPaid - totalAmount);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
        {/* Animated Background Accents */}
        <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-500/10 rounded-full blur-[100px]" />

        {/* Store Header bar */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#78c953] text-white rounded-xl flex items-center justify-center shadow-md">
              <Store size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase">{storeName}</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">Sistem Pembayaran Pelanggan</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-300">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Core Payment Board Workspace */}
        <main className="flex-1 my-8 flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10 max-w-6xl mx-auto w-full">
          
          {/* Left Block: Payment Mode details */}
          <div className="w-full lg:flex-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <span className="p-1 px-3 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-full uppercase tracking-wider mb-4 inline-block">
                Metode Pembayaran
              </span>

              {isQris ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <CreditCard size={24} className="text-blue-400" />
                    PEMBAYARAN QRIS DINAMIS
                  </h2>
                  <p className="text-slate-400 text-xs">
                    Silakan gunakan e-wallet (GoPay, OVO, Dana, LinkAja) atau Mobile Banking Anda untuk memindai kode QRIS di samping.
                  </p>
                  
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 flex items-center gap-4">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-200">Menunggu Pembayaran...</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Sistem akan segera mencetak nota setelah pembayaran sukses terverifikasi.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Coins size={24} className="text-emerald-400" />
                    PEMBAYARAN TUNAI / CASH
                  </h2>
                  <p className="text-slate-400 text-xs">
                    Silakan berikan uang tunai kepada petugas kasir untuk memproses transaksi belanja Anda.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Uang Diterima */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black block">Uang Diserahkan</span>
                      <p className="text-lg font-bold text-slate-200 mt-1">
                        {parsedPaid > 0 ? formatIDR(parsedPaid) : "Menunggu Petugas..."}
                      </p>
                    </div>

                    {/* Kembalian Anda */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black block">Kembalian Anda</span>
                      <p className={`text-xl font-black mt-1 ${changeDue > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                        {parsedPaid >= totalAmount ? formatIDR(changeDue) : "Rp 0"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Block: Bill Details QR Code & Giant Subtotals */}
          <div className="w-full max-w-sm shrink-0 flex flex-col gap-6">
            
            {/* If QRIS - Display code frame */}
            {isQris && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                <div className="bg-white p-4 rounded-2xl shadow-inner relative flex flex-col items-center justify-center border border-slate-100">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=qris://mitra-mandiri-kasir?amount=${totalAmount}`} 
                    alt="Dynamic QRIS Code" 
                    className="w-[140px] h-[140px]"
                  />
                  <div className="text-[8px] tracking-widest text-slate-400 font-mono mt-2 uppercase font-black">
                    QRIS DINAMIS • MITRA MANDIRI
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-black font-mono mt-3">PROSES SECARA REAL-TIME</span>
              </div>
            )}

            {/* Price tag summary board */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black block mb-1">Total yang Harus Dibayar</span>
              <p className="text-3xl font-black text-blue-400 tracking-tight">{formatIDR(totalAmount)}</p>

              <div className="border-t border-slate-800/80 pt-3.5 mt-3.5 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span className="text-slate-200">{formatIDR(state?.subTotal || 0)}</span>
                </div>
                {state && state.discountTotal > 0 && (
                  <div className="flex justify-between font-bold text-red-400">
                    <span>Diskon Nota:</span>
                    <span>-{formatIDR(state.discountTotal)}</span>
                  </div>
                )}
                {state && state.taxTotal > 0 && (
                  <div className="flex justify-between font-medium">
                    <span>PPN (11%):</span>
                    <span className="text-slate-200">{formatIDR(state.taxTotal)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>

        <footer className="border-t border-slate-850 pt-3 text-center text-[10px] text-slate-500 relative z-10 font-bold uppercase tracking-wider flex flex-col sm:flex-row justify-between gap-2">
          <span>Stasiun Kasir #01 • {storeName}</span>
          <span>Sistem Pembayaran Terpadu</span>
        </footer>
      </div>
    );
  }

  // --- RENDERING 3: ACTIVE CART DISPLAY SCREEN (Left: Items list, Right: Live bill summary) ---
  if (hasItemsInCart) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
        {/* Animated Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]" />

        {/* Store Header bar */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-4 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#78c953] text-white rounded-xl flex items-center justify-center shadow-md">
              <Store size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase">{storeName}</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">Tampilan Rincian Belanja Pelanggan</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-3">
            <span className="hidden sm:inline-block p-1 px-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse">
              Sedang Dilayani Kasir
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Side-by-Side Splitscreen Workspace */}
        <main className="flex-1 my-6 flex flex-col lg:flex-row items-stretch gap-6 relative z-10 overflow-hidden">
          
          {/* Left panel: List of items in the cart */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col min-h-[300px] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0">
              <ShoppingBag size={16} className="text-slate-400" />
              <h2 className="font-extrabold text-sm text-slate-200">Daftar Barang Belanjaan</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[calc(100vh-280px)]">
              <AnimatePresence initial={false}>
                {state.cartItems.map((item, idx) => (
                  <motion.div
                    key={item.name + idx}
                    initial={{ opacity: 0, x: -15, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850/80 flex items-center justify-between text-xs transition-all gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-200 text-sm truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">{formatIDR(item.price)} / pcs</p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 font-extrabold">Qty: <span className="text-white font-black text-sm">{item.qty}</span></p>
                      <p className="text-xs font-extrabold text-blue-400 mt-0.5">{formatIDR(item.subtotal)}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Right panel: Active subtotal/pricing breakdown */}
          <div className="w-full lg:w-[360px] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between shrink-0">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black block mb-1">Status Belanja</span>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex items-center gap-3 mb-6">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <p className="text-[10px] font-black text-slate-200 uppercase tracking-wide">Petugas sedang menambahkan item...</p>
              </div>

              {/* Breakdown detail rows */}
              <div className="space-y-3.5 text-xs text-slate-400 border-b border-slate-800 pb-5 mb-5">
                <div className="flex justify-between">
                  <span>Subtotal Belanja:</span>
                  <span className="text-slate-200 font-bold">{formatIDR(state.subTotal)}</span>
                </div>
                {state.discountTotal > 0 && (
                  <div className="flex justify-between text-red-400 font-bold">
                    <span>Total Diskon Nota:</span>
                    <span>-{formatIDR(state.discountTotal)}</span>
                  </div>
                )}
                {state.taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak PPN (11%):</span>
                    <span className="text-slate-200 font-bold">{formatIDR(state.taxTotal)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Big grand total card */}
            <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-black block mb-1">Grand Total Belanja Anda</span>
              <p className="text-3xl font-black text-blue-400 tracking-tight leading-none mt-1">{formatIDR(state.total)}</p>
            </div>
          </div>

        </main>

        <footer className="border-t border-slate-850 pt-3 text-center text-[10px] text-slate-500 relative z-10 font-bold uppercase tracking-wider flex flex-col sm:flex-row justify-between gap-2 shrink-0">
          <span>Stasiun Kasir #01 • {storeName}</span>
          <span>Sistem Pembayaran Terpadu</span>
        </footer>
      </div>
    );
  }

  // --- RENDERING 4: IDLE/WELCOME SCREEN WITH FOOD PROMOS & DATE-TIME ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
      {/* Immersive Decorative Orbs */}
      <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-indigo-500/10 rounded-full blur-[140px] animate-pulse" />

      {/* Header bar */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-[#78c953] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Store size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white uppercase">{storeName}</h1>
            <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-0.5 leading-none">Mitra Mandiri Kasir Pro</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-200">Stasiun #01</p>
          <p className="text-[9px] text-[#78c953] font-bold mt-0.5 flex items-center justify-end gap-1 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> ONLINE
          </p>
        </div>
      </header>

      {/* Main Promo / Welcome stage */}
      <main className="flex-1 my-6 flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full relative z-10">
        
        <div className="space-y-6">
          {/* Welcome animations with coffee icon */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 text-[#78c953] flex items-center justify-center shadow-xl mb-4 relative">
            <div className="absolute inset-0 border border-dashed border-[#78c953]/20 rounded-3xl animate-spin [animation-duration:15s]" />
            <Coffee size={40} className="relative z-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">SELAMAT DATANG</h2>
            <p className="text-sm text-slate-400 font-medium">Petugas kami siap melayani pesanan Anda dengan sepenuh hati.</p>
          </div>

          {/* Dynamic rotating banner slide */}
          <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl relative overflow-hidden text-left shadow-lg max-w-lg mx-auto">
            <div className="absolute top-3 right-3 text-[#78c953]/30">
              <Gift size={24} />
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={promoIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-1"
              >
                <h3 className="text-xs font-black text-[#78c953] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={11} />
                  PROMO & INFORMASI HARI INI
                </h3>
                <h4 className="text-sm font-extrabold text-slate-200 mt-1 leading-tight">{promos[promoIndex].title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1.5">{promos[promoIndex].text}</p>
              </motion.div>
            </AnimatePresence>

            {/* Slider dots indicators */}
            <div className="flex gap-1.5 mt-4 justify-end">
              {promos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPromoIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === promoIndex ? 'w-4 bg-[#78c953]' : 'w-1.5 bg-slate-700 hover:bg-slate-500'}`}
                />
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Clock & Status footer bar */}
      <footer className="border-t border-slate-850 pt-4 relative z-10 flex flex-col md:flex-row justify-between items-center gap-3.5 shrink-0">
        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider text-center md:text-left">
          <span>Stasiun Kasir #01 • {storeName}</span>
          <p className="text-[9px] text-slate-600 font-semibold mt-0.5">Sistem Kasir Pintar Digital Bersertifikat</p>
        </div>

        {/* Grand Date & Clock card */}
        <div className="bg-slate-900 border border-slate-850 p-2.5 px-5 rounded-2xl flex items-center gap-4 text-left shadow-md">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider border-r border-slate-850 pr-4">
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-[#78c953]" />
              <span>Tanggal</span>
            </div>
            <p className="text-xs text-slate-200 font-extrabold mt-0.5">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block">Jam Operasional</span>
            <span className="text-base font-mono font-black text-[#78c953] tracking-wider">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
