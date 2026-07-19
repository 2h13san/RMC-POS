/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, Send, Search, Check, FileText, 
  Trash2, CreditCard, User, Building, AlertCircle, RefreshCw, MessageSquare
} from 'lucide-react';
import { BrilinkTransaction, User as UserType } from '../types';

interface BrilinkTabProps {
  transactions: BrilinkTransaction[];
  onAddTransaction: (tx: BrilinkTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentUser: UserType | null;
}

const COMMON_BANKS = ['BRI', 'BCA', 'Mandiri', 'BNI', 'BSI', 'Danamon', 'CIMB'];

export default function BrilinkTab({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  currentUser
}: BrilinkTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'history'>('form');
  
  // Form State
  const [txType, setTxType] = useState<'tarik_tunai' | 'transfer' | 'setor_tunai'>('transfer');
  const [amount, setAmount] = useState<number>(0);
  const [bankName, setBankName] = useState('BRI');
  const [customBank, setCustomBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [adminFee, setAdminFee] = useState<number>(5000);
  const [bankFee, setBankFee] = useState<number>(3000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'non_cash'>('cash');
  const [notes, setNotes] = useState('');
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Receipt Modal State
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<BrilinkTransaction | null>(null);

  // Auto fee calculation based on amount & type
  const handleAmountChange = (val: number) => {
    setAmount(val);
    // Automatic suggested admin fees
    if (val <= 100000) {
      setAdminFee(5000);
      setBankFee(3000);
    } else if (val <= 1000000) {
      setAdminFee(10000);
      setBankFee(3000);
    } else if (val <= 5000000) {
      setAdminFee(15000);
      setBankFee(3000);
    } else {
      setAdminFee(20000);
      setBankFee(5000);
    }
  };

  const handleGenerateRef = () => {
    const timestamp = new Date().getTime().toString().substring(5);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setRefNumber(`BRILINK${timestamp}${rand}`);
  };

  const resetForm = () => {
    setAmount(0);
    setAccountNumber('');
    setRecipientName('');
    setSenderName('');
    setRefNumber('');
    setAdminFee(5000);
    setBankFee(3000);
    setNotes('');
    setPaymentMethod('cash');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Jumlah transaksi harus lebih dari Rp 0!');
      return;
    }
    if (!accountNumber.trim()) {
      alert('Nomor Rekening wajib diisi!');
      return;
    }
    if (!recipientName.trim()) {
      alert('Nama Penerima wajib diisi!');
      return;
    }

    const finalRef = refNumber.trim() || `BRILINK${new Date().getTime().toString().substring(5)}`;

    const newTx: BrilinkTransaction = {
      id: `brilink-${Math.random().toString(36).substring(2, 9)}`,
      transactionType: txType,
      date: new Date().toISOString(),
      refNumber: finalRef,
      amount,
      bankName: bankName === 'Lainnya' ? customBank : bankName,
      accountNumber: accountNumber.trim(),
      recipientName: recipientName.trim(),
      senderName: senderName.trim() || undefined,
      adminFee,
      bankFee,
      totalAmount: txType === 'tarik_tunai' ? amount - adminFee : amount + adminFee,
      paymentMethod,
      cashierId: currentUser?.id || 'unknown',
      cashierName: currentUser?.name || 'Sistem',
      status: 'success',
      notes: notes.trim() || undefined
    };

    onAddTransaction(newTx);
    setSelectedTxForReceipt(newTx);
    resetForm();
    setActiveSubTab('history');
  };

  // Filter & Search Logic
  const filteredTransactions = transactions.filter(tx => {
    const matchSearch = 
      tx.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.accountNumber.includes(searchTerm) ||
      tx.bankName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = filterType === 'all' || tx.transactionType === filterType;
    return matchSearch && matchType;
  });

  const getWhatsAppReceiptUrl = (tx: BrilinkTransaction) => {
    const cleanPhone = '62'; // Dummy prefix
    const storeHeader = `*AGEN BRILINK KASIR PINTAR*\n------------------------------------------`;
    const txDetails = `*STRUK BRILINK DIGITAL*\nRef: *${tx.refNumber}*\nTanggal: ${new Date(tx.date).toLocaleString('id-ID')}\nJenis: *${tx.transactionType === 'tarik_tunai' ? 'Tarik Tunai' : tx.transactionType === 'transfer' ? 'Transfer Bank' : 'Setor Tunai'}*\nBank: ${tx.bankName}\nNo. Rek: ${tx.accountNumber}\nPenerima: ${tx.recipientName}${tx.senderName ? `\nPengirim: ${tx.senderName}` : ''}\n------------------------------------------`;
    const financials = `*Nominal:* Rp ${tx.amount.toLocaleString('id-ID')}\n*Biaya Admin:* Rp ${tx.adminFee.toLocaleString('id-ID')}\n------------------------------------------\n*TOTAL:* *Rp ${(tx.transactionType === 'tarik_tunai' ? tx.amount : tx.amount + tx.adminFee).toLocaleString('id-ID')}*`;
    const footer = `\n------------------------------------------\nTransaksi Berhasil & Lunas.\nTerima kasih telah bertransaksi di Agen kami! 😊`;
    
    return `https://wa.me/?text=${encodeURIComponent(`${storeHeader}\n${txDetails}\n${financials}${footer}`)}`;
  };

  return (
    <div id="brilink-tab-container" className="space-y-6">
      {/* Header Cards with Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Volume Brilink</span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 block mt-1">
            Rp {transactions.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Total {transactions.length} transaksi</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Admin Fee</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
            Rp {transactions.reduce((sum, tx) => sum + tx.adminFee, 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">Kotor dari pelanggan</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Laba Bersih BRILink</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 block mt-1">
            Rp {transactions.reduce((sum, tx) => sum + (tx.adminFee - tx.bankFee), 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-blue-500/80 mt-1 block">Bersih (Admin Fee - Fee Bank)</span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('form')}
          className={`py-2 px-4 font-bold text-xs border-b-2 transition-colors cursor-pointer ${activeSubTab === 'form' ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          💳 Transaksi Baru
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2 px-4 font-bold text-xs border-b-2 transition-colors cursor-pointer ${activeSubTab === 'history' ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          📂 Riwayat & Struk ({filteredTransactions.length})
        </button>
      </div>

      {activeSubTab === 'form' ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4">
              {/* Transaction Type Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Jenis Transaksi BRILink</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTxType('transfer'); }}
                    className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${txType === 'transfer' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444] font-bold shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  >
                    <Send size={16} />
                    <span className="text-[10px]">Transfer Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTxType('tarik_tunai'); }}
                    className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${txType === 'tarik_tunai' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444] font-bold shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  >
                    <ArrowDownRight size={16} />
                    <span className="text-[10px]">Tarik Tunai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTxType('setor_tunai'); }}
                    className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${txType === 'setor_tunai' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444] font-bold shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  >
                    <ArrowUpRight size={16} />
                    <span className="text-[10px]">Setor Tunai</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nominal Transaksi (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    placeholder="Masukkan nominal"
                    required
                    min="1"
                    className="w-full p-2 pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-[#ef4444]/15 focus:border-[#ef4444]"
                  />
                </div>
                {/* Quick select buttons */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[50000, 100000, 500000, 1000000, 2000000, 5000000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAmountChange(val)}
                      className="text-[9px] font-bold px-2 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      {val.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Bank Tujuan/Asal</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {COMMON_BANKS.map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => { setBankName(bank); }}
                      className={`text-[10px] font-bold px-2.5 py-1.5 border rounded-lg transition-colors cursor-pointer ${bankName === bank ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-extrabold' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                    >
                      {bank}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setBankName('Lainnya'); }}
                    className={`text-[10px] font-bold px-2.5 py-1.5 border rounded-lg cursor-pointer ${bankName === 'Lainnya' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-extrabold' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                  >
                    Lainnya
                  </button>
                </div>
                {bankName === 'Lainnya' && (
                  <input
                    type="text"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    placeholder="Nama bank kustom..."
                    required
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                  />
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nomor Rekening / Kartu</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Masukkan nomor rekening"
                  required
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-hidden focus:ring-2 focus:ring-[#ef4444]/15 focus:border-[#ef4444]"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Recipient & Sender Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Penerima</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nama penerima"
                    required
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-hidden focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Pengirim (Opt)</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Nama pengirim"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-hidden focus:ring-2"
                  />
                </div>
              </div>

              {/* Reference / BRILink Ref Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">No. Referensi / Ref BRILink</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="Kosongkan untuk auto-generate"
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRef}
                    className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Auto
                  </button>
                </div>
              </div>

              {/* Admin Fee & Bank Fee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tarif Admin (Pelanggan)</label>
                  <input
                    type="number"
                    value={adminFee || ''}
                    onChange={(e) => setAdminFee(Number(e.target.value))}
                    required
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Potongan BRI (Fee Bank)</label>
                  <input
                    type="number"
                    value={bankFee || ''}
                    onChange={(e) => setBankFee(Number(e.target.value))}
                    required
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${paymentMethod === 'cash' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                  >
                    💵 Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${paymentMethod === 'qris' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                  >
                    📊 QRIS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('non_cash')}
                    className={`p-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${paymentMethod === 'non_cash' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                  >
                    🏦 Debet/Lain
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan transaksi..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Checkout Breakdown Panel */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kalkulasi Keuntungan</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Fee Mitra: Rp {(adminFee - bankFee).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-sm">
                    Profit 100%
                  </span>
                </div>
              </div>
              <div className="text-right w-full sm:w-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pembayaran Pelanggan</span>
                <span className="text-xl font-black text-[#ef4444] block">
                  Rp {(txType === 'tarik_tunai' ? amount : amount + adminFee).toLocaleString('id-ID')}
                </span>
                <span className="text-[9px] text-slate-400 block">
                  {txType === 'tarik_tunai' ? 'Pelanggan menerima uang tunai bersih dikurangi biaya admin' : 'Pelanggan menyerahkan uang nominal ditambah biaya admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl font-bold text-xs shadow-md transition-colors text-center cursor-pointer flex items-center justify-center gap-2"
          >
            <CreditCard size={14} />
            Simpan Transaksi BRILink
          </button>
        </form>
      ) : (
        /* History & Receipts List */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-400"><Search size={14} /></span>
              <input
                type="text"
                placeholder="Cari penerima, no. rekening, bank, atau ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-hidden"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-hidden"
            >
              <option value="all">Semua Jenis</option>
              <option value="transfer">Transfer Bank</option>
              <option value="tarik_tunai">Tarik Tunai</option>
              <option value="setor_tunai">Setor Tunai</option>
            </select>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500">
                  <th className="py-3 px-2">Tanggal / Ref</th>
                  <th className="py-3 px-2">Jenis</th>
                  <th className="py-3 px-2">Bank & Rekening</th>
                  <th className="py-3 px-2">Penerima/Pengirim</th>
                  <th className="py-3 px-2 text-right">Nominal</th>
                  <th className="py-3 px-2 text-right">Admin / Profit</th>
                  <th className="py-3 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-450 font-medium">Tidak ada transaksi BRILink ditemukan.</td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{new Date(tx.date).toLocaleDateString('id-ID')}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">{tx.refNumber}</div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          tx.transactionType === 'transfer' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' :
                          tx.transactionType === 'tarik_tunai' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {tx.transactionType === 'transfer' ? <Send size={10} /> : tx.transactionType === 'tarik_tunai' ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {tx.transactionType === 'transfer' ? 'Transfer' : tx.transactionType === 'tarik_tunai' ? 'Tarik Tunai' : 'Setor Tunai'}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium">
                        <div className="font-bold text-blue-600 dark:text-blue-400">{tx.bankName}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{tx.accountNumber}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{tx.recipientName}</div>
                        {tx.senderName && <div className="text-[10px] text-slate-450 mt-0.5">dari: {tx.senderName}</div>}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-slate-800 dark:text-slate-200">
                        Rp {tx.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">+{tx.adminFee.toLocaleString('id-ID')}</div>
                        <div className="text-[9px] text-blue-500 dark:text-blue-400 mt-0.5">Profit: {(tx.adminFee - tx.bankFee).toLocaleString('id-ID')}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedTxForReceipt(tx)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                            title="Tampilkan Struk"
                          >
                            <FileText size={14} />
                          </button>
                          <a
                            href={getWhatsAppReceiptUrl(tx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                            title="Bagikan via WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </a>
                          {['owner', 'admin'].includes(currentUser?.role || '') && (
                            <button
                              onClick={() => {
                                if (confirm('Hapus transaksi BRILink ini secara permanen?')) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mini Receipt Modal */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Struk Transaksi BRILink</span>
              <button 
                onClick={() => setSelectedTxForReceipt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
              >
                Tutup
              </button>
            </div>

            {/* Receipt Printable Area */}
            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-slate-800 bg-white">
              <div className="text-center space-y-1 mb-4">
                <span className="font-extrabold text-sm tracking-widest block">AGEN BRILINK KASIR PINTAR</span>
                <span className="text-[10px] text-slate-500 block">Jalan Terusan Mandiri No. 88, Malang</span>
                <span className="text-[10px] text-slate-500 block">HP: 0812-3456-7890</span>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref No:</span>
                  <span className="font-bold">{selectedTxForReceipt.refNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span>{new Date(selectedTxForReceipt.date).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operator:</span>
                  <span>{selectedTxForReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-600 font-bold">BERHASIL (Lunas)</span>
                </div>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis:</span>
                  <span className="font-extrabold uppercase">
                    {selectedTxForReceipt.transactionType === 'transfer' ? 'Transfer Bank' :
                     selectedTxForReceipt.transactionType === 'tarik_tunai' ? 'Tarik Tunai' : 'Setor Tunai'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank:</span>
                  <span>{selectedTxForReceipt.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Rek/Kartu:</span>
                  <span className="font-bold">{selectedTxForReceipt.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penerima:</span>
                  <span className="font-bold">{selectedTxForReceipt.recipientName}</span>
                </div>
                {selectedTxForReceipt.senderName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pengirim:</span>
                    <span>{selectedTxForReceipt.senderName}</span>
                  </div>
                )}
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal:</span>
                  <span className="font-bold">Rp {selectedTxForReceipt.amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Biaya Admin:</span>
                  <span className="font-bold">Rp {selectedTxForReceipt.adminFee.toLocaleString('id-ID')}</span>
                </div>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
                <div className="flex justify-between text-sm font-black">
                  <span>TOTAL:</span>
                  <span>Rp {(selectedTxForReceipt.transactionType === 'tarik_tunai' ? selectedTxForReceipt.amount : selectedTxForReceipt.amount + selectedTxForReceipt.adminFee).toLocaleString('id-ID')}</span>
                </div>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
              </div>

              <div className="text-center mt-4 space-y-1">
                <span className="block font-bold">Terima Kasih</span>
                <span className="text-[10px] text-slate-500 block">Simpan struk ini sebagai bukti transaksi sah</span>
                <span className="text-[9px] text-slate-400 block mt-2">Kasir Pintar v4.0</span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2">
              <a
                href={getWhatsAppReceiptUrl(selectedTxForReceipt)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer text-center"
              >
                <MessageSquare size={14} />
                Bagikan ke WhatsApp
              </a>
              <button
                onClick={() => { window.print(); }}
                className="w-full p-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Cetak Struk Fisik
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
