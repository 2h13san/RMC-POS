/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, AlertTriangle, Calendar, DollarSign, Trash2, 
  X, Check, ClipboardList, Truck, RotateCcw, ArrowLeftRight, FileText
} from 'lucide-react';
import { Product, Supplier, Purchase, PurchaseReturn, User } from '../types';

interface PurchaseManagerProps {
  products: Product[];
  onUpdateProducts: (p: Product[]) => void;
  suppliers: Supplier[];
  onUpdateSuppliers: (s: Supplier[]) => void;
  purchases: Purchase[];
  onUpdatePurchases: (p: Purchase[]) => void;
  purchaseReturns: PurchaseReturn[];
  onUpdatePurchaseReturns: (pr: PurchaseReturn[]) => void;
  currentUser: User;
}

export default function PurchaseManager({
  products,
  onUpdateProducts,
  suppliers,
  onUpdateSuppliers,
  purchases,
  onUpdatePurchases,
  purchaseReturns,
  onUpdatePurchaseReturns,
  currentUser
}: PurchaseManagerProps) {
  // Sub-tabs: 'purchases' | 'returns' | 'suppliers'
  const [subTab, setSubTab] = useState<'purchases' | 'returns' | 'suppliers'>('purchases');
  
  // Search terms
  const [searchPurchase, setSearchPurchase] = useState('');
  const [searchReturn, setSearchReturn] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');

  // Modals / Forms visibility
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [isReturnFormOpen, setIsReturnFormOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<Purchase | null>(null);
  const [selectedReturnDetails, setSelectedReturnDetails] = useState<PurchaseReturn | null>(null);

  // Supplier Form State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Pay Debt Form State
  const [selectedSupplierForDebt, setSelectedSupplierForDebt] = useState<Supplier | null>(null);
  const [payDebtAmount, setPayDebtAmount] = useState<number>(0);

  // New Purchase Form State
  const [pSupplierId, setPSupplierId] = useState('');
  const [pPaymentStatus, setPPaymentStatus] = useState<'paid' | 'debt'>('paid');
  const [pCart, setPCart] = useState<{ product: Product; qty: number; costPrice: number }[]>([]);
  const [pSearchProductTerm, setPSearchProductTerm] = useState('');

  // New Return Form State
  const [rSupplierId, setRSupplierId] = useState('');
  const [rPurchaseId, setRPurchaseId] = useState('');
  const [rRefundType, setRRefundType] = useState<'potong_hutang' | 'tunai'>('potong_hutang');
  const [rNotes, setRNotes] = useState('');
  const [rCart, setRCart] = useState<{ productId: string; sku: string; name: string; costPrice: number; originalQty: number; returnQty: number }[]>([]);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper: Format to IDR Currency
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Filter lists
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
      s.phone.includes(searchSupplier)
    );
  }, [suppliers, searchSupplier]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => 
      p.purchaseNumber.toLowerCase().includes(searchPurchase.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchPurchase.toLowerCase())
    );
  }, [purchases, searchPurchase]);

  const filteredReturns = useMemo(() => {
    return purchaseReturns.filter(r => 
      r.returnNumber.toLowerCase().includes(searchReturn.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchReturn.toLowerCase()) ||
      r.purchaseNumber.toLowerCase().includes(searchReturn.toLowerCase())
    );
  }, [purchaseReturns, searchReturn]);

  // Product list for purchase search
  const availableProductsForPurchase = useMemo(() => {
    if (!pSearchProductTerm) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(pSearchProductTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(pSearchProductTerm.toLowerCase())
    ).slice(0, 5);
  }, [products, pSearchProductTerm]);

  // Purchases filtered by supplier for Return select dropdown
  const selectedSupplierPurchases = useMemo(() => {
    if (!rSupplierId) return [];
    return purchases.filter(p => p.supplierId === rSupplierId);
  }, [purchases, rSupplierId]);

  // Handle supplier submission
  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      showToast('Nama dan nomor telepon wajib diisi!', 'warning');
      return;
    }

    if (editingSupplier) {
      const updated = suppliers.map(s => s.id === editingSupplier.id ? { ...s, name: supName, phone: supPhone, address: supAddress } : s);
      onUpdateSuppliers(updated);
      showToast('Informasi supplier berhasil diperbarui!');
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name: supName,
        phone: supPhone,
        address: supAddress,
        debt: 0
      };
      onUpdateSuppliers([newSup, ...suppliers]);
      showToast('Supplier baru berhasil ditambahkan!');
    }

    setIsSupplierFormOpen(false);
    setEditingSupplier(null);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
  };

  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setIsSupplierFormOpen(true);
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupPhone(s.phone);
    setSupAddress(s.address);
    setIsSupplierFormOpen(true);
  };

  // Handle paying debt to supplier
  const handlePayDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForDebt) return;
    if (payDebtAmount <= 0) {
      showToast('Jumlah pembayaran harus lebih besar dari 0!', 'warning');
      return;
    }
    if (payDebtAmount > selectedSupplierForDebt.debt) {
      showToast('Jumlah pembayaran melebihi saldo hutang!', 'warning');
      return;
    }

    const updated = suppliers.map(s => {
      if (s.id === selectedSupplierForDebt.id) {
        return { ...s, debt: s.debt - payDebtAmount };
      }
      return s;
    });

    onUpdateSuppliers(updated);
    showToast(`Pembayaran hutang sebesar ${formatIDR(payDebtAmount)} ke ${selectedSupplierForDebt.name} berhasil dicatat!`);
    setIsPayDebtOpen(false);
    setSelectedSupplierForDebt(null);
    setPayDebtAmount(0);
  };

  // Purchase Cart actions
  const addToPurchaseCart = (p: Product) => {
    const existing = pCart.find(item => item.product.id === p.id);
    if (existing) {
      setPCart(pCart.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setPCart([...pCart, { product: p, qty: 1, costPrice: p.costPrice || 0 }]);
    }
    setPSearchProductTerm('');
  };

  const removeFromPurchaseCart = (productId: string) => {
    setPCart(pCart.filter(item => item.product.id !== productId));
  };

  const updatePurchaseCartQty = (productId: string, qty: number) => {
    if (qty <= 0) return;
    setPCart(pCart.map(item => item.product.id === productId ? { ...item, qty } : item));
  };

  const updatePurchaseCartCost = (productId: string, costPrice: number) => {
    if (costPrice < 0) return;
    setPCart(pCart.map(item => item.product.id === productId ? { ...item, costPrice } : item));
  };

  // Handle Purchase Submit
  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pSupplierId) {
      showToast('Pilih supplier terlebih dahulu!', 'warning');
      return;
    }
    if (pCart.length === 0) {
      showToast('Keranjang pembelian masih kosong!', 'warning');
      return;
    }

    const supplier = suppliers.find(s => s.id === pSupplierId);
    if (!supplier) return;

    const total = pCart.reduce((sum, item) => sum + (item.qty * item.costPrice), 0);

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      purchaseNumber: `PO/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: pCart.map(item => ({
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        costPrice: item.costPrice,
        qty: item.qty,
        total: item.qty * item.costPrice
      })),
      total,
      paymentStatus: pPaymentStatus
    };

    // Update Product Stock and buying cost price in main database
    const updatedProducts = products.map(p => {
      const purchased = pCart.find(item => item.product.id === p.id);
      if (purchased) {
        return {
          ...p,
          stock: p.stock + purchased.qty,
          costPrice: purchased.costPrice // Automatically adjust default costPrice to latest purchase price
        };
      }
      return p;
    });

    // If paymentStatus is 'debt', add to supplier's debt balance
    const updatedSuppliers = suppliers.map(s => {
      if (s.id === supplier.id && pPaymentStatus === 'debt') {
        return { ...s, debt: s.debt + total };
      }
      return s;
    });

    onUpdateProducts(updatedProducts);
    onUpdateSuppliers(updatedSuppliers);
    onUpdatePurchases([newPurchase, ...purchases]);

    showToast(`Pembelian ${newPurchase.purchaseNumber} berhasil disimpan! Stok produk disesuaikan.`);
    setIsPurchaseFormOpen(false);
    setPCart([]);
    setPSupplierId('');
    setPPaymentStatus('paid');
  };

  // Handle selecting a purchase to return
  const handleSelectPurchaseToReturn = (purchaseId: string) => {
    setRPurchaseId(purchaseId);
    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase) {
      setRCart(purchase.items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        costPrice: item.costPrice,
        originalQty: item.qty,
        returnQty: 0
      })));
    } else {
      setRCart([]);
    }
  };

  const updateReturnQty = (productId: string, returnQty: number, maxQty: number) => {
    if (returnQty < 0) return;
    if (returnQty > maxQty) {
      showToast(`Jumlah retur melebihi jumlah pembelian (${maxQty})!`, 'warning');
      return;
    }
    setRCart(rCart.map(item => item.productId === productId ? { ...item, returnQty } : item));
  };

  // Handle Return Submit (Core Logic!)
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rSupplierId) {
      showToast('Pilih supplier terlebih dahulu!', 'warning');
      return;
    }
    if (!rPurchaseId) {
      showToast('Pilih nota pembelian yang akan diretur!', 'warning');
      return;
    }

    const activeReturns = rCart.filter(item => item.returnQty > 0);
    if (activeReturns.length === 0) {
      showToast('Isi jumlah retur pada minimal satu item!', 'warning');
      return;
    }

    const supplier = suppliers.find(s => s.id === rSupplierId);
    const originalPurchase = purchases.find(p => p.id === rPurchaseId);
    if (!supplier || !originalPurchase) return;

    const totalRefund = activeReturns.reduce((sum, item) => sum + (item.returnQty * item.costPrice), 0);

    // If refundType is potong_hutang, ensure supplier has enough debt to cover, or deduct all available debt
    if (rRefundType === 'potong_hutang' && supplier.debt === 0) {
      showToast(`Supplier ${supplier.name} tidak memiliki saldo hutang untuk dipotong. Silakan pilih Refund Tunai.`, 'warning');
      return;
    }

    const newReturn: PurchaseReturn = {
      id: `ret-${Date.now()}`,
      returnNumber: `RET-PO/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`,
      purchaseId: originalPurchase.id,
      purchaseNumber: originalPurchase.purchaseNumber,
      date: new Date().toISOString(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: activeReturns.map(item => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        costPrice: item.costPrice,
        qty: item.returnQty,
        total: item.returnQty * item.costPrice
      })),
      total: totalRefund,
      refundType: rRefundType,
      notes: rNotes
    };

    // Auto-adjust Product Stocks (Decrease since we return goods to supplier)
    const updatedProducts = products.map(p => {
      const returned = activeReturns.find(item => item.productId === p.id);
      if (returned) {
        return {
          ...p,
          stock: Math.max(0, p.stock - returned.returnQty) // prevent negative stocks
        };
      }
      return p;
    });

    // Auto-adjust Supplier Debt balance if 'potong_hutang'
    const updatedSuppliers = suppliers.map(s => {
      if (s.id === supplier.id && rRefundType === 'potong_hutang') {
        return {
          ...s,
          debt: Math.max(0, s.debt - totalRefund) // decrease our debt to supplier
        };
      }
      return s;
    });

    onUpdateProducts(updatedProducts);
    onUpdateSuppliers(updatedSuppliers);
    onUpdatePurchaseReturns([newReturn, ...purchaseReturns]);

    showToast(`Retur ${newReturn.returnNumber} berhasil disimpan! Stok & Hutang disesuaikan secara otomatis.`);
    setIsReturnFormOpen(false);
    setRSupplierId('');
    setRPurchaseId('');
    setRCart([]);
    setRNotes('');
    setRRefundType('potong_hutang');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert overlay */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 p-3.5 px-5 bg-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-in text-xs font-bold">
          <span className={toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}>
            {toast.type === 'success' ? '✓' : '⚠️'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header section with tab navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Truck className="text-[#ef4444]" size={22} /> Pembelian & Supplier
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Kelola transaksi pembelian, pengembalian barang (retur) ke supplier, stok, serta penyesuaian saldo hutang toko.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex gap-1 border border-slate-200/50 dark:border-slate-800 shrink-0 self-start md:self-center">
          <button
            onClick={() => setSubTab('purchases')}
            className={`p-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${subTab === 'purchases' ? 'bg-[#ef4444] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <ClipboardList size={13} /> Pembelian
          </button>
          <button
            onClick={() => setSubTab('returns')}
            className={`p-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${subTab === 'returns' ? 'bg-[#ef4444] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <RotateCcw size={13} /> Retur Pembelian
          </button>
          <button
            onClick={() => setSubTab('suppliers')}
            className={`p-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${subTab === 'suppliers' ? 'bg-[#ef4444] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Truck size={13} /> Supplier
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PURCHASES */}
      {subTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Cari nota, supplier..."
                value={searchPurchase}
                onChange={(e) => setSearchPurchase(e.target.value)}
                className="w-full pl-9 p-2 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#ef4444]/25 focus:border-[#ef4444]"
              />
            </div>

            {/* Action buttons */}
            {['owner', 'admin'].includes(currentUser.role) && (
              <button
                onClick={() => {
                  setPCart([]);
                  setPSupplierId('');
                  setPPaymentStatus('paid');
                  setIsPurchaseFormOpen(true);
                }}
                className="p-2 px-4 bg-[#ef4444] hover:bg-[#67b444] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus size={14} /> Catat Pembelian Baru
              </button>
            )}
          </div>

          {/* Purchases Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[10px] tracking-wider select-none">
                    <th className="p-4">No. PO / Pembelian</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Total Belanja</th>
                    <th className="p-4">Metode Bayar</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                  {filteredPurchases.length > 0 ? (
                    filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 font-black text-slate-850 dark:text-slate-100">{purchase.purchaseNumber}</td>
                        <td className="p-4 font-bold text-slate-500 dark:text-slate-500">
                          {new Date(purchase.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 font-bold">{purchase.supplierName}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {purchase.items.length} macam ({purchase.items.reduce((sum, i) => sum + i.qty, 0)} pcs)
                        </td>
                        <td className="p-4 font-black text-slate-850 dark:text-slate-100">{formatIDR(purchase.total)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${purchase.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'}`}>
                            {purchase.paymentStatus === 'paid' ? 'Lunas' : 'Hutang / Bon'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedPurchaseDetails(purchase)}
                            className="p-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500 select-none">
                        Tidak ada transaksi pembelian yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RETURNS */}
      {subTab === 'returns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Cari retur, nota, supplier..."
                value={searchReturn}
                onChange={(e) => setSearchReturn(e.target.value)}
                className="w-full pl-9 p-2 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#ef4444]/25 focus:border-[#ef4444]"
              />
            </div>

            {/* Action buttons */}
            {['owner', 'admin'].includes(currentUser.role) && (
              <button
                onClick={() => {
                  setRSupplierId('');
                  setRPurchaseId('');
                  setRCart([]);
                  setRNotes('');
                  setRRefundType('potong_hutang');
                  setIsReturnFormOpen(true);
                }}
                className="p-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus size={14} /> Catat Retur Pembelian
              </button>
            )}
          </div>

          {/* Returns Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[10px] tracking-wider select-none">
                    <th className="p-4">No. Retur</th>
                    <th className="p-4">Asal Nota PO</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Barang Diretur</th>
                    <th className="p-4">Nilai Pengembalian</th>
                    <th className="p-4">Kompensasi</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                  {filteredReturns.length > 0 ? (
                    filteredReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 font-black text-amber-600 dark:text-amber-400">{ret.returnNumber}</td>
                        <td className="p-4 font-bold text-slate-500 dark:text-slate-400">{ret.purchaseNumber}</td>
                        <td className="p-4 font-bold text-slate-500 dark:text-slate-500">
                          {new Date(ret.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 font-bold">{ret.supplierName}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {ret.items.length} macam ({ret.items.reduce((sum, i) => sum + i.qty, 0)} pcs)
                        </td>
                        <td className="p-4 font-black text-slate-850 dark:text-slate-100">{formatIDR(ret.total)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${ret.refundType === 'potong_hutang' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                            {ret.refundType === 'potong_hutang' ? 'Potong Hutang' : 'Refund Tunai'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedReturnDetails(ret)}
                            className="p-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 select-none">
                        Tidak ada transaksi retur pembelian yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SUPPLIERS */}
      {subTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Cari nama, telepon supplier..."
                value={searchSupplier}
                onChange={(e) => setSearchSupplier(e.target.value)}
                className="w-full pl-9 p-2 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#ef4444]/25 focus:border-[#ef4444]"
              />
            </div>

            {/* Action buttons */}
            {['owner', 'admin'].includes(currentUser.role) && (
              <button
                onClick={handleOpenAddSupplier}
                className="p-2 px-4 bg-[#ef4444] hover:bg-[#67b444] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus size={14} /> Tambah Supplier Baru
              </button>
            )}
          </div>

          {/* Suppliers List cards or table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[10px] tracking-wider select-none">
                    <th className="p-4">Nama Supplier</th>
                    <th className="p-4">Nomor Telepon</th>
                    <th className="p-4">Alamat Pemasok</th>
                    <th className="p-4">Saldo Hutang Kita</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 font-black text-slate-850 dark:text-slate-100 text-sm">{supplier.name}</td>
                        <td className="p-4 font-bold font-mono">{supplier.phone}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-medium max-w-xs truncate" title={supplier.address}>
                          {supplier.address || '-'}
                        </td>
                        <td className="p-4">
                          <p className={`font-extrabold ${supplier.debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                            {formatIDR(supplier.debt)}
                          </p>
                          {supplier.debt > 0 && <span className="text-[9px] text-slate-400 italic">Harus segera diselesaikan</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 justify-center">
                            {['owner', 'admin'].includes(currentUser.role) && (
                              <>
                                <button
                                  onClick={() => handleOpenEditSupplier(supplier)}
                                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Edit
                                </button>
                                {supplier.debt > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedSupplierForDebt(supplier);
                                      setPayDebtAmount(supplier.debt);
                                      setIsPayDebtOpen(true);
                                    }}
                                    className="p-1 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Bayar Hutang
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 select-none">
                        Tidak ada supplier yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL PEMBELIAN */}
      {selectedPurchaseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-lg shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <FileText size={15} className="text-[#ef4444]" /> Rincian Nota Pembelian (PO)
              </h4>
              <button 
                onClick={() => setSelectedPurchaseDetails(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">No. Pembelian</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{selectedPurchaseDetails.purchaseNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tanggal Nota</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">
                    {new Date(selectedPurchaseDetails.date).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Supplier</p>
                  <p className="font-extrabold text-[#ef4444]">{selectedPurchaseDetails.supplierName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Status Pembayaran</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${selectedPurchaseDetails.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'}`}>
                    {selectedPurchaseDetails.paymentStatus === 'paid' ? 'Lunas' : 'Hutang / Bon'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Daftar Barang yang Dibeli</p>
                <div className="border border-slate-100 dark:border-slate-850 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                  {selectedPurchaseDetails.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800 dark:text-slate-100">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{item.sku} • {item.qty} pcs @ {formatIDR(item.costPrice)}</p>
                      </div>
                      <p className="font-black text-slate-850 dark:text-slate-100 text-right">{formatIDR(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-slate-500 text-xs">TOTAL BELANJA:</span>
                <span className="font-black text-slate-900 dark:text-slate-100 text-lg">{formatIDR(selectedPurchaseDetails.total)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPurchaseDetails(null)}
                className="p-2 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL RETUR */}
      {selectedReturnDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-lg shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <RotateCcw size={15} className="text-amber-500" /> Rincian Nota Retur Pembelian
              </h4>
              <button 
                onClick={() => setSelectedReturnDetails(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">No. Retur</p>
                  <p className="font-extrabold text-amber-600 dark:text-amber-400">{selectedReturnDetails.returnNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Asal Nota PO</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{selectedReturnDetails.purchaseNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tanggal Retur</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">
                    {new Date(selectedReturnDetails.date).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Kompensasi</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${selectedReturnDetails.refundType === 'potong_hutang' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                    {selectedReturnDetails.refundType === 'potong_hutang' ? 'Potong Hutang' : 'Refund Tunai'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Supplier</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{selectedReturnDetails.supplierName}</p>
                </div>
                {selectedReturnDetails.notes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Alasan Retur / Catatan</p>
                    <p className="font-bold text-slate-600 dark:text-slate-350 italic">{selectedReturnDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Returned Items */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Daftar Barang yang Dikembalikan</p>
                <div className="border border-slate-100 dark:border-slate-850 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 max-h-40 overflow-y-auto">
                  {selectedReturnDetails.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800 dark:text-slate-100">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{item.sku} • {item.qty} pcs @ {formatIDR(item.costPrice)}</p>
                      </div>
                      <p className="font-black text-amber-600 dark:text-amber-400 text-right">{formatIDR(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-slate-500 text-xs">TOTAL REFUND / KREDIT:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 text-lg">{formatIDR(selectedReturnDetails.total)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReturnDetails(null)}
                className="p-2 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL: SUPPLIER ADD/EDIT */}
      {isSupplierFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-sm shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <Truck size={15} className="text-[#ef4444]" /> {editingSupplier ? 'Edit Informasi Supplier' : 'Tambah Supplier Pemasok Baru'}
              </h4>
              <button 
                onClick={() => setIsSupplierFormOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Nama Lengkap Supplier / Perusahaan</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: PT Wings Food, Distributor Kopi..."
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 focus:outline-hidden focus:ring-2 focus:ring-[#ef4444]/20"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Nomor Telepon / Kontak Whatsapp</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 0812-xxxx-xxxx atau 021-xxxxx"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#ef4444]/20"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Alamat Lengkap Kantor / Gudang</label>
                <textarea
                  placeholder="Tulis alamat penjemputan barang..."
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 focus:outline-hidden focus:ring-2 focus:ring-[#ef4444]/20"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierFormOpen(false)}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-[#ef4444] hover:bg-[#67b444] text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {editingSupplier ? 'Simpan Perubahan' : 'Tambah Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL: PAY DEBT TO SUPPLIER */}
      {isPayDebtOpen && selectedSupplierForDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-sm shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <DollarSign size={15} className="text-blue-500" /> Pencatatan Bayar Hutang Supplier
              </h4>
              <button 
                onClick={() => setIsPayDebtOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handlePayDebtSubmit} className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 rounded-xl text-xs space-y-1">
                <p className="font-bold uppercase text-[9px] tracking-wider text-red-500">Supplier Penerima</p>
                <p className="font-extrabold text-sm">{selectedSupplierForDebt.name}</p>
                <p className="font-bold mt-1">Total Saldo Hutang Toko: {formatIDR(selectedSupplierForDebt.debt)}</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Jumlah Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  required
                  min={100}
                  max={selectedSupplierForDebt.debt}
                  placeholder="Tulis nominal bayar..."
                  value={payDebtAmount || ''}
                  onChange={(e) => setPayDebtAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 font-black focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayDebtOpen(false)}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Konfirmasi Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL: CATAT PEMBELIAN BARU */}
      {isPurchaseFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-2xl shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <ClipboardList size={15} className="text-[#ef4444]" /> Catat Nota Pembelian Pemasok (PO)
              </h4>
              <button 
                onClick={() => setIsPurchaseFormOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Supplier */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Pilih Supplier / Pemasok</label>
                  <select
                    required
                    value={pSupplierId}
                    onChange={(e) => setPSupplierId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-150 font-bold focus:outline-hidden"
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Hutang: {formatIDR(s.debt)})</option>
                    ))}
                  </select>
                </div>

                {/* Select Payment Status */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Metode Pembayaran ke Supplier</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPPaymentStatus('paid')}
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${pPaymentStatus === 'paid' ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                    >
                      ✓ Lunas (Paid)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPPaymentStatus('debt')}
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${pPaymentStatus === 'debt' ? 'bg-red-500 border-red-500 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                    >
                      📓 Hutang / Bon (Credit)
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Search & Selection */}
              <div className="space-y-2 text-xs relative">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Cari & Tambah Produk</label>
                <input
                  type="text"
                  placeholder="Ketik nama produk atau SKU untuk dimasukkan..."
                  value={pSearchProductTerm}
                  onChange={(e) => setPSearchProductTerm(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden"
                />

                {availableProductsForPurchase.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-850">
                    {availableProductsForPurchase.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addToPurchaseCart(p)}
                        className="w-full p-2.5 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex justify-between cursor-pointer"
                      >
                        <span>{p.name} ({p.sku})</span>
                        <span className="text-slate-400">Harga Beli POS: {formatIDR(p.costPrice || 0)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart List */}
              <div className="space-y-1 text-xs">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Daftar Item Keranjang PO</label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 max-h-40 overflow-y-auto">
                  {pCart.length > 0 ? (
                    pCart.map((item, idx) => (
                      <div key={idx} className="p-3 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{item.product.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{item.product.sku}</p>
                        </div>
                        <div className="col-span-2 text-center">
                          <input
                            type="number"
                            required
                            min={1}
                            placeholder="Qty"
                            value={item.qty || ''}
                            onChange={(e) => updatePurchaseCartQty(item.product.id, Number(e.target.value))}
                            className="w-full p-1 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-bold"
                          />
                        </div>
                        <div className="col-span-3 text-right">
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="Hrg Beli"
                            value={item.costPrice || ''}
                            onChange={(e) => updatePurchaseCartCost(item.product.id, Number(e.target.value))}
                            className="w-full p-1 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-bold text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 shrink-0 select-none">
                            {formatIDR(item.qty * item.costPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromPurchaseCart(item.product.id)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-md cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 select-none font-medium">
                      Keranjang belanja PO kosong. Cari dan pilih produk di atas.
                    </div>
                  )}
                </div>
              </div>

              {pCart.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl text-xs">
                  <span className="font-bold text-slate-500">ESTIMASI TOTAL BELANJA:</span>
                  <span className="font-black text-slate-900 dark:text-slate-100 text-base">
                    {formatIDR(pCart.reduce((sum, i) => sum + (i.qty * i.costPrice), 0))}
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseFormOpen(false)}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-[#ef4444] hover:bg-[#67b444] text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Konfirmasi PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL: CATAT RETUR PEMBELIAN */}
      {isReturnFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-2xl shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <RotateCcw size={15} className="text-amber-500 animate-spin" /> Catat Retur Pengembalian Barang Supplier
              </h4>
              <button 
                onClick={() => setIsReturnFormOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Supplier */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Pilih Supplier / Pemasok</label>
                  <select
                    required
                    value={rSupplierId}
                    onChange={(e) => {
                      setRSupplierId(e.target.value);
                      setRPurchaseId('');
                      setRCart([]);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-150 font-bold focus:outline-hidden"
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Hutang Toko: {formatIDR(s.debt)})</option>
                    ))}
                  </select>
                </div>

                {/* Select Purchase PO */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Pilih Nota PO Asal</label>
                  <select
                    required
                    disabled={!rSupplierId}
                    value={rPurchaseId}
                    onChange={(e) => handleSelectPurchaseToReturn(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-150 font-bold focus:outline-hidden disabled:opacity-50"
                  >
                    <option value="">-- Pilih Nota Asal PO --</option>
                    {selectedSupplierPurchases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.purchaseNumber} ({new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {formatIDR(p.total)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items returning */}
              {rPurchaseId && (
                <div className="space-y-2 text-xs">
                  <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500">
                    Pilih Item dan Tentukan Jumlah Retur
                  </label>
                  <div className="border border-slate-200 dark:border-slate-850 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 max-h-44 overflow-y-auto">
                    {rCart.map((item, idx) => (
                      <div key={idx} className="p-3 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {item.sku} • Dibeli {item.originalQty} pcs @ {formatIDR(item.costPrice)}
                          </p>
                        </div>
                        <div className="col-span-3 text-center">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              required
                              min={0}
                              max={item.originalQty}
                              placeholder="Qty Retur"
                              value={item.returnQty || ''}
                              onChange={(e) => updateReturnQty(item.productId, Number(e.target.value), item.originalQty)}
                              className="w-full p-1 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-bold text-amber-600 focus:outline-hidden"
                            />
                            <span className="text-slate-400">/ {item.originalQty}</span>
                          </div>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="font-black text-slate-800 dark:text-slate-100 select-none">
                            {formatIDR(item.returnQty * item.costPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refund Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Jenis Kompensasi Retur</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRRefundType('potong_hutang')}
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${rRefundType === 'potong_hutang' ? 'bg-indigo-500 border-indigo-500 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                    >
                      Potong Hutang (Deduct Debt)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRRefundType('tunai')}
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${rRefundType === 'tunai' ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                    >
                      Refund Tunai (Cash)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Alasan Retur / Catatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Barang cacat, kedaluwarsa, salah kirim..."
                    value={rNotes}
                    onChange={(e) => setRNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 focus:outline-hidden"
                  />
                </div>
              </div>

              {rCart.some(item => item.returnQty > 0) && (
                <div className="flex justify-between items-center p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl text-xs">
                  <span className="font-bold">TOTAL PENYESUAIAN PENGEMBALIAN:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-base">
                    {formatIDR(rCart.reduce((sum, i) => sum + (i.returnQty * i.costPrice), 0))}
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnFormOpen(false)}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Transaksi Retur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
