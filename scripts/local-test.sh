#!/usr/bin/env bash
set -euo pipefail

# SolTok Bridge Local Testing Script
# This script sets up a local Solana validator with the escrow program for testing

echo "=== SolTok Bridge Local Test Environment ==="
echo ""

# Check for required tools
if ! command -v solana &> /dev/null; then
  echo "Error: solana CLI not found"
  exit 1
fi

if ! command -v solana-test-validator &> /dev/null; then
  echo "Error: solana-test-validator not found"
  exit 1
fi

# Configuration
PROGRAM_ID="3pMM6KnPpxc1mhprcPGb7oLLi5skDmcVAvDb4sq4nS1L"
PROGRAM_SO="programs/escrow/target/deploy/soltok_escrow.so"
LEDGER_DIR="test-ledger"

# Check if program is built
if [ ! -f "$PROGRAM_SO" ]; then
  echo "Program not built. Building..."
  (cd programs/escrow && cargo-build-sbf)
fi

# Kill any existing validator
pkill -f solana-test-validator 2>/dev/null || true
sleep 2

echo "Starting local validator..."
echo "  Program ID: $PROGRAM_ID"
echo "  Ledger: $LEDGER_DIR"
echo ""

# Start validator with the program preloaded
solana-test-validator \
  --ledger "$LEDGER_DIR" \
  --bpf-program "$PROGRAM_ID" "$PROGRAM_SO" \
  --reset \
  --quiet &

VALIDATOR_PID=$!

# Wait for validator to start
echo "Waiting for validator to start..."
sleep 5

# Check if validator is running
if ! kill -0 $VALIDATOR_PID 2>/dev/null; then
  echo "Error: Validator failed to start"
  exit 1
fi

# Configure CLI for local
solana config set --url http://localhost:8899 > /dev/null

# Create test keypair if needed
TEST_KEYPAIR="/tmp/soltok-test-keypair.json"
if [ ! -f "$TEST_KEYPAIR" ]; then
  echo "Creating test keypair..."
  solana-keygen new --no-passphrase -o "$TEST_KEYPAIR" --force > /dev/null 2>&1
fi

solana config set --keypair "$TEST_KEYPAIR" > /dev/null

# Airdrop SOL
echo "Airdropping SOL to test wallet..."
solana airdrop 100 > /dev/null 2>&1

TEST_PUBKEY=$(solana address)
TEST_BALANCE=$(solana balance | cut -d' ' -f1)

echo ""
echo "=== Local Environment Ready ==="
echo "  RPC URL: http://localhost:8899"
echo "  Test Wallet: $TEST_PUBKEY"
echo "  Balance: $TEST_BALANCE SOL"
echo "  Program: $PROGRAM_ID"
echo ""
echo "To stop the validator, run: pkill -f solana-test-validator"
echo ""
echo "Press Ctrl+C to stop and view logs, or run in background with &"

# Keep running
wait $VALIDATOR_PID
