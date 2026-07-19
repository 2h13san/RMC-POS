/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, Calendar, Clock, CreditCard, ChevronRight, ShoppingCart, UserCheck, RotateCcw, X, AlertCircle } from 'lucide-react';
import { Transaction, StoreSettings, SalesReturn } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onReprint: (tx: Transaction) => void;
  storeSettings: StoreSettings;
  onDeleteTransaction?: (txId: string) => void;
  currentUserRole?: string;
  onProcessReturn?: (
    txId: string,
    returnedItems: { productId: string; qty: number; refundAmount: number; name: string }[],
    restock: boolean,
    notes: string
  ) => void;
  salesReturns?: SalesReturn[];
}

export default function TransactionHistory({ 
  transactions, 
  onReprint, 
  storeSettings,
  onDeleteTransaction,
  currentUserRole,
  onProcessReturn,
  salesReturns = []
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Return Feature States
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [restockGoods, setRestockGoods] = useState(true);

  // Reset confirmation and return states when selected transaction changes
  useEffect(() => {
    setIsConfirmDeleteOpen(false);
    setIsReturnModalOpen(false);
    setReturnQtys({});
    setReturnNotes('');
    setRestockGoods(true);
  }, [selectedTx]);

  // Track already returned quantities for this transaction
  const alreadyReturnedQtys = useMemo(() => {
    const qtys: Record<string, number> = {};
    if (!salesReturns || !selectedTx) return qtys;
    
    const txReturns = salesReturns.filter(ret => ret.transactionId === selectedTx.id);
    txReturns.forEach(ret => {
      ret.items.forEach(item => {
        qtys[item.productId] = (qtys[item.productId] || 0) + item.qty;
      });
    });
    return qtys;
  }, [salesReturns, selectedTx]);

  // Filter returns related to selected transaction
  const txReturns = useMemo(() => {
    if (!salesReturns || !selectedTx) return [];
    return salesReturns.filter(ret => ret.transactionId === selectedTx.id);
  }, [salesReturns, selectedTx]);


  // Format currency helper
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Filter process
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.cashierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMethod = selectedMethod === 'all' || t.paymentMethod === selectedMethod;
      return matchSearch && matchMethod;
    });
  }, [transactions, searchTerm, selectedMethod]);

  return (
    <div className="max-w-7xl mx-auto p-2 animate-fade-in space-y-6">
      
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Riwayat Transaksi Toko</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Daftar rekaman seluruh penjualan kasir. Anda dapat melacak invoice dan mencetak ulang struk.</p>
        </div>

        <div className="flex flex-1 max-w-xl flex-col sm:flex-row gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Cari Invoice atau nama Kasir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#ef4444] transition-colors"
            />
          </div>

          {/* Payment Method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Semua Pembayaran</option>
            <option value="cash" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">💵 CASH / TUNAI</option>
            <option value="qris" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">📊 DYNAMIC QRIS</option>
            <option value="gopay" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">👛 GOPAY</option>
            <option value="ovo" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">👛 OVO</option>
            <option value="dana" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">👛 DANA</option>
            <option value="shopeepay" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">👛 SHOPEEPAY</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: List of Transactions (7 cols) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-7 flex flex-col">
          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            Daftar Pembayaran Selesai ({filteredTxs.length})
          </div>

          <div className="overflow-y-auto max-h-[550px] pr-1 flex-1 space-y-1.5">
            {filteredTxs.length > 0 ? (
              filteredTxs.map(t => {
                const totalItemQty = t.items.reduce((acc, item) => acc + item.qty, 0);
                const isSelected = selectedTx?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTx(t)}
                    className={`p-4 flex items-center justify-between text-xs gap-3 cursor-pointer transition-all rounded-xl mt-1.5 ${
                      isSelected 
                        ? 'bg-[#ef4444]/10 dark:bg-[#ef4444]/20 border-2 border-[#ef4444]' 
                        : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-950/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight text-xs">{t.invoiceNumber}</span>
                        <span className="p-1 px-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[9px] font-bold uppercase shrink-0">
                          {t.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Calendar size={11} />
                          {new Date(t.date).toLocaleDateString('id-ID')}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={11} />
                          {new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <UserCheck size={11} />
                          {t.cashierName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{formatIDR(t.total)}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{totalItemQty} Item barang</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full border border-dashed border-slate-100 dark:border-slate-800 py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                Tidak ada riwayat transaksi ditemukan.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mini Details panel & Reprint Controls (5 cols) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-5 flex flex-col justify-between">
          {selectedTx ? (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Informasi Transaksi</h3>
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 font-bold rounded-md">Lunas</span>
                </div>

                {/* Info List */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 mt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Nomor Invoice:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTx.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Waktu Pencatatan:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(selectedTx.date).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Kasir Bertugas:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTx.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Saluran Pembayaran:</span>
                    <span className="font-bold text-[#ef4444] uppercase">{selectedTx.paymentMethod}</span>
                  </div>
                </div>

                {/* Items Sold Breakdown */}
                <div className="mt-4">
                  <h4 className="font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-2">Item Terjual</h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs max-h-[160px] overflow-y-auto pr-1">
                    {selectedTx.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-center">
                        <div className="max-w-[70%]">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">{item.name}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{item.qty} pcs x {formatIDR(item.price)}</p>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatIDR(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {txReturns.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 p-3 rounded-xl space-y-1.5 mt-3 text-[10px]">
                    <div className="flex items-center gap-1 font-bold text-purple-800 dark:text-purple-400">
                      <AlertCircle size={12} />
                      <span>Sebagian barang telah diretur:</span>
                    </div>
                    <div className="space-y-1 pl-3.5">
                      {txReturns.map(ret => (
                        <div key={ret.id} className="text-slate-600 dark:text-slate-450 font-semibold leading-relaxed">
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{ret.returnNumber}</span>:{' '}
                          {ret.items.map(i => `${i.name} (x${i.qty})`).join(', ')} {' '}
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">({formatIDR(ret.totalRefund)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Subtotals breakdown list */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-xs space-y-1 font-semibold text-slate-600 dark:text-slate-400 font-sans">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatIDR(selectedTx.subTotal)}</span>
                  </div>
                  {selectedTx.discountTotal > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Total Potongan:</span>
                      <span>-{formatIDR(selectedTx.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Pajak (PPN):</span>
                    <span>{formatIDR(selectedTx.taxTotal)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-800 dark:text-slate-100 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span>TOTAL BAYAR:</span>
                    <span className="text-blue-600 dark:text-blue-400 text-base">{formatIDR(selectedTx.total)}</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Reprint, Return & Delete */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 space-y-2">
                <button
                  onClick={() => onReprint(selectedTx)}
                  className="w-full p-3 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-750 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all border dark:border-slate-700"
                >
                  <Printer size={16} />
                  Cetak Ulang Struk (Layar Cetak)
                </button>

                {onProcessReturn && (
                  <button
                    onClick={() => {
                      const initialQtys: Record<string, number> = {};
                      selectedTx.items.forEach(item => {
                        initialQtys[item.productId] = 0;
                      });
                      setReturnQtys(initialQtys);
                      setReturnNotes('');
                      setRestockGoods(true);
                      setIsReturnModalOpen(true);
                    }}
                    className="w-full p-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-purple-500"
                  >
                    <RotateCcw size={15} />
                    Proses Retur Barang Belanjaan
                  </button>
                )}

                {['owner', 'admin'].includes(currentUserRole || '') && onDeleteTransaction && (
                  <>
                    {!isConfirmDeleteOpen ? (
                      <button
                        onClick={() => setIsConfirmDeleteOpen(true)}
                        className="w-full p-2.5 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        Hapus Transaksi Ini
                      </button>
                    ) : (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-xl space-y-2 animate-fade-in">
                        <p className="text-[10px] text-red-700 dark:text-red-400 font-bold leading-normal text-center">
                          Yakin ingin menghapus transaksi ini? <br />
                          <span className="text-[9px] font-medium text-red-600 dark:text-red-300">Stok barang dari transaksi ini akan dikembalikan otomatis.</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onDeleteTransaction(selectedTx.id);
                              setSelectedTx(null);
                              setIsConfirmDeleteOpen(false);
                            }}
                            className="flex-1 p-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setIsConfirmDeleteOpen(false)}
                            className="flex-1 p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 text-xs text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl h-full font-medium">
              <ShoppingCart size={40} className="text-slate-200 dark:text-slate-700 mb-3" />
              <p>Pilih salah satu transaksi di daftar sebelah kiri</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">untuk meninjau perincian item belanja & cetak struk.</p>
            </div>
          )}
        </div>

      </div>

      {/* Interactive Sales Return Modal */}
      {isReturnModalOpen && selectedTx && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-purple-600" size={18} />
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">Proses Retur Barang Belanjaan</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-0.5">Invoice: {selectedTx.invoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[350px] space-y-4">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Pilih Jumlah Barang yang Diretur</p>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
                {selectedTx.items.map(item => {
                  const maxReturnQty = item.qty - (alreadyReturnedQtys[item.productId] || 0);
                  const currentQty = returnQtys[item.productId] || 0;
                  const itemRefund = currentQty * (item.price - (item.discount || 0));

                  return (
                    <div key={item.productId} className="py-3 flex justify-between items-center text-xs">
                      <div className="max-w-[60%]">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                        <p className="text-[9.5px] text-slate-450 mt-0.5 font-semibold">
                          Telah dibeli: <span className="font-bold text-slate-600 dark:text-slate-350">{item.qty} pcs</span>
                          {alreadyReturnedQtys[item.productId] > 0 && (
                            <span className="text-purple-600 dark:text-purple-400 ml-1.5 font-extrabold">({alreadyReturnedQtys[item.productId]} diretur)</span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">Refund: {formatIDR(itemRefund)}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {maxReturnQty > 0 ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setReturnQtys(prev => ({
                                  ...prev,
                                  [item.productId]: Math.max(0, currentQty - 1)
                                }));
                              }}
                              className="w-6 h-6 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg cursor-pointer flex items-center justify-center text-xs transition-colors"
                            >
                              -
                            </button>
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 min-w-5 text-center">{currentQty}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setReturnQtys(prev => ({
                                  ...prev,
                                  [item.productId]: Math.min(maxReturnQty, currentQty + 1)
                                }));
                              }}
                              className="w-6 h-6 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg cursor-pointer flex items-center justify-center text-xs transition-colors"
                            >
                              +
                            </button>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">/ maks {maxReturnQty}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/20 p-1 px-2 rounded-md">Semua Diretur</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Restock checkbox & note fields */}
              <div className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3.5">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockGoods}
                    onChange={(e) => setRestockGoods(e.target.checked)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded border-slate-200"
                  />
                  <span>Kembalikan produk yang diretur ke dalam stok barang gudang</span>
                </label>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Catatan / Alasan Retur Barang</label>
                  <textarea
                    placeholder="Contoh: Barang cacat pabrik, salah beli varian..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-purple-500 transition-all min-h-[70px]"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer calculations and checkout actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 border-t border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-center sm:text-left text-xs">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Estimasi Refund Kasir</p>
                <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatIDR(selectedTx.items.reduce((sum, item) => sum + (returnQtys[item.productId] || 0) * (item.price - (item.discount || 0)), 0))}
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 sm:flex-initial p-2.5 px-4 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={selectedTx.items.reduce((sum, item) => sum + (returnQtys[item.productId] || 0), 0) === 0}
                  onClick={() => {
                    const returnedItems = selectedTx.items
                      .filter(item => (returnQtys[item.productId] || 0) > 0)
                      .map(item => ({
                        productId: item.productId,
                        qty: returnQtys[item.productId],
                        refundAmount: returnQtys[item.productId] * (item.price - (item.discount || 0)),
                        name: item.name
                      }));

                    onProcessReturn?.(selectedTx.id, returnedItems, restockGoods, returnNotes);
                    setIsReturnModalOpen(false);
                  }}
                  className="flex-1 sm:flex-initial p-2.5 px-5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-950/40 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Proses Retur Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
