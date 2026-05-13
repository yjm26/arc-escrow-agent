#!/bin/bash
# Quick setup for Bond Escrow on Arc Testnet
# Usage: chmod +x setup.sh && ./setup.sh

set -e

echo "Installing dependencies..."
npm install

if [ ! -f .env ]; then
  echo ""
  echo "==========================================="
  echo "  IMPORTANT: Configure your .env file!"
  echo "==========================================="
  echo ""
  echo "  1. cp .env.example .env"
  echo "  2. Edit .env and add your PRIVATE_KEY"
  echo "  3. Then run: npx hardhat run deploy.js --network arc"
  echo ""
else
  echo ""
  echo "Ready to deploy! Run:"
  echo "  npx hardhat run deploy.js --network arc"
  echo ""
fi
