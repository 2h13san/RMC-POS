/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number; // For profit/loss calculations
  stock: number;
  minStock: number; // Minimum threshold before low stock alert
  imageUrl?: string;
}

export interface TransactionItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  discount: number; // discount amount per item
  total: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // ISO String
  items: TransactionItem[];
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: 'cash' | 'qris' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';
  cashAmount?: number;
  changeAmount?: number;
  cashierId: string;
  cashierName: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'cashier' | 'owner';
  active: boolean;
}

export interface SyncConfig {
  googleSheetsUrl: string;
  isEnabled: boolean;
  lastSyncedAt?: string;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  isTaxEnabled: boolean;
  taxPercentage: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

// Pre-seeded initial data
export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Makanan', icon: 'Utensils' },
  { id: '2', name: 'Minuman Kopi', icon: 'Coffee' },
  { id: '3', name: 'Minuman Non-Kopi', icon: 'CupSoda' },
  { id: '4', name: 'Camilan', icon: 'Cookie' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'MKN-001',
    name: 'Nasi Goreng Spesial',
    category: 'Makanan',
    price: 25000,
    costPrice: 15000,
    stock: 25,
    minStock: 5,
  },
  {
    id: 'prod-2',
    sku: 'MKN-002',
    name: 'Mie Goreng Seafood',
    category: 'Makanan',
    price: 28000,
    costPrice: 17000,
    stock: 12,
    minStock: 5,
  },
  {
    id: 'prod-3',
    sku: 'KOP-001',
    name: 'Espresso Single',
    category: 'Minuman Kopi',
    price: 15000,
    costPrice: 6000,
    stock: 4, // Low stock triggers warning
    minStock: 10,
  },
  {
    id: 'prod-4',
    sku: 'KOP-002',
    name: 'Kopi Susu Gula Aren',
    category: 'Minuman Kopi',
    price: 18000,
    costPrice: 8000,
    stock: 50,
    minStock: 15,
  },
  {
    id: 'prod-5',
    sku: 'KOP-003',
    name: 'Cafe Latte',
    category: 'Minuman Kopi',
    price: 22000,
    costPrice: 10000,
    stock: 35,
    minStock: 10,
  },
  {
    id: 'prod-6',
    sku: 'NKO-001',
    name: 'Matcha Latte Ice',
    category: 'Minuman Non-Kopi',
    price: 20000,
    costPrice: 9000,
    stock: 18,
    minStock: 5,
  },
  {
    id: 'prod-7',
    sku: 'NKO-002',
    name: 'Ice Red Velvet',
    category: 'Minuman Non-Kopi',
    price: 20000,
    costPrice: 9000,
    stock: 3, // Low stock warning
    minStock: 8,
  },
  {
    id: 'prod-8',
    sku: 'CAM-001',
    name: 'Croissant Cokelat',
    category: 'Camilan',
    price: 18000,
    costPrice: 11000,
    stock: 2, // Low stock warning
    minStock: 5,
  },
  {
    id: 'prod-9',
    sku: 'CAM-002',
    name: 'French Fries',
    category: 'Camilan',
    price: 15000,
    costPrice: 7000,
    stock: 15,
    minStock: 5,
  },
];

// Seeded Transactions across the last few days to populate dashboards with realistic data
export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    invoiceNumber: 'INV/20260604/001',
    date: '2026-06-04T09:15:00Z',
    items: [
      { productId: 'prod-4', sku: 'KOP-002', name: 'Kopi Susu Gula Aren', price: 18000, costPrice: 8000, qty: 2, discount: 0, total: 36000 },
      { productId: 'prod-8', sku: 'CAM-001', name: 'Croissant Cokelat', price: 18000, costPrice: 11000, qty: 1, discount: 2000, total: 16000 },
    ],
    subTotal: 54000,
    discountTotal: 2000,
    taxTotal: 5720, // 11% of (54000 - 2000)
    total: 57720,
    paymentMethod: 'cash',
    cashAmount: 60000,
    changeAmount: 2280,
    cashierId: 'user-3',
    cashierName: 'Rina Kasir',
  },
  {
    id: 'tx-002',
    invoiceNumber: 'INV/20260604/002',
    date: '2026-06-04T12:30:00Z',
    items: [
      { productId: 'prod-1', sku: 'MKN-001', name: 'Nasi Goreng Spesial', price: 25000, costPrice: 15000, qty: 2, discount: 0, total: 50000 },
      { productId: 'prod-5', sku: 'KOP-003', name: 'Cafe Latte', price: 22000, costPrice: 10000, qty: 2, discount: 0, total: 44000 },
    ],
    subTotal: 94000,
    discountTotal: 0,
    taxTotal: 10340,
    total: 104340,
    paymentMethod: 'qris',
    cashierId: 'user-3',
    cashierName: 'Rina Kasir',
  },
  {
    id: 'tx-003',
    invoiceNumber: 'INV/20260605/001',
    date: '2026-06-05T10:45:00Z',
    items: [
      { productId: 'prod-6', sku: 'NKO-001', name: 'Matcha Latte Ice', price: 20000, costPrice: 9000, qty: 3, discount: 3000, total: 57000 },
    ],
    subTotal: 60000,
    discountTotal: 3000,
    taxTotal: 6270,
    total: 63270,
    paymentMethod: 'dana',
    cashierId: 'user-3',
    cashierName: 'Rina Kasir',
  },
  {
    id: 'tx-004',
    invoiceNumber: 'INV/20260605/002',
    date: '2026-06-05T15:20:00Z',
    items: [
      { productId: 'prod-2', sku: 'MKN-002', name: 'Mie Goreng Seafood', price: 28000, costPrice: 17000, qty: 1, discount: 0, total: 28000 },
      { productId: 'prod-9', sku: 'CAM-002', name: 'French Fries', price: 15000, costPrice: 7000, qty: 1, discount: 0, total: 15000 },
      { productId: 'prod-4', sku: 'KOP-002', name: 'Kopi Susu Gula Aren', price: 18000, costPrice: 8000, qty: 1, discount: 0, total: 18000 },
    ],
    subTotal: 61000,
    discountTotal: 0,
    taxTotal: 6710,
    total: 67710,
    paymentMethod: 'gopay',
    cashierId: 'user-3',
    cashierName: 'Rina Kasir',
  },
  {
    id: 'tx-005',
    invoiceNumber: 'INV/20260606/001',
    date: '2026-06-06T11:00:00Z',
    items: [
      { productId: 'prod-5', sku: 'KOP-003', name: 'Cafe Latte', price: 22000, costPrice: 10000, qty: 1, discount: 0, total: 22000 },
      { productId: 'prod-8', sku: 'CAM-001', name: 'Croissant Cokelat', price: 18000, costPrice: 11000, qty: 2, discount: 0, total: 36000 },
    ],
    subTotal: 58000,
    discountTotal: 0,
    taxTotal: 6380,
    total: 64380,
    paymentMethod: 'ovo',
    cashierId: 'user-3',
    cashierName: 'Rina Kasir',
  },
  {
    id: 'tx-006',
    invoiceNumber: 'INV/20260606/002',
    date: '2026-06-06T18:40:00Z',
    items: [
      { productId: 'prod-1', sku: 'MKN-001', name: 'Nasi Goreng Spesial', price: 25000, costPrice: 15000, qty: 4, discount: 5000, total: 95000 },
      { productId: 'prod-4', sku: 'KOP-002', name: 'Kopi Susu Gula Aren', price: 18000, costPrice: 8000, qty: 4, discount: 0, total: 72000 },
    ],
    subTotal: 172000,
    discountTotal: 5000,
    taxTotal: 18370,
    total: 185370,
    paymentMethod: 'qris',
    cashierId: 'user-1',
    cashierName: 'Adi Pemilik',
  },
  {
    id: 'tx-007',
    invoiceNumber: 'INV/20260607/001',
    date: '2026-06-07T08:10:00Z',
    items: [
      { productId: 'prod-5', sku: 'KOP-003', name: 'Cafe Latte', price: 22000, costPrice: 10000, qty: 2, discount: 0, total: 44000 },
      { productId: 'prod-9', sku: 'CAM-002', name: 'French Fries', price: 15000, costPrice: 7000, qty: 2, discount: 2000, total: 28000 },
    ],
    subTotal: 74000,
    discountTotal: 2000,
    taxTotal: 7920,
    total: 79920,
    paymentMethod: 'shopeepay',
    cashierId: 'user-2',
    cashierName: 'Fajar Admin',
  },
];
