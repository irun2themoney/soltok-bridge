import React from 'react';
import { AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';

interface SetupGuideProps {
  onDismiss?: () => void;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({ onDismiss }) => {
  const [copied, setCopied] = React.useState(false);
  
  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto glass p-8 rounded-[32px] border border-yellow-500/20 space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-yellow-500/10 p-3 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-yellow-400">Escrow Not Initialized</h3>
          <p className="text-gray-400 text-sm mt-1">
            The on-chain escrow program needs to be initialized before you can make purchases.
          </p>
        </div>
      </div>

      <div className="space-y-4 bg-black/40 p-6 rounded-2xl">
        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Setup Commands</h4>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/5 px-4 py-2 rounded-lg text-xs text-emerald-400 font-mono">
              solana airdrop 2
            </code>
            <button 
              onClick={() => copyCommand('solana airdrop 2')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/5 px-4 py-2 rounded-lg text-xs text-emerald-400 font-mono truncate">
              npx tsx scripts/initialize-escrow.ts
            </code>
            <button 
              onClick={() => copyCommand('npx tsx scripts/initialize-escrow.ts')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <a 
          href="https://faucet.solana.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
        >
          Get Devnet SOL <ExternalLink className="w-3 h-3" />
        </a>
        
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupGuide;
