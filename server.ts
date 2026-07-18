import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_FILE = isVercel ? '/tmp/data.json' : path.join(process.cwd(), 'data.json');

if (isVercel && !fs.existsSync('/tmp/data.json')) {
  try {
    const srcPath = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, '/tmp/data.json');
    }
  } catch (err) {
    console.error('Failed to copy initial data.json to /tmp:', err);
  }
}

app.use(express.json({ limit: '10mb' }));

// Ensure uploads directory exists and serve it statically
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Initial Seed Data
const defaultUsers = [
  { id: 'user-1', username: 'owner', password: 'owner123', name: 'Adi Pemilik', role: 'owner', active: true },
  { id: 'user-2', username: 'admin', password: 'admin123', name: 'Fajar Admin', role: 'admin', active: true },
  { id: 'user-3', username: 'kasir', password: 'kasir123', name: 'Rina Kasir', role: 'cashier', active: true }
];

const defaultStoreSettings = {
  name: "KASIR PINTAR COFFEE & EATERY",
  address: "Jl. Sudirman No. 45, Jakarta",
  phone: "0812-3456-7890",
  isTaxEnabled: true,
  taxPercentage: 11
};

const defaultSyncConfig = {
  googleSheetsUrl: '',
  isEnabled: false
};

const INITIAL_CATEGORIES = [
  { id: '1', name: 'Makanan', icon: 'Utensils' },
  { id: '2', name: 'Minuman Kopi', icon: 'Coffee' },
  { id: '3', name: 'Minuman Non-Kopi', icon: 'CupSoda' },
  { id: '4', name: 'Camilan', icon: 'Cookie' },
];

const INITIAL_PRODUCTS = [
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
    stock: 4,
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
    stock: 3,
    minStock: 8,
  },
  {
    id: 'prod-8',
    sku: 'CAM-001',
    name: 'Croissant Cokelat',
    category: 'Camilan',
    price: 18000,
    costPrice: 11000,
    stock: 2,
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

const INITIAL_TRANSACTIONS = [
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
    taxTotal: 5720,
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
  }
];

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      
      let updated = false;
      if (!parsed.products) { parsed.products = INITIAL_PRODUCTS; updated = true; }
      if (!parsed.categories) { parsed.categories = INITIAL_CATEGORIES; updated = true; }
      if (!parsed.transactions) { parsed.transactions = INITIAL_TRANSACTIONS; updated = true; }
      if (!parsed.users) { parsed.users = defaultUsers; updated = true; }
      if (!parsed.storeSettings) { parsed.storeSettings = defaultStoreSettings; updated = true; }
      if (!parsed.syncConfig) { parsed.syncConfig = defaultSyncConfig; updated = true; }
      if (!parsed.lastUpdated) { parsed.lastUpdated = 1700000000000; updated = true; }
      
      if (updated) {
        writeData(parsed);
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error reading data.json, resetting to default', error);
  }
  
  const defaultData = {
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    transactions: INITIAL_TRANSACTIONS,
    users: defaultUsers,
    storeSettings: defaultStoreSettings,
    syncConfig: defaultSyncConfig,
    lastUpdated: 1700000000000
  };
  writeData(defaultData);
  return defaultData;
}

function writeData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data.json', error);
  }
}

// REST API Endpoints for Real-Time Sync
app.get('/api/data', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const data = readData();
  res.json(data);
});

app.post('/api/products', (req, res) => {
  const data = readData();
  data.products = req.body;
  data.lastUpdated = Date.now();
  writeData(data);
  res.json({ success: true, lastUpdated: data.lastUpdated });
});

app.post('/api/upload', (req, res) => {
  try {
    const { filename, fileType, base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeFilename);

    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${safeFilename}`;
    res.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error('Upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/categories', (req, res) => {
  const data = readData();
  data.categories = req.body;
  data.lastUpdated = Date.now();
  writeData(data);
  res.json({ success: true, lastUpdated: data.lastUpdated });
});

app.post('/api/transactions', (req, res) => {
  const data = readData();
  data.transactions = req.body;
  data.lastUpdated = Date.now();
  writeData(data);
  res.json({ success: true, lastUpdated: data.lastUpdated });
});

app.post('/api/users', (req, res) => {
  const data = readData();
  data.users = req.body;
  data.lastUpdated = Date.now();
  writeData(data);
  res.json({ success: true, lastUpdated: data.lastUpdated });
});

app.post('/api/store-settings', (req, res) => {
  const data = readData();
  data.storeSettings = req.body;
  data.lastUpdated = Date.now();
  writeData(data);
  res.json({ success: true, lastUpdated: data.lastUpdated });
});

app.post('/api/sync-config', (req, res) => {
  const data = readData();
  data.syncConfig = req.body;
  data.lastUpdated = Date.now();
  writeData(data);
  res.json({ success: true, lastUpdated: data.lastUpdated });
});

async function startServer() {
  // Vite dev server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!isVercel) {
  startServer();
}

export default app;
