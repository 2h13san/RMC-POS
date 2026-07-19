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

  // 5 Pricing Tiers State
  const [tier1Name, setTier1Name] = useState('Eceran');
  const [tier1Price, setTier1Price] = useState(0);
  const [tier2Name, setTier2Name] = useState('Renceng');
  const [tier2Price, setTier2Price] = useState(0);
  const [tier3Name, setTier3Name] = useState('Pak');
  const [tier3Price, setTier3Price] = useState(0);
  const [tier4Name, setTier4Name] = useState('Dus');
  const [tier4Price, setTier4Price] = useState(0);
  const [tier5Name, setTier5Name] = useState('Grosir');
  const [tier5Price, setTier5Price] = useState(0);

  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
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

  // Import CSV Validation Report State
  const [importReport, setImportReport] = useState<{
    totalRows: number;
    errors: { row: number; sku: string; name: string; errors: string[] }[];
    validProducts: any[];
  } | null>(null);
  const [showImportReportModal, setShowImportReportModal] = useState(false);

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

    // Default 5 Tiers
    setTier1Name('Eceran');
    setTier1Price(0);
    setTier2Name('Renceng');
    setTier2Price(0);
    setTier3Name('Pak');
    setTier3Price(0);
    setTier4Name('Dus');
    setTier4Price(0);
    setTier5Name('Grosir');
    setTier5Price(0);

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

    // Load 5 Tiers
    setTier1Name(p.tier1Name || 'Eceran');
    setTier1Price(p.tier1Price !== undefined ? p.tier1Price : p.price);
    setTier2Name(p.tier2Name || 'Renceng');
    setTier2Price(p.tier2Price || 0);
    setTier3Name(p.tier3Name || 'Pak');
    setTier3Price(p.tier3Price || 0);
    setTier4Name(p.tier4Name || 'Dus');
    setTier4Price(p.tier4Price || 0);
    setTier5Name(p.tier5Name || 'Grosir');
    setTier5Price(p.tier5Price || 0);

    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Build values, fallback tier1 to price if not set
    const finalTier1Price = tier1Price > 0 ? tier1Price : price;

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
        imageUrl,
        tier1Name,
        tier1Price: finalTier1Price,
        tier2Name,
        tier2Price,
        tier3Name,
        tier3Price,
        tier4Name,
        tier4Price,
        tier5Name,
        tier5Price,
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
        imageUrl,
        tier1Name,
        tier1Price: finalTier1Price,
        tier2Name,
        tier2Price,
        tier3Name,
        tier3Price,
        tier4Name,
        tier4Price,
        tier5Name,
        tier5Price,
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
    let csvContent = "sep=,\n";
    csvContent += "SKU,Nama Produk,Kategori,Harga Jual,Harga Jual Pokok,Stok Saat Ini,Batas Minimum Stok\n";
    
    // Add default template rows if there are no products, or add existing products
    const listToExport = products.length > 0 ? products : [
      { sku: "MKN-001", name: "Nasi Goreng Spesial", category: "Makanan", price: 25000, costPrice: 15000, stock: 27, minStock: 5 },
      { sku: "MKN-002", name: "Mie Goreng Seafood", category: "Makanan", price: 28000, costPrice: 17000, stock: 12, minStock: 5 },
      { sku: "KOP-001", name: "Espresso Single", category: "Minuman Kopi", price: 15000, costPrice: 6000, stock: 4, minStock: 10 },
      { sku: "KOP-002", name: "Kopi Susu Gula Aren", category: "Minuman Kopi", price: 18000, costPrice: 8000, stock: 50, minStock: 15 },
      { sku: "KOP-003", name: "Cafe Latte", category: "Minuman Kopi", price: 22000, costPrice: 10000, stock: 35, minStock: 10 },
      { sku: "NKO-001", name: "Matcha Latte Ice", category: "Minuman Non-Kopi", price: 20000, costPrice: 9000, stock: 18, minStock: 5 },
      { sku: "NKO-002", name: "Ice Red Velvet", category: "Minuman Non-Kopi", price: 20000, costPrice: 9000, stock: 3, minStock: 8 },
      { sku: "CAM-001", name: "Croissant Cokelat", category: "Camilan", price: 18000, costPrice: 11000, stock: 2, minStock: 5 },
      { sku: "CAM-002", name: "French Fries", category: "Camilan", price: 15000, costPrice: 7000, stock: 15, minStock: 5 }
    ];

    listToExport.forEach(p => {
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

    // Create blob with UTF-8 BOM so Excel opens it with proper encoding
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Produk_Inventaris_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProductCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target?.result as string;
        // Strip BOM if present
        if (text.startsWith('\uFEFF')) {
          text = text.substring(1);
        }
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          showToast("File CSV kosong atau tidak valid!", "warning");
          return;
        }

        const errorsList: { row: number; sku: string; name: string; errors: string[] }[] = [];
        const validList: any[] = [];
        let totalRowsParsed = 0;

        let startLineIndex = 1;
        if (lines[0] && lines[0].trim().toLowerCase().startsWith('sep=')) {
          startLineIndex = 2; // Line 0 is sep=, Line 1 is header, data starts from Line 2
        }

        for (let i = startLineIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          totalRowsParsed++;

          // Simple CSV parser that handles double quotes
          const values: string[] = [];
          let currentVal = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentVal.trim());
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim());

          if (values.length < 2) {
            errorsList.push({
              row: i + 1,
              sku: '-',
              name: 'Baris Rusak',
              errors: ['Kolom tidak lengkap atau salah pemisah koma']
            });
            continue;
          }

          const rawSku = values[0]?.toUpperCase() || '';
          const sku = rawSku || `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
          const name = values[1]?.replace(/^"|"$/g, '').trim() || '';
          const category = values[2]?.trim() || categories[0]?.name || 'Umum';

          const rowErrors: string[] = [];

          // 1. Validate name
          if (!name) {
            rowErrors.push("Nama Produk tidak boleh kosong");
          }

          // 2. Validate price (Harga Jual)
          const rawPrice = values[3];
          let price = 0;
          if (rawPrice === undefined || rawPrice.trim() === '') {
            rowErrors.push("Harga Jual tidak boleh kosong");
          } else {
            const numPrice = Number(rawPrice.trim());
            if (isNaN(numPrice)) {
              rowErrors.push(`Format Harga Jual tidak valid: "${rawPrice}" (harus berupa angka)`);
            } else if (numPrice < 0) {
              rowErrors.push(`Harga Jual tidak boleh negatif: ${numPrice}`);
            } else {
              price = numPrice;
            }
          }

          // 3. Validate cost price (Harga Jual Pokok)
          const rawCostPrice = values[4];
          let costPrice = 0;
          if (rawCostPrice === undefined || rawCostPrice.trim() === '') {
            rowErrors.push("Harga Jual Pokok tidak boleh kosong");
          } else {
            const numCostPrice = Number(rawCostPrice.trim());
            if (isNaN(numCostPrice)) {
              rowErrors.push(`Format Harga Jual Pokok tidak valid: "${rawCostPrice}" (harus berupa angka)`);
            } else if (numCostPrice < 0) {
              rowErrors.push(`Harga Jual Pokok tidak boleh negatif: ${numCostPrice}`);
            } else {
              costPrice = numCostPrice;
            }
          }

          // 4. Validate stock (Stok Saat Ini)
          const rawStock = values[5];
          let stock = 0;
          if (rawStock === undefined || rawStock.trim() === '') {
            rowErrors.push("Stok Saat Ini tidak boleh kosong");
          } else {
            const numStock = Number(rawStock.trim());
            if (isNaN(numStock)) {
              rowErrors.push(`Format Stok Saat Ini tidak valid: "${rawStock}" (harus berupa angka)`);
            } else if (!Number.isInteger(numStock)) {
              rowErrors.push(`Stok Saat Ini harus berupa angka bulat: ${numStock}`);
            } else if (numStock < 0) {
              rowErrors.push(`Stok Saat Ini tidak boleh negatif: ${numStock}`);
            } else {
              stock = numStock;
            }
          }

          // 5. Validate min stock (Batas Minimum Stok)
          const rawMinStock = values[6];
          let minStock = 5;
          if (rawMinStock === undefined || rawMinStock.trim() === '') {
            minStock = 5;
          } else {
            const numMinStock = Number(rawMinStock.trim());
            if (isNaN(numMinStock)) {
              rowErrors.push(`Format Batas Minimum Stok tidak valid: "${rawMinStock}" (harus berupa angka)`);
            } else if (!Number.isInteger(numMinStock)) {
              rowErrors.push(`Batas Minimum Stok harus berupa angka bulat: ${numMinStock}`);
            } else if (numMinStock < 0) {
              rowErrors.push(`Batas Minimum Stok tidak boleh negatif: ${numMinStock}`);
            } else {
              minStock = numMinStock;
            }
          }

          if (rowErrors.length > 0) {
            errorsList.push({
              row: i + 1,
              sku,
              name: name || `Baris ${i + 1}`,
              errors: rowErrors
            });
          } else {
            validList.push({
              sku,
              name,
              category,
              price,
              costPrice,
              stock,
              minStock
            });
          }
        }

        setImportReport({
          totalRows: totalRowsParsed,
          errors: errorsList,
          validProducts: validList
        });
        setShowImportReportModal(true);
      } catch (err) {
        console.error(err);
        showToast("Gagal memproses file CSV. Pastikan format sesuai template.", "warning");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importReport) return;
    
    let addedCount = 0;
    let updatedCount = 0;

    importReport.validProducts.forEach(item => {
      // Check if SKU already exists
      const existing = products.find(p => p.sku.toUpperCase() === item.sku.toUpperCase());
      if (existing) {
        onUpdateProduct({
          ...existing,
          name: item.name,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          stock: item.stock,
          minStock: item.minStock
        });
        updatedCount++;
      } else {
        onAddProduct({
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          stock: item.stock,
          minStock: item.minStock,
          imageUrl: '',
          tier1Name: 'Eceran',
          tier1Price: item.price,
          tier2Name: 'Renceng',
          tier2Price: 0,
          tier3Name: 'Pak',
          tier3Price: 0,
          tier4Name: 'Dus',
          tier4Price: 0,
          tier5Name: 'Grosir',
          tier5Price: 0
        });
        addedCount++;
      }
    });

    showToast(`Berhasil mengimport data: ${addedCount} produk baru ditambahkan, ${updatedCount} produk diperbarui!`, "success");
    setShowImportReportModal(false);
    setImportReport(null);
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
            <Download size={18} className="text-[#ef4444]" />
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
              title="Unduh format template CSV/Excel"
            >
              <FileSpreadsheet size={14} />
              Template Excel
            </button>

            <button
              onClick={() => csvInputRef.current?.click()}
              className="p-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-[#ef4444]/10 hover:text-[#ef4444] hover:border-[#ef4444]/30 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-white dark:bg-slate-900"
              title="Unggah file CSV produk untuk import massal"
            >
              <Upload size={14} />
              Import CSV
            </button>
            <input
              type="file"
              ref={csvInputRef}
              onChange={handleImportProductCSV}
              accept=".csv"
              className="hidden"
            />
            
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
                      <td className="p-3 text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Rp {p.price.toLocaleString('id-ID')}</div>
                        {((p.tier1Price && p.tier1Price !== p.price) || p.tier2Price || p.tier3Price || p.tier4Price || p.tier5Price) ? (
                          <div className="flex flex-col items-end gap-0.5 mt-1 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                            {p.tier1Price && <div>{p.tier1Name || 'Eceran'}: Rp {p.tier1Price.toLocaleString('id-ID')}</div>}
                            {p.tier2Price ? <div>{p.tier2Name || 'Renceng'}: Rp {p.tier2Price.toLocaleString('id-ID')}</div> : null}
                            {p.tier3Price ? <div>{p.tier3Name || 'Pak'}: Rp {p.tier3Price.toLocaleString('id-ID')}</div> : null}
                            {p.tier4Price ? <div>{p.tier4Name || 'Dus'}: Rp {p.tier4Price.toLocaleString('id-ID')}</div> : null}
                            {p.tier5Price ? <div>{p.tier5Name || 'Grosir'}: Rp {p.tier5Price.toLocaleString('id-ID')}</div> : null}
                          </div>
                        ) : null}
                      </td>
                      
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
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setPrice(val);
                      if (tier1Price === 0 || tier1Price === price) {
                        setTier1Price(val);
                      }
                    }}
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

              {/* Tiered Pricing Section */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Harga Jual Bertingkat (5 Tingkat Harga)</label>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">Kustomisasi nama unit & harga</span>
                </div>
                
                <div className="space-y-2">
                  {/* Tier 1 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">Tingkat 1:</span>
                    <input
                      type="text"
                      placeholder="Nama unit (cth: Eceran)"
                      value={tier1Name}
                      onChange={(e) => setTier1Name(e.target.value)}
                      className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Harga (Rp)"
                      value={tier1Price || ''}
                      onChange={(e) => setTier1Price(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {/* Tier 2 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">Tingkat 2:</span>
                    <input
                      type="text"
                      placeholder="Nama unit (cth: Renceng)"
                      value={tier2Name}
                      onChange={(e) => setTier2Name(e.target.value)}
                      className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Harga (Rp)"
                      value={tier2Price || ''}
                      onChange={(e) => setTier2Price(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {/* Tier 3 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">Tingkat 3:</span>
                    <input
                      type="text"
                      placeholder="Nama unit (cth: Pak)"
                      value={tier3Name}
                      onChange={(e) => setTier3Name(e.target.value)}
                      className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Harga (Rp)"
                      value={tier3Price || ''}
                      onChange={(e) => setTier3Price(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {/* Tier 4 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">Tingkat 4:</span>
                    <input
                      type="text"
                      placeholder="Nama unit (cth: Dus)"
                      value={tier4Name}
                      onChange={(e) => setTier4Name(e.target.value)}
                      className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Harga (Rp)"
                      value={tier4Price || ''}
                      onChange={(e) => setTier4Price(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {/* Tier 5 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">Tingkat 5:</span>
                    <input
                      type="text"
                      placeholder="Nama unit (cth: Grosir)"
                      value={tier5Name}
                      onChange={(e) => setTier5Name(e.target.value)}
                      className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Harga (Rp)"
                      value={tier5Price || ''}
                      onChange={(e) => setTier5Price(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 p-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>
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
                          className="p-1.5 px-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-emerald-800 dark:text-emerald-300 border border-[#ef4444]/15 font-bold rounded-lg text-[10px] cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Sparkles size={11} className="text-[#ef4444] animate-pulse" />
                          {isUploadingDrive ? "Mengunggah..." : "Unggah ke Google Drive"}
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                      {isUploadingDrive ? (
                        <span className="text-[#ef4444] font-bold">{uploadStatus}</span>
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

      {/* Import CSV Validation Modal */}
      <AnimatePresence>
        {showImportReportModal && importReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${importReport.errors.length > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'bg-emerald-50 dark:bg-emerald-950/40 text-[#ef4444]'}`}>
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Laporan Validasi Import CSV</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-505 font-semibold">
                      Dievaluasi: {importReport.totalRows} baris data produk
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowImportReportModal(false);
                    setImportReport(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Error Summary Alert */}
                {importReport.errors.length > 0 ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs">
                      <h4 className="font-extrabold text-amber-800 dark:text-amber-400">Ditemukan kesalahan format data!</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">
                        Ada <strong>{importReport.errors.length}</strong> baris yang tidak memenuhi standar validasi (nama kosong, format harga salah, atau stok negatif).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl flex gap-3">
                    <Check className="text-[#ef4444] shrink-0 mt-0.5" size={18} />
                    <div className="text-xs">
                      <h4 className="font-extrabold text-emerald-800 dark:text-emerald-400">Seluruh data valid! 🎉</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">
                        Sebanyak <strong>{importReport.validProducts.length}</strong> produk siap diimport secara massal tanpa kendala format.
                      </p>
                    </div>
                  </div>
                )}

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-lg font-black text-[#ef4444]">
                      {importReport.validProducts.length}
                    </div>
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      Siap Diimport / Update
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className={`text-lg font-black ${importReport.errors.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {importReport.errors.length}
                    </div>
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      Gagal Validasi (Dilewati)
                    </div>
                  </div>
                </div>

                {/* Errors List */}
                {importReport.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wide">
                      Rincian Baris yang Bermasalah
                    </h4>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                      {importReport.errors.map((err, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="w-full">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                              <span className="p-0.5 px-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px]">
                                Baris {err.row}
                              </span>
                              <span>{err.name}</span>
                              {err.sku && err.sku !== '-' && (
                                <span className="text-[10px] font-mono text-slate-400">({err.sku})</span>
                              )}
                            </div>
                            <ul className="list-disc pl-5 mt-1 text-[11px] text-red-500 font-medium space-y-0.5">
                              {err.errors.map((e, eIdx) => (
                                <li key={eIdx}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 shrink-0 flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportReportModal(false);
                    setImportReport(null);
                  }}
                  className="p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs cursor-pointer transition-colors border dark:border-slate-700"
                >
                  Batal / Perbaiki File
                </button>
                {importReport.validProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="p-2 px-5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} />
                    Import {importReport.validProducts.length} Produk Valid
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
