/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Search, Filter, AlertTriangle, CloudRain, 
  Upload, Download, FileSpreadsheet, RefreshCw, RefreshCcw, 
  Settings, Check, HelpCircle, HardDriveDownload, Sparkles, X, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, SyncConfig } from '../types';
import { uploadImageToGoogleDrive, initializeGoogleSheets, getHighResImageUrl } from '../utils/syncService';

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
  syncConfig: SyncConfig;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSyncConfig: (cfg: SyncConfig) => void;
  onTriggerSync: () => Promise<void>;
  onPullFromSheets: () => Promise<void>;
  isSyncing: boolean;
  onOpenSyncGuide: () => void;
  onBackupLocal: () => void;
  onRestoreLocal: (file: File) => Promise<boolean>;
}

const compressImageToBase64 = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export default function InventoryManager({
  products,
  categories,
  syncConfig,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateSyncConfig,
  onTriggerSync,
  onPullFromSheets,
  isSyncing,
  onOpenSyncGuide,
  onBackupLocal,
  onRestoreLocal
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals/Forms State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product state forms
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Auto-sheets initialization states
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [initFeedback, setInitFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Custom Toast State to avoid iframe window.alert blocking
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'warning') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  };

  // State for safe delete confirmation overlay modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Local state for Sheets Sync to prevent continuous overwrite while typing on cross-device
  const [localSheetsUrl, setLocalSheetsUrl] = useState(syncConfig.googleSheetsUrl || '');
  const [isSheetsUrlFocused, setIsSheetsUrlFocused] = useState(false);

  useEffect(() => {
    if (!isSheetsUrlFocused) {
      setLocalSheetsUrl(syncConfig.googleSheetsUrl || '');
    }
  }, [syncConfig, isSheetsUrlFocused]);

  const handleSaveSyncConfig = () => {
    onUpdateSyncConfig({
      ...syncConfig,
      googleSheetsUrl: localSheetsUrl,
      isEnabled: true
    });
    showToast("Koneksi Google Sheets berhasil disimpan & disinkronkan!", "success");
  };

  const handleAutoInitSheets = async () => {
    if (!localSheetsUrl) {
      showToast("Silakan masukkan URL Google Apps Script Web App terlebih dahulu!", 'warning');
      return;
    }
    
    setIsInitializingSheets(true);
    setInitFeedback(null);
    try {
      const res = await initializeGoogleSheets(localSheetsUrl);
      setInitFeedback({ success: res.success, message: res.message });
      // Clear feedback after 6 seconds
      setTimeout(() => setInitFeedback(null), 6000);
    } catch (err: any) {
      setInitFeedback({ success: false, message: err.message || 'Gagal terhubung ke Google Sheets!' });
      setTimeout(() => setInitFeedback(null), 6000);
    } finally {
      setIsInitializingSheets(false);
    }
  };

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setSku(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setCategory(categories[0]?.name || '');
    setPrice(0);
    setCostPrice(0);
    setStock(0);
    setMinStock(5);
    setImageUrl('');
    setUploadStatus('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setCostPrice(p.costPrice);
    setStock(p.stock);
    setMinStock(p.minStock);
    setImageUrl(p.imageUrl || '');
    setUploadStatus('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        sku,
        name,
        category,
        price,
        costPrice,
        stock,
        minStock,
        imageUrl
      });
    } else {
      onAddProduct({
        sku,
        name,
        category,
        price,
        costPrice,
        stock,
        minStock,
        imageUrl
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = (p: Product) => {
    setProductToDelete(p);
  };

  const handleQuickStock = (p: Product, change: number) => {
    const newStock = Math.max(0, p.stock + change);
    onUpdateProduct({
      ...p,
      stock: newStock
    });
  };

  // Import / Export products as CSV (Excel compatible) template
  const handleExportProductCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Nama Produk,Kategori,Harga Jual,Harga Jual Pokok,Stok Saat Ini,Batas Minimum Stok\n";
    
    products.forEach(p => {
      const row = [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.price,
        p.costPrice,
        p.stock,
        p.minStock
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Produk_Inventaris_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('Memulihkan backup data...');
    const result = await onRestoreLocal(file);
    if (result) {
      setRestoreStatus('Data berhasil dipulihkan!');
      setTimeout(() => setRestoreStatus(null), 3500);
    } else {
      setRestoreStatus('Gagal memproses file backup. Pastikan format file berkode JSON.');
      setTimeout(() => setRestoreStatus(null), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl shadow-xl border flex items-center gap-2.5 bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/40 text-slate-800 dark:text-slate-100 min-w-[300px]"
          >
            <div className="p-1 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-500 shrink-0">
              <AlertTriangle size={15} />
            </div>
            <span className="text-xs font-bold leading-normal">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100/80 dark:border-slate-800 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                <Trash2 size={22} />
              </div>
              
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Konfirmasi Hapus Produk</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus produk <span className="font-bold text-slate-700 dark:text-slate-300">"{productToDelete.name}"</span>? Stok tersisa di gudang saat ini adalah <span className="font-bold">{productToDelete.stock} pcs</span>. Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProduct(productToDelete.id);
                    setProductToDelete(null);
                  }}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-colors shadow-sm shadow-red-100"
                >
                  Hapus Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Grid Header: Backup Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Ekspor & Pulihkan Toko (Backup Data Lokal)</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Unduh semua salinan lokal atau muat cadangan jika berganti mesin kasir.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Backup Button */}
          <button
            onClick={onBackupLocal}
            className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <Download size={18} className="text-[#78c953]" />
            <div className="text-left">
              <span className="font-bold block text-slate-800 dark:text-slate-100">Simpan Cadangan (.json)</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">Ekspor semua produk, kategori, dan riwayat</span>
            </div>
          </button>

          {/* Restore File Button */}
          <button
            onClick={() => restoreInputRef.current?.click()}
            className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <Upload size={18} className="text-amber-600" />
            <div className="text-left">
              <span className="font-bold block text-slate-800 dark:text-slate-100">Pasangkan File Cadangan</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">Pulihkan data dari file ekspor kasir</span>
            </div>
          </button>
          <input
            type="file"
            ref={restoreInputRef}
            onChange={handleRestoreFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        {restoreStatus && (
          <p className="text-[10px] text-center font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-md animate-pulse">
            {restoreStatus}
          </p>
        )}
      </div>

      {/* Primary Products Inventory table */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        
        {/* Search, Filter groups, Add Product header */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex-1 flex flex-col md:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons list */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportProductCSV}
              className="p-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-white dark:bg-slate-900"
            >
              <FileSpreadsheet size={14} />
              Template Excel
            </button>
            
            <button
              onClick={handleOpenAddForm}
              className="p-2 px-4 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border dark:border-slate-700"
            >
              <Plus size={14} />
              Tambah Produk
            </button>
          </div>
        </div>

        {/* Master Catalog inventory entries */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <th className="p-3">SKU / Kode</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Harga Modal</th>
                <th className="p-3 text-right">Harga Jual</th>
                <th className="p-3 text-center">Stok Gudang</th>
                <th className="p-3 text-center">Batas Aman</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock <= p.minStock;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="p-3 font-mono font-medium text-slate-800 dark:text-slate-300">{p.sku}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img
                              src={getHighResImageUrl(p.imageUrl)}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-contain p-0.5 bg-white dark:bg-slate-850 shrink-0 border border-slate-250 dark:border-slate-800 shadow-2xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500 font-bold flex items-center justify-center shrink-0 text-[10px] uppercase font-mono tracking-wider">
                              No Pic
                            </div>
                          )}
                          <span className="truncate max-w-[200px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-medium text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600 dark:text-slate-400">{p.costPrice.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">{p.price.toLocaleString('id-ID')}</td>
                      
                      {/* Interactive Stock Column */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleQuickStock(p, -1)}
                            className="w-5 h-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-md text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          
                          <span className={`min-w-8 text-center font-bold px-2 py-0.5 rounded-md ${isLowStock ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-extrabold border border-red-100 dark:border-red-900/40' : 'text-slate-800 dark:text-slate-300'}`}>
                            {p.stock}
                          </span>
 
                          <button
                            onClick={() => handleQuickStock(p, 5)}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold max-h-5 p-0.5 px-1.5 rounded-md text-[10px] flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap"
                          >
                            +5
                          </button>
                        </div>
                      </td>
 
                      <td className="p-3 text-center font-semibold text-slate-500 dark:text-slate-400">{p.minStock}</td>
                      
                      {/* Action edit/delete btns */}
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditForm(p)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-slate-400 dark:text-slate-500">Tidak ada produk dalam daftar inventaris Anda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main product creation modal form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {editingProduct ? 'Ubah Informasi Produk' : 'Tambah Produk Inventaris'}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Konfigurasikan HPP, harga jual, dan stok pengaman produk.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Kode SKU / Barcode</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold uppercase text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Kategori Utama</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Nama Produk Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Caramel Macchiato"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Biaya Modal (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Harga Jual (Retail)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Batas Minimum (Alert)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              {/* Product Image Section */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Foto / Gambar Produk</label>
                <div className="flex gap-3 items-center">
                  {/* Photo Preview Container */}
                  <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-800 outline-dashed outline-1 outline-slate-350 dark:outline-slate-700 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {imageUrl ? (
                      <>
                        <img src={getHighResImageUrl(imageUrl)} alt="preview" className="w-full h-full object-contain p-1 bg-white dark:bg-slate-900" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setUploadStatus('');
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <Upload className="text-slate-400 dark:text-slate-500" size={16} />
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Masukkan URL Gambar (HTTP/Drive/etc)..."
                      value={imageUrl.startsWith('data:image/') ? '' : imageUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageUrl(getHighResImageUrl(val));
                        setUploadStatus(val ? "Menggunakan URL gambar 🌐" : "");
                      }}
                      className="w-full p-1.5 px-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-250 dark:border-slate-800 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-hidden focus:border-slate-350 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />

                    <input
                      type="file"
                      id="product-image-file"
                      accept="image/*"
                      ref={productFileInputRef}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setUploadStatus("Memproses & mengompresi gambar...");
                          const compressedBase64 = await compressImageToBase64(file);
                          setImageUrl(compressedBase64); // show preview instantly

                          setUploadStatus("Mengunggah gambar ke server...");
                          const commaIdx = compressedBase64.indexOf(',');
                          const rawBase64 = commaIdx !== -1 ? compressedBase64.substring(commaIdx + 1) : compressedBase64;

                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              filename: file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? file.name : `${file.name}.jpg`,
                              fileType: 'image/jpeg',
                              base64: rawBase64
                            })
                          });

                          const result = await response.json();
                          if (result.success && result.url) {
                            setImageUrl(result.url);
                            setUploadStatus("Gambar berhasil disimpan di server! ✅");
                          } else {
                            setUploadStatus("Gambar disimpan offline sementara.");
                            console.error(result.error);
                          }
                        } catch (err) {
                          setUploadStatus("Gambar disimpan offline sementara.");
                          console.error(err);
                        }
                      }}
                      className="hidden"
                    />
                    
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => productFileInputRef.current?.click()}
                        className="p-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px] cursor-pointer transition-colors border dark:border-slate-700"
                      >
                        Pilih File
                      </button>

                      {/* Google Drive upload active button if sheet sync is enabled & we have a file selected */}
                      {imageUrl && !imageUrl.startsWith('https://drive.google.com') && !imageUrl.startsWith('https://lh3.googleusercontent.com') && syncConfig.googleSheetsUrl && (
                        <button
                          type="button"
                          disabled={isUploadingDrive}
                          onClick={async () => {
                            setIsUploadingDrive(true);
                            setUploadStatus("Mengunggah di Google Drive...");
                            
                            try {
                              let rawBase64 = '';
                              let fileName = 'gambar-produk.jpg';
                              let fileType = 'image/jpeg';

                              const fileInput = productFileInputRef.current;
                              const file = fileInput?.files?.[0];

                              if (file) {
                                fileName = file.name;
                                fileType = file.type;
                                const reader = new FileReader();
                                rawBase64 = await new Promise<string>((resolve, reject) => {
                                  reader.onload = (event) => {
                                    const fullBase64 = event.target?.result as string;
                                    const commaIdx = fullBase64.indexOf(',');
                                    const raw = commaIdx !== -1 ? fullBase64.substring(commaIdx + 1) : fullBase64;
                                    resolve(raw);
                                  };
                                  reader.onerror = (err) => reject(err);
                                  reader.readAsDataURL(file);
                                });
                              } else if (imageUrl && (imageUrl.startsWith('/') || imageUrl.startsWith('data:image/'))) {
                                // Ambil file gambar yang sudah diunggah di server offline sebelumnya untuk diupload ke Drive
                                try {
                                  const response = await fetch(imageUrl);
                                  const blob = await response.blob();
                                  fileType = blob.type || 'image/jpeg';
                                  fileName = `produk-${Date.now()}.${fileType.split('/')[1] || 'jpg'}`;
                                  const reader = new FileReader();
                                  rawBase64 = await new Promise<string>((resolve, reject) => {
                                    reader.onload = (event) => {
                                      const fullBase64 = event.target?.result as string;
                                      const commaIdx = fullBase64.indexOf(',');
                                      const raw = commaIdx !== -1 ? fullBase64.substring(commaIdx + 1) : fullBase64;
                                      resolve(raw);
                                    };
                                    reader.onerror = (err) => reject(err);
                                    reader.readAsDataURL(blob);
                                  });
                                } catch (err) {
                                  console.error('Failed to load image for Drive upload:', err);
                                  alert("Gagal mengambil file gambar untuk diunggah. Silakan pilih ulang file gambar.");
                                  setIsUploadingDrive(false);
                                  return;
                                }
                              } else {
                                alert("Silakan pilih file gambar terlebih dahulu.");
                                setIsUploadingDrive(false);
                                return;
                              }

                              const res = await uploadImageToGoogleDrive(
                                syncConfig.googleSheetsUrl,
                                fileName,
                                fileType,
                                rawBase64
                              );
                              
                              if (res.success && res.url) {
                                setImageUrl(res.url);
                                setUploadStatus("Berhasil tersimpan di Drive! ✨");
                              } else {
                                alert(res.message);
                                setUploadStatus("Gagal diunggah.");
                              }
                            } catch (e: any) {
                              alert("Gagal: " + e.message);
                              setUploadStatus("Gagal diunggah.");
                            } finally {
                              setIsUploadingDrive(false);
                            }
                          }}
                          className="p-1.5 px-3 bg-[#78c953]/10 hover:bg-[#78c953]/20 text-emerald-800 dark:text-emerald-300 border border-[#78c953]/15 font-bold rounded-lg text-[10px] cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Sparkles size={11} className="text-[#78c953] animate-pulse" />
                          {isUploadingDrive ? "Mengunggah..." : "Unggah ke Google Drive"}
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                      {isUploadingDrive ? (
                        <span className="text-[#78c953] font-bold">{uploadStatus}</span>
                      ) : uploadStatus ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{uploadStatus}</span>
                      ) : imageUrl && imageUrl.startsWith('data:image/') ? (
                        <span>Disimpan offline. Tekan tombol hijau untuk upload Google Drive!</span>
                      ) : imageUrl && (imageUrl.startsWith('https://drive.google.com') || imageUrl.startsWith('https://lh3.googleusercontent.com')) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">Terintegrasi Google Drive Cloud! ✅</span>
                      ) : (
                        <span>Format JPG/PNG. Maks 2MB.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium rounded-lg">
                * Keuntungan per pcs: <strong>Rp {Math.max(0, price - costPrice).toLocaleString('id-ID')}</strong>. Batas minimum pengaman stok berguna agar notifikasi peringatan berbunyi otomatis.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs cursor-pointer transition-colors border dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-750 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors border dark:border-slate-700"
                >
                  {editingProduct ? 'Simpan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
