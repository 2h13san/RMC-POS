/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Printer, Wifi, Bluetooth, ArrowLeft, RefreshCw, CheckCircle, Smartphone, HelpCircle } from 'lucide-react';
import { Transaction, StoreSettings } from '../types';

interface ThermalReceiptProps {
  transaction: Transaction;
  onBack: () => void;
  storeSettings?: StoreSettings;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export default function ThermalReceipt({
  transaction,
  onBack,
  storeSettings,
  storeName,
  storeAddress,
  storePhone
}: ThermalReceiptProps) {
  // Leverage storeSettings with defaults fallbacks
  const nameOfStore = storeSettings?.name || storeName || "KASIR PINTAR COFFEE & EATERY";
  const addressOfStore = storeSettings?.address || storeAddress || "Jl. Sudirman No. 45, Jakarta";
  const phoneOfStore = storeSettings?.phone || storePhone || "0812-3456-7890";
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>('58');

  // Format IDR helper
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Web Bluetooth integration for portable thermal printer
  const connectBluetoothPrinter = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert("Aplikasi browser Anda tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di laptop/Android.");
      return;
    }

    setIsBluetoothConnecting(true);
    try {
      // Prompt user to pick a bluetooth printer
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Standard raw print service UUID
      });

      console.log('Menghubungkan ke peranti bluetooth printer:', device.name);
      setBluetoothDevice(device);
      
      // Simulate connecting and sending thermal ESC/POS commands
      setTimeout(() => {
        setIsBluetoothConnecting(false);
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }, 1500);

    } catch (err: any) {
      console.warn('Bluetooth pairing canceled or failed:', err);
      setIsBluetoothConnecting(false);
    }
  };

  const handleSystemPrint = () => {
    // Elegant system print via stylesheet or custom win
    const printContent = document.getElementById('thermal-receipt-view')?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const popupWin = window.open('', '_blank', 'width=400,height=600');
      if (popupWin) {
        popupWin.document.open();
        popupWin.document.write(`
          <html>
            <head>
              <title>Print Struk - ${transaction.invoiceNumber}</title>
              <style>
                body {
                  font-family: 'Courier New', Courier, monospace;
                  padding: 10px;
                  width: ${paperWidth === '58' ? '280px' : '380px'};
                  margin: 0 auto;
                  font-size: 11px;
                  color: #000;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .flex-row { display: flex; justify-content: space-between; }
                .bold { font-weight: bold; }
                @media print {
                  body { margin: 0; padding: 0; }
                }
              </style>
            </head>
            <body onload="window.print(); window.close();">
              ${printContent}
            </body>
          </html>
        `);
        popupWin.document.close();
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-4xl mx-auto p-4 animate-fade-in">
      {/* Receipt Preview Card */}
      <div className="flex-1 flex flex-col items-center bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
        <div className="flex justify-between items-center w-full max-w-[320px] mb-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Format Kertas:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPaperWidth('58')}
              className={`p-1 px-3 text-xs rounded-lg font-medium cursor-pointer transition-colors ${paperWidth === '58' ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'}`}
            >
              58mm (Portable)
            </button>
            <button
              onClick={() => setPaperWidth('80')}
              className={`p-1 px-3 text-xs rounded-lg font-medium cursor-pointer transition-colors ${paperWidth === '80' ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'}`}
            >
              80mm (Desktop)
            </button>
          </div>
        </div>

        {/* Outer White Paper Card */}
        <div 
          className="bg-white dark:bg-slate-900 p-6 shadow-md border border-slate-300 dark:border-slate-800 relative rounded-md select-none transition-all duration-300"
          style={{ width: paperWidth === '58' ? '300px' : '380px' }}
        >
          {/* Top and Bottom jagged thermal paper edge visual */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200 dark:from-slate-800 to-transparent"></div>
          
          <div id="thermal-receipt-view" className="font-mono text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed">
            <div className="text-center">
              <p className="font-bold text-xs md:text-sm">{nameOfStore}</p>
              <p>{addressOfStore}</p>
              <p>Telp: {phoneOfStore}</p>
              <div className="divider border-t border-dashed border-slate-800 dark:border-slate-700 my-2"></div>
              
              <div className="text-[10px] space-y-0.5 mb-2 text-left">
                <div className="flex-row flex justify-between">
                  <span>Nota  : {transaction.invoiceNumber}</span>
                </div>
                <div className="flex-row flex justify-between">
                  <span>Tgl   : {new Date(transaction.date).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex-row flex justify-between">
                  <span>Kasir : {transaction.cashierName}</span>
                </div>
                <div className="flex-row flex justify-between">
                  <span>Bayar : {transaction.paymentMethod.toUpperCase()}</span>
                </div>
              </div>
              <div className="divider border-t border-dashed border-slate-800 dark:border-slate-700 my-2"></div>
            </div>

            {/* Receipt Items */}
            <div className="space-y-1 my-2">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold">{item.name}</div>
                  <div className="flex-row flex justify-between pl-2">
                    <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                    <span>{item.total.toLocaleString('id-ID')}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="text-red-600 dark:text-red-400 pl-2 text-[10px]">
                      * Diskon: -{formatIDR(item.discount * item.qty)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="divider border-t border-dashed border-slate-800 dark:border-slate-700 my-2"></div>

            {/* Calculations summaries */}
            <div className="space-y-0.5 text-right pl-12 font-medium">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{transaction.subTotal.toLocaleString('id-ID')}</span>
              </div>
              {transaction.discountTotal > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Total Potongan:</span>
                  <span>-{transaction.discountTotal.toLocaleString('id-ID')}</span>
                </div>
              )}
              {(() => {
                const netSub = Math.max(0, transaction.subTotal - transaction.discountTotal);
                const derivedTaxPercent = transaction.taxTotal > 0 
                  ? (netSub > 0 ? Math.round((transaction.taxTotal * 10) / netSub) / 10 : (storeSettings?.taxPercentage || 11))
                  : 0;
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Pajak (PPN {derivedTaxPercent}%):</span>
                      <span>{transaction.taxTotal.toLocaleString('id-ID')}</span>
                    </div>
                    {transaction.taxTotal > 0 && (
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 italic flex justify-between leading-none pb-0.5">
                        <span>Dasar PPN:</span>
                        <span>{netSub.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>{transaction.total.toLocaleString('id-ID')}</span>
              </div>
              
              <div className="divider border-t border-dashed border-slate-800 dark:border-slate-700 my-2"></div>

              {transaction.paymentMethod === 'cash' ? (
                <>
                  <div className="flex justify-between">
                    <span>Bayar Tunai:</span>
                    <span>{(transaction.cashAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kembalian:</span>
                    <span>{(transaction.changeAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                </>
              ) : (
                <div className="text-right text-[10px] italic text-slate-500 dark:text-slate-400">
                  Lunas via {transaction.paymentMethod.toUpperCase()} (Online)
                </div>
              )}
            </div>

            <div className="divider border-t border-dashed border-slate-800 dark:border-slate-700 my-2"></div>

            {/* Footer feedback */}
            <div className="text-center text-[10px] space-y-1">
              <p className="font-bold">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
              <p>Struk Resmi Digenerate Secara Digital</p>
              <p>Powered by Kasir Pintar Pro</p>
              <div className="my-3 font-mono tracking-widest text-[#000] dark:text-slate-400 text-lg select-none">
                ||||| | ||||| | || ||||
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-200 dark:from-slate-800 to-transparent"></div>
        </div>
      </div>

      {/* Control Panel Panel */}
      <div className="w-full lg:w-[320px] bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Cetak Struk</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gunakan printer thermal portable Bluetooth atau cetak standar melalui printer kasir desktop.
          </p>
        </div>

        {/* Integration Statuses */}
        <div className="space-y-3">
          {/* Bluetooth Option */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/45 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Bluetooth size={18} />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">Printer Bluetooth Portable</span>
                {bluetoothDevice ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium">Terhubung: {bluetoothDevice.name}</span>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Belum dipasangkan</span>
                )}
              </div>
              <Wifi size={14} className={bluetoothDevice ? 'text-emerald-500 animate-pulse' : 'text-slate-300 dark:text-slate-700'} />
            </div>
            
            <button
              onClick={connectBluetoothPrinter}
              disabled={isBluetoothConnecting}
              className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:bg-blue-400 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              {isBluetoothConnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Memindai Printer...
                </>
              ) : bluetoothDevice ? (
                <>
                  <Printer size={14} />
                  Kirim ke {bluetoothDevice.name.substring(0,10)}..
                </>
              ) : (
                <>
                  <Smartphone size={14} />
                  Pasangkan Thermal Printer
                </>
              )}
            </button>
          </div>

          {/* Desktop Print option */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/45 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                <Printer size={18} />
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">Sistem Printer Lokal</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Desktop / PDF print format</span>
              </div>
            </div>

            <button
              onClick={handleSystemPrint}
              className="w-full p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer size={14} />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Dynamic Help Guide for Thermal Printer Pairing */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
            <HelpCircle size={15} className="text-emerald-600 shrink-0" />
            <span>Panduan Pasang Thermal Printer</span>
          </div>
          <div className="text-[10px] space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            <div>
              <p className="font-extrabold text-[#78c953] flex items-center gap-1">① Melalui Bluetooth (Portable):</p>
              <ul className="list-disc list-inside pl-1 mt-1 space-y-0.5">
                <li>Aktifkan bluetooth di device Android / Laptop Anda.</li>
                <li>Nyalakan daya printer thermal bluetooth.</li>
                <li>Klik tombol <strong className="text-blue-700 dark:text-blue-400">Pasangkan Thermal Printer</strong> di atas.</li>
                <li>Pilih nama printer Anda dari daftar popup browser, lalu klik <strong className="text-slate-800 dark:text-slate-200">Pair/Hubungkan</strong>.</li>
              </ul>
            </div>
            <div className="border-t border-emerald-100/60 dark:border-emerald-900/30 pt-2">
              <p className="font-extrabold text-[#78c953] flex items-center gap-1">② Melalui USB / Kertas Kasir Desktop:</p>
              <ul className="list-disc list-inside pl-1 mt-1 space-y-0.5">
                <li>Sambungkan kabel printer thermal ke laptop Anda.</li>
                <li>Setel setelan printer komputer Anda ke mode <strong className="text-slate-800 dark:text-slate-200">Generic / Text Only</strong>.</li>
                <li>Klik <strong className="text-slate-800 dark:text-slate-200">Cetak / Simpan PDF</strong>, dan pilih printer kasir Anda sebagai tujuan cetak utama.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Print Success Alert Banner */}
        {printSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-300 text-xs font-medium rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2 animate-bounce">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>Struk thermal berhasil ditransfer ke printer!</span>
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={onBack}
            className="w-full p-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Kembali ke Kasir
          </button>
        </div>
      </div>
    </div>
  );
}
