/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Calendar, ArrowRightLeft, CreditCard, 
  Layers, ChevronDown, RefreshCw, AlertCircle, CheckCircle, 
  Lock, Unlock, HelpCircle, FileText, Search, Plus
} from 'lucide-react';
import { 
  Transaction, BrilinkTransaction, PpobTransaction, CashSession, User as UserType, Product
} from '../types';

interface FinanceReportTabProps {
  transactions: Transaction[];
  brilinkTransactions: BrilinkTransaction[];
  ppobTransactions: PpobTransaction[];
  cashSessions: CashSession[];
  currentCashSession: CashSession | null;
  onOpenSession: (initialCash: number) => void;
  onCloseSession: (actualCash: number, notes: string) => void;
  currentUser: UserType | null;
  products: Product[];
}

export default function FinanceReportTab({
  transactions,
  brilinkTransactions,
  ppobTransactions,
  cashSessions,
  currentCashSession,
  onOpenSession,
  onCloseSession,
  currentUser,
  products
}: FinanceReportTabProps) {
  const [activeReportTab, setActiveReportTab] = useState<'daily_combined' | 'brilink_fees' | 'goods_sales' | 'cash_reconciliation'>('daily_combined');
  
  // Date filtering state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  // For goods sales search
  const [goodsSearch, setGoodsSearch] = useState('');

  // Cashier Form State
  const [initialCashInput, setInitialCashInput] = useState<number>(100000);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');

  // Auto calculate expected cash inside open session if currentCashSession exists
  const [realtimeExpectedCash, setRealtimeExpectedCash] = useState<number>(0);
  const [sessionSalesCash, setSessionSalesCash] = useState<number>(0);
  const [sessionBrilinkIn, setSessionBrilinkIn] = useState<number>(0);
  const [sessionBrilinkOut, setSessionBrilinkOut] = useState<number>(0);
  const [sessionPpobCash, setSessionPpobCash] = useState<number>(0);
  const [sessionNonCash, setSessionNonCash] = useState<number>(0);

  // Recalculate real-time cash session values based on transaction lists inside active session time
  useEffect(() => {
    if (!currentCashSession) return;
    const start = new Date(currentCashSession.startTime).getTime();
    
    // 1. Regular sales cash vs non-cash
    const sessionTxs = transactions.filter(t => new Date(t.date).getTime() >= start);
    let salesCash = 0;
    let nonCash = 0;
    sessionTxs.forEach(tx => {
      if (tx.paymentMethod === 'cash') {
        salesCash += tx.total;
      } else {
        nonCash += tx.total;
      }
    });

    // 2. BRILink transactions cash in vs out
    // Setor tunai / Transfer = customer hands cash in (amount + adminFee if paid by cash)
    // Tarik tunai = customer hands card, agent gives out cash (cashOut = amount - adminFee)
    const sessionBrilinks = brilinkTransactions.filter(t => new Date(t.date).getTime() >= start);
    let bIn = 0;
    let bOut = 0;
    sessionBrilinks.forEach(tx => {
      if (tx.paymentMethod === 'cash') {
        if (tx.transactionType === 'tarik_tunai') {
          // Cashier hands out cash (amount - adminFee).
          bOut += (tx.amount - tx.adminFee);
        } else {
          // Setor / Transfer: Cashier receives cash (amount + adminFee)
          bIn += (tx.amount + tx.adminFee);
        }
      }
    });

    // 3. PPOB transactions (Cash received = amount + adminFee)
    const sessionPpobs = ppobTransactions.filter(t => new Date(t.date).getTime() >= start);
    let ppobCash = 0;
    sessionPpobs.forEach(tx => {
      if (tx.paymentMethod === 'cash') {
        ppobCash += tx.totalAmount;
      }
    });

    setSessionSalesCash(salesCash);
    setSessionBrilinkIn(bIn);
    setSessionBrilinkOut(bOut);
    setSessionPpobCash(ppobCash);
    setSessionNonCash(nonCash);

    const expected = currentCashSession.initialCash + salesCash + bIn - bOut + ppobCash;
    setRealtimeExpectedCash(expected);
  }, [currentCashSession, transactions, brilinkTransactions, ppobTransactions]);

  // Calculations for Daily Combined Report
  const getDailyStats = (dateStr: string) => {
    const filterByDay = (isoStr: string) => {
      return isoStr.startsWith(dateStr);
    };

    // Goods Sales
    const dayTxs = transactions.filter(t => filterByDay(t.date));
    const salesVolume = dayTxs.reduce((sum, t) => sum + t.total, 0);
    const salesRevenue = dayTxs.reduce((sum, t) => sum + (t.subTotal - t.discountTotal), 0);
    
    // Profit of goods
    let salesProfit = 0;
    dayTxs.forEach(t => {
      t.items.forEach(item => {
        // Profit per item = total_item_price - (item_cost_price * qty)
        const cost = (item.costPrice || 0) * item.qty;
        salesProfit += (item.total - cost);
      });
    });

    // BRILink
    const dayBrilink = brilinkTransactions.filter(t => filterByDay(t.date));
    const brilinkVolume = dayBrilink.reduce((sum, t) => sum + t.amount, 0);
    const brilinkProfit = dayBrilink.reduce((sum, t) => sum + (t.adminFee - t.bankFee), 0);
    const brilinkFees = dayBrilink.reduce((sum, t) => sum + t.adminFee, 0);

    // PPOB
    const dayPpob = ppobTransactions.filter(t => filterByDay(t.date));
    const ppobVolume = dayPpob.reduce((sum, t) => sum + t.amount, 0);
    const ppobProfit = dayPpob.reduce((sum, t) => sum + t.adminFee + (t.amount - t.costPrice), 0);

    return {
      salesCount: dayTxs.length,
      salesVolume,
      salesProfit,
      brilinkCount: dayBrilink.length,
      brilinkVolume,
      brilinkFees,
      brilinkProfit,
      ppobCount: dayPpob.length,
      ppobVolume,
      ppobProfit,
      grandTotalProfit: salesProfit + brilinkProfit + ppobProfit
    };
  };

  const dayStats = getDailyStats(selectedDate);

  // Group items sold for Goods Sales Report
  const getSoldItemsReport = () => {
    const dayTxs = transactions.filter(t => t.date.startsWith(selectedDate));
    const summaryMap: Record<string, { sku: string; name: string; qty: number; revenue: number; cost: number; profit: number }> = {};

    dayTxs.forEach(tx => {
      tx.items.forEach(item => {
        const key = item.productId;
        const totalCost = (item.costPrice || 0) * item.qty;
        const totalProfit = item.total - totalCost;

        if (summaryMap[key]) {
          summaryMap[key].qty += item.qty;
          summaryMap[key].revenue += item.total;
          summaryMap[key].cost += totalCost;
          summaryMap[key].profit += totalProfit;
        } else {
          summaryMap[key] = {
            sku: item.sku,
            name: item.name,
            qty: item.qty,
            revenue: item.total,
            cost: totalCost,
            profit: totalProfit
          };
        }
      });
    });

    return Object.values(summaryMap).filter(item => 
      item.name.toLowerCase().includes(goodsSearch.toLowerCase()) || 
      item.sku.toLowerCase().includes(goodsSearch.toLowerCase())
    );
  };

  const soldItems = getSoldItemsReport();

  return (
    <div id="finance-report-container" className="space-y-6">
      
      {/* Date Filter & Tab Selection */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Calendar className="text-slate-400 dark:text-slate-500 shrink-0" size={16} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Tanggal Laporan:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-[#ef4444]/20"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto justify-end">
          {[
            { id: 'daily_combined', label: '📊 Gabungan Harian' },
            { id: 'goods_sales', label: '📦 Penjualan Barang' },
            { id: 'brilink_fees', label: '💳 Fee BRILink' },
            { id: 'cash_reconciliation', label: '🔒 Rekap Kas Laci' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`p-2 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${activeReportTab === tab.id ? 'bg-[#ef4444] text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. TAB: DAILY COMBINED REPORT */}
      {activeReportTab === 'daily_combined' && (
        <div className="space-y-6">
          {/* Executive Overview Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 block">Laporan Pendapatan Gabungan</span>
              <h2 className="text-2xl font-black mt-1">
                Rp {dayStats.grandTotalProfit.toLocaleString('id-ID')}
              </h2>
              <span className="text-xs text-emerald-150 mt-1 block font-medium">
                Total keuntungan bersih toko (Barang + BRILink + PPOB) pada tanggal {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/15">
              <span className="text-[9px] uppercase font-black text-emerald-200 block">Total Omset Penjualan</span>
              <span className="text-lg font-extrabold block mt-0.5">
                Rp {(dayStats.salesVolume + dayStats.brilinkFees + dayStats.ppobVolume).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Module Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Goods Sales Module */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black text-slate-400">📦 Penjualan Barang</span>
                  <span className="text-[10px] bg-slate-50 dark:bg-slate-850 px-1.5 py-0.5 rounded text-slate-500 font-bold">{dayStats.salesCount} Nota</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Omset Kotor:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Rp {dayStats.salesVolume.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Keuntungan Bersih:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Rp {dayStats.salesProfit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={() => setActiveReportTab('goods_sales')}
                  className="text-[10px] font-bold text-[#ef4444] hover:underline cursor-pointer flex items-center gap-1"
                >
                  Lihat Detail Barang Terjual →
                </button>
              </div>
            </div>

            {/* BRILink Module */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black text-blue-500 dark:text-blue-400">💳 BRILink</span>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded text-blue-600 font-bold">{dayStats.brilinkCount} Transaksi</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Total Volume:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Rp {dayStats.brilinkVolume.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Admin Fee Diterima:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Rp {dayStats.brilinkFees.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Laba Bersih BRILink:</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">Rp {dayStats.brilinkProfit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={() => setActiveReportTab('brilink_fees')}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  Lihat Detail Laporan Fee BRILink →
                </button>
              </div>
            </div>

            {/* PPOB Module */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black text-amber-500">📱 PPOB Loket</span>
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded text-amber-600 font-bold">{dayStats.ppobCount} Bayar</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Total Tagihan:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Rp {dayStats.ppobVolume.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 font-semibold">Keuntungan Bersih:</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">Rp {dayStats.ppobProfit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 block font-medium">Auto rekap profit dari margin produk + admin loket</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. TAB: GOODS SALES REPORT */}
      {activeReportTab === 'goods_sales' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-widest">Detail Barang Terjual ({soldItems.length})</h3>
            <div className="relative w-full sm:w-64">
              <span className="absolute left-3 top-2 text-slate-400"><Search size={12} /></span>
              <input
                type="text"
                placeholder="Cari barang atau SKU..."
                value={goodsSearch}
                onChange={(e) => setGoodsSearch(e.target.value)}
                className="w-full p-1.5 pl-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500">
                  <th className="py-3 px-2">SKU</th>
                  <th className="py-3 px-2">Nama Barang</th>
                  <th className="py-3 px-2 text-center">Jumlah Terjual</th>
                  <th className="py-3 px-2 text-right">Omset (Kotor)</th>
                  <th className="py-3 px-2 text-right">HPP (Modal)</th>
                  <th className="py-3 px-2 text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                {soldItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-450 font-medium">Tidak ada barang terjual pada tanggal ini.</td>
                  </tr>
                ) : (
                  soldItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-2 font-mono font-bold text-slate-500">{item.sku}</td>
                      <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300">{item.qty} pcs</td>
                      <td className="py-3 px-2 text-right font-bold">Rp {item.revenue.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-2 text-right text-slate-500 font-mono">Rp {item.cost.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">Rp {item.profit.toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TAB: BRILINK FEES REPORT */}
      {activeReportTab === 'brilink_fees' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Laporan Fee Admin & Pengeluaran Agen BRILink</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500">
                  <th className="py-3 px-2">Waktu / Ref</th>
                  <th className="py-3 px-2">Tipe Transaksi</th>
                  <th className="py-3 px-2">Bank & Rekening</th>
                  <th className="py-3 px-2 text-right">Nominal</th>
                  <th className="py-3 px-2 text-right">Tarif Admin</th>
                  <th className="py-3 px-2 text-right">Fee Bank</th>
                  <th className="py-3 px-2 text-right">Keuntungan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                {brilinkTransactions.filter(t => t.date.startsWith(selectedDate)).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-450 font-medium">Tidak ada transaksi BRILink pada tanggal ini.</td>
                  </tr>
                ) : (
                  brilinkTransactions.filter(t => t.date.startsWith(selectedDate)).map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">{tx.refNumber}</div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-bold capitalize">{tx.transactionType.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">{tx.bankName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{tx.accountNumber}</div>
                      </td>
                      <td className="py-3 px-2 text-right font-bold">Rp {tx.amount.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">+Rp {tx.adminFee.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-2 text-right text-rose-500 font-mono">-Rp {tx.bankFee.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-2 text-right font-black text-blue-600 dark:text-blue-400">Rp {(tx.adminFee - tx.bankFee).toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB: AUTOMATIC CASH RECONCILIATION */}
      {activeReportTab === 'cash_reconciliation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Session Status & Control Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Status Rekap Laci Kas</span>
                  {currentCashSession ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      <Unlock size={10} /> Terbuka
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      <Lock size={10} /> Terkunci
                    </span>
                  )}
                </div>

                {!currentCashSession ? (
                  /* Start Session Form */
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/15 rounded-lg border border-blue-150/40">
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Buka sesi kasir baru dengan menginput modal awal kas laci Anda hari ini. Semua transaksi uang tunai masuk/keluar akan terpantau real-time.</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Modal Awal Laci (Rp)</label>
                      <input
                        type="number"
                        value={initialCashInput || ''}
                        onChange={(e) => setInitialCashInput(Number(e.target.value))}
                        required
                        className="w-full p-2 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenSession(initialCashInput)}
                      className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer text-center"
                    >
                      Buka Sesi Kasir Baru
                    </button>
                  </div>
                ) : (
                  /* End/Close Session Form */
                  <div className="space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mulai Sesi:</span>
                        <span className="font-semibold">{new Date(currentCashSession.startTime).toLocaleTimeString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kasir Pembuka:</span>
                        <span className="font-semibold">{currentCashSession.openedByName}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-150/40">
                      <span className="text-[9px] uppercase font-bold text-slate-450 dark:text-slate-500 block">Kalkulasi Uang Laci Seharusnya</span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100 block mt-0.5">
                        Rp {realtimeExpectedCash.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Uang Fisik di Laci (Dihitung manual)</label>
                        <input
                          type="number"
                          value={actualCashInput || ''}
                          onChange={(e) => setActualCashInput(Number(e.target.value))}
                          placeholder="Hitung jumlah uang fisik..."
                          className="w-full p-2 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-[#ef4444]"
                        />
                      </div>
                      
                      {/* Real-time difference box */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between text-xs">
                        <span className="text-slate-500">Discrepancy (Selisih):</span>
                        <span className={`font-bold ${actualCashInput - realtimeExpectedCash === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          Rp {(actualCashInput - realtimeExpectedCash).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Catatan Tutup Buku</label>
                        <input
                          type="text"
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          placeholder="Alasan selisih jika ada..."
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Selesaikan sesi kasir ini dan kunci rekap laci kas sekarang?')) {
                          onCloseSession(actualCashInput, closingNotes);
                          setActualCashInput(0);
                          setClosingNotes('');
                        }
                      }}
                      className="w-full p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer text-center"
                    >
                      Tutup Sesi & Kunci Kas
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Real-time Cash Register Accumulator Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Rincian Arus Uang Tunai di Sesi Ini</h3>
                
                {currentCashSession ? (
                  <div className="space-y-4">
                    {/* Flow details in/out */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Modal Awal (Cash float)</span>
                        <span className="text-sm font-extrabold text-slate-700 mt-1 block">Rp {currentCashSession.initialCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Tunai Penjualan POS</span>
                        <span className="text-sm font-extrabold text-slate-700 mt-1 block">Rp {sessionSalesCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Uang Masuk BRILink</span>
                        <span className="text-sm font-extrabold text-slate-700 mt-1 block">Rp {sessionBrilinkIn.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-black text-rose-450 block">Uang Keluar BRILink</span>
                        <span className="text-sm font-extrabold text-rose-600 mt-1 block">Rp {sessionBrilinkOut.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Tunai Loket PPOB</span>
                        <span className="text-sm font-extrabold text-slate-700 mt-1 block">Rp {sessionPpobCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Non-Tunai (QRIS/E-Wallet)</span>
                        <span className="text-sm font-extrabold text-slate-700 mt-1 block">Rp {sessionNonCash.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-650 font-bold">Total Uang Tunai Laci Saat Ini (Teoritis):</span>
                        <span className="text-lg font-black text-[#ef4444]">Rp {realtimeExpectedCash.toLocaleString('id-ID')}</span>
                      </div>
                      <span className="text-[9px] text-slate-450 block italic">*Hasil penjumlahan: Modal Awal + Tunai Masuk - Tunai Keluar</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={24} className="text-slate-350" />
                    <span className="text-xs font-semibold">Sesi rekap kas laci belum dibuka.</span>
                    <span className="text-[10px] text-slate-450">Buka sesi di panel sebelah kiri untuk mulai melacak kas.</span>
                  </div>
                )}

                {/* Closed Sessions History */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 block mb-2">Riwayat Tutup Buku Kas Sesi</span>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {cashSessions.length === 0 ? (
                      <div className="text-center py-4 text-[10px] text-slate-450 italic">Belum ada riwayat rekap kas terkunci.</div>
                    ) : (
                      cashSessions.map(session => (
                        <div key={session.id} className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/60 rounded-lg text-xs space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Rekap Kasir {new Date(session.date).toLocaleDateString('id-ID')}</span>
                            <span className="text-[9px] bg-slate-200/50 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">Terkunci</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            <div>
                              <span className="text-slate-450 block">Modal Awal:</span>
                              <span className="font-semibold text-slate-700">Rp {session.initialCash.toLocaleString('id-ID')}</span>
                            </div>
                            <div>
                              <span className="text-slate-450 block">Teoritis (Expected):</span>
                              <span className="font-semibold text-slate-700">Rp {session.expectedCash.toLocaleString('id-ID')}</span>
                            </div>
                            <div>
                              <span className="text-slate-450 block">Uang Fisik (Actual):</span>
                              <span className="font-semibold text-slate-700">Rp {session.actualCash?.toLocaleString('id-ID')}</span>
                            </div>
                            <div>
                              <span className="text-slate-450 block">Discrepancy (Selisih):</span>
                              <span className={`font-bold ${session.difference === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                Rp {session.difference?.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                          {session.notes && (
                            <div className="text-[9px] italic text-slate-500 bg-slate-100/60 dark:bg-slate-900/40 p-1.5 rounded mt-1">
                              * {session.notes}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
