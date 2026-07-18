/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, Calendar, Clock, CreditCard, ChevronRight, ShoppingCart, UserCheck } from 'lucide-react';
import { Transaction, StoreSettings } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onReprint: (tx: Transaction) => void;
  storeSettings: StoreSettings;
  onDeleteTransaction?: (txId: string) => void;
  currentUserRole?: string;
}

export default function TransactionHistory({ 
  transactions, 
  onReprint, 
  storeSettings,
  onDeleteTransaction,
  currentUserRole
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Reset confirmation state when selected transaction changes
  useEffect(() => {
    setIsConfirmDeleteOpen(false);
  }, [selectedTx]);

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
              className="w-full pl-9 pr-4 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#78c953] transition-colors"
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
                        ? 'bg-[#78c953]/10 dark:bg-[#78c953]/20 border-2 border-[#78c953]' 
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
                    <span className="font-bold text-[#78c953] uppercase">{selectedTx.paymentMethod}</span>
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

                {/* Subtotals breakdown list */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-xs space-y-1 font-semibold text-slate-600 dark:text-slate-400">
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

              {/* Action Button: Reprint & Delete */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 space-y-2">
                <button
                  onClick={() => onReprint(selectedTx)}
                  className="w-full p-3 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-750 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all border dark:border-slate-700"
                >
                  <Printer size={16} />
                  Cetak Ulang Struk (Layar Cetak)
                </button>

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
    </div>
  );
}
