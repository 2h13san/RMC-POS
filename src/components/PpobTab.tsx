/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Zap, Droplet, Phone, Wifi, Shield, FileText, Trash2, 
  Search, Smartphone, HelpCircle, MessageSquare, Plus, RefreshCw, Layers
} from 'lucide-react';
import { PpobTransaction, User as UserType } from '../types';

interface PpobTabProps {
  transactions: PpobTransaction[];
  onAddTransaction: (tx: PpobTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentUser: UserType | null;
}

const PPOB_TYPES = [
  { id: 'pln', name: 'Token / Tagihan PLN', icon: Zap, color: 'text-amber-500 bg-amber-50' },
  { id: 'pulsa', name: 'Pulsa Seluler', icon: Smartphone, color: 'text-blue-500 bg-blue-50' },
  { id: 'data', name: 'Paket Data Internet', icon: Wifi, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'pdam', name: 'Tagihan Air PDAM', icon: Droplet, color: 'text-sky-500 bg-sky-50' },
  { id: 'bpjs', name: 'Iuran BPJS Kesehatan', icon: Shield, color: 'text-teal-500 bg-teal-50' },
  { id: 'internet', name: 'Internet Pascabayar', icon: Layers, color: 'text-indigo-500 bg-indigo-50' },
];

const PROVIDER_PRESETS: Record<string, { name: string; price: number; costPrice: number; adminFee: number }[]> = {
  pln: [
    { name: 'Token PLN Rp 20.000', price: 20000, costPrice: 20200, adminFee: 3000 },
    { name: 'Token PLN Rp 50.000', price: 50000, costPrice: 50200, adminFee: 3000 },
    { name: 'Token PLN Rp 100.000', price: 100000, costPrice: 100200, adminFee: 3000 },
    { name: 'Token PLN Rp 200.000', price: 200000, costPrice: 200200, adminFee: 3000 },
    { name: 'Tagihan Listrik Bulanan (PLN Pascabayar)', price: 0, costPrice: 0, adminFee: 3000 },
  ],
  pulsa: [
    { name: 'Pulsa Telkomsel 5.000', price: 5000, costPrice: 5350, adminFee: 2000 },
    { name: 'Pulsa Telkomsel 10.000', price: 10000, costPrice: 10350, adminFee: 2000 },
    { name: 'Pulsa Telkomsel 20.000', price: 20000, costPrice: 19900, adminFee: 2000 },
    { name: 'Pulsa Indosat 10.000', price: 10000, costPrice: 10450, adminFee: 2000 },
    { name: 'Pulsa XL Axiata 10.000', price: 10000, costPrice: 10400, adminFee: 2000 },
    { name: 'Pulsa Tri 10.000', price: 10000, costPrice: 10250, adminFee: 2000 },
  ],
  data: [
    { name: 'Telkomsel Flash 2.5GB 5 Hari', price: 15000, costPrice: 14200, adminFee: 2000 },
    { name: 'Telkomsel Flash 4GB 30 Hari', price: 38000, costPrice: 36500, adminFee: 2000 },
    { name: 'Indosat Freedom 3GB 30 Hari', price: 25000, costPrice: 23800, adminFee: 2000 },
    { name: 'XL Xtra Combo Flex 5GB', price: 30000, costPrice: 28500, adminFee: 2000 },
  ],
  pdam: [
    { name: 'PDAM Kota Malang', price: 0, costPrice: 0, adminFee: 3000 },
    { name: 'PDAM Kabupaten Malang', price: 0, costPrice: 0, adminFee: 3000 },
    { name: 'PDAM Kota Surabaya', price: 0, costPrice: 0, adminFee: 3000 },
  ],
  bpjs: [
    { name: 'BPJS Kesehatan Kelas 3', price: 35000, costPrice: 35000, adminFee: 3000 },
    { name: 'BPJS Kesehatan Kelas 2', price: 100000, costPrice: 100000, adminFee: 3000 },
    { name: 'BPJS Kesehatan Kelas 1', price: 150000, costPrice: 150000, adminFee: 3000 },
  ],
  internet: [
    { name: 'IndiHome / Telkom', price: 0, costPrice: 0, adminFee: 3500 },
    { name: 'Biznet Home', price: 0, costPrice: 0, adminFee: 3500 },
  ]
};

export default function PpobTab({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  currentUser
}: PpobTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'history'>('form');
  
  // Form State
  const [ppobType, setPpobType] = useState<'pln' | 'pdam' | 'pulsa' | 'data' | 'bpjs' | 'internet' | 'lainnya'>('pln');
  const [customerNumber, setCustomerNumber] = useState('');
  const [providerName, setProviderName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(3000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'non_cash'>('cash');
  const [notes, setNotes] = useState('');
  const [plnTokenNum, setPlnTokenNum] = useState(''); // Simulated Token

  // Search & Filter History
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Receipt Modal State
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<PpobTransaction | null>(null);

  const handleSelectPreset = (preset: typeof PROVIDER_PRESETS[string][0]) => {
    setProviderName(preset.name);
    setAmount(preset.price);
    setCostPrice(preset.costPrice || preset.price);
    setAdminFee(preset.adminFee);
    
    // Auto generate fake token number if PLN Token
    if (ppobType === 'pln' && preset.name.includes('Token')) {
      const parts = [];
      for (let i = 0; i < 4; i++) {
        parts.push(Math.floor(1000 + Math.random() * 9000).toString());
      }
      setPlnTokenNum(parts.join(' '));
    } else {
      setPlnTokenNum('');
    }
  };

  const handleSelectType = (type: any) => {
    setPpobType(type);
    setProviderName('');
    setAmount(0);
    setCostPrice(0);
    setPlnTokenNum('');
    if (['pln', 'pdam', 'bpjs', 'internet'].includes(type)) {
      setAdminFee(3000);
    } else {
      setAdminFee(2000);
    }
  };

  const resetForm = () => {
    setCustomerNumber('');
    setProviderName('');
    setAmount(0);
    setCostPrice(0);
    setNotes('');
    setPlnTokenNum('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerNumber.trim()) {
      alert('Nomor pelanggan / No. HP wajib diisi!');
      return;
    }
    if (!providerName.trim()) {
      alert('Pilih produk / provider terlebih dahulu!');
      return;
    }
    if (amount <= 0) {
      alert('Masukkan nominal transaksi yang valid!');
      return;
    }

    // Save PPOB transaction
    const finalNotes = notes.trim() + (plnTokenNum ? ` | Token: ${plnTokenNum}` : '');
    
    const newTx: PpobTransaction = {
      id: `ppob-${Math.random().toString(36).substring(2, 9)}`,
      ppobType,
      date: new Date().toISOString(),
      customerNumber: customerNumber.trim(),
      providerName: providerName.trim(),
      amount,
      costPrice: costPrice || amount,
      adminFee,
      totalAmount: amount + adminFee,
      paymentMethod,
      cashierId: currentUser?.id || 'unknown',
      cashierName: currentUser?.name || 'Sistem',
      status: 'success',
      notes: finalNotes || undefined
    };

    onAddTransaction(newTx);
    setSelectedTxForReceipt(newTx);
    resetForm();
    setActiveSubTab('history');
  };

  // Filter & Search Logic
  const filteredTransactions = transactions.filter(tx => {
    const matchSearch = 
      tx.customerNumber.includes(searchTerm) ||
      tx.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.includes(searchTerm);
    const matchType = filterType === 'all' || tx.ppobType === filterType;
    return matchSearch && matchType;
  });

  const getWhatsAppReceiptUrl = (tx: PpobTransaction) => {
    const storeHeader = `*LOKET PPOB KASIR PINTAR*\n------------------------------------------`;
    const txDetails = `*STRUK PEMBAYARAN DIGITAL*\nNo. Transaksi: *${tx.id.toUpperCase()}*\nTanggal: ${new Date(tx.date).toLocaleString('id-ID')}\nLayanan: *${tx.ppobType.toUpperCase()}*\nProduk: ${tx.providerName}\nNo. Pelanggan/HP: *${tx.customerNumber}*`;
    const tokenInfo = tx.notes && tx.notes.includes('Token:') 
      ? `\n*TOKEN LISTRIK:* _${tx.notes.split('Token:')[1].trim()}_` 
      : '';
    const financials = `\n------------------------------------------\n*Tagihan / Harga:* Rp ${tx.amount.toLocaleString('id-ID')}\n*Admin Loket:* Rp ${tx.adminFee.toLocaleString('id-ID')}\n------------------------------------------\n*TOTAL BAYAR:* *Rp ${tx.totalAmount.toLocaleString('id-ID')}*`;
    const footer = `\n------------------------------------------\nLunas & Sukses.\nSimpan struk ini sebagai bukti pembayaran sah.`;
    
    return `https://wa.me/?text=${encodeURIComponent(`${storeHeader}\n${txDetails}${tokenInfo}${financials}${footer}`)}`;
  };

  return (
    <div id="ppob-tab-container" className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Transaksi PPOB</span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 block mt-1">
            Rp {transactions.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Total {transactions.length} pembayaran</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Biaya Admin Terkumpul</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
            Rp {transactions.reduce((sum, tx) => sum + tx.adminFee, 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">Dari loket pembayaran</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Profit Bersih</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 block mt-1">
            Rp {transactions.reduce((sum, tx) => sum + tx.adminFee + (tx.amount - tx.costPrice), 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-blue-500/80 mt-1 block">Admin + Margin Pulsa/Token</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('form')}
          className={`py-2 px-4 font-bold text-xs border-b-2 transition-colors cursor-pointer ${activeSubTab === 'form' ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          📱 Transaksi PPOB Baru
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2 px-4 font-bold text-xs border-b-2 transition-colors cursor-pointer ${activeSubTab === 'history' ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          📂 Laporan & Riwayat ({filteredTransactions.length})
        </button>
      </div>

      {activeSubTab === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Menu PPOB Types Left Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-3">Pilih Kategori Layanan</span>
              <div className="space-y-1.5">
                {PPOB_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleSelectType(type.id)}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all border text-left text-xs cursor-pointer ${ppobType === type.id ? 'border-[#ef4444] bg-[#ef4444]/5 font-extrabold text-[#ef4444]' : 'border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <div className={`p-1.5 rounded-md ${type.color}`}>
                        <Icon size={14} />
                      </div>
                      <span>{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form & Preset Panel Right Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                  Layanan: {PPOB_TYPES.find(t => t.id === ppobType)?.name || ppobType.toUpperCase()}
                </h3>

                {/* Customer Number Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {['pulsa', 'data'].includes(ppobType) ? 'Nomor Handphone Pelanggan' : 'Nomor Pelanggan / ID Meter'}
                  </label>
                  <input
                    type="tel"
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value)}
                    placeholder={['pulsa', 'data'].includes(ppobType) ? 'Contoh: 08123456789' : 'Contoh: 53210987654'}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold font-mono outline-hidden focus:ring-2 focus:ring-[#ef4444]/15 focus:border-[#ef4444]"
                  />
                </div>

                {/* Preset packages for selected type */}
                {PROVIDER_PRESETS[ppobType] && (
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5">Pilih Preset Produk</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {PROVIDER_PRESETS[ppobType].map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-2 border.5 text-left rounded-lg text-[11px] transition-all cursor-pointer ${providerName === preset.name ? 'border-[#ef4444] bg-[#ef4444]/5 font-extrabold text-[#ef4444]' : 'border-slate-100 dark:border-slate-800 text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className="font-semibold block truncate">{preset.name}</div>
                          {preset.price > 0 ? (
                            <div className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">Rp {preset.price.toLocaleString('id-ID')}</div>
                          ) : (
                            <div className="text-[9px] italic text-rose-500 mt-0.5">Input manual tagihan</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Input Panel (Required for non-fixed prices or custom entries) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Produk / Deskripsi</label>
                    <input
                      type="text"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      placeholder="Contoh: Token PLN 50k / Paket Data XL"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nominal / Tagihan (Rp)</label>
                    <input
                      type="number"
                      value={amount || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAmount(val);
                        if (!costPrice) setCostPrice(val);
                      }}
                      placeholder="Rp 0"
                      required
                      min="1"
                      className="w-full p-2 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Biaya Admin Loket (Rp)</label>
                    <input
                      type="number"
                      value={adminFee || ''}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Harga Modal Server (Opt)</label>
                    <input
                      type="number"
                      value={costPrice || ''}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      placeholder="Sama dengan nominal"
                      className="w-full p-2 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Token PLN Box */}
                {plnTokenNum && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">Struk Token PLN Tersimulasi</span>
                    <span className="text-lg font-black font-mono text-amber-700 dark:text-amber-400 tracking-wider block mt-1">{plnTokenNum}</span>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Metode Bayar Pelanggan</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2 text-center text-xs font-bold rounded-lg border cursor-pointer ${paymentMethod === 'cash' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]' : 'border-slate-200 text-slate-500'}`}
                    >
                      💵 Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`p-2 text-center text-xs font-bold rounded-lg border cursor-pointer ${paymentMethod === 'qris' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]' : 'border-slate-200 text-slate-500'}`}
                    >
                      📊 QRIS
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('non_cash')}
                      className={`p-2 text-center text-xs font-bold rounded-lg border cursor-pointer ${paymentMethod === 'non_cash' ? 'border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]' : 'border-slate-200 text-slate-500'}`}
                    >
                      🏦 Non-Tunai
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Catatan</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: No Ref, Atas Nama, dll"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>

                {/* Total Billing */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150/40 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Profit Bersih Anda</span>
                    <span className="text-sm font-black text-emerald-600">
                      Rp {(adminFee + (amount - costPrice)).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Bayar Pelanggan</span>
                    <span className="text-lg font-black text-[#ef4444]">
                      Rp {(amount + adminFee).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl font-bold text-xs shadow-md transition-colors text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Simpan & Cetak Struk PPOB
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* History & Records List */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-400"><Search size={14} /></span>
              <input
                type="text"
                placeholder="Cari ID pelanggan, nomor hp, provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
            >
              <option value="all">Semua Layanan</option>
              <option value="pln">PLN</option>
              <option value="pulsa">Pulsa</option>
              <option value="data">Paket Data</option>
              <option value="pdam">PDAM</option>
              <option value="bpjs">BPJS</option>
              <option value="internet">Internet</option>
            </select>
          </div>

          {/* List table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500">
                  <th className="py-3 px-2">Tanggal / ID Transaksi</th>
                  <th className="py-3 px-2">Kategori</th>
                  <th className="py-3 px-2">Nomor Pelanggan / HP</th>
                  <th className="py-3 px-2">Deskripsi Produk</th>
                  <th className="py-3 px-2 text-right">Tagihan</th>
                  <th className="py-3 px-2 text-right">Biaya Admin</th>
                  <th className="py-3 px-2 text-right">Profit Bersih</th>
                  <th className="py-3 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-450 font-medium">Tidak ada transaksi PPOB ditemukan.</td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const profit = tx.adminFee + (tx.amount - tx.costPrice);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-2">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{new Date(tx.date).toLocaleDateString('id-ID')}</div>
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">{tx.id.toUpperCase()}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-semibold text-xs capitalize text-slate-700 dark:text-slate-300">
                            {tx.ppobType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold font-mono text-slate-800 dark:text-slate-200">
                          {tx.customerNumber}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-600 dark:text-slate-400">
                          {tx.providerName}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-slate-800 dark:text-slate-200">
                          Rp {tx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400 font-semibold">
                          Rp {tx.adminFee.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {profit.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTxForReceipt(tx)}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
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
                                  if (confirm('Hapus transaksi PPOB ini secara permanen?')) {
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
                    );
                  })
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
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Struk Pembayaran PPOB</span>
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
                <span className="font-extrabold text-sm tracking-widest block">LOKET PPOB MANDIRI KASIR</span>
                <span className="text-[10px] text-slate-500 block">Jalan Terusan Mandiri No. 88, Malang</span>
                <span className="text-[10px] text-slate-500 block">HP: 0812-3456-7890</span>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Transaksi:</span>
                  <span className="font-bold">{selectedTxForReceipt.id.toUpperCase()}</span>
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
                  <span className="text-slate-500">Layanan:</span>
                  <span className="font-bold uppercase">{selectedTxForReceipt.ppobType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Produk:</span>
                  <span className="font-bold">{selectedTxForReceipt.providerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Pelanggan/HP:</span>
                  <span className="font-black">{selectedTxForReceipt.customerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-600 font-bold">SUKSES / LUNAS</span>
                </div>

                {selectedTxForReceipt.notes && (
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-md text-[10px] mt-2 space-y-1">
                    <div className="font-bold uppercase text-slate-500 text-[8px]">Keterangan / Token:</div>
                    <div className="font-mono font-bold tracking-wider text-slate-800">{selectedTxForReceipt.notes}</div>
                  </div>
                )}

                <span className="block border-b border-dashed border-slate-300 my-2"></span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tagihan/Denom:</span>
                  <span className="font-bold">Rp {selectedTxForReceipt.amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admin Loket:</span>
                  <span className="font-bold">Rp {selectedTxForReceipt.adminFee.toLocaleString('id-ID')}</span>
                </div>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
                <div className="flex justify-between text-sm font-black">
                  <span>TOTAL:</span>
                  <span>Rp {selectedTxForReceipt.totalAmount.toLocaleString('id-ID')}</span>
                </div>
                <span className="block border-b border-dashed border-slate-300 my-2"></span>
              </div>

              <div className="text-center mt-4 space-y-1">
                <span className="block font-bold">Terima Kasih</span>
                <span className="text-[10px] text-slate-500 block">Struk ini adalah bukti pembayaran yang sah</span>
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
