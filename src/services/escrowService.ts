import { 
  Connection, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

// Program ID - deployed to devnet
export const ESCROW_PROGRAM_ID = new PublicKey(
  process.env.ESCROW_PROGRAM_ID || '3pMM6KnPpxc1mhprcPGb7oLLi5skDmcVAvDb4sq4nS1L'
);

// USDC Mint addresses
export const USDC_MINT = {
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // Devnet USDC
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // Mainnet USDC
};

// Get the config PDA
export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    ESCROW_PROGRAM_ID
  );
}

// Get the escrow PDA for a specific order
export function getEscrowPDA(orderId: string, buyer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), Buffer.from(orderId), buyer.toBuffer()],
    ESCROW_PROGRAM_ID
  );
}

// Get the escrow vault PDA
export function getEscrowVaultPDA(escrowPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), escrowPDA.toBuffer()],
    ESCROW_PROGRAM_ID
  );
}

// Convert USDC amount to lamports (6 decimals)
export function usdcToLamports(amount: number): BN {
  return new BN(Math.floor(amount * 1_000_000));
}

// Convert lamports to USDC
export function lamportsToUsdc(lamports: BN): number {
  return lamports.toNumber() / 1_000_000;
}

/**
 * Create the instruction to deposit USDC into escrow
 */
export async function createEscrowInstruction(
  connection: Connection,
  buyer: PublicKey,
  orderId: string,
  amountUsdc: number,
  isDevnet: boolean = true
): Promise<{
  instruction: TransactionInstruction;
  escrowPDA: PublicKey;
  escrowVaultPDA: PublicKey;
}> {
  const usdcMint = isDevnet ? USDC_MINT.devnet : USDC_MINT.mainnet;
  const amount = usdcToLamports(amountUsdc);
  
  const [configPDA] = getConfigPDA();
  const [escrowPDA, escrowBump] = getEscrowPDA(orderId, buyer);
  const [escrowVaultPDA, vaultBump] = getEscrowVaultPDA(escrowPDA);
  
  // Get buyer's USDC token account
  const buyerTokenAccount = await getAssociatedTokenAddress(usdcMint, buyer);
  
  // Build instruction data
  // Format: [discriminator (8 bytes), orderId length (4 bytes), orderId, amount (8 bytes)]
  const orderIdBytes = Buffer.from(orderId);
  const discriminator = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]); // createEscrow discriminator
  
  const data = Buffer.alloc(8 + 4 + orderIdBytes.length + 8);
  discriminator.copy(data, 0);
  data.writeUInt32LE(orderIdBytes.length, 8);
  orderIdBytes.copy(data, 12);
  amount.toArrayLike(Buffer, 'le', 8).copy(data, 12 + orderIdBytes.length);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: escrowVaultPDA, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: ESCROW_PROGRAM_ID,
    data,
  });

  return {
    instruction,
    escrowPDA,
    escrowVaultPDA,
  };
}

/**
 * Build a complete transaction for escrow deposit
 */
export async function buildEscrowTransaction(
  connection: Connection,
  buyer: PublicKey,
  orderId: string,
  amountUsdc: number,
  isDevnet: boolean = true
): Promise<{
  transaction: Transaction;
  escrowPDA: PublicKey;
}> {
  const usdcMint = isDevnet ? USDC_MINT.devnet : USDC_MINT.mainnet;
  
  // Get buyer's USDC token account
  const buyerTokenAccount = await getAssociatedTokenAddress(usdcMint, buyer);
  
  // Check if buyer has USDC token account
  const tokenAccountInfo = await connection.getAccountInfo(buyerTokenAccount);
  
  const transaction = new Transaction();
  
  // If no token account exists, create it
  if (!tokenAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        buyerTokenAccount,
        buyer,
        usdcMint
      )
    );
  }
  
  // Add escrow instruction
  const { instruction, escrowPDA } = await createEscrowInstruction(
    connection,
    buyer,
    orderId,
    amountUsdc,
    isDevnet
  );
  
  transaction.add(instruction);
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyer;
  
  return { transaction, escrowPDA };
}

/**
 * Fetch escrow account data
 */
export async function getEscrowAccount(
  connection: Connection,
  orderId: string,
  buyer: PublicKey
): Promise<{
  buyer: PublicKey;
  orderId: string;
  amount: number;
  feeAmount: number;
  fulfillmentAmount: number;
  status: 'Locked' | 'Released' | 'Refunded';
  createdAt: number;
} | null> {
  const [escrowPDA] = getEscrowPDA(orderId, buyer);
  
  const accountInfo = await connection.getAccountInfo(escrowPDA);
  if (!accountInfo) return null;
  
  // Parse account data (simplified - in production use Anchor's deserialization)
  const data = accountInfo.data;
  
  // Skip discriminator (8 bytes)
  let offset = 8;
  
  // Read buyer pubkey (32 bytes)
  const buyerPubkey = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  // Read order ID (4 bytes length + string)
  const orderIdLen = data.readUInt32LE(offset);
  offset += 4;
  const orderIdStr = data.slice(offset, offset + orderIdLen).toString();
  offset += orderIdLen;
  
  // Read amounts
  const amount = lamportsToUsdc(new BN(data.slice(offset, offset + 8), 'le'));
  offset += 8;
  const feeAmount = lamportsToUsdc(new BN(data.slice(offset, offset + 8), 'le'));
  offset += 8;
  const fulfillmentAmount = lamportsToUsdc(new BN(data.slice(offset, offset + 8), 'le'));
  offset += 8;
  
  // Read status (1 byte)
  const statusByte = data[offset];
  const status = statusByte === 0 ? 'Locked' : statusByte === 1 ? 'Released' : 'Refunded';
  offset += 1;
  
  // Read created_at (8 bytes)
  const createdAt = new BN(data.slice(offset, offset + 8), 'le').toNumber();
  
  return {
    buyer: buyerPubkey,
    orderId: orderIdStr,
    amount,
    feeAmount,
    fulfillmentAmount,
    status,
    createdAt,
  };
}
