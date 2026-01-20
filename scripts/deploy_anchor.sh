#!/usr/bin/env bash
set -euo pipefail

echo "=== SolTok Anchor Deploy Helper ==="

# Defaults
CLUSTER="${1:-devnet}"
ANCHOR_CLI="${ANCHOR_CLI:-anchor}"

echo "Cluster: $CLUSTER"

if ! command -v $ANCHOR_CLI &> /dev/null; then
  echo "Error: anchor CLI not found. Install Anchor: https://book.anchor-lang.com/intro/installation.html"
  exit 1
fi

if ! command -v solana &> /dev/null; then
  echo "Error: solana CLI not found. Install from https://docs.solana.com/cli/install-solana-cli-tools"
  exit 1
fi

# Ensure Solana config
echo "Checking Solana config..."
SOLANA_KEYPAIR=$(solana config get | rg 'Keypair Path:' -n || true)
solana config get

echo ""
echo "Building Anchor program..."
(cd programs/escrow && anchor build)

echo ""
echo "Deploying to $CLUSTER..."
(cd programs/escrow && anchor deploy --provider.cluster "$CLUSTER")

echo ""
echo "Deployment complete. Fetching program ID from IDL..."
IDL_PATH="programs/escrow/target/idl/soltok_escrow.json"
if [ -f "$IDL_PATH" ]; then
  PROGRAM_ID=$(jq -r '.metadata.address' "$IDL_PATH" 2>/dev/null || true)
  if [ -n "$PROGRAM_ID" ]; then
    echo "Program ID: $PROGRAM_ID"
    echo "Copy this value to your .env.local as ESCROW_PROGRAM_ID and to your Vercel project secret ESCROW_PROGRAM_ID"
    echo ""
    echo "Example:"
    echo "  echo \"ESCROW_PROGRAM_ID=$PROGRAM_ID\" >> .env.local"
  else
    echo "Warning: Could not read program id from $IDL_PATH. Inspect the file manually."
  fi
else
  echo "Warning: IDL not found at $IDL_PATH. Check build/deploy output for program id."
fi

echo ""
echo "Tip: If you need devnet SOL for the deploy wallet, run: solana airdrop 2 --url https://api.devnet.solana.com"

echo "Done."

