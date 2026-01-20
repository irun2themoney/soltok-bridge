import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { 
  buildEscrowTransaction, 
  getEscrowAccount,
  getEscrowPDA 
} from '../services/escrowService';

// Devnet USDC mint address
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Bridge treasury wallet - receives payments on devnet
// In production, this would be the escrow program PDA
const BRIDGE_TREASURY = new PublicKey('BRiDGE1111111111111111111111111111111111111');

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
   * On devnet: Performs a real USDC transfer to the bridge treasury
   * On mainnet: Would use the full escrow program (not yet deployed)
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

      // For devnet: Do a real USDC transfer to prove the payment rail works
      if (isDevnet) {
        console.log('[Bridge] Devnet mode: Real USDC transfer');
        console.log(`[Bridge] Order: ${orderId}, Amount: ${amountUsdc} USDC`);
        
        // Convert USDC amount to smallest unit (6 decimals)
        const amountInSmallestUnit = Math.floor(amountUsdc * 1_000_000);
        
        // Get the sender's USDC token account
        const senderTokenAccount = await getAssociatedTokenAddress(
          DEVNET_USDC_MINT,
          publicKey
        );
        
        // Get or create the treasury's USDC token account
        const treasuryTokenAccount = await getAssociatedTokenAddress(
          DEVNET_USDC_MINT,
          BRIDGE_TREASURY
        );
        
        // Build the transaction
        const transaction = new Transaction();
        
        // Check if treasury token account exists, if not create it
        try {
          await getAccount(connection, treasuryTokenAccount);
        } catch {
          // Account doesn't exist, add instruction to create it
          console.log('[Bridge] Creating treasury token account...');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              treasuryTokenAccount, // ata
              BRIDGE_TREASURY, // owner
              DEVNET_USDC_MINT, // mint
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
        
        // Add the transfer instruction
        transaction.add(
          createTransferInstruction(
            senderTokenAccount, // from
            treasuryTokenAccount, // to
            publicKey, // owner
            amountInSmallestUnit, // amount
            [], // multiSigners
            TOKEN_PROGRAM_ID
          )
        );
        
        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        
        // Sign the transaction
        console.log('[Bridge] Requesting wallet signature...');
        const signedTx = await signTransaction(transaction);
        
        // Send the transaction
        console.log('[Bridge] Sending transaction...');
        const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log(`[Bridge] Transaction sent: ${txHash}`);
        
        // Wait for confirmation
        console.log('[Bridge] Waiting for confirmation...');
        const confirmation = await connection.confirmTransaction({
          signature: txHash,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log(`[Bridge] Transaction confirmed! View on explorer:`);
        console.log(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
        
        // Generate a mock escrow PDA (for compatibility with order storage)
        const [escrowPDA] = getEscrowPDA(orderId, publicKey);
        
        return {
          success: true,
          txHash,
          escrowPDA: escrowPDA.toBase58(),
        };
      }

      // Production: Use real escrow program
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
