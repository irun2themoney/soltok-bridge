import React from 'react';
import { Sparkles, RotateCcw, Wallet } from 'lucide-react';

interface DemoModeBannerProps {
  isDemoMode: boolean;
  onToggle: () => void;
  balance?: number;
  onResetWallet?: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  isDemoMode,
  onToggle,
  balance,
  onResetWallet,
}) => {
  if (!isDemoMode) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all hover:scale-105 text-sm font-bold"
      >
        <Sparkles className="w-4 h-4" />
        Try Demo
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          <div>
            <span className="font-bold">Demo Mode Active</span>
            <span className="text-white/70 ml-2 text-sm">— Using simulated transactions</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {balance !== undefined && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <Wallet className="w-4 h-4" />
              <span className="font-mono font-bold">{balance.toFixed(2)} USDC</span>
              {onResetWallet && (
                <button
                  onClick={onResetWallet}
                  className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors"
                  title="Reset demo wallet"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-bold transition-colors"
          >
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoModeBanner;
