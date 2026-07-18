/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, AlertTriangle, Download, 
  FileSpreadsheet, FileText, Calendar, Filter, ArchiveRestore, Coins,
  Plus, Clock, ArrowRight, User as UserIcon, Coffee, Award, Send, RefreshCw, Sliders,
  ShieldCheck, CheckCircle2, ChevronRight, HelpCircle, Sparkles, X, Info, Printer, FileCheck, Edit2,
  Eye, EyeOff
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Product, StoreSettings, User, Category } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  onNavigateToStock: () => void;
  storeSettings?: StoreSettings;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
  users: User[];
  onUpdateUsers: (updated: User[]) => void;
}

export default function Dashboard({ 
  transactions, 
  products, 
  categories = [],
  onNavigateToStock,
  storeSettings,
  onTriggerSync,
  isSyncing = false,
  users = [],
  onUpdateUsers
}: DashboardProps) {
  const [dateRange, setDateRange] = useState<'all' | '7days' | 'today'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormUsername, setEditFormUsername] = useState('');
  const [editFormPassword, setEditFormPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleSaveUserCredentials = () => {
    if (!editingUser) return;
    setEditUserError(null);

    const cleanName = editFormName.trim();
    const cleanUsername = editFormUsername.trim().toLowerCase();
    const cleanPassword = editFormPassword.trim();

    if (!cleanName) {
      setEditUserError("Nama personel tidak boleh kosong!");
      return;
    }
    if (!cleanUsername) {
      setEditUserError("Username tidak boleh kosong!");
      return;
    }
    if (cleanUsername.includes(" ")) {
      setEditUserError("Username tidak boleh mengandung spasi!");
      return;
    }
    if (cleanPassword.length < 4) {
      setEditUserError("Password minimal terdiri dari 4 karakter!");
      return;
    }

    // Check if username is already taken by another user
    const isTaken = users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === cleanUsername);
    if (isTaken) {
      setEditUserError(`Username "${cleanUsername}" sudah digunakan oleh personel lain!`);
      return;
    }

    const updated = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: cleanName,
          username: cleanUsername,
          password: cleanPassword
        };
      }
      return u;
    });

    onUpdateUsers(updated);
    setEditingUser(null);
  };

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
  };

  // Safe color palettes matching the reference UI colors
  const PIE_COLORS = ['#34d399', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

  // Default store settings fallbacks if not supplied
  const activeStoreName = storeSettings?.name || "KASIR PINTAR COFFEE & EATERY";
  const activeStoreAddress = storeSettings?.address || "Jl. Sudirman No. 45, Jakarta";

  // Filter transactions based on dateRange and selectedMonth
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      const now = new Date();
      
      // Date Range Filter
      if (dateRange === 'today') {
        const isToday = txDate.toDateString() === now.toDateString();
        if (!isToday) return false;
      } else if (dateRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (txDate < sevenDaysAgo) return false;
      }

      // Monthly filter
      if (selectedMonth !== 'all') {
        const txMonth = txDate.getMonth() + 1; // 1-12
        const txYear = txDate.getFullYear();
        const [filterYear, filterMonth] = selectedMonth.split('-');
        if (txYear !== parseInt(filterYear) || txMonth !== parseInt(filterMonth)) {
          // Check format of selectedMonth which might be e.g. "2026-06"
          return false;
        }
      }

      return true;
    });
  }, [transactions, dateRange, selectedMonth]);

  // Aggregate Key Analytics Metrics
  const metrics = useMemo(() => {
    let salesTotal = 0;
    let costTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const ordersCount = filteredTransactions.length;

    filteredTransactions.forEach(t => {
      salesTotal += t.total;
      discountTotal += t.discountTotal;
      taxTotal += t.taxTotal;
      t.items.forEach(item => {
        costTotal += ((item.costPrice || 0) * item.qty);
      });
    });

    // Handle initial edge case seeds where cost price is 0
    if (costTotal === 0 && salesTotal > 0) {
      costTotal = Math.round(salesTotal * 0.45); // estimate standard food cost (HPP)
    }

    const netProfit = Math.max(0, salesTotal - costTotal - taxTotal);
    const profitMargin = salesTotal > 0 ? Math.round((netProfit / salesTotal) * 100) : 0;
    const averageOrderValue = ordersCount > 0 ? Math.round(salesTotal / ordersCount) : 0;

    return {
      revenue: salesTotal,
      costOfGoods: costTotal,
      discounts: discountTotal,
      tax: taxTotal,
      profit: netProfit,
      margin: profitMargin,
      orders: ordersCount,
      avgValue: averageOrderValue,
    };
  }, [filteredTransactions]);

  // Low stock inventory items count
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Daily Sales & Expenses Chart Data
  const dailySalesData = useMemo(() => {
    const datesMap: { [key: string]: { dateStr: string; Revenue: number; Expenses: number; Profit: number; count: number } } = {};
    
    // Seed the map with empty values for past week days to prevent completely blank chart
    const daysToSeed = dateRange === '7days' ? 7 : 10;
    for (let i = daysToSeed - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      datesMap[dateString] = {
        dateStr: dateString,
        Revenue: 0,
        Expenses: 0,
        Profit: 0,
        count: 0
      };
    }

    filteredTransactions.forEach(t => {
      const dateString = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      let tCost = 0;
      t.items.forEach(item => {
        tCost += ((item.costPrice || 0) * item.qty);
      });
      if (tCost === 0) {
        tCost = Math.round(t.total * 0.45); // estimate HPP fallback
      }

      const tProfit = Math.max(0, t.total - tCost - t.taxTotal);

      if (!datesMap[dateString]) {
        datesMap[dateString] = {
          dateStr: dateString,
          Revenue: 0,
          Expenses: 0,
          Profit: 0,
          count: 0
        };
      }
      datesMap[dateString].Revenue += t.total;
      datesMap[dateString].Expenses += (tCost + t.taxTotal);
      datesMap[dateString].Profit += tProfit;
      datesMap[dateString].count += 1;
    });

    return Object.values(datesMap).sort((a, b) => {
      // Basic chronological placeholder sorting 
      return 1;
    });
  }, [filteredTransactions, dateRange]);

  // Popular categories calculation
  const popularCategoriesData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    
    // Initialize map with all categories from the system (real-time!)
    categories.forEach(cat => {
      categoriesMap[cat.name] = 0;
    });

    // Also populate any products categories that are not in categories array just in case
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const catName = prod?.category || "Lain-lain";
        if (catName) {
          if (categoriesMap[catName] === undefined) {
            categoriesMap[catName] = 0;
          }
          categoriesMap[catName] += item.total;
        }
      });
    });

    // Convert to array
    const sortedData = Object.entries(categoriesMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    if (sortedData.length === 0) {
      return [
        { name: "Umum", value: 1, actualValue: 0 }
      ];
    }

    const totalRevenue = sortedData.reduce((sum, item) => sum + item.value, 0);

    return sortedData.map(item => ({
      name: item.name,
      value: totalRevenue > 0 ? item.value : 1, // equal slice if no sales, but actual total is 0
      actualValue: item.value // track actual sales for tooltip or display
    })).slice(0, 4);
  }, [filteredTransactions, products, categories]);

  // Active cashier personnel tracking
  const cashiersActivity = useMemo(() => {
    const getInitialsLocal = (fullName: string) => {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 0 || !parts[0]) return "??";
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    };

    // Initialize list from actual users in the database / state
    const activeUsersList = users.length > 0 ? users : [
      { id: 'user-1', username: 'owner', password: 'owner123', name: 'Adi Pemilik', role: 'owner', active: true },
      { id: 'user-2', username: 'admin', password: 'admin123', name: 'Fajar Admin', role: 'admin', active: true },
      { id: 'user-3', username: 'kasir', password: 'kasir123', name: 'Rina Kasir', role: 'cashier', active: true }
    ];

    // Create entries for each user
    const usersMap = activeUsersList.reduce((acc, u) => {
      acc[u.id] = {
        id: u.id,
        name: u.name,
        initials: getInitialsLocal(u.name),
        count: 0,
        totalSales: 0,
        roleKey: u.role,
        username: u.username
      };
      return acc;
    }, {} as { [key: string]: { id: string; name: string; initials: string; count: number; totalSales: number; roleKey: string; username: string } });

    // Count actual transactions for each user
    filteredTransactions.forEach(t => {
      // Find user by matching cashierName exactly or case-insensitively, or falling back to part match
      const matchedUser = activeUsersList.find(u => 
        u.name.toLowerCase() === t.cashierName.toLowerCase() || 
        t.cashierName.toLowerCase().includes(u.name.toLowerCase()) ||
        u.name.toLowerCase().includes(t.cashierName.toLowerCase())
      );

      if (matchedUser) {
        usersMap[matchedUser.id].count += 1;
        usersMap[matchedUser.id].totalSales += t.total;
      } else {
        // Fallback or match by roles if we have some pre-defined roles and custom cashierName
        const nameKey = t.cashierName.toLowerCase();
        let matchedRole = 'cashier';
        if (nameKey.includes('owner') || nameKey.includes('adi')) {
          matchedRole = 'owner';
        } else if (nameKey.includes('admin') || nameKey.includes('fajar')) {
          matchedRole = 'admin';
        }

        const userWithRole = activeUsersList.find(u => u.role === matchedRole || (matchedRole === 'cashier' && u.role === 'cashier'));
        if (userWithRole) {
          usersMap[userWithRole.id].count += 1;
          usersMap[userWithRole.id].totalSales += t.total;
        }
      }
    });

    return Object.values(usersMap);
  }, [filteredTransactions, users]);

  // Click on "Send" in the debit card to invoke sheets syncing
  const handleQuickSheetSync = async () => {
    if (onTriggerSync) {
      setSyncFeedback("Memulai sinkronisasi...");
      try {
        await onTriggerSync();
        setSyncFeedback("Sync Google Sheets Sukses!");
        setTimeout(() => setSyncFeedback(null), 3000);
      } catch (err) {
        setSyncFeedback("Gagal Sync. Silakan periksa URL.");
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    } else {
      setSyncFeedback("Fungsi Sync tidak terdaftar.");
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Invoice,Tanggal,Subtotal,Diskon,Pajak,Total,Pembayaran,Kasir\n";
    filteredTransactions.forEach(t => {
      const row = [t.id, t.invoiceNumber, t.date, t.subTotal, t.discountTotal, t.taxTotal, t.total, t.paymentMethod, `"${t.cashierName}"`].join(",");
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Kasir_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* 1. Header Row (Dashboard Title and Date filter) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs transition-colors duration-200">
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium select-none">
            Pantau kinerja keuangan outlet dan rincian transaksi kasir Anda secara modern & real-time.
          </p>
        </div>

        {/* Date search and quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Tabs */}
          <div className="flex border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-1">
            <button
              onClick={() => { setDateRange('all'); setSelectedMonth('all'); }}
              className={`p-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${dateRange === 'all' && selectedMonth === 'all' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}
            >
              Semua
            </button>
            <button
              onClick={() => { setDateRange('7days'); setSelectedMonth('all'); }}
              className={`p-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${dateRange === '7days' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}
            >
              7 Hari ini
            </button>
            <button
              onClick={() => { setDateRange('today'); setSelectedMonth('all'); }}
              className={`p-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${dateRange === 'today' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}
            >
              Hari ini
            </button>
          </div>

          {/* Month Dropdown filter */}
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setDateRange('all'); }}
            className="p-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Pilih Bulan</option>
            <option value="2026-06">Juni 2026</option>
            <option value="2026-05">Mei 2026</option>
            <option value="2026-04">April 2026</option>
          </select>

          {/* Export action */}
          <button
            onClick={handleExportCSV}
            className="p-1.5 px-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 dark:hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Download size={11} />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* 2. Critical Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200 text-xs">Peringatan: Stok Tipis!</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                Terdapat <strong>{lowStockItems.length} produk</strong> yang sudah di bawah batas minimum. Kami sarankan untuk segera restock.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToStock}
            className="p-1 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
          >
            Kelola Stok Sekarang
          </button>
        </div>
      )}

      {/* 3. Main Bento Row: Balance & Volume overview chart (Left) + Top Metrics (Center) + My Card / Cashier Team (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Main Balance & Volume Bar Chart (Colspan 5) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs lg:col-span-6 flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Total Volume Penjualan</span>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  {formatIDR(metrics.revenue)}
                </h2>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium block">Visual grafik omset, beban pokok & keuntungan kotor</span>
              </div>
              <div className="flex items-center gap-1.5 select-none text-[8.5px] font-bold">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100"></span>
                <span className="text-slate-500 dark:text-slate-400 mr-2">Omset</span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-500 dark:text-slate-400 mr-2">Beban Pokok</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#78c953]"></span>
                <span className="text-slate-500 dark:text-slate-400">Laba Bersih</span>
              </div>
            </div>

            {/* Custom rounded Bar Chart */}
            <div className="h-[235px] w-full mt-4">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(v: any) => [formatIDR(Number(v)), '']}
                      contentStyle={{ background: isDark ? '#020617' : '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '10px', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="Revenue" fill={isDark ? '#cbd5e1' : '#0f172a'} radius={[3, 3, 0, 0]} barSize={10} />
                    <Bar dataKey="Expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={10} />
                    <Bar dataKey="Profit" fill="#78c953" radius={[3, 3, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                  Belum ada transaksi terekam untuk visualisasi grafik.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-50 dark:border-slate-800/60 pt-3 mt-3 flex justify-between items-center text-[9px] text-slate-450 dark:text-slate-400 font-medium">
            <span>Pembaharuan data: Otomatis (Real-time)</span>
            <span className="flex items-center gap-1 text-[#78c953] font-bold">
              <CheckCircle2 size={10} /> POS Sinkron
            </span>
          </div>
        </div>

        {/* Center: Numeric Summary Cards Column (Colspan 3) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-4">
          
          {/* Card 1: Total Omset */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col justify-between hover:bg-slate-50/20 dark:hover:bg-slate-850/50 transition-all duration-200">
            <div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Omset</span>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{formatIDR(metrics.revenue)}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-900 dark:text-slate-200 font-bold mt-2">
              <TrendingUp size={12} className="text-[#78c953]" />
              <span>+5.1% dibanding bulan lalu</span>
            </div>
          </div>

          {/* Card 2: Total Beban Pokok (HPP) */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col justify-between hover:bg-slate-50/20 dark:hover:bg-slate-850/50 transition-all duration-200">
            <div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Beban Pokok (HPP)</span>
              <div className="text-lg font-extrabold text-slate-700 dark:text-slate-200 mt-1">{formatIDR(metrics.costOfGoods)}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-2">
              <ArchiveRestore size={12} className="text-amber-500" />
              <span>15.5% dari rata-rata margin</span>
            </div>
          </div>

          {/* Card 3: Saved Profit Bersih */}
          <div className="bg-[#78c953]/15 dark:bg-[#78c953]/10 p-4.5 rounded-2xl border border-[#78c953]/25 dark:border-[#78c953]/20 flex-1 flex flex-col justify-between hover:bg-[#78c953]/20 transition-all duration-200">
            <div>
              <span className="text-[9px] font-bold text-emerald-800 dark:text-[#78c953] uppercase tracking-widest block">Laba / (Rugi) Bersih (Otomatis)</span>
              <div className={`text-lg font-extrabold mt-1 ${metrics.profit >= 0 ? 'text-emerald-700 dark:text-emerald-450' : 'text-red-650 dark:text-red-400'}`}>
                {formatIDR(metrics.profit)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-[#78c953] font-medium mt-2">
              <Sparkles size={11} className="text-[#78c953] animate-pulse" />
              <span>Keuntungan bersih dihitung otomatis</span>
            </div>
          </div>

        </div>

        {/* Right: Active Cashier List Only (Colspan 3) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs lg:col-span-3 flex flex-col justify-between transition-colors duration-200">
          
          <div>
            {/* Header info */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#78c953] animate-pulse"></span>
                Kasir Berjaga Aktif
              </span>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-505">Live POS</span>
            </div>

            <p className="text-[11px] text-slate-450 dark:text-slate-400 mb-4 leading-relaxed font-medium">
              Ringkasan kasir yang bertugas serta performa nominal transaksi ril mereka hari ini.
            </p>

            <div className="space-y-3.5">
              {cashiersActivity.map((cash, i) => {
                let roleLabel = "Pemilik Toko";
                let badgeColor = "bg-[#78c953]/10 text-emerald-800 border-[#78c953]/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
                let avatarColor = "bg-[#78c953]/15 text-[#78c953] dark:bg-[#78c953]/20";
                
                if (cash.roleKey === 'admin') {
                  roleLabel = "Staf Admin";
                  badgeColor = "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
                  avatarColor = "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400";
                } else if (cash.roleKey === 'cashier') {
                  roleLabel = "Kasir Utama";
                  badgeColor = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
                  avatarColor = "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400";
                }

                return (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col gap-2.5 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-xs font-black uppercase shadow-sm`}>
                            {cash.initials}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#78c953] border-2 border-white dark:border-slate-900"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 group/name min-w-0">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 font-sans tracking-tight leading-none truncate max-w-[100px]" title={cash.name}>{cash.name}</h4>
                            <button
                              onClick={() => {
                                const actualUser = users.find(u => u.id === cash.id);
                                if (actualUser) {
                                  setEditingUser(actualUser);
                                  setEditFormName(actualUser.name);
                                  setEditFormUsername(actualUser.username);
                                  setEditFormPassword(actualUser.password || `${actualUser.username}123`);
                                  setShowEditPassword(false);
                                  setEditUserError(null);
                                }
                              }}
                              className="p-0.5 text-slate-400 hover:text-[#78c953] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors opacity-0 group-hover/name:opacity-100 focus:opacity-100 cursor-pointer shrink-0"
                              title="Kelola Akun & Password"
                            >
                              <Edit2 size={9.5} />
                            </button>
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-1 block leading-none">{roleLabel}</span>
                        </div>
                      </div>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                        AKTIF
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/60 pt-2 text-[9px] font-medium text-slate-500">
                      <div>
                        <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Nota Selesai</span>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5 block">{cash.count} Transaksi</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Total Omset</span>
                        <span className="text-xs font-extrabold text-[#78c953] mt-0.5 block">{formatIDR(cash.totalSales)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-[9px] text-slate-450 dark:text-slate-400 font-medium">
            <span>Sesi Berjalan: 24 Jam</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#78c953] animate-ping"></span>
              Jaringan Stabil
            </span>
          </div>

        </div>

      </div>

      {/* 4. Lower Bento Row: Progress bar limit, Optimize advice tips, Cost category analysis, Financial radial score */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Bento Widget 1: Spending Limit / Target Omset Bulanan (Colspan 3) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs lg:col-span-3 flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Target Omset Bulanan</span>
                <h3 className="text-sm font-extrabold font-sans text-slate-800 dark:text-slate-100 mt-1">Rp 10.000.000</h3>
              </div>
              <Sliders size={12} className="text-slate-400 dark:text-slate-500" />
            </div>

            {/* Custom Progress bar matching monthly spending limit visual design */}
            <div className="mt-4">
              <div className="flex justify-between text-[8px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                <span>Pencapaian: {formatIDR(metrics.revenue)}</span>
                <span>Terlampaui</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (metrics.revenue / 10000000) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-2">
                Sasaran target omset per bulan diset ke Rp 10.000.000.
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-50 dark:border-slate-800/60 pt-2 text-[8.5px] font-bold text-emerald-650 dark:text-emerald-400 flex justify-between">
            <span>Progress Target</span>
            <span>{Math.round((metrics.revenue / 10000000) * 100)}% Selesai</span>
          </div>
        </div>

        {/* Bento Widget 2: Optimize Budget & Tips (Colspan 3) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs lg:col-span-3 flex flex-col justify-between transition-colors duration-200">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Tips Optimalkan Profit</span>
            <h3 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 mt-1 leading-snug">
              Bagaimana cara menghemat modal & melipatgandakan untung outlet?
            </h3>
            
            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
              Tekan harga kulaan (HPP) hingga maksimal 35% dari harga jual. Optimalkan menu kopi yang memiliki volume profit terbesar dan singkirkan menu slow-moving yang mengendap di kulkas!
            </p>
          </div>

          <div className="mt-3">
            <button 
              onClick={() => setIsTipsOpen(true)}
              className="text-[9.5px] font-extrabold text-slate-900 dark:text-slate-200 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Baca Tips Selengkapnya <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Bento Widget 3: Cost analysis breakdown PieChart (Colspan 3) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs lg:col-span-3 flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Kategori Terlaris (Kinerja Omset)</span>
              <span className="text-[8px] text-slate-400 dark:text-slate-500">Porsi Channel</span>
            </div>

            {/* Circle Donut Breakdown Chart */}
            <div className="h-[105px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {popularCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, entry) => formatIDR(entry.payload?.actualValue !== undefined ? entry.payload.actualValue : Number(value))} 
                    contentStyle={{ background: isDark ? '#020617' : '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '10px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Labels list */}
            <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-bold text-slate-600 dark:text-slate-300 mt-1 select-none">
              {popularCategoriesData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                  <span className="truncate" title={entry.name}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bento Widget 4: Financial Health Radial Gauge (Colspan 3) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs lg:col-span-3 flex flex-col justify-between text-center transition-colors duration-200">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Kesehatan Finansial</span>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">Rating rasio laba bersih / omset</p>

            {/* Radial semi-arch meter using customized SVG path */}
            <div className="relative flex flex-col items-center justify-center h-20 mt-3 overflow-visible">
              <div className="relative">
                <svg className="w-28 h-14 overflow-visible" viewBox="0 0 100 55">
                  {/* Background track */}
                  <path
                    d="M 15 50 A 35 35 0 0 1 85 50"
                    fill="none"
                    stroke="#f1f5f9"
                    className="stroke-[#f1f5f9] dark:stroke-slate-800"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Active fill */}
                  <path
                    d="M 15 50 A 35 35 0 0 1 85 50"
                    fill="none"
                    stroke={metrics.margin >= 50 ? '#10b981' : metrics.margin >= 30 ? '#3b82f6' : metrics.margin >= 15 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={109.95}
                    strokeDashoffset={109.95 - (Math.min(100, Math.max(0, metrics.margin)) / 100) * 109.95}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-x-0 bottom-0.5 flex flex-col items-center justify-center">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">{metrics.margin}%</span>
                  <span className="text-[7.5px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                    {metrics.margin >= 45 ? "SEHAT" : metrics.margin >= 25 ? "STANDAR" : "WARNING"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-slate-450 dark:text-slate-500 mt-1">
            Rasio dihitung berdasarkan keuntungan bersih dikurangi harga modal dan PPN.
          </p>
        </div>

      </div>

      {/* 5. Automatic Financial Report Breakdown Table (Daily details) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150/70 dark:border-slate-800 shadow-2xs transition-colors duration-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 select-none">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Laporan Keuangan & Margin Laba Harian</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Histori ringkasan penjualan POS per hari yang tersinkron.</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="p-1 px-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/40 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={12} /> Ekspor Laporan
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 dark:text-slate-350 border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100 dark:border-slate-800/60">
                <th className="p-3">Sesi Tanggal</th>
                <th className="p-3">Jumlah Transaksi</th>
                <th className="p-3 text-right">Penjualan Kotor (Omset)</th>
                <th className="p-3 text-right">Potongan Diskon</th>
                <th className="p-3 text-right">Pajak (PPN)</th>
                <th className="p-3 text-right">Biaya Modal (HPP)</th>
                <th className="p-3 text-right font-bold">Margin Keuntungan Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {dailySalesData.length > 0 ? (
                dailySalesData.map((d, index) => {
                  // Find HPP & fields in that date matching filtered transactions
                  const dayTxs = filteredTransactions.filter(t => {
                    const str = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    return str === d.dateStr;
                  });

                  // Skip displaying seeded days with 0 sales for a cleaner look if dateRange isn't selectedMonth
                  if (dayTxs.length === 0 && dateRange === 'all') return null;

                  let dayHpp = 0;
                  let dayDiscounts = 0;
                  let dayTaxes = 0;
                  let dayRevenueWithTax = 0;

                  dayTxs.forEach(t => {
                    dayDiscounts += t.discountTotal;
                    dayTaxes += t.taxTotal;
                    dayRevenueWithTax += t.total;
                    t.items.forEach(item => { dayHpp += ((item.costPrice || 0) * item.qty); });
                  });

                  if (dayHpp === 0 && dayRevenueWithTax > 0) {
                    dayHpp = Math.round(dayRevenueWithTax * 0.45); // estimate standard fallback HPP
                  }

                  const dayProfit = Math.max(0, dayRevenueWithTax - dayHpp - dayTaxes);

                  return (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 border-b border-slate-100/50 dark:border-slate-800/30 transition-colors">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{d.dateStr}</td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{dayTxs.length} Nota transaksi</td>
                      <td className="p-3 text-right text-slate-800 dark:text-slate-100 font-bold">{formatIDR(dayRevenueWithTax)}</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400 font-medium">-{formatIDR(dayDiscounts)}</td>
                      <td className="p-3 text-right text-slate-500 dark:text-slate-400">{formatIDR(dayTaxes)}</td>
                      <td className="p-3 text-right text-slate-500 dark:text-slate-400">{formatIDR(dayHpp)}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{formatIDR(dayProfit)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-450 dark:text-slate-500 font-medium">tidak ada transaksi penjualan terdaftar dalam kurun filter terpilih.</td>
                </tr>
              )}
            </tbody>
            {/* Grand Total Row */}
            <tfoot className="bg-slate-50 dark:bg-slate-950/40 font-extrabold border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td className="p-3 text-slate-800 dark:text-slate-200" colSpan={2}>Grand Total Terhitung</td>
                <td className="p-3 text-right text-slate-800 dark:text-slate-100 text-sm font-black">{formatIDR(metrics.revenue)}</td>
                <td className="p-3 text-right text-red-600 dark:text-red-400">{metrics.discounts > 0 ? `-${formatIDR(metrics.discounts)}` : 'Rp 0'}</td>
                <td className="p-3 text-right text-slate-800 dark:text-slate-300">{formatIDR(metrics.tax)}</td>
                <td className="p-3 text-right text-slate-800 dark:text-slate-300">{formatIDR(metrics.costOfGoods)}</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 text-sm font-black bg-emerald-50/50 dark:bg-emerald-950/20">{formatIDR(metrics.profit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tips Popup Modal */}
      <AnimatePresence>
        {isTipsOpen && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#78c953]/15 text-[#78c953] dark:bg-[#78c953]/20 rounded-xl flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tips Memaksimalkan Profit Outlet</h3>
                </div>
                <button
                  onClick={() => setIsTipsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {/* Tip 1 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#78c953] flex items-center justify-center font-black text-xs shrink-0 border border-[#78c953]/10">1</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Atur Margin HPP Ideal (30% - 35%)</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Jaga Harga Pokok Penjualan (HPP) mentah kopi & makanan di kisaran 30%-35% dari harga eceran. Komposisikan bahan baku dengan saksama agar margin bersih tetap tebal di setiap produk.
                    </p>
                  </div>
                </div>

                {/* Tip 2 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100 dark:border-blue-900/30">2</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Cegah Out-Of-Stock Bahan Baku</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Pantau indikator "Peringatan Stok Tipis" secara berkala agar pengadaan kopi susu, cangkir cup, sirup mocktail tidak terputus serta menghindari kekecewaan pelanggan.
                    </p>
                  </div>
                </div>

                {/* Tip 3 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs shrink-0 border border-amber-100 dark:border-amber-900/30">3</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Bundling Item Slow-Moving</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Sandingkan item slow-moving bersama menu kopi andalan terlaris dalam bentuk promo bundling. Ini mempercepat pemutaran stok bahan baku sebelum kedaluwarsa.
                    </p>
                  </div>
                </div>

                {/* Tip 4 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#78c953]/10 dark:bg-[#78c953]/20 text-emerald-800 dark:text-emerald-450 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-100 dark:border-[#78c953]/25">4</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Integrasikan Cloud Autosave Google Sheets</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Hindari pencatatan manual di kertas yang rawan human-error. Hubungkan Google Apps Script Web App URL agar omset, beban modal, hpp, dan profit terdokumentasi aman di cloud.
                    </p>
                  </div>
                </div>

                {/* Tip 5 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-xs shrink-0 border border-purple-100 dark:border-purple-900/30">5</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Optimalkan Kecepatan Kasir dengan Printer Thermal</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Siapkan printer thermal portable Bluetooth 58mm / desktop USB 80mm agar struk kasir dapat dicetak fisik langsung secara instan demi kelancaran operasional antrean.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsTipsOpen(false)}
                  className="px-4 py-2 bg-[#78c953] text-white hover:bg-[#68b544] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Saya Paham
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account Credentials Settings Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100/80 dark:border-slate-800 flex flex-col"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#78c953]/15 text-[#78c953] dark:bg-[#78c953]/20 rounded-xl flex items-center justify-center">
                    <UserIcon size={16} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Atur Akun & Kredensial</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Peran: {editingUser.role === 'owner' ? 'Owner / Pemilik' : editingUser.role === 'admin' ? 'Staf Admin' : 'Kasir Utama'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-left">
                {/* 1. Full Name */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    placeholder="Nama personel..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#78c953]"
                  />
                </div>

                {/* 2. Username */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Username Login</label>
                  <input
                    type="text"
                    value={editFormUsername}
                    onChange={(e) => setEditFormUsername(e.target.value)}
                    placeholder="Username baru..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#78c953]"
                  />
                  <p className="text-[8.5px] text-slate-400 dark:text-slate-550 mt-1 font-medium leading-normal">Digunakan untuk login di sistem kasir, tanpa spasi & huruf kecil.</p>
                </div>

                {/* 3. Password */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={editFormPassword}
                      onChange={(e) => setEditFormPassword(e.target.value)}
                      placeholder="Password baru..."
                      className="w-full p-2.5 pr-9 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#78c953]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[8.5px] text-slate-400 dark:text-slate-550 mt-1 font-medium leading-normal">Minimal terdiri dari 4 karakter rahasia.</p>
                </div>

                {editUserError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-xl border border-red-100 dark:border-red-900/40 leading-normal">
                    {editUserError}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserCredentials}
                  className="p-2 bg-[#78c953] hover:bg-[#68b544] text-white font-extrabold rounded-xl text-xs cursor-pointer transition-colors shadow-xs"
                >
                  Simpan Akun
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
