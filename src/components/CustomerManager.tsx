/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, UserPlus, Edit2, Trash2, Search, DollarSign, Award, Phone, Mail, Plus, X, CheckCircle, 
  Wallet, ShieldCheck, HelpCircle, FileText, ArrowUpRight
} from 'lucide-react';
import { Customer, Transaction, User } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  onUpdateCustomers: (updated: Customer[]) => void;
  currentUser: User;
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
}

export default function CustomerManager({
  customers,
  onUpdateCustomers,
  currentUser,
  transactions,
  onAddTransaction
}: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Repayment Modal
  const [repayCustomer, setRepayCustomer] = useState<Customer | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'qris' | 'gopay' | 'ovo' | 'dana' | 'shopeepay'>('cash');

  // Point Redemption Modal
  const [redeemCustomer, setRedeemCustomer] = useState<Customer | null>(null);
  const [redeemOption, setRedeemOption] = useState<number>(100);
  const [generatedVoucher, setGeneratedVoucher] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [memberLevel, setMemberLevel] = useState<'regular' | 'gold' | 'platinum'>('regular');
  const [notes, setNotes] = useState('');
  const [initialDebt, setInitialDebt] = useState('0');

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Summary stats
  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);
  const totalDebt = customers.reduce((sum, c) => sum + c.debt, 0);
  const platinumGoldCount = customers.filter(c => c.memberLevel === 'platinum' || c.memberLevel === 'gold').length;

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterLevel === 'all') return true;
    if (filterLevel === 'has_debt') return c.debt > 0;
    return c.memberLevel === filterLevel;
  });

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setMemberLevel('regular');
    setNotes('');
    setInitialDebt('0');
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Nama dan nomor telepon wajib diisi!', 'warning');
      return;
    }

    const phoneExists = customers.some(c => c.phone === phone.trim());
    if (phoneExists) {
      showToast('Nomor telepon ini sudah terdaftar!', 'warning');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      memberLevel,
      points: 0,
      debt: parseFloat(initialDebt) || 0,
      notes: notes.trim() || undefined
    };

    const updated = [newCustomer, ...customers];
    onUpdateCustomers(updated);
    showToast(`Pelanggan "${newCustomer.name}" berhasil ditambahkan!`, 'success');
    setIsAddOpen(false);
    resetForm();
  };

  const handleStartEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setMemberLevel(cust.memberLevel);
    setNotes(cust.notes || '');
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!name.trim() || !phone.trim()) {
      showToast('Nama dan nomor telepon wajib diisi!', 'warning');
      return;
    }

    const phoneExists = customers.some(c => c.phone === phone.trim() && c.id !== editingCustomer.id);
    if (phoneExists) {
      showToast('Nomor telepon ini sudah terdaftar untuk pelanggan lain!', 'warning');
      return;
    }

    const updated = customers.map(c => {
      if (c.id === editingCustomer.id) {
        return {
          ...c,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          memberLevel,
          notes: notes.trim() || undefined
        };
      }
      return c;
    });

    onUpdateCustomers(updated);
    showToast(`Data pelanggan "${name}" berhasil diperbarui!`, 'success');
    setEditingCustomer(null);
    resetForm();
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${name}"? Semua data point dan piutang akan terhapus.`)) {
      const updated = customers.filter(c => c.id !== id);
      onUpdateCustomers(updated);
      showToast(`Pelanggan "${name}" berhasil dihapus.`, 'warning');
    }
  };

  // Process debt payment (Bayar Piutang)
  const handleRepayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayCustomer) return;

    const amount = parseFloat(repayAmount) || 0;
    if (amount <= 0) {
      showToast('Masukkan jumlah pembayaran yang valid!', 'warning');
      return;
    }

    if (amount > repayCustomer.debt) {
      showToast(`Jumlah pembayaran melebihi total piutang (${formatIDR(repayCustomer.debt)})!`, 'warning');
      return;
    }

    // 1. Update customer debt balance
    const updated = customers.map(c => {
      if (c.id === repayCustomer.id) {
        return {
          ...c,
          debt: Math.max(0, c.debt - amount)
        };
      }
      return c;
    });

    onUpdateCustomers(updated);

    // 2. Insert transaction history so accounting is clean
    const invoicePrefix = repayMethod === 'cash' ? 'PAY-TUNAI' : 'PAY-DIJ';
    const invoiceNum = `${invoicePrefix}/${new Date().toISOString().slice(0,10).replace(/-/g,'')}/${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`;

    const paymentTx: Transaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: invoiceNum,
      date: new Date().toISOString(),
      items: [
        {
          productId: 'repay-debt',
          sku: 'PAY-PIUTANG',
          name: `Pembayaran Piutang - ${repayCustomer.name}`,
          price: amount,
          costPrice: 0, // No COGS for debt repayment
          qty: 1,
          discount: 0,
          total: amount
        }
      ],
      subTotal: amount,
      discountTotal: 0,
      taxTotal: 0,
      total: amount,
      paymentMethod: repayMethod === 'cash' ? 'cash' : repayMethod,
      cashAmount: repayMethod === 'cash' ? amount : undefined,
      changeAmount: repayMethod === 'cash' ? 0 : undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerId: repayCustomer.id,
      customerName: repayCustomer.name
    };

    onAddTransaction(paymentTx);

    showToast(`Berhasil menerima pembayaran piutang ${formatIDR(amount)} dari ${repayCustomer.name}!`, 'success');
    setRepayCustomer(null);
    setRepayAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 text-xs font-semibold ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900 dark:text-emerald-300' : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-950/80 dark:border-amber-900 dark:text-amber-300'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Summary Statistics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider">Total Pelanggan</div>
            <div className="text-base font-black text-slate-800 dark:text-slate-100">{totalCustomers} orang</div>
          </div>
        </div>

        {/* Total Points Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider">Total Poin Member</div>
            <div className="text-base font-black text-slate-800 dark:text-slate-100">{totalPoints} Pts</div>
          </div>
        </div>

        {/* Total Debt Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl">
            <DollarSign size={18} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider">Total Piutang (Tempo)</div>
            <div className="text-base font-black text-slate-800 dark:text-slate-100">{formatIDR(totalDebt)}</div>
          </div>
        </div>

        {/* VIP Level Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider">Member VIP (G/P)</div>
            <div className="text-base font-black text-slate-800 dark:text-slate-100">{platinumGoldCount} member</div>
          </div>
        </div>
      </div>

      {/* Top Bar with Search & Action Button */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama, nomor HP, email pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 pl-10 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-250 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] transition-all"
            />
          </div>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-250 outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer"
          >
            <option value="all">Semua Level Member</option>
            <option value="regular">Member Regular</option>
            <option value="gold">Member Gold (Diskon 5%)</option>
            <option value="platinum">Member Platinum (Diskon 10%)</option>
            <option value="has_debt">Memiliki Tunggakan (Piutang)</option>
          </select>
        </div>

        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="p-2.5 px-4 bg-[#78c953] hover:bg-[#68b544] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap justify-center"
        >
          <UserPlus size={14} />
          Tambah Pelanggan Baru
        </button>
      </div>

      {/* Main Grid: Left Customer List, Right Add/Edit Widget on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Customer List Container */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/25">
              <h3 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-[#78c953]" />
                Database Pelanggan ({filteredCustomers.length})
              </h3>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
                <p className="text-xs font-semibold text-slate-505 dark:text-slate-500">Tidak ada pelanggan terdaftar.</p>
                <p className="text-[10px] text-slate-400 mt-1">Coba kata kunci pencarian lain atau tambahkan baru.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold bg-slate-50/20">
                      <th className="p-4 py-3 font-bold">Pelanggan</th>
                      <th className="p-4 py-3 font-bold">Level Member</th>
                      <th className="p-4 py-3 font-bold text-center">Poin</th>
                      <th className="p-4 py-3 font-bold text-right">Piutang (Debt)</th>
                      <th className="p-4 py-3 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                    {filteredCustomers.map(c => {
                      const levelColors = {
                        platinum: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
                        gold: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
                        regular: 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-100 dark:border-slate-800'
                      };

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/15 transition-all">
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{c.name}</div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                              <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>
                              {c.email && <span className="flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                            </div>
                            {c.notes && (
                              <p className="text-[9.5px] italic text-slate-400 dark:text-slate-500 mt-1 font-mono">
                                Notes: {c.notes}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${levelColors[c.memberLevel]}`}>
                              {c.memberLevel}
                            </span>
                          </td>
                          <td className="p-4 text-center font-extrabold text-slate-700 dark:text-slate-300">
                            {c.points} Pts
                          </td>
                          <td className="p-4 text-right">
                            {c.debt > 0 ? (
                              <div className="space-y-1">
                                <div className="font-extrabold text-red-600 dark:text-red-400">
                                  {formatIDR(c.debt)}
                                </div>
                                <button
                                  onClick={() => {
                                    setRepayCustomer(c);
                                    setRepayAmount(c.debt.toString());
                                  }}
                                  className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/40 dark:text-red-300 font-extrabold text-[9px] uppercase rounded-md border border-red-100 dark:border-red-900/30 cursor-pointer tracking-wider"
                                >
                                  Bayar Piutang
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 justify-end">
                                <ShieldCheck size={11} /> Lunas
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {c.points > 0 && (
                                <button
                                  onClick={() => {
                                    setRedeemCustomer(c);
                                    setGeneratedVoucher(null);
                                    setRedeemOption(100);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                  title="Tukar Poin Loyalty"
                                >
                                  <Award size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => handleStartEdit(c)}
                                className="p-1.5 text-slate-500 hover:text-[#78c953] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                title="Edit Pelanggan"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(c.id, c.name)}
                                className="p-1.5 text-slate-500 hover:text-red-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Pelanggan"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Side Widget */}
        <div className="space-y-4">
          {(isAddOpen || editingCustomer) ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 p-5 shadow-xs relative">
              <button
                onClick={() => { setIsAddOpen(false); setEditingCustomer(null); resetForm(); }}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X size={16} />
              </button>

              <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserPlus size={14} className="text-[#78c953]" />
                {editingCustomer ? `Edit: ${editingCustomer.name}` : 'Tambah Pelanggan Baru'}
              </h3>

              <form onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Nomor WhatsApp/HP *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Alamat Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="Contoh: budi@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Level Member</label>
                  <select
                    value={memberLevel}
                    onChange={(e) => setMemberLevel(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                  >
                    <option value="regular">Regular Member (Normal)</option>
                    <option value="gold">Gold Member (Diskon 5%)</option>
                    <option value="platinum">Platinum Member (Diskon 10%)</option>
                  </select>
                </div>

                {!editingCustomer && (
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Saldo Hutang/Piutang Awal (Opsional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={initialDebt}
                        onChange={(e) => setInitialDebt(e.target.value)}
                        className="w-full p-2 pl-9 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Gunakan bila pelanggan memiliki tunggakan/bon yang belum lunas sebelumnya.</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Catatan Keterangan</label>
                  <textarea
                    placeholder="Contoh: Suka bayar mingguan"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full p-2.5 bg-[#78c953] hover:bg-[#68b544] text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
                >
                  {editingCustomer ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-slate-900 dark:to-slate-950/50 p-5 rounded-2xl border border-emerald-150/50 dark:border-slate-850 shadow-xs">
              <Award className="text-[#78c953] mb-3" size={24} />
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Program Loyalty & Piutang</h4>
              <p className="text-slate-505 dark:text-slate-400 text-[10.5px] leading-relaxed">
                Database pelanggan mendukung diskon member khusus secara otomatis, pencatatan pinjaman/piutang (bon), dan poin loyalty:
              </p>
              <ul className="mt-3 space-y-2 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#78c953] rounded-full mt-1 shrink-0" />
                  <span><strong>Gold Member:</strong> Diskon otomatis 5% untuk setiap pembelian POS.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#78c953] rounded-full mt-1 shrink-0" />
                  <span><strong>Platinum Member:</strong> Diskon otomatis 10% untuk setiap pembelian POS.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#78c953] rounded-full mt-1 shrink-0" />
                  <span><strong>Loyalty Points:</strong> Mendapatkan 1 poin setiap belanja kelipatan Rp 10.000.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#78c953] rounded-full mt-1 shrink-0" />
                  <span><strong>Transaksi Piutang:</strong> Dapat melakukan transaksi "Bayar Nanti/Bon" langsung pada POS kasir.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Pay Debt Repayment Modal */}
      {repayCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200/50 dark:border-slate-800 p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => { setRepayCustomer(null); setRepayAmount(''); }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wallet className="text-red-500" size={16} />
              Terima Pembayaran Piutang
            </h3>
            <p className="text-[11px] text-slate-405 dark:text-slate-400 mb-4 font-medium">
              Pelanggan: <strong className="text-slate-700 dark:text-slate-200">{repayCustomer.name}</strong> ({repayCustomer.phone})
            </p>

            <form onSubmit={handleRepayDebt} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex justify-between items-center text-xs">
                <span className="text-slate-450 dark:text-slate-500 font-bold">Total Piutang Berjalan:</span>
                <span className="font-black text-red-600 dark:text-red-400">{formatIDR(repayCustomer.debt)}</span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Jumlah Pembayaran (IDR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    max={repayCustomer.debt}
                    placeholder="Masukkan nominal"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 block mb-1">Metode Pembayaran</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] text-slate-700 dark:text-slate-200"
                >
                  <option value="cash">Tunai / Cash</option>
                  <option value="qris">QRIS Dinamis</option>
                  <option value="gopay">GoPay</option>
                  <option value="ovo">OVO</option>
                  <option value="dana">DANA</option>
                  <option value="shopeepay">ShopeePay</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition-colors cursor-pointer shadow-md shadow-emerald-100 dark:shadow-none"
              >
                Konfirmasi Terima Uang
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
