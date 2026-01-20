# Deployment & Local Testing Guide

This document explains how to run the app locally, deploy serverless functions (Vercel), and deploy the Anchor escrow program to Solana devnet.

## Current Deployment Status

**Program ID**: `3pMM6KnPpxc1mhprcPGb7oLLi5skDmcVAvDb4sq4nS1L`
**Network**: Solana Devnet
**Status**: Deployed - awaiting initialization (requires program upgrade with matching declare_id)

## Prerequisites
- Node.js (>=18)
- npm or yarn
- Rust + Cargo (for Anchor)
- Anchor CLI (or use Agave CLI tools v3.0+)
- Solana CLI / Agave CLI configured with a keypair
- Vercel account / CLI (for serverless functions)

## Local development (frontend + serverless emulation)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file from the example:

   ```bash
   cp .env.example .env.local
   # Edit .env.local and set GEMINI_API_KEY and SOLANA_RPC_URL
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. The frontend calls `/api/*` endpoints which will be available during development via Vite's dev server.

## Vercel deployment (serverless)

1. Create a new Vercel project and connect the repository (or use `vercel` CLI).
2. Add project environment variables / secrets on Vercel:
   - `GEMINI_API_KEY` — your Gemini API key
   - `SOLANA_RPC_URL` — e.g. `https://api.devnet.solana.com`
   - `ESCROW_PROGRAM_ID` — set after you deploy the Anchor program
   - `VERCEL_KV_URL` / Vercel KV (optional) — set up Vercel KV and add credentials if you want persistent order storage
3. Deploy via Vercel dashboard or:

   ```bash
   vercel --prod
   ```

## Anchor program deployment (Escrow)

1. Ensure Rust and Anchor are installed. Build and test locally:

   ```bash
   # from repository root
   cd programs/escrow
   anchor build
   ```

2. Configure Anchor provider in `Anchor.toml` (the file exists in `programs/escrow`). Make sure `wallet` points to your Solana keypair and `cluster` is `devnet`.

3. Deploy to devnet:

   ```bash
   anchor deploy --provider.cluster devnet
   ```

   The deploy output will show the program ID. Copy that value.

4. Update the Vercel project secret `ESCROW_PROGRAM_ID` with the deployed program ID, and update `.env.local` for local testing.

## Testing the full flow

1. Use a wallet with devnet SOL and devnet USDC. You can mint devnet USDC (or use test SPL tokens).
2. Open the app, connect a wallet, paste a TikTok product URL, verify, open checkout, and "INITIATE BRIDGE".
3. Confirm transaction in the wallet. The escrow program will lock funds if deployed and configured properly.
4. Monitor blockchain transaction on Solana devnet explorers and server logs for API calls.

## Completing the Setup (Requires ~2 SOL)

The program is deployed but needs to be upgraded to match the new program ID. Once the devnet faucet rate limit resets (8 hours), run:

```bash
# 1. Request airdrop (need ~2 SOL for upgrade)
solana airdrop 2

# 2. Upgrade the program with the correct declare_id
solana program deploy programs/escrow/target/deploy/soltok_escrow.so --program-id 3pMM6KnPpxc1mhprcPGb7oLLi5skDmcVAvDb4sq4nS1L

# 3. Initialize the escrow config
npx tsx scripts/initialize-escrow.ts
```

## Notes & Next Steps
- The current serverless order endpoints use an in-memory store for demo only. For production, replace with a persistent DB (Vercel KV, Supabase, PostgreSQL, etc.).
- To enable persistent order storage, configure Vercel KV and set the appropriate secret (see above). The API will automatically use KV when available.
- Ensure legal/compliance review before handling real value transfer (MSB/FinCEN concerns).
- Consider adding monitoring and webhooks for fulfillment updates.

