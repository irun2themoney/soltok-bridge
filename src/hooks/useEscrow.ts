import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  buildEscrowTransaction, 
  getEscrowAccount,
  getEscrowPDA 
} from '../services/escrowService';

interface EscrowResult {
  success: boolean;
  txHash?: string;
  escrowPDA?: string;
  error?: string;
}

interface EscrowStatus {
  buyer: string;
  orderId: string;
  amount: number;
  feeAmount: number;
  fulfillmentAmount: number;
  status: 'Locked' | 'Released' | 'Refunded';
  createdAt: Date;
}

export function useEscrow() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create an escrow deposit for an order
   */
  const createEscrow = useCallback(async (
    orderId: string,
    amountUsdc: number
  ): Promise<EscrowResult> => {
    if (!connected || !publicKey || !signTransaction) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Determine if we're on devnet
      const rpcUrl = connection.rpcEndpoint;
      const isDevnet = rpcUrl.includes('devnet');

      // Build the transaction
      const { transaction, escrowPDA } = await buildEscrowTransaction(
        connection,
        publicKey,
        orderId,
        amountUsdc,
        isDevnet
      );

      // Sign the transaction
      const signedTx = await signTransaction(transaction);

      // Send the transaction
      const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txHash, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return {
        success: true,
        txHash,
        escrowPDA: escrowPDA.toBase58(),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [connection, publicKey, signTransaction, connected]);

  /**
   * Get the status of an escrow
   */
  const getEscrowStatus = useCallback(async (
    orderId: string,
    buyerAddress?: string
  ): Promise<EscrowStatus | null> => {
    const buyer = buyerAddress 
      ? new (await import('@solana/web3.js')).PublicKey(buyerAddress)
      : publicKey;

    if (!buyer) {
      setError('No buyer address provided');
      return null;
    }

    try {
      const escrow = await getEscrowAccount(connection, orderId, buyer);
      
      if (!escrow) return null;

      return {
        buyer: escrow.buyer.toBase58(),
        orderId: escrow.orderId,
        amount: escrow.amount,
        feeAmount: escrow.feeAmount,
        fulfillmentAmount: escrow.fulfillmentAmount,
        status: escrow.status,
        createdAt: new Date(escrow.createdAt * 1000),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch escrow';
      setError(errorMessage);
      return null;
    }
  }, [connection, publicKey]);

  /**
   * Get the escrow PDA for an order
   */
  const getEscrowAddress = useCallback((orderId: string): string | null => {
    if (!publicKey) return null;
    const [escrowPDA] = getEscrowPDA(orderId, publicKey);
    return escrowPDA.toBase58();
  }, [publicKey]);

  /**
   * Check if user has sufficient USDC balance
   */
  const checkUsdcBalance = useCallback(async (requiredAmount: number): Promise<{
    sufficient: boolean;
    balance: number;
  }> => {
    if (!publicKey) {
      return { sufficient: false, balance: 0 };
    }

    try {
      const { getAssociatedTokenAddress } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      
      // USDC mint (devnet)
      const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
      const tokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      
      const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
      const balance = accountInfo.value.uiAmount || 0;
      
      return {
        sufficient: balance >= requiredAmount,
        balance,
      };
    } catch {
      // Token account doesn't exist
      return { sufficient: false, balance: 0 };
    }
  }, [connection, publicKey]);

  return {
    createEscrow,
    getEscrowStatus,
    getEscrowAddress,
    checkUsdcBalance,
    isProcessing,
    error,
    connected,
    walletAddress: publicKey?.toBase58() || null,
  };
}

export default useEscrow;
