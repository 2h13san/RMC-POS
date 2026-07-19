/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ClipboardList, RotateCcw, Search, Trash2, Calendar, Clock, User, AlertCircle, FileText, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { ActivityLog, SalesReturn } from '../types';

interface LogsAndReturnsProps {
  activityLogs: ActivityLog[];
  salesReturns: SalesReturn[];
  onClearLogs?: () => void;
  currentUserRole?: string;
}

export default function LogsAndReturns({
  activityLogs,
  salesReturns,
  onClearLogs,
  currentUserRole
}: LogsAndReturnsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'returns'>('logs');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [returnSearchTerm, setReturnSearchTerm] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');

  // Format currency
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Get unique action names for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    activityLogs.forEach(log => {
      if (log.action) actions.add(log.action);
    });
    return Array.from(actions);
  }, [activityLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchSearch = 
        log.username.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearchTerm.toLowerCase());
      const matchAction = logActionFilter === 'all' || log.action === logActionFilter;
      return matchSearch && matchAction;
    });
  }, [activityLogs, logSearchTerm, logActionFilter]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return salesReturns.filter(ret => {
      return (
        ret.returnNumber.toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
        ret.invoiceNumber.toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
        ret.cashierName.toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
        (ret.notes && ret.notes.toLowerCase().includes(returnSearchTerm.toLowerCase()))
      );
    });
  }, [salesReturns, returnSearchTerm]);

  return (
    <div className="max-w-7xl mx-auto p-2 animate-fade-in space-y-6">
      
      {/* Tab Switcher Panel */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#ef4444]/10 text-[#ef4444] rounded-xl">
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Log Aktivitas & Retur Penjualan</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Audit log operasional toko dan pemrosesan pengembalian barang belanjaan pelanggan.</p>
          </div>
        </div>

        {/* Horizontal Navigation */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 shrink-0 border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === 'logs'
                ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-xs border border-slate-200/40 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText size={13} />
            <span>Audit Log Aktivitas ({activityLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('returns')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === 'returns'
                ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-xs border border-slate-200/40 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <RotateCcw size={13} />
            <span>Retur Penjualan ({salesReturns.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB: AUDIT ACTIVITY LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
            <div className="flex flex-1 max-w-2xl gap-2 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Cari kasir, deskripsi, atau detail log..."
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-[#ef4444] transition-colors"
                />
              </div>

              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">Semua Tipe Aktivitas</option>
                {uniqueActions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            {['owner', 'admin'].includes(currentUserRole || '') && onClearLogs && activityLogs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus seluruh log aktivitas audit ini? Tindakan ini tidak dapat dibatalkan.')) {
                    onClearLogs();
                  }
                }}
                className="p-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                Hapus Seluruh Log
              </button>
            )}
          </div>

          {/* Logs Table / List */}
          <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-450 border-b border-slate-150 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[9.5px]">
                    <th className="p-3.5 pl-4">Tanggal & Waktu</th>
                    <th className="p-3.5">Operator (User)</th>
                    <th className="p-3.5">Tipe Aktivitas</th>
                    <th className="p-3.5">Rincian Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap text-slate-500 dark:text-slate-450 font-mono text-[10.5px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-slate-400" />
                            {new Date(log.timestamp).toLocaleDateString('id-ID')}
                            <Clock size={11} className="text-slate-400 ml-1" />
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5 font-bold">
                            <User size={12} className="text-slate-400" />
                            {log.username}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`p-1 px-2.5 rounded-lg text-[9px] font-black uppercase inline-block ${
                            log.action === 'Ubah Harga Barang' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/40' :
                            log.action === 'Hapus Transaksi' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/40' :
                            log.action === 'Retur Penjualan' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/40' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/40'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-16 text-center text-slate-400 dark:text-slate-500 italic">
                        Tidak ada catatan log aktivitas audit yang cocok dengan kriteria pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: SALES RETURNS */}
      {activeSubTab === 'returns' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Cari No Retur, No Invoice, kasir, atau catatan..."
                value={returnSearchTerm}
                onChange={(e) => setReturnSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-[#ef4444] transition-colors"
              />
            </div>
            
            <div className="p-1.5 px-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <ArrowLeftRight size={13} className="text-[#ef4444]" /> Total Retur Penjualan: {salesReturns.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReturns.length > 0 ? (
              filteredReturns.map(ret => (
                <div key={ret.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-4 flex flex-col justify-between hover:border-[#ef4444]/35 dark:hover:border-[#ef4444]/35 transition-all">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Nomor Retur</span>
                        <h4 className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 mt-0.5">{ret.returnNumber}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Nilai Pengembalian</span>
                        <h4 className="font-extrabold text-blue-600 dark:text-blue-400 text-sm mt-0.5">{formatIDR(ret.totalRefund)}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                      <div>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500">Invoice Terkait:</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-350">{ret.invoiceNumber}</p>
                      </div>
                      <div>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500">Kasir Retur:</p>
                        <p className="font-bold text-slate-700 dark:text-slate-350">{ret.cashierName}</p>
                      </div>
                      <div>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500">Waktu Retur:</p>
                        <p className="text-slate-700 dark:text-slate-350">{new Date(ret.date).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500">Restock Barang:</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-md text-[9px] font-black ${
                          ret.restock 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-750'
                        }`}>
                          {ret.restock ? '✓ YA' : '✗ TIDAK'}
                        </span>
                      </div>
                    </div>

                    {/* Return Item detail list */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Detail Barang Retur</p>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/50 space-y-1.5 text-xs">
                        {ret.items.map((item, index) => (
                          <div key={index} className="pt-1.5 first:pt-0 flex justify-between items-center text-slate-700 dark:text-slate-350">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-250">{item.name}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">{item.qty} unit x {formatIDR(item.price)}</span>
                            </div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{formatIDR(item.refundAmount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes / Reason */}
                  {ret.notes && (
                    <div className="mt-2.5 p-2 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] font-medium text-amber-700 dark:text-amber-400 flex gap-1.5 items-start">
                      <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                      <p className="leading-normal"><span className="font-bold uppercase text-[9.5px]">Alasan:</span> {ret.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full border border-dashed border-slate-200 dark:border-slate-800 py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                Tidak ada riwayat retur barang penjualan yang ditemukan.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
