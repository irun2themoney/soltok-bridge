import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, BarChart3 } from 'lucide-react';

interface OrderManagerProps {
  orderCount: number;
  onExport: () => void;
  onImport: (file: File) => Promise<number>;
  onClear: () => void;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
  };
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  orderCount,
  onExport,
  onImport,
  onClear,
  stats,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const count = await onImport(file);
      setMessage({ type: 'success', text: `Imported ${count} orders` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all orders? This cannot be undone.')) {
      onClear();
      setMessage({ type: 'success', text: 'All orders cleared' });
    }
  };

  return (
    <div className="glass p-6 rounded-[24px] border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">
          Order Management
        </h3>
        <button
          onClick={() => setShowStats(!showStats)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          title="Toggle stats"
        >
          <BarChart3 className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {showStats && (
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/5">
          <div>
            <p className="text-2xl font-bold text-emerald-400">{stats.total}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{stats.totalValue.toFixed(2)}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total USDC</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.byStatus['shipped'] || 0}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Shipped</p>
          </div>
        </div>
      )}

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400' 
            : 'bg-red-500/10 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onExport}
          disabled={orderCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {isImporting ? 'Importing...' : 'Import'}
        </button>

        <button
          onClick={handleClear}
          disabled={orderCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default OrderManager;
