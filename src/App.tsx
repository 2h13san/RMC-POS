/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LogOut, UserCheck, Shield, ShoppingBag, BarChart3, Database, 
  AlertTriangle, CheckCircle, Lock, PlusCircle, Sparkles, Eye, EyeOff,
  History, Settings, Store, Receipt, X, User as UserIcon, Moon, Sun, Users, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types & Initial seeds
import { Product, Category, Transaction, User, SyncConfig, StoreSettings, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, Customer, INITIAL_CUSTOMERS, Supplier, Purchase, PurchaseReturn, INITIAL_SUPPLIERS } from './types';

// Services
import { syncToGoogleSheets, pullFromGoogleSheets } from './utils/syncService';

// Components
import CashierTab from './components/CashierTab';
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import ThermalReceipt from './components/ThermalReceipt';
import AppsScriptGuide from './components/AppsScriptGuide';
import TransactionHistory from './components/TransactionHistory';
import SettingsTab from './components/SettingsTab';
import CustomerDisplay from './components/CustomerDisplay';
import CustomerManager from './components/CustomerManager';
import PurchaseManager from './components/PurchaseManager';

export default function App() {
  // --- core PERSISTENCE states ---
  const lastSavedSettingsTime = React.useRef<number>(0);
  const lastSavedSyncTime = React.useRef<number>(0);
  const lastLocalUpdate = React.useRef<number>(0);
  const backupTimeoutRef = React.useRef<any>(null);
  const isSyncingRef = React.useRef<boolean>(false);
  const pendingBackupRef = React.useRef<{ products: Product[], transactions: Transaction[] } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem('kp_sync_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return {
      googleSheetsUrl: '',
      isEnabled: false
    };
  });

  // Store Settings (Nama Toko, alamat, nomor telpon, status PPN)
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('kb_store_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return {
      name: "KASIR PINTAR COFFEE & EATERY",
      address: "Jl. Sudirman No. 45, Jakarta",
      phone: "0812-3456-7890",
      isTaxEnabled: true,
      taxPercentage: 11
    };
  });

  // --- UI states ---
  const [activeTab, setActiveTab] = useState<'cashier' | 'dashboard' | 'inventory' | 'history' | 'settings' | 'customers' | 'pembelian'>('cashier');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [isSyncGuideOpen, setIsSyncGuideOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPosFullscreen, setIsPosFullscreen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // --- UI Theme (Light/Dark Mode) ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('kp_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kp_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Global alert banners state
  const [alertNotification, setAlertNotification] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // --- 1. INITIAL LOAD & PERSISTENCE (SERVER REAL-TIME CLOUD SYNC) ---
  const saveProductsToServer = async (updated: Product[]) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync products to server:', e);
    }
  };

  const saveCategoriesToServer = async (updated: Category[]) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync categories to server:', e);
    }
  };

  const saveTransactionsToServer = async (updated: Transaction[]) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync transactions to server:', e);
    }
  };

  const saveUsersToServer = async (updated: User[]) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync users to server:', e);
    }
  };

  const saveCustomersToServer = async (updated: Customer[]) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync customers to server:', e);
    }
  };

  const saveSuppliersToServer = async (updated: Supplier[]) => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync suppliers to server:', e);
    }
  };

  const savePurchasesToServer = async (updated: Purchase[]) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync purchases to server:', e);
    }
  };

  const savePurchaseReturnsToServer = async (updated: PurchaseReturn[]) => {
    try {
      const res = await fetch('/api/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync purchase returns to server:', e);
    }
  };

  const saveStoreSettingsToServer = async (updated: StoreSettings) => {
    try {
      const res = await fetch('/api/store-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync store settings to server:', e);
    }
  };

  const saveSyncConfigToServer = async (updated: SyncConfig) => {
    try {
      const res = await fetch('/api/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.lastUpdated) {
          localStorage.setItem('kp_last_updated', resData.lastUpdated.toString());
        }
      }
    } catch (e) {
      console.error('Failed to sync config to server:', e);
    }
  };

  const syncCloudData = async (isInitial = false) => {
    // Skip polling if there are very recent client mutations to avoid race condition/overwrites
    if (!isInitial && Date.now() - lastLocalUpdate.current < 8000) {
      console.log('Skipping background poll because client just made local updates');
      return;
    }

    try {
      const res = await fetch(`/api/data?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch from server');
      const data = await res.json();
      
      if (data) {
        const localLastUpdated = Number(localStorage.getItem('kp_last_updated')) || 0;
        const serverLastUpdated = data.lastUpdated || 0;

        const localProductsStr = localStorage.getItem('kp_products');
        const localTransactionsStr = localStorage.getItem('kp_transactions');
        let parsedLocalProducts = [];
        try {
          parsedLocalProducts = localProductsStr ? JSON.parse(localProductsStr) : [];
        } catch (e) {
          console.warn('Corrupted kp_products in localStorage:', e);
        }
        let parsedLocalTxs = [];
        try {
          parsedLocalTxs = localTransactionsStr ? JSON.parse(localTransactionsStr) : [];
        } catch (e) {
          console.warn('Corrupted kp_transactions in localStorage:', e);
        }

        // Determine if server is stale (e.g. server reset or container restart with default values)
        const isServerStale = serverLastUpdated < localLastUpdated || 
          (serverLastUpdated <= 1700000000000 && (parsedLocalProducts.length > data.products.length || parsedLocalTxs.length > data.transactions.length));

        // If the server's data is older than the client's local data (e.g. server reset/container redeploy/restart),
        // we trigger an automatic healing push of all our local data to the server, instead of overwriting!
        if (isServerStale) {
          console.log(`Detected stale server data (${serverLastUpdated} < ${localLastUpdated} or reset to seeds). Healing server with local configurations...`);
          try {
            const localSyncConfigStr = localStorage.getItem('kp_sync_config');
            if (localSyncConfigStr) {
              const parsedLocalSync = JSON.parse(localSyncConfigStr);
              await saveSyncConfigToServer(parsedLocalSync);
            }

            const localStoreSettingsStr = localStorage.getItem('kb_store_settings');
            if (localStoreSettingsStr) {
              const parsedSettings = JSON.parse(localStoreSettingsStr);
              await saveStoreSettingsToServer(parsedSettings);
            }

            const localProductsStr = localStorage.getItem('kp_products');
            if (localProductsStr) {
              const parsedProducts = JSON.parse(localProductsStr);
              if (parsedProducts && parsedProducts.length > 0) {
                await saveProductsToServer(parsedProducts);
              }
            }

            const localCategoriesStr = localStorage.getItem('kp_categories');
            if (localCategoriesStr) {
              const parsedCats = JSON.parse(localCategoriesStr);
              if (parsedCats && parsedCats.length > 0) {
                await saveCategoriesToServer(parsedCats);
              }
            }

            const localTransactionsStr = localStorage.getItem('kp_transactions');
            if (localTransactionsStr) {
              const parsedTxs = JSON.parse(localTransactionsStr);
              if (parsedTxs && parsedTxs.length > 0) {
                await saveTransactionsToServer(parsedTxs);
              }
            }

            const localUsersStr = localStorage.getItem('kp_users');
            if (localUsersStr) {
              const parsedUsers = JSON.parse(localUsersStr);
              if (parsedUsers && parsedUsers.length > 0) {
                await saveUsersToServer(parsedUsers);
              }
            }

             const localCustomersStr = localStorage.getItem('kp_customers');
            if (localCustomersStr) {
              const parsedCusts = JSON.parse(localCustomersStr);
              if (parsedCusts && parsedCusts.length > 0) {
                await saveCustomersToServer(parsedCusts);
              }
            }

            const localSuppliersStr = localStorage.getItem('kp_suppliers');
            if (localSuppliersStr) {
              const parsedSups = JSON.parse(localSuppliersStr);
              if (parsedSups && parsedSups.length > 0) {
                await saveSuppliersToServer(parsedSups);
              }
            }

            const localPurchasesStr = localStorage.getItem('kp_purchases');
            if (localPurchasesStr) {
              const parsedPurchases = JSON.parse(localPurchasesStr);
              if (parsedPurchases && parsedPurchases.length > 0) {
                await savePurchasesToServer(parsedPurchases);
              }
            }

            const localReturnsStr = localStorage.getItem('kp_purchase_returns');
            if (localReturnsStr) {
              const parsedReturns = JSON.parse(localReturnsStr);
              if (parsedReturns && parsedReturns.length > 0) {
                await savePurchaseReturnsToServer(parsedReturns);
              }
            }

            // Fetch newly synchronized data from server to align React states
            const healRes = await fetch(`/api/data?t=${Date.now()}`);
            if (healRes.ok) {
              const healedData = await healRes.json();
              if (healedData) {
                setProducts(healedData.products || []);
                setCategories(healedData.categories || []);
                setTransactions(healedData.transactions || []);
                setUsers(healedData.users || []);
                setCustomers(healedData.customers || []);
                setSuppliers(healedData.suppliers || []);
                setPurchases(healedData.purchases || []);
                setPurchaseReturns(healedData.purchaseReturns || []);
                setStoreSettings(healedData.storeSettings);
                setSyncConfig(healedData.syncConfig);
                if (healedData.lastUpdated) {
                  localStorage.setItem('kp_last_updated', healedData.lastUpdated.toString());
                }
                return;
              }
            }
          } catch (e) {
            console.error('Error in self-healing sync logic:', e);
          }
        }

        // Standard pull logic:
        if (isInitial || JSON.stringify(data.products) !== localStorage.getItem('kp_products')) {
          setProducts(data.products);
          try {
            localStorage.setItem('kp_products', JSON.stringify(data.products));
          } catch (e) {
            console.warn('LocalStorage limit exceeded:', e);
          }
        }
        if (isInitial || JSON.stringify(data.categories) !== localStorage.getItem('kp_categories')) {
          setCategories(data.categories);
          localStorage.setItem('kp_categories', JSON.stringify(data.categories));
        }
        if (isInitial || JSON.stringify(data.transactions) !== localStorage.getItem('kp_transactions')) {
          setTransactions(data.transactions);
          localStorage.setItem('kp_transactions', JSON.stringify(data.transactions));
        }
        if (isInitial || JSON.stringify(data.users) !== localStorage.getItem('kp_users')) {
          setUsers(data.users);
          localStorage.setItem('kp_users', JSON.stringify(data.users));
        }
        if (isInitial || JSON.stringify(data.customers || []) !== localStorage.getItem('kp_customers')) {
          setCustomers(data.customers || []);
          localStorage.setItem('kp_customers', JSON.stringify(data.customers || []));
        }
        if (isInitial || JSON.stringify(data.suppliers || []) !== localStorage.getItem('kp_suppliers')) {
          setSuppliers(data.suppliers || []);
          localStorage.setItem('kp_suppliers', JSON.stringify(data.suppliers || []));
        }
        if (isInitial || JSON.stringify(data.purchases || []) !== localStorage.getItem('kp_purchases')) {
          setPurchases(data.purchases || []);
          localStorage.setItem('kp_purchases', JSON.stringify(data.purchases || []));
        }
        if (isInitial || JSON.stringify(data.purchaseReturns || []) !== localStorage.getItem('kp_purchase_returns')) {
          setPurchaseReturns(data.purchaseReturns || []);
          localStorage.setItem('kp_purchase_returns', JSON.stringify(data.purchaseReturns || []));
        }
        
        // Update client last updated timestamp to match server
        localStorage.setItem('kp_last_updated', serverLastUpdated.toString());
        const clientSettings = localStorage.getItem('kb_store_settings');
        let parsedClientSettings = null;
        try {
          parsedClientSettings = clientSettings ? JSON.parse(clientSettings) : null;
        } catch (e) {
          console.warn('Corrupted kb_store_settings in localStorage:', e);
        }

        const areSettingsEqual = (s1: any, s2: any) => {
          if (!s1 || !s2) return false;
          return s1.name === s2.name &&
                 s1.address === s2.address &&
                 s1.phone === s2.phone &&
                 s1.isTaxEnabled === s2.isTaxEnabled &&
                 s1.taxPercentage === s2.taxPercentage;
        };

        if (isInitial) {
          if (parsedClientSettings) {
            if (!areSettingsEqual(data.storeSettings, parsedClientSettings)) {
              console.log('Aligning server storeSettings with local custom settings...');
              await saveStoreSettingsToServer(parsedClientSettings);
            }
          } else if (data.storeSettings) {
            console.log('Loading storeSettings from server into client...');
            setStoreSettings(data.storeSettings);
            localStorage.setItem('kb_store_settings', JSON.stringify(data.storeSettings));
          }
        } else {
          // Do not overwrite client-side custom settings from the server in the background
        }

        const clientSync = localStorage.getItem('kp_sync_config');
        let parsedClientSync = null;
        try {
          parsedClientSync = clientSync ? JSON.parse(clientSync) : null;
        } catch (e) {
          console.warn('Corrupted kp_sync_config in localStorage:', e);
        }
        if (isInitial) {
          if (parsedClientSync) {
            if (JSON.stringify(data.syncConfig) !== clientSync) {
              console.log('Aligning server syncConfig with local custom config...');
              await saveSyncConfigToServer(parsedClientSync);
            }
          } else if (data.syncConfig) {
            console.log('Loading syncConfig from server into client...');
            setSyncConfig(data.syncConfig);
            localStorage.setItem('kp_sync_config', JSON.stringify(data.syncConfig));
          }
        } else {
          if (Date.now() - lastSavedSyncTime.current > 10000) {
            if (data.syncConfig && JSON.stringify(data.syncConfig) !== clientSync) {
              if (data.syncConfig.googleSheetsUrl) {
                setSyncConfig(data.syncConfig);
                localStorage.setItem('kp_sync_config', JSON.stringify(data.syncConfig));
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Live database offline fallback to localStorage:', error);
      if (isInitial) {
        const savedProducts = localStorage.getItem('kp_products');
        if (savedProducts) {
          try {
            setProducts(JSON.parse(savedProducts));
          } catch (e) {
            setProducts(INITIAL_PRODUCTS);
          }
        } else {
          setProducts(INITIAL_PRODUCTS);
        }

        const savedCategories = localStorage.getItem('kp_categories');
        if (savedCategories) {
          try {
            setCategories(JSON.parse(savedCategories));
          } catch (e) {
            setCategories(INITIAL_CATEGORIES);
          }
        } else {
          setCategories(INITIAL_CATEGORIES);
        }

        const savedTxs = localStorage.getItem('kp_transactions');
        if (savedTxs) {
          try {
            setTransactions(JSON.parse(savedTxs));
          } catch (e) {
            setTransactions(INITIAL_TRANSACTIONS);
          }
        } else {
          setTransactions(INITIAL_TRANSACTIONS);
        }

        const savedUsers = localStorage.getItem('kp_users');
        const defaultUsers: User[] = [
          { id: 'user-1', username: 'owner', password: 'owner123', name: 'Adi Pemilik', role: 'owner', active: true },
          { id: 'user-2', username: 'admin', password: 'admin123', name: 'Fajar Admin', role: 'admin', active: true },
          { id: 'user-3', username: 'kasir', password: 'kasir123', name: 'Rina Kasir', role: 'cashier', active: true }
        ];
        if (savedUsers) {
          try {
            setUsers(JSON.parse(savedUsers));
          } catch (e) {
            setUsers(defaultUsers);
          }
        } else {
          setUsers(defaultUsers);
        }

        const savedCustomers = localStorage.getItem('kp_customers');
        if (savedCustomers) {
          try {
            setCustomers(JSON.parse(savedCustomers));
          } catch (e) {
            setCustomers(INITIAL_CUSTOMERS);
          }
        } else {
          setCustomers(INITIAL_CUSTOMERS);
        }

        const savedSync = localStorage.getItem('kp_sync_config');
        if (savedSync) {
          try {
            setSyncConfig(JSON.parse(savedSync));
          } catch (e) {}
        }

        const savedSettings = localStorage.getItem('kb_store_settings');
        if (savedSettings) {
          try {
            setStoreSettings(JSON.parse(savedSettings));
          } catch (e) {}
        }
      }
    }
  };

  useEffect(() => {
    // Initial fetch from node server
    syncCloudData(true);

    // Live continuous cloud polling every 4 seconds for instant cross-device updates
    const timer = setInterval(() => {
      syncCloudData(false);
    }, 4000);

    // Parse sheetsUrl parameter from address bar for instant cross-device/profile pairing!
    const queryParams = new URLSearchParams(window.location.search);
    const sheetsUrlParam = queryParams.get('sheetsUrl');
    if (sheetsUrlParam && sheetsUrlParam.startsWith('https://script.google.com')) {
      console.log('Detected auto-import sheetsUrl from address bar:', sheetsUrlParam);
      const newCfg = {
        googleSheetsUrl: sheetsUrlParam,
        isEnabled: true
      };
      setSyncConfig(newCfg);
      localStorage.setItem('kp_sync_config', JSON.stringify(newCfg));
      saveSyncConfigToServer(newCfg);
      
      // Clean up the URL query parameter for clean look without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Pull immediately
      triggerNotification("Koneksi Google Sheets terdeteksi! Menarik data...", "success");
      setTimeout(() => {
        handlePullFromSheets(sheetsUrlParam);
      }, 1000);
    }

    // Recover login state
    const savedActiveUser = sessionStorage.getItem('kp_active_user');
    if (savedActiveUser) {
      try {
        setCurrentUser(JSON.parse(savedActiveUser));
      } catch (e) {
        console.warn('Corrupted kp_active_user in sessionStorage:', e);
      }
    }

    return () => clearInterval(timer);
  }, []);

  // Show status popup banner helper
  const triggerNotification = (message: string, type: 'success' | 'warning' = 'success') => {
    setAlertNotification({ message, type });
    setTimeout(() => {
      setAlertNotification(null);
    }, 4000);
  };

  // Pull all data from Google Sheets and update both local state and node server database
  const handlePullFromSheets = async (urlToUse?: string) => {
    const targetUrl = urlToUse || syncConfig.googleSheetsUrl;
    if (!targetUrl) {
      triggerNotification("URL Google Sheets belum diatur di Pengaturan!", "warning");
      return;
    }

    setIsSyncing(true);
    try {
      const res = await pullFromGoogleSheets(targetUrl);
      if (res.success && res.data) {
        const { products: fetchedProds, categories: fetchedCats, transactions: fetchedTxs, users: fetchedUsers, storeSettings: fetchedSettings } = res.data;
        
        if (fetchedProds.length > 0) {
          setProducts(fetchedProds);
          try {
            localStorage.setItem('kp_products', JSON.stringify(fetchedProds));
          } catch (e) {
            console.warn('LocalStorage limit exceeded:', e);
          }
          await saveProductsToServer(fetchedProds);
        }
        if (fetchedCats.length > 0) {
          setCategories(fetchedCats);
          localStorage.setItem('kp_categories', JSON.stringify(fetchedCats));
          await saveCategoriesToServer(fetchedCats);
        }
        if (fetchedTxs.length > 0) {
          setTransactions(fetchedTxs);
          localStorage.setItem('kp_transactions', JSON.stringify(fetchedTxs));
          await saveTransactionsToServer(fetchedTxs);
        }
        if (fetchedUsers && fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
          localStorage.setItem('kp_users', JSON.stringify(fetchedUsers));
          await saveUsersToServer(fetchedUsers);
        }
        if (fetchedSettings) {
          setStoreSettings(fetchedSettings);
          localStorage.setItem('kb_store_settings', JSON.stringify(fetchedSettings));
          await saveStoreSettingsToServer(fetchedSettings);
        }

        triggerNotification(res.message || "Berhasil menarik data terbaru dari Google Sheets!", "success");
      } else {
        triggerNotification(res.message || "Gagal menarik data dari Google Sheets. Pastikan spreadsheet tidak kosong.", "warning");
      }
    } catch (err: any) {
      triggerNotification(`Gagal menarik data: ${err.message || err}`, "warning");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- 2. GOOGLE SHEETS CLOUD SYNC TRIGGER ---
  const handleTriggerSync = async () => {
    if (!syncConfig.isEnabled || !syncConfig.googleSheetsUrl) return;

    setIsSyncing(true);
    isSyncingRef.current = true;
    const result = await syncToGoogleSheets(syncConfig.googleSheetsUrl, {
      products,
      categories,
      transactions,
      users,
      storeSettings
    });

    setIsSyncing(false);
    isSyncingRef.current = false;
    if (result.success) {
      const updatedConfig = {
        ...syncConfig,
        lastSyncedAt: new Date().toISOString()
      };
      setSyncConfig(updatedConfig);
      localStorage.setItem('kp_sync_config', JSON.stringify(updatedConfig));
      triggerNotification(result.message, 'success');
    } else {
      triggerNotification(result.message, 'warning');
    }
  };

  // Safe auto cloud backup on checkout / inventory changes with debouncing and queue to support 100+ items and prevent concurrent rate limiting errors
  const performAutoCloudBackup = (currentProducts: Product[], currentTxs: Transaction[]) => {
    if (!syncConfig.isEnabled || !syncConfig.googleSheetsUrl) return;

    // Save the latest data as the pending backup
    pendingBackupRef.current = { products: currentProducts, transactions: currentTxs };

    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }

    backupTimeoutRef.current = setTimeout(async () => {
      // If a sync is already running, wait 3 seconds and reschedule backup
      if (isSyncing || isSyncingRef.current) {
        console.log('Sync is currently active, rescheduling auto cloud backup...');
        performAutoCloudBackup(currentProducts, currentTxs);
        return;
      }

      const dataToBackup = pendingBackupRef.current;
      if (!dataToBackup) return;

      // Mark sync as active
      isSyncingRef.current = true;
      setIsSyncing(true);
      pendingBackupRef.current = null;

      console.log('Executing debounced cloud backup for ' + dataToBackup.products.length + ' products...');
      try {
        const result = await syncToGoogleSheets(syncConfig.googleSheetsUrl, {
          products: dataToBackup.products,
          categories,
          transactions: dataToBackup.transactions,
          users,
          storeSettings
        });

        if (result.success) {
          const updatedConfig = { ...syncConfig, lastSyncedAt: new Date().toISOString() };
          setSyncConfig(updatedConfig);
          localStorage.setItem('kp_sync_config', JSON.stringify(updatedConfig));
          console.log('Debounced cloud backup successful.');
        } else {
          console.warn('Debounced cloud backup failed:', result.message);
        }
      } catch (err) {
        console.error('Error during cloud backup:', err);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
        
        // If another update came in while we were syncing, run it now
        if (pendingBackupRef.current) {
          const nextData = pendingBackupRef.current;
          performAutoCloudBackup(nextData.products, nextData.transactions);
        }
      }
    }, 5000); // 5 seconds debounce
  };

  // --- 3. CORE INVENTORY & POS MUTATIONS ---
  const handleAddNewProduct = (newProdData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: `prod-${Math.random().toString(36).substr(2, 9)}`
    };

    const updated = [newProduct, ...products];
    const now = Date.now();
    lastLocalUpdate.current = now;
    localStorage.setItem('kp_last_updated', now.toString());
    setProducts(updated);
    try {
      localStorage.setItem('kp_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage limit exceeded for products, saving to server only:', e);
    }
    triggerNotification(`Produk "${newProduct.name}" berhasil dibuat!`, 'success');
    performAutoCloudBackup(updated, transactions);
    saveProductsToServer(updated);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const updated = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    const now = Date.now();
    lastLocalUpdate.current = now;
    localStorage.setItem('kp_last_updated', now.toString());
    setProducts(updated);
    try {
      localStorage.setItem('kp_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage limit exceeded for products, saving to server only:', e);
    }
    triggerNotification(`Stok & Data "${updatedProd.name}" diperbarui!`, 'success');
    performAutoCloudBackup(updated, transactions);
    saveProductsToServer(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    const prodToDelete = products.find(p => p.id === productId);
    const updated = products.filter(p => p.id !== productId);
    const now = Date.now();
    lastLocalUpdate.current = now;
    localStorage.setItem('kp_last_updated', now.toString());
    setProducts(updated);
    try {
      localStorage.setItem('kp_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage limit exceeded for products, saving to server only:', e);
    }
    triggerNotification(`Produk "${prodToDelete?.name}" telah dihapus.`, 'warning');
    performAutoCloudBackup(updated, transactions);
    saveProductsToServer(updated);
  };

  const handleDeleteTransaction = (txId: string) => {
    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return;

    // Restore stock counts
    const updatedProducts = products.map(p => {
      const soldItem = txToDelete.items.find(item => item.productId === p.id);
      if (soldItem) {
        return {
          ...p,
          stock: p.stock + soldItem.qty
        };
      }
      return p;
    });

    const updatedTxs = transactions.filter(t => t.id !== txId);
    const now = Date.now();
    lastLocalUpdate.current = now;
    localStorage.setItem('kp_last_updated', now.toString());
    
    setTransactions(updatedTxs);
    localStorage.setItem('kp_transactions', JSON.stringify(updatedTxs));
    saveTransactionsToServer(updatedTxs);

    setProducts(updatedProducts);
    localStorage.setItem('kp_products', JSON.stringify(updatedProducts));
    saveProductsToServer(updatedProducts);

    triggerNotification(`Transaksi ${txToDelete.invoiceNumber} berhasil dihapus & stok dikembalikan!`, 'success');
    performAutoCloudBackup(updatedProducts, updatedTxs);
  };

  const handleCheckoutSuccess = (newTx: Product | any) => {
    // 1. Save new transaction log
    const updatedTxs = [newTx as Transaction, ...transactions];
    const now = Date.now();
    lastLocalUpdate.current = now;
    localStorage.setItem('kp_last_updated', now.toString());
    
    setTransactions(updatedTxs);
    localStorage.setItem('kp_transactions', JSON.stringify(updatedTxs));
    saveTransactionsToServer(updatedTxs);

    // 2. Reduce product stocks in retail ledger
    const updatedProducts = products.map(p => {
      const soldItem = newTx.items.find((item: any) => item.productId === p.id);
      if (soldItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - soldItem.qty)
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    localStorage.setItem('kp_products', JSON.stringify(updatedProducts));
    saveProductsToServer(updatedProducts);

    // Update Customer loyalty points and/or debt
    if (newTx.customerId) {
      const earnedPoints = newTx.pointsEarned !== undefined ? newTx.pointsEarned : Math.floor(newTx.total / 10000);
      const pointsRedeemed = newTx.pointsRedeemed || 0;
      const updatedCustomers = customers.map(c => {
        if (c.id === newTx.customerId) {
          return {
            ...c,
            points: Math.max(0, c.points + earnedPoints - pointsRedeemed),
            debt: newTx.paymentMethod === 'debt' ? c.debt + newTx.total : c.debt
          };
        }
        return c;
      });
      setCustomers(updatedCustomers);
      localStorage.setItem('kp_customers', JSON.stringify(updatedCustomers));
      saveCustomersToServer(updatedCustomers);
    }

    // 3. Auto backup to Google Sheets if configured
    performAutoCloudBackup(updatedProducts, updatedTxs);

    // 4. Prompt physical receipt view instantly
    setSelectedTxForReceipt(newTx);
    triggerNotification("Transaksi Kasir Selesai & Sukses!", "success");
  };

  const handleUpdateSyncConfig = (cfg: SyncConfig) => {
    const now = Date.now();
    lastSavedSyncTime.current = now;
    lastLocalUpdate.current = now;
    localStorage.setItem('kp_last_updated', now.toString());
    setSyncConfig(cfg);
    localStorage.setItem('kp_sync_config', JSON.stringify(cfg));
    triggerNotification(`Konfigurasi Sinkronisasi berhasil disimpan!`, 'success');
    saveSyncConfigToServer(cfg);
  };

  // Offline recovery back-up JSON download
  const handleBackupLocal = () => {
    const dataStr = JSON.stringify({
      products,
      categories,
      transactions,
      users
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_KasirPro_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Offline backup JSON import
  const handleRestoreLocal = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.products && parsed.transactions && parsed.categories) {
        setProducts(parsed.products);
        setCategories(parsed.categories);
        setTransactions(parsed.transactions);
        if (parsed.users) setUsers(parsed.users);

        try {
          localStorage.setItem('kp_products', JSON.stringify(parsed.products));
        } catch (e) {
          console.warn('LocalStorage limit exceeded:', e);
        }
        try {
          localStorage.setItem('kp_categories', JSON.stringify(parsed.categories));
        } catch (e) {
          console.warn('LocalStorage limit exceeded:', e);
        }
        try {
          localStorage.setItem('kp_transactions', JSON.stringify(parsed.transactions));
        } catch (e) {
          console.warn('LocalStorage limit exceeded:', e);
        }
        if (parsed.users) localStorage.setItem('kp_users', JSON.stringify(parsed.users));
        
        triggerNotification('Data backup berhasil dipulihkan!', 'success');
        
        // Push everything to server immediately
        saveProductsToServer(parsed.products);
        saveCategoriesToServer(parsed.categories);
        saveTransactionsToServer(parsed.transactions);
        if (parsed.users) saveUsersToServer(parsed.users);

        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // --- 4. SECURE AUTHENTICATION LOGIN HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Mock authenticator mapping matching user names
    let matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    if (matchedUser) {
      // Check stored custom password, fallback to `${matchedUser.username}123`
      const validPass = matchedUser.password || `${matchedUser.username}123`;
      if (password === validPass) {
        setCurrentUser(matchedUser);
        sessionStorage.setItem('kp_active_user', JSON.stringify(matchedUser));
        
        // Dynamic dashboard tab redirect for managers, POS for checkout clerks
        if (matchedUser.role === 'cashier') {
          setActiveTab('cashier');
        } else if (matchedUser.role === 'owner') {
          setActiveTab('dashboard');
        } else {
          setActiveTab('inventory');
        }
        
        triggerNotification(`Selamat datang kembali, ${matchedUser.name}!`, 'success');
      } else {
        setLoginError('Password salah! Harap periksa kembali password Anda.');
      }
    } else {
      setLoginError('Username tidak terdaftar! Hubungi Owner untuk melakukan pengaturan akun.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('kp_active_user');
    setSelectedTxForReceipt(null);
    setUsername('');
    setPassword('');
    setIsLogoutConfirmOpen(false);
    triggerNotification('Berhasil keluar sistem.', 'success');
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('kp_users', JSON.stringify(updatedUsers));
    saveUsersToServer(updatedUsers);
    
    // Check if current user name was updated, of so sync state and session storage
    if (currentUser) {
      const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
      if (updatedMe && updatedMe.name !== currentUser.name) {
        setCurrentUser(updatedMe);
        sessionStorage.setItem('kp_active_user', JSON.stringify(updatedMe));
      }
    }
    triggerNotification('Nama personel berhasil diperbarui.', 'success');
  };

  // Count items with low stock warning alerts
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const isCustomerDisplayMode = window.location.search.includes('display=customer') || window.location.hash.includes('customer-display');
  if (isCustomerDisplayMode) {
    return <CustomerDisplay storeSettings={storeSettings} />;
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Alert Notification Popup Banner */}
      <AnimatePresence>
        {alertNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 w-80 text-xs font-semibold ${
              alertNotification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}
          >
            {alertNotification.type === 'success' ? (
              <CheckCircle className="text-emerald-500 shrink-0" size={18} />
            ) : (
              <AlertTriangle className="text-amber-500 shrink-0" size={18} />
            )}
            <span>{alertNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER LOGIN PAGE IF CURRENT USER NOT LOGGED IN */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-screen bg-[#f3f4f6] dark:bg-slate-950">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200/40 dark:border-slate-800/80 overflow-hidden flex flex-col md:flex-row min-h-[560px]"
          >
            {/* Left Welcome Panel (Green Brand Gradient matching Dashboard) */}
            <div className="w-full md:w-[45%] bg-gradient-to-br from-[#78c953] via-[#68b544] to-[#519632] p-8 md:p-10 flex flex-col justify-between text-white relative">
              {/* Decorative Background Blob */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_55%)] pointer-events-none" />
              
              <div>
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-8 shadow-xs">
                  <UserCheck size={20} className="text-white/90" />
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-4">
                  Selamat Datang di <br />
                  <span className="text-yellow-300 font-extrabold">{storeSettings.name}</span>
                </h1>
                
                <p className="text-white/80 text-[11px] md:text-xs font-semibold leading-relaxed max-w-sm">
                  Sistem POS Retail & Manajemen Kasir otomatis yang terintegrasi secara real-time antar perangkat dan cloud Google Sheets.
                </p>
              </div>

              <div className="mt-8 md:mt-0 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                <p className="text-white/95 text-[10.5px] md:text-[11.5px] font-medium leading-relaxed italic">
                  "Sistem yang rapi dan pelayanan cepat adalah fondasi utama bagi kemajuan bisnis yang berkelanjutan."
                </p>
                <p className="text-white/60 text-[8.5px] md:text-[9.5px] font-bold uppercase tracking-widest mt-2.5">
                  — TIM KASIR PINTAR PRO
                </p>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Login Account</h2>
                <p className="text-xs text-slate-405 dark:text-slate-500 font-bold mt-1">Silakan masuk menggunakan username dan password Anda.</p>
              </div>

              {/* Login form field */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#78c953] block mb-1.5">Username Login</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-2.5 pl-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#78c953] block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2.5 pl-10 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#78c953]/10 focus:border-[#78c953] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[10px] font-medium rounded-xl border border-red-100 dark:border-red-900/40">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full p-3 bg-[#78c953] hover:bg-[#68b544] font-extrabold text-white rounded-2xl text-xs tracking-wider uppercase transition-colors shadow-md shadow-emerald-100 cursor-pointer text-center"
                >
                  Masuk Aplikasi
                </button>
              </form>


            </div>
          </motion.div>
        </div>
      ) : (
        // RENDER POS INNER MAIN APPLICATION PORTAL
        <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex flex-col md:flex-row font-sans antialiased text-slate-800 dark:text-slate-100 overflow-hidden h-screen transition-colors duration-200">
          
          {/* Left Sidebar on Desktop - rendered only if NOT in checkout printable mode or POS Fullscreen */}
          {!isPosFullscreen && !selectedTxForReceipt && (
            <aside className="hidden md:flex w-[190px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex-col justify-between shrink-0 h-screen select-none z-40 border-r border-slate-200/50 dark:border-slate-800 transition-colors duration-200">
              <div className="p-3.5 flex flex-col h-full overflow-hidden">
                
                {/* Brand/Store Info */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3.5 shrink-0">
                  <div className="p-1.5 bg-[#78c953] text-white rounded-lg flex items-center justify-center shadow-xs">
                    <Store size={14} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-extrabold text-[11px] tracking-tight text-slate-900 dark:text-slate-100 leading-none uppercase">ACRU | POS</h1>
                    <p className="text-[8.5px] text-slate-400 dark:text-slate-500 mt-0.5 truncate font-medium">{storeSettings.name}</p>
                  </div>
                </div>

                {/* Left Sidebar Navigation Menu: ORDERED WITH LAPORAN KEUANGAN ON TOP */}
                <div className="space-y-0.5 flex-1 overflow-y-auto pr-0.5">
                  
                  {/* 1. Dashboard / Laporan Keuangan - Allowed for: Owner only */}
                  {['owner'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('dashboard'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'dashboard'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <BarChart3 size={14} className={activeTab === 'dashboard' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Dashboard</span>
                    </button>
                  )}

                  {/* 2. Kasir POS - Allowed for: Everyone */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('cashier'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'cashier'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <ShoppingBag size={14} className={activeTab === 'cashier' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Kasir (POS)</span>
                    </button>
                  )}

                  {/* 3. Riwayat Transaksi - Allowed for: Everyone */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('history'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'history'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <History size={14} className={activeTab === 'history' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Riwayat Transaksi</span>
                    </button>
                  )}

                  {/* 4. Manajemen Stok - Allowed for: Owner & Admin only */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('inventory'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'inventory'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <Database size={14} className={activeTab === 'inventory' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Manajemen Stok</span>
                    </button>
                  )}

                  {/* 4.2. Pembelian & Supplier - Allowed for: Owner & Admin only */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('pembelian'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'pembelian'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <Truck size={14} className={activeTab === 'pembelian' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Pembelian & Supplier</span>
                    </button>
                  )}

                  {/* 4.5. Data Pelanggan - Allowed for: Everyone */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('customers'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'customers'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <Users size={14} className={activeTab === 'customers' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Data Pelanggan</span>
                    </button>
                  )}

                  {/* 5. Pengaturan - Allowed for: Owner & Admin only */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('settings'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'settings'
                          ? 'bg-[#78c953]/8 text-slate-900 dark:text-slate-100 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <Settings size={14} className={activeTab === 'settings' ? 'text-[#78c953]' : 'text-slate-400 dark:text-slate-500'} />
                      <span>Pengaturan</span>
                    </button>
                  )}
                </div>

                {/* bottom profile block & log out */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto shrink-0 space-y-2 pb-1 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-[#78c953] text-white font-black text-[9px] uppercase flex items-center justify-center shrink-0">
                      {currentUser.role.substring(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-405 dark:text-slate-500">{currentUser.role === 'owner' ? 'Owner Akun' : 'Petugas'}</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    className="w-full p-1.5 px-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-550 hover:text-red-650 border border-slate-100 dark:border-slate-800 hover:border-red-100 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide bg-slate-50/50 dark:bg-slate-900"
                  >
                    <LogOut size={11} />
                    Keluar Sistem
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Right Side Content Workspace Panel */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
            
            {/* Top Workspace Bar: hidden if in Fullscreen mode */}
            {!isPosFullscreen && !selectedTxForReceipt ? (
              <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 select-none shrink-0 md:shadow-xs transition-colors duration-200">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  
                  <div className="flex items-center gap-3">
                    <div className="md:hidden p-2 bg-[#78c953]/15 text-[#78c953] rounded-xl flex items-center justify-center">
                      <Store size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                        {activeTab === 'dashboard' && 'Laporan Keuangan & Laba Rugi'}
                        {activeTab === 'cashier' && 'Aplikasi Kasir POS'}
                        {activeTab === 'history' && 'Arsip Riwayat Transaksi'}
                        {activeTab === 'inventory' && 'Manajemen Stok & Cloud Sync'}
                        {activeTab === 'pembelian' && 'Pembelian & Retur Supplier'}
                        {activeTab === 'settings' && 'Setelan Operasional'}
                        
                        {lowStockCount > 0 && currentUser.role !== 'cashier' && (
                          <span className="p-1 px-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900 text-[8.5px] font-bold rounded-lg animate-pulse inline-flex items-center gap-1 leading-none shrink-0 select-none">
                            <AlertTriangle size={9} /> {lowStockCount} Stok Habis!
                          </span>
                        )}
                      </h2>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">Fasilitas administrasi toko mitra mandiri</p>
                    </div>
                  </div>

                  {/* Top-Right Info badges */}
                  <div className="flex items-center gap-2.5 text-xs font-bold font-sans">
                    <span className="hidden lg:inline bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-xl text-[9.5px]">
                      Stasiun Kasir #01: ONLINE
                    </span>

                    {/* Theme Toggle Button */}
                    <button
                      onClick={toggleTheme}
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs border border-slate-200/40 dark:border-slate-700"
                      title={theme === 'light' ? 'Aktifkan Mode Gelap' : 'Aktifkan Mode Terang'}
                    >
                      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                    
                    <div className="md:hidden flex items-center gap-2 text-right">
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 truncate max-w-[100px] block">{currentUser.name}</span>
                      <button
                        onClick={() => setIsLogoutConfirmOpen(true)}
                        className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl cursor-pointer text-[10px] font-bold animate-pulse"
                        title="Keluar"
                      >
                        Keluar
                      </button>
                    </div>
                  </div>

                </div>

                {/* Mobile View - Horizontal Tab lists with Laporan Keuangan on top block */}
                <div className="flex md:hidden bg-slate-100 dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800 p-2 gap-1.5 overflow-x-auto justify-start select-none">
                  {/* 1. Laporan Keuangan - POSISI PALING ATAS (LEFTMOST) */}
                  {['owner'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('dashboard'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Laporan Keuangan
                    </button>
                  )}

                  {/* 2. Kasir POS */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('cashier'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'cashier' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Kasir POS
                    </button>
                  )}

                  {/* 3. Riwayat */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('history'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Riwayat
                    </button>
                  )}

                  {/* 3.5. Pelanggan */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('customers'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'customers' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Pelanggan
                    </button>
                  )}

                  {/* 4. Stok Barang */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('inventory'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'inventory' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Stok & Barang
                    </button>
                  )}

                  {/* 4.2. Pembelian */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('pembelian'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'pembelian' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Pembelian
                    </button>
                  )}

                  {/* 5. Setelan */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('settings'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'settings' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Setelan
                    </button>
                  )}
                </div>
              </header>
            ) : isPosFullscreen && !selectedTxForReceipt ? (
              /* Float alert bar indicating Fullscreen operation mode */
              <div className="bg-amber-600 text-white text-[9px] font-bold tracking-widest uppercase p-2 flex justify-between items-center px-4 shrink-0 select-none animate-slide-down">
                <span>⚡ MODE LAYAR PENUH AKTIF — Transaksi lebih cepat tanpa distraksi menu</span>
                <button
                  onClick={() => setIsPosFullscreen(false)}
                  className="bg-slate-900 text-white font-sans text-[8.5px] font-extrabold px-3 py-1 rounded-lg hover:bg-slate-800 cursor-pointer shadow-sm ml-2 transition-colors uppercase"
                >
                  Keluar Layar Penuh
                </button>
              </div>
            ) : null}

            {/* Core Content Layout Area */}
            <main className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 focus:outline-hidden">
              {selectedTxForReceipt ? (
                // RETAIL THERMAL CEK OUT SCREEN ROUTE
                <div className="animate-fade-in p-2">
                  <div className="mb-4 text-center select-none">
                    <h3 className="font-extrabold text-slate-800 text-base flex justify-center items-center gap-1.5">
                      <CheckCircle className="text-emerald-500" size={20} />
                      Transaksi Kasir Berhasil Dicatat!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Konfigurasikan ukuran tanda terima dan cetak struk nota fisik.</p>
                  </div>
                  <ThermalReceipt
                    transaction={selectedTxForReceipt}
                    onBack={() => setSelectedTxForReceipt(null)}
                    storeSettings={storeSettings}
                  />
                </div>
              ) : (
                // CORE NAVIGATION TAB ROUTING
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {activeTab === 'cashier' && (
                      <CashierTab
                        products={products}
                        categories={categories}
                        currentUser={currentUser}
                        customers={customers}
                        onCheckoutSuccess={handleCheckoutSuccess}
                        storeSettings={storeSettings}
                        isFullscreen={isPosFullscreen}
                        onToggleFullscreen={() => setIsPosFullscreen(!isPosFullscreen)}
                      />
                    )}

                    {activeTab === 'history' && (
                      <TransactionHistory
                        transactions={transactions}
                        storeSettings={storeSettings}
                        onReprint={(tx) => setSelectedTxForReceipt(tx)}
                        onDeleteTransaction={handleDeleteTransaction}
                        currentUserRole={currentUser?.role}
                      />
                    )}

                    {activeTab === 'dashboard' && (
                      <Dashboard
                        transactions={transactions}
                        products={products}
                        categories={categories}
                        onNavigateToStock={() => { setActiveTab('inventory'); }}
                        storeSettings={storeSettings}
                        onTriggerSync={handleTriggerSync}
                        isSyncing={isSyncing}
                        users={users}
                        onUpdateUsers={handleUpdateUsers}
                      />
                    )}

                    {activeTab === 'inventory' && (
                      <InventoryManager
                        products={products}
                        categories={categories}
                        syncConfig={syncConfig}
                        onAddProduct={handleAddNewProduct}
                        onUpdateProduct={handleUpdateProduct}
                        onDeleteProduct={handleDeleteProduct}
                        onUpdateSyncConfig={handleUpdateSyncConfig}
                        onTriggerSync={handleTriggerSync}
                        onPullFromSheets={handlePullFromSheets}
                        isSyncing={isSyncing}
                        onOpenSyncGuide={() => setIsSyncGuideOpen(true)}
                        onBackupLocal={handleBackupLocal}
                        onRestoreLocal={handleRestoreLocal}
                      />
                    )}

                    {activeTab === 'settings' && (
                      <SettingsTab
                        settings={storeSettings}
                        onSaveSettings={(updated, silent = false, persistToServer = true) => {
                          lastSavedSettingsTime.current = Date.now();
                          setStoreSettings(updated);
                          localStorage.setItem('kb_store_settings', JSON.stringify(updated));
                          if (!silent) {
                            triggerNotification("Pengaturan toko berhasil disimpan!", "success");
                          }
                          if (persistToServer) {
                            saveStoreSettingsToServer(updated);
                          }
                        }}
                        syncConfig={syncConfig}
                        onUpdateSyncConfig={handleUpdateSyncConfig}
                        onTriggerSync={handleTriggerSync}
                        onPullFromSheets={handlePullFromSheets}
                        isSyncing={isSyncing}
                        onOpenSyncGuide={() => setIsSyncGuideOpen(true)}
                        currentUser={currentUser}
                        users={users}
                        onUpdateUsers={handleUpdateUsers}
                      />
                    )}

                    {activeTab === 'customers' && (
                      <CustomerManager
                        customers={customers}
                        onUpdateCustomers={(updated) => {
                          setCustomers(updated);
                          localStorage.setItem('kp_customers', JSON.stringify(updated));
                          saveCustomersToServer(updated);
                        }}
                        currentUser={currentUser}
                        transactions={transactions}
                        onAddTransaction={(tx) => {
                          const updated = [tx, ...transactions];
                          setTransactions(updated);
                          localStorage.setItem('kp_transactions', JSON.stringify(updated));
                          saveTransactionsToServer(updated);
                        }}
                      />
                    )}

                    {activeTab === 'pembelian' && (
                      <PurchaseManager
                        products={products}
                        onUpdateProducts={(updated) => {
                          setProducts(updated);
                          localStorage.setItem('kp_products', JSON.stringify(updated));
                          saveProductsToServer(updated);
                        }}
                        suppliers={suppliers}
                        onUpdateSuppliers={(updated) => {
                          setSuppliers(updated);
                          localStorage.setItem('kp_suppliers', JSON.stringify(updated));
                          saveSuppliersToServer(updated);
                        }}
                        purchases={purchases}
                        onUpdatePurchases={(updated) => {
                          setPurchases(updated);
                          localStorage.setItem('kp_purchases', JSON.stringify(updated));
                          savePurchasesToServer(updated);
                        }}
                        purchaseReturns={purchaseReturns}
                        onUpdatePurchaseReturns={(updated) => {
                          setPurchaseReturns(updated);
                          localStorage.setItem('kp_purchase_returns', JSON.stringify(updated));
                          savePurchaseReturnsToServer(updated);
                        }}
                        currentUser={currentUser}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </main>

            {/* Footer status markers for connected sync networks - hidden in fullscreen POS */}
            {!isPosFullscreen && !selectedTxForReceipt && (
              <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 text-center text-[10px] text-slate-400 select-none shrink-0">
                <div className="px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <span className="font-medium text-slate-400 dark:text-slate-500">Kasir Pintar Pro Cloud Sync v2.0 - {storeSettings.name}</span>
                  
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[8px]">
                      Sistem: <span className="text-[#5cb85c] font-black">Online / Connected Database</span>
                    </span>
                    
                    {syncConfig.isEnabled && (
                      <span className="p-1 px-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-extrabold rounded-md text-[8px] border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1 animate-pulse">
                        <Database size={10} />
                        Connected Sheets Active
                      </span>
                    )}
                  </div>
                </div>
              </footer>
            )}

          </div>

          {/* Global copy-paste Apps Script Integration Setup guide */}
          <AppsScriptGuide
            isOpen={isSyncGuideOpen}
            onClose={() => setIsSyncGuideOpen(false)}
          />

          {/* Secure Logout Confirmation Dialog Popup */}
          <AnimatePresence>
            {isLogoutConfirmOpen && (
              <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100/80 dark:border-slate-800 text-center"
                >
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mb-4">
                    <LogOut size={22} className="ml-0.5" />
                  </div>
                  
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Konfirmasi Keluar Aplikasi</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Apakah Anda yakin ingin keluar dari sistem kasir <span className="font-bold text-slate-700 dark:text-slate-350">KASIR PINTAR PRO</span>? Sesi aktif Anda saat ini akan segera diistirahatkan.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className="p-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-colors shadow-sm shadow-red-100"
                    >
                      Keluar Sekarang
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
