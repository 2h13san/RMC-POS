/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, FileSpreadsheet, Server, HelpCircle, X, ExternalLink } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/syncService';

interface AppsScriptGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppsScriptGuide({ isOpen, onClose }: AppsScriptGuideProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div 
        id="apps-script-guide-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Panduan Google Sheets Sync</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hubungkan Kasir ke Spreadsheet Anda untuk Multi-Device Sync</p>
            </div>
          </div>
          <button 
            id="close-guide-btn"
            onClick={onClose} 
            className="p-1 px-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-250 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Intro */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3 text-slate-700 dark:text-slate-200">
            <HelpCircle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Mengapa Menggunakan Google Sheets Sync?</p>
              <p className="text-xs text-slate-600 dark:text-slate-450">
                Data transaksi, produk, dan laporan keuangan Anda akan otomatis tersimpan di Google Sheets milik Anda sendiri. 
                Hal ini memungkinkan Anda memantau penjualan dari HP, tablet, maupun laptop secara <strong>real-time</strong> tanpa biaya server bulanan!
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Server size={18} className="text-slate-700 dark:text-slate-300" />
              Langkah-langkah Setup (Hanya 3 Menit)
            </h4>
            
            <ol className="list-decimal list-inside space-y-3 pl-1 text-xs md:text-sm">
              <li>
                Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium">Google Sheets <ExternalLink size={12}/></a> lalu buat sebuah Spreadsheet kosong baru. Beri nama (misal: <strong>Laporan Kasir Pintar</strong>).
              </li>
              <li>
                Di menu bagian atas Spreadsheet, klik <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.
              </li>
              <li>
                Hapus semua kode bawaan yang ada di editor Apps Script, lalu klik tombol <strong>Salin Kode Script</strong> di bawah ini dan paste ke dalam editor.
              </li>
              <li>
                Klik tombol <strong>Simpan</strong> (ikon disket 💾) di atas editor Apps Script.
              </li>
              <li>
                Klik tombol biru <strong>Terapkan</strong> (Deploy) &gt; <strong>Penerapan Baru</strong> (New Deployment) di kanan atas.
              </li>
              <li>
                Klik ikon Gear (Pilih Jenis Penerapan) lalu pilih <strong>Aplikasi Web</strong> (Web App). Isi konfigurasi berikut:
                <ul className="list-disc pl-6 mt-1 space-y-1 text-slate-500 dark:text-slate-400 font-normal">
                  <li><strong>Deskripsi:</strong> Kasir Pro Sync v1</li>
                  <li><strong>Jalankan sebagai:</strong> Saya (email-anda@gmail.com)</li>
                  <li><strong>Siapa yang memiliki akses:</strong> Siapa saja (Anyone) <span className="text-amber-600 dark:text-amber-400 font-semibold">(Penting!)</span></li>
                </ul>
              </li>
              <li>
                Klik <strong>Terapkan</strong> (Deploy). Jika muncul jendela izin, klik <strong>Berikan Akses</strong> (Authorize Access) dan konfirmasi menggunakan akun Google Anda. (Jika ada peringatan tidak diverifikasi, pilih <i>Advanced/Lanjutan</i> lalu klik <i>Go to Kasir Sync (unsafe)</i>).
              </li>
              <li>
                Salin <strong>URL Aplikasi Web</strong> yang dihasilkan (panjang, berakhiran <code className="bg-slate-100 dark:bg-slate-800 p-0.5 px-1 rounded text-red-600 dark:text-red-400 font-mono text-xs">/exec</code>).
              </li>
              <li>
                Buka tab <strong>Pengaturan</strong> di aplikasi Kasir ini, aktifkan Sync, lalu tempel URL tersebut. Selesai! 🎉
              </li>
            </ol>
          </div>

          {/* Copy Script Section */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Kode Google Apps Script</span>
              <button
                id="copy-script-btn"
                onClick={handleCopy}
                className="flex items-center gap-1.5 p-1.5 px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium cursor-pointer transition-colors shadow-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Berhasil Disalin!' : 'Salin Kode Script'}
              </button>
            </div>
            
            <div className="relative">
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[250px] border border-slate-800 shadow-inner">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            id="close-guide-footer-btn"
            onClick={onClose}
            className="p-2 px-5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-950/60 text-white font-medium text-xs rounded-lg cursor-pointer transition-colors"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
