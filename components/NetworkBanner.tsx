import React from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

export const NetworkBanner: React.FC = () => {
  const { connection } = useConnection();
  const [network, setNetwork] = React.useState<string>('unknown');
  const [isConnected, setIsConnected] = React.useState(true);

  React.useEffect(() => {
    const checkNetwork = async () => {
      try {
        const rpcUrl = connection.rpcEndpoint;
        if (rpcUrl.includes('devnet')) {
          setNetwork('devnet');
        } else if (rpcUrl.includes('mainnet')) {
          setNetwork('mainnet');
        } else if (rpcUrl.includes('testnet')) {
          setNetwork('testnet');
        } else if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
          setNetwork('localnet');
        } else {
          setNetwork('custom');
        }
        
        // Check if we can reach the RPC
        await connection.getLatestBlockhash();
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [connection]);

  if (network === 'mainnet') return null; // Don't show banner on mainnet

  const isDevnet = network === 'devnet';
  const bgColor = !isConnected 
    ? 'bg-red-500/10 border-red-500/20' 
    : isDevnet 
      ? 'bg-yellow-500/10 border-yellow-500/20' 
      : 'bg-blue-500/10 border-blue-500/20';
  
  const textColor = !isConnected 
    ? 'text-red-400' 
    : isDevnet 
      ? 'text-yellow-400' 
      : 'text-blue-400';

  return (
    <div className={`${bgColor} border-b px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium ${textColor}`}>
      {!isConnected ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Network connection lost. Trying to reconnect...</span>
        </>
      ) : isDevnet ? (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>You're on <strong>Devnet</strong> — This is test money only. Not real value.</span>
        </>
      ) : (
        <>
          <Wifi className="w-3 h-3" />
          <span>Connected to <strong>{network}</strong></span>
        </>
      )}
    </div>
  );
};

export default NetworkBanner;
