/**
 * Initialize the SolTok Bridge Escrow Program
 * 
 * This script calls the `initialize` instruction to set up the escrow config
 * with treasury and fulfillment vault addresses.
 * 
 * Usage: npx ts-node scripts/initialize-escrow.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PROGRAM_ID = new PublicKey('3pMM6KnPpxc1mhprcPGb7oLLi5skDmcVAvDb4sq4nS1L');
const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TREASURY_FEE_BPS = 500; // 5%

// Load keypair from file
function loadKeypair(keypairPath: string): Keypair {
  const resolvedPath = keypairPath.replace('~', process.env.HOME || '');
  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

// Get config PDA
function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
}

// Build initialize instruction
function buildInitializeInstruction(
  admin: PublicKey,
  config: PublicKey,
  treasury: PublicKey,
  fulfillmentVault: PublicKey,
  treasuryFeeBps: number
): TransactionInstruction {
  // Instruction discriminator for "initialize" - calculated from sha256("global:initialize")[0..8]
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  
  // Encode fee BPS as u16 little endian
  const feeBpsBuffer = Buffer.alloc(2);
  feeBpsBuffer.writeUInt16LE(treasuryFeeBps, 0);
  
  const data = Buffer.concat([discriminator, feeBpsBuffer]);

  return new TransactionInstruction({
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: fulfillmentVault, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

async function main() {
  console.log('=== SolTok Escrow Initialization ===\n');
  
  // Load admin keypair
  const keypairPath = process.env.SOLANA_KEYPAIR || '~/.config/solana/arb.json';
  console.log(`Loading keypair from: ${keypairPath}`);
  const admin = loadKeypair(keypairPath);
  console.log(`Admin address: ${admin.publicKey.toBase58()}`);

  // Connect to Solana
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log(`Connected to: ${RPC_URL}`);
  
  const balance = await connection.getBalance(admin.publicKey);
  console.log(`Admin balance: ${balance / 1e9} SOL\n`);

  // Get config PDA
  const [configPDA, configBump] = getConfigPDA();
  console.log(`Config PDA: ${configPDA.toBase58()} (bump: ${configBump})`);

  // Check if already initialized
  const configAccount = await connection.getAccountInfo(configPDA);
  if (configAccount) {
    console.log('\n⚠️  Config account already exists! Program is already initialized.');
    console.log('If you need to re-initialize, you must redeploy the program.');
    return;
  }

  // Create treasury and fulfillment vault token accounts
  // For simplicity, we'll use the admin's associated token accounts
  const treasuryATA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, admin.publicKey);
  const fulfillmentATA = await getAssociatedTokenAddress(
    USDC_MINT_DEVNET, 
    admin.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );
  
  // For a real deployment, you'd want separate keypairs for treasury and fulfillment
  // Here we use the same ATA for both (demo purposes)
  console.log(`Treasury ATA: ${treasuryATA.toBase58()}`);
  console.log(`Fulfillment Vault ATA: ${fulfillmentATA.toBase58()}`);
  console.log(`Fee: ${TREASURY_FEE_BPS} bps (${TREASURY_FEE_BPS / 100}%)\n`);

  // Build transaction
  const tx = new Transaction();

  // Check if ATA exists, if not create it
  const ataInfo = await connection.getAccountInfo(treasuryATA);
  if (!ataInfo) {
    console.log('Creating treasury/fulfillment ATA...');
    tx.add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        treasuryATA,
        admin.publicKey,
        USDC_MINT_DEVNET
      )
    );
  }

  // Add initialize instruction
  tx.add(
    buildInitializeInstruction(
      admin.publicKey,
      configPDA,
      treasuryATA, // treasury receives fees
      treasuryATA, // fulfillment vault (using same for demo)
      TREASURY_FEE_BPS
    )
  );

  console.log('Sending initialize transaction...');
  
  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: 'confirmed',
    });
    
    console.log(`\n✅ Escrow initialized successfully!`);
    console.log(`Transaction signature: ${signature}`);
    console.log(`\nView on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Verify initialization
    const configData = await connection.getAccountInfo(configPDA);
    if (configData) {
      console.log(`\nConfig account verified: ${configData.data.length} bytes`);
    }
  } catch (error) {
    console.error('\n❌ Failed to initialize escrow:', error);
    throw error;
  }
}

main().catch(console.error);
