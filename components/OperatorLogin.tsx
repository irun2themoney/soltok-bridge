import React, { useState } from 'react';
import { Shield, Key, AlertCircle, ArrowRight, Lock } from 'lucide-react';

interface OperatorLoginProps {
  onLogin: (key: string) => boolean;
  onCancel: () => void;
}

export const OperatorLogin: React.FC<OperatorLoginProps> = ({ onLogin, onCancel }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);
    
    // Simulate auth delay
    await new Promise(r => setTimeout(r, 500));
    
    const success = onLogin(key);
    if (!success) {
      setError(true);
      setKey('');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-white/5 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black">Operator Access</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Enter your operator key to access the dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Operator Key
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(false);
                }}
                placeholder="Enter your operator key"
                className={`w-full bg-white/5 border rounded-xl pl-12 pr-4 py-4 outline-none transition-all ${
                  error 
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-white/10 focus:ring-2 focus:ring-emerald-500/20'
                }`}
                autoFocus
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Invalid operator key
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!key || isLoading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Demo hint */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mt-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-purple-300 font-bold">Demo Access</p>
                <p className="text-xs text-purple-400/70 mt-1">
                  Use key: <code className="bg-purple-500/20 px-2 py-0.5 rounded">operator-demo-2024</code>
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperatorLogin;
