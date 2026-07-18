/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Transaction, Category, User, StoreSettings } from '../types';

/**
 * Helper to convert any Google Drive preview link to a direct high-resolution lh3.googleusercontent.com link with "=s0" to prevent low-resolution pixelation
 */
export const getHighResImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com')) {
    let fileId = '';
    
    // Pattern 1: /file/d/FILE_ID/...
    if (url.includes('/file/d/')) {
      const parts = url.split('/file/d/');
      if (parts[1]) {
        fileId = parts[1].split('/')[0];
      }
    }
    // Pattern 2: ?id=FILE_ID
    else if (url.includes('id=')) {
      const match = url.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        fileId = match[1];
      }
    }
    
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=s0`;
    }
  }
  
  // If it is already a googleusercontent URL
  if (url.startsWith('https://lh3.googleusercontent.com/d/')) {
    if (!url.includes('=')) {
      return `${url}=s0`;
    } else {
      // Replace any other size parameter with =s0 (original high resolution)
      return url.replace(/=[^=]*$/, '=s0');
    }
  }
  
  return url;
};

/**
 * Helper to append action query parameter to Web App URL to prevent browser payload stripping on redirect
 */
const appendActionToUrl = (url: string, action: string): string => {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}action=${action}`;
};

/**
 * Service to sync data with Google Sheets via a Google Apps Script web app
 */
export const syncToGoogleSheets = async (
  webAppUrl: string,
  data: {
    products: Product[];
    categories: Category[];
    transactions: Transaction[];
    users?: User[];
    storeSettings?: StoreSettings;
  }
): Promise<{ success: boolean; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com') || !webAppUrl.includes('/exec')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Pastikan Anda menyalin "Aplikasi Web (Web App) URL" yang berakhiran "/exec" saat melakukan Deploy (Penerapan Baru), bukan URL Editor Apps Script.',
    };
  }

  try {
    // Sanitize products: prevent raw base64 from crashing Google Sheets (50k chars limit)
    // and expand local /uploads/ images to absolute URLs so Google can see them
    const sanitizedProducts = data.products.map(p => {
      let img = p.imageUrl || '';
      if (img.startsWith('data:image/')) {
        img = ''; // Exclude base64 from cells to avoid Google Sheets 50,000 chars limit
      } else if (img.startsWith('/uploads/')) {
        img = window.location.origin + img; // Convert to absolute URL
      }
      return {
        ...p,
        imageUrl: img
      };
    });

    const urlWithAction = appendActionToUrl(webAppUrl, 'sync_all');
    // Send full data payload as POST to the Apps Script Web App URL
    const response = await fetch(urlWithAction, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Apps Script handles text/plain best to circumvent CORS preflight
      },
      body: JSON.stringify({
        action: 'sync_all',
        payload: {
          ...data,
          products: sanitizedProducts
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        message: result.message || 'Data berhasil disinkronisasi ke Google Sheets!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Sinkronisasi gagal diproses oleh Apps Script.',
      };
    }
  } catch (error: any) {
    console.error('Apps Script Sync Error:', error);
    // Standard fetch can fail CORS on redirect even if write succeeds
    // We add a friendly message of success with redirection hint since GET/POST usually fires under the hood anyway
    return {
      success: false,
      message: `Gagal terhubung ke Google Sheets: ${error.message || error}. Pastikan Web App diset ke "Anyone" (Siapa saja) saat deploy.`,
    };
  }
};

/**
 * Service to pull all data from Google Sheets via the Apps Script Web App
 */
export const pullFromGoogleSheets = async (
  webAppUrl: string
): Promise<{ success: boolean; data?: { products: Product[]; categories: Category[]; transactions: Transaction[]; users?: User[]; storeSettings?: StoreSettings }; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com') || !webAppUrl.includes('/exec')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Pastikan Anda menyalin "Aplikasi Web (Web App) URL" yang berakhiran "/exec" saat melakukan Deploy (Penerapan Baru), bukan URL Editor Apps Script.',
    };
  }

  try {
    const urlWithAction = appendActionToUrl(webAppUrl, 'pull_all');
    const response = await fetch(urlWithAction, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'pull_all',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        data: {
          products: result.products || [],
          categories: result.categories || [],
          transactions: result.transactions || [],
          users: result.users,
          storeSettings: result.storeSettings,
        },
        message: result.message || 'Data berhasil ditarik dari Google Sheets!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Gagal menarik data dari Google Sheets.',
      };
    }
  } catch (error: any) {
    console.error('Apps Script Pull Error:', error);
    return {
      success: false,
      message: `Gagal menarik data dari Google Sheets: ${error.message || error}. Pastikan Web App diset ke "Anyone" saat deploy.`,
    };
  }
};

/**
 * Service to upload an image to Google Drive via the Apps Script Web App
 */
export const uploadImageToGoogleDrive = async (
  webAppUrl: string,
  fileName: string,
  mimeType: string,
  base64Data: string
): Promise<{ success: boolean; url?: string; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com') || !webAppUrl.includes('/exec')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Pastikan Anda menyalin "Aplikasi Web (Web App) URL" yang berakhiran "/exec" saat melakukan Deploy (Penerapan Baru), bukan URL Editor Apps Script.',
    };
  }

  try {
    const urlWithAction = appendActionToUrl(webAppUrl, 'upload_image');
    const response = await fetch(urlWithAction, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'upload_image',
        payload: {
          fileName,
          mimeType,
          base64Data,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        url: result.url,
        message: result.message || 'Gambar sukses disimpan ke Google Drive!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Gagal menyimpan gambar di Google Drive.',
      };
    }
  } catch (error: any) {
    console.error('Apps Script Upload Error:', error);
    return {
      success: false,
      message: `Gagal upload gambar ke Google Drive: ${error.message || error}`,
    };
  }
};

/**
 * Service to automatically create and format all required sheets in Google Sheets Spreadsheet
 */
export const initializeGoogleSheets = async (webAppUrl: string): Promise<{ success: boolean; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com') || !webAppUrl.includes('/exec')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Pastikan Anda menyalin "Aplikasi Web (Web App) URL" yang berakhiran "/exec" saat melakukan Deploy (Penerapan Baru), bukan URL Editor Apps Script.',
    };
  }

  try {
    const urlWithAction = appendActionToUrl(webAppUrl, 'init_sheets');
    const response = await fetch(urlWithAction, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'init_sheets',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        message: result.message || 'Semua sheets otomatis berhasil dibuat dangan format header yang benar!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Gagal menginisialisasi spreadsheet.',
      };
    }
  } catch (error: any) {
    console.error('Initialize Sheets Error:', error);
    return {
      success: false,
      message: `Gagal membuat sheets otomatis secara langsung: ${error.message || error}. Pastikan Web App diset ke "Anyone" (Siapa saja) saat deploy.`,
    };
  }
};

/**
 * Apps Script Code content that the user can copy
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT - KASIR PINTAR PRO SYNC ENGINE
 * 
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets (Buat Spreadsheet baru).
 * 2. Klik menu "Ekstensi" -> "Apps Script".
 * 3. Hapus kode bawaan, lalu paste kode di bawah ini.
 * 4. Klik ikon Save (Disket/Simpan).
 * 5. Klik tombol "Terapkan" (Deploy) -> "Penerapan Baru" (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 * 7. Konfigurasi:
 *    - Deskripsi: Kasir Sync
 *    - Jalankan sebagai: Saya (Email Anda)
 *    - Siapa yang memiliki akses: Siapa saja (Anyone) -> SANGAT PENTING!
 * 8. Klik "Terapkan" (Deploy). Berikan izin akses Google jika diminta.
 * 9. Salin URL Aplikasi Web yang diberikan, tempel di menu Pengaturan Kasir Pintar Pro Anda!
 */

function doPost(e) {
  try {
    var action = "";
    var payload = null;
    
    // 1. Coba baca dari postData (JSON body)
    if (e && e.postData && e.postData.contents) {
      try {
        var data = JSON.parse(e.postData.contents);
        action = data.action;
        payload = data.payload;
      } catch (pErr) {
        // Abaikan parse error, lanjut ke parameter
      }
    }
    
    // 2. Fallback ke URL query parameters jika JSON body tidak mengandung action atau kosong
    if (!action && e && e.parameter) {
      action = e.parameter.action;
      if (e.parameter.payload) {
        try {
          payload = JSON.parse(e.parameter.payload);
        } catch (pErr) {
          payload = e.parameter.payload;
        }
      }
    }
    
    if (action === 'sync_all') {
      return ContentService.createTextOutput(JSON.stringify(syncAllData(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'pull_all') {
      return ContentService.createTextOutput(JSON.stringify(pullAllData()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'upload_image') {
      return ContentService.createTextOutput(JSON.stringify(uploadImage(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'init_sheets') {
      return ContentService.createTextOutput(JSON.stringify(initAllSheets()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Kembalikan objek debug informatif agar pengguna tahu persis mengapa gagal
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'Aksi tidak dikenal (Aksi diterima: "' + action + '")',
      debug: {
        receivedAction: action,
        hasPostData: !!(e && e.postData && e.postData.contents),
        hasParameters: !!(e && e.parameter)
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : "";
    
    // Sangat berguna untuk pull_all dan init_sheets yang tidak membutuhkan payload besar,
    // seandainya browser menurunkan request POST menjadi GET saat proses pengalihan (redirect) CORS Google Drive.
    if (action) {
      if (action === 'pull_all') {
        return ContentService.createTextOutput(JSON.stringify(pullAllData()))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'init_sheets') {
        return ContentService.createTextOutput(JSON.stringify(initAllSheets()))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput("Koneksi Kasir Pintar Pro - Google Sheets & Drive Aktif! Gunakan POST untuk kirim data.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function initAllSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. CREATE SHEET_PRODUK
    var sheetProducts = ss.getSheetByName("Sheet_Produk");
    if (!sheetProducts) {
      sheetProducts = ss.insertSheet("Sheet_Produk");
    }
    sheetProducts.clear();
    sheetProducts.appendRow(["ID Produk", "SKU", "Nama Produk", "Kategori", "Harga Jual", "Harga Modal", "Stok", "Stok Minimum", "URL Gambar"]);
    sheetProducts.getRange("A1:I1").setBackground("#d9ead3").setFontWeight("bold");
    
    // 2. CREATE SHEET_KATEGORI
    var sheetCategories = ss.getSheetByName("Sheet_Kategori");
    if (!sheetCategories) {
      sheetCategories = ss.insertSheet("Sheet_Kategori");
    }
    sheetCategories.clear();
    sheetCategories.appendRow(["ID Kategori", "Nama Kategori", "Ikon"]);
    sheetCategories.getRange("A1:C1").setBackground("#fce5cd").setFontWeight("bold");
    
    // 3. CREATE SHEET_TRANSAKSI
    var sheetSales = ss.getSheetByName("Sheet_Transaksi");
    if (!sheetSales) {
      sheetSales = ss.insertSheet("Sheet_Transaksi");
    }
    sheetSales.clear();
    sheetSales.appendRow(["ID Transaksi", "No Invoice", "Tanggal", "Item Terjual", "Subtotal", "Diskon", "Pajak", "Total Selesai", "Metode Pembayaran", "Nama Kasir", "Total Profit Bersih"]);
    sheetSales.getRange("A1:K1").setBackground("#cfe2f3").setFontWeight("bold");

    // 4. CREATE SHEET_PENGATURAN
    var sheetSettings = ss.getSheetByName("Sheet_Pengaturan");
    if (!sheetSettings) {
      sheetSettings = ss.insertSheet("Sheet_Pengaturan");
    }
    sheetSettings.clear();
    sheetSettings.appendRow(["Nama Toko", "Alamat Toko", "No Telepon", "Pajak Aktif", "Persentase Pajak"]);
    sheetSettings.getRange("A1:E1").setBackground("#d9d9d9").setFontWeight("bold");

    // 5. CREATE SHEET_PENGGUNA
    var sheetUsers = ss.getSheetByName("Sheet_Pengguna");
    if (!sheetUsers) {
      sheetUsers = ss.insertSheet("Sheet_Pengguna");
    }
    sheetUsers.clear();
    sheetUsers.appendRow(["ID Pengguna", "Username", "Password", "Nama Lengkap", "Role", "Status Aktif"]);
    sheetUsers.getRange("A1:F1").setBackground("#f3f3f3").setFontWeight("bold");
    
    // Autoresize and format
    try {
      sheetProducts.autoResizeColumns(1, 9);
      sheetCategories.autoResizeColumns(1, 3);
      sheetSales.autoResizeColumns(1, 11);
      sheetSettings.autoResizeColumns(1, 5);
      sheetUsers.autoResizeColumns(1, 6);
    } catch(e) {}
    
    // Clean up default starter sheets
    var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
    if (defaultSheet && ss.getSheets().length > 5) {
      ss.deleteSheet(defaultSheet);
    }
    
    return {
      success: true,
      message: "Sukses! Seluruh lembar ('Sheet_Produk', 'Sheet_Kategori', 'Sheet_Transaksi', 'Sheet_Pengaturan', dan 'Sheet_Pengguna') berhasil dibuat otomatis di Spreadsheet Anda dengan header baris yang rapi!"
    };
  } catch (err) {
    return {
      success: false,
      error: "Gagal memproses inisialisasi sheets: " + err.toString()
    };
  }
}

function uploadImage(payload) {
  try {
    var folderName = "Kasir_Pintar_Pro_Images";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    var decodedData = Utilities.base64Decode(payload.base64Data);
    var blob = Utilities.newBlob(decodedData, payload.mimeType, payload.fileName);
    var file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    // Gunakan format lh3 googleusercontent dengan parameter =s0 agar gambar bisa tampil instan dengan kualitas tinggi (tidak pecah)
    var fileUrl = "https://lh3.googleusercontent.com/d/" + fileId + "=s0";
    
    return {
      success: true,
      url: fileUrl,
      message: "Gambar berhasil diunggah ke Google Drive!"
    };
  } catch (err) {
    return {
      success: false,
      error: "Gagal menyimpan file ke Google Drive: " + err.toString()
    };
  }
}

function syncAllData(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. SINKRONISASI PRODUK
  var sheetProducts = ss.getSheetByName("Sheet_Produk") || ss.insertSheet("Sheet_Produk");
  sheetProducts.clear();
  sheetProducts.appendRow(["ID Produk", "SKU", "Nama Produk", "Kategori", "Harga Jual", "Harga Modal", "Stok", "Stok Minimum", "URL Gambar"]);
  if (payload.products && payload.products.length > 0) {
    var prodRows = payload.products.map(function(p) {
      return [p.id, p.sku, p.name, p.category, p.price, p.costPrice, p.stock, p.minStock, p.imageUrl || ""];
    });
    sheetProducts.getRange(2, 1, prodRows.length, 9).setValues(prodRows);
  }
  
  // 2. SINKRONISASI KATEGORI
  var sheetCategories = ss.getSheetByName("Sheet_Kategori") || ss.insertSheet("Sheet_Kategori");
  sheetCategories.clear();
  sheetCategories.appendRow(["ID Kategori", "Nama Kategori", "Ikon"]);
  if (payload.categories && payload.categories.length > 0) {
    var catRows = payload.categories.map(function(c) {
      return [c.id, c.name, c.icon];
    });
    sheetCategories.getRange(2, 1, catRows.length, 3).setValues(catRows);
  }
  
  // 3. SINKRONISASI TRANSAKSI / LAPORAN PENJUALAN
  var sheetSales = ss.getSheetByName("Sheet_Transaksi") || ss.insertSheet("Sheet_Transaksi");
  sheetSales.clear();
  sheetSales.appendRow(["ID Transaksi", "No Invoice", "Tanggal", "Item Terjual", "Subtotal", "Diskon", "Pajak (11%)", "Total Selesai", "Metode Pembayaran", "Nama Kasir", "Total Profit Bersih"]);
  
  if (payload.transactions && payload.transactions.length > 0) {
    var salesRows = payload.transactions.map(function(t) {
      // Create detailed string for items sold
      var itemListStr = t.items.map(function(item) {
        return item.name + " (" + item.qty + "x @ Rp " + item.price + " - Disk: Rp" + item.discount + ")";
      }).join("\\n");
      
      // Calculate net profit for transaction
      var netProfit = t.items.reduce(function(acc, item) {
        var baseProfit = (item.price - item.costPrice) * item.qty;
        var finalProfit = baseProfit - (item.discount * item.qty);
        return acc + finalProfit;
      }, 0);
      
      return [
        t.id,
        t.invoiceNumber,
        t.date,
        itemListStr,
        t.subTotal,
        t.discountTotal,
        t.taxTotal,
        t.total,
        t.paymentMethod.toUpperCase(),
        t.cashierName,
        netProfit
      ];
    });
    sheetSales.getRange(2, 1, salesRows.length, 11).setValues(salesRows);
  }

  // 4. SINKRONISASI PENGATURAN TOKO
  var sheetSettings = ss.getSheetByName("Sheet_Pengaturan") || ss.insertSheet("Sheet_Pengaturan");
  sheetSettings.clear();
  sheetSettings.appendRow(["Nama Toko", "Alamat Toko", "No Telepon", "Pajak Aktif", "Persentase Pajak"]);
  if (payload.storeSettings) {
    var s = payload.storeSettings;
    sheetSettings.appendRow([s.name || "", s.address || "", s.phone || "", s.isTaxEnabled === true ? "TRUE" : "FALSE", s.taxPercentage || 0]);
  }

  // 5. SINKRONISASI PENGGUNA
  var sheetUsers = ss.getSheetByName("Sheet_Pengguna") || ss.insertSheet("Sheet_Pengguna");
  sheetUsers.clear();
  sheetUsers.appendRow(["ID Pengguna", "Username", "Password", "Nama Lengkap", "Role", "Status Aktif"]);
  if (payload.users && payload.users.length > 0) {
    var userRows = payload.users.map(function(u) {
      return [u.id, u.username, u.password || "", u.name, u.role, u.active === true ? "TRUE" : "FALSE"];
    });
    sheetUsers.getRange(2, 1, userRows.length, 6).setValues(userRows);
  }
  
  // Auto-fit columns
  try {
    sheetProducts.autoResizeColumns(1, 9);
    sheetCategories.autoResizeColumns(1, 3);
    sheetSales.autoResizeColumns(1, 11);
    sheetSettings.autoResizeColumns(1, 5);
    sheetUsers.autoResizeColumns(1, 6);
  } catch(e) {}
  
  return {
    success: true,
    message: "Sheets berhasil diperbarui! " + payload.products.length + " produk, " + payload.transactions.length + " transaksi telah disinkronkan."
  };
}

function pullAllData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. READ PRODUCTS
    var sheetProducts = ss.getSheetByName("Sheet_Produk");
    var products = [];
    if (sheetProducts) {
      var prodValues = sheetProducts.getDataRange().getValues();
      if (prodValues.length > 1) {
        for (var i = 1; i < prodValues.length; i++) {
          var row = prodValues[i];
          if (row[0]) {
            products.push({
              id: String(row[0]),
              sku: String(row[1] || ""),
              name: String(row[2] || "Produk Tanpa Nama"),
              category: String(row[3] || "Umum"),
              price: Number(row[4]) || 0,
              costPrice: Number(row[5]) || 0,
              stock: Number(row[6]) || 0,
              minStock: Number(row[7]) || 0,
              imageUrl: String(row[8] || "")
            });
          }
        }
      }
    }
    
    // 2. READ CATEGORIES
    var sheetCategories = ss.getSheetByName("Sheet_Kategori");
    var categories = [];
    if (sheetCategories) {
      var catValues = sheetCategories.getDataRange().getValues();
      if (catValues.length > 1) {
        for (var i = 1; i < catValues.length; i++) {
          var row = catValues[i];
          if (row[0]) {
            categories.push({
              id: String(row[0]),
              name: String(row[1] || "Kategori"),
              icon: String(row[2] || "Tag")
            });
          }
        }
      }
    }
    
    // 3. READ TRANSACTIONS
    var sheetSales = ss.getSheetByName("Sheet_Transaksi");
    var transactions = [];
    if (sheetSales) {
      var salesValues = sheetSales.getDataRange().getValues();
      if (salesValues.length > 1) {
        for (var i = 1; i < salesValues.length; i++) {
          var row = salesValues[i];
          if (row[0]) {
            var itemLines = String(row[3] || "").split('\\n');
            var items = [];
            for (var j = 0; j < itemLines.length; j++) {
              var line = itemLines[j].trim();
              if (line) {
                var namePart = line.split('(')[0].trim();
                var details = line.includes('(') ? line.substring(line.indexOf('(') + 1, line.indexOf(')')) : "";
                var qty = 1;
                var price = 0;
                var discount = 0;
                
                if (details) {
                  try {
                    var qtyMatch = details.match(/(\\d+)x/);
                    if (qtyMatch) qty = parseInt(qtyMatch[1]);
                    
                    var priceMatch = details.match(/@ Rp\\s*(\\d+)/);
                    if (priceMatch) price = parseInt(priceMatch[1]);
                    
                    var diskMatch = details.match(/Disk:\\s*Rp\\s*(\\d+)/);
                    if (diskMatch) discount = parseInt(diskMatch[1]);
                  } catch(e) {}
                }
                
                items.push({
                  productId: "imported",
                  sku: "",
                  name: namePart,
                  price: price,
                  costPrice: 0,
                  qty: qty,
                  discount: discount,
                  total: (price - discount) * qty
                });
              }
            }
            
            transactions.push({
              id: String(row[0]),
              invoiceNumber: String(row[1] || "INV-000"),
              date: String(row[2] || new Date().toISOString()),
              items: items,
              subTotal: Number(row[4]) || 0,
              discountTotal: Number(row[5]) || 0,
              taxTotal: Number(row[6]) || 0,
              total: Number(row[7]) || 0,
              paymentMethod: String(row[8] || "CASH").toLowerCase(),
              cashierName: String(row[9] || "Kasir")
            });
          }
        }
      }
    }

    // 4. READ STORE SETTINGS
    var sheetSettings = ss.getSheetByName("Sheet_Pengaturan");
    var storeSettings = null;
    if (sheetSettings) {
      var settingValues = sheetSettings.getDataRange().getValues();
      if (settingValues.length > 1) {
        var row = settingValues[1];
        storeSettings = {
          name: String(row[0] || ""),
          address: String(row[1] || ""),
          phone: String(row[2] || ""),
          isTaxEnabled: String(row[3]).toUpperCase() === "TRUE",
          taxPercentage: Number(row[4]) || 0
        };
      }
    }

    // 5. READ USERS
    var sheetUsers = ss.getSheetByName("Sheet_Pengguna");
    var users = [];
    if (sheetUsers) {
      var userValues = sheetUsers.getDataRange().getValues();
      if (userValues.length > 1) {
        for (var i = 1; i < userValues.length; i++) {
          var row = userValues[i];
          if (row[0]) {
            users.push({
              id: String(row[0]),
              username: String(row[1] || ""),
              password: String(row[2] || ""),
              name: String(row[3] || ""),
              role: String(row[4] || "cashier"),
              active: String(row[5]).toUpperCase() === "TRUE"
            });
          }
        }
      }
    }
    
    return {
      success: true,
      products: products,
      categories: categories,
      transactions: transactions,
      users: users,
      storeSettings: storeSettings,
      message: "Berhasil memuat " + products.length + " produk dan " + transactions.length + " transaksi dari Google Sheets!"
    };
  } catch (err) {
    return {
      success: false,
      error: "Gagal menarik data dari Google Sheets: " + err.toString()
    };
  }
}
`;
