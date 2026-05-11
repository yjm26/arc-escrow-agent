# Arc Escrow Agent

Trustless USDC escrow on Arc Network — automate Discord middleman services with smart contracts.

## Why?

Discord middleman services exist everywhere: gaming, crypto P2P, digital goods. But they rely on **trusting a human** who takes 5-10% fees and can scam you.

This replaces that with a **$0.01 smart contract** that can't scam anyone.

## How It Works

```
Client → create deal + deposit USDC to contract
                ↓
Freelancer → does the work
                ↓
Client → approve → USDC releases to freelancer
                ↓
(or) Client → refund → USDC returns to client
```

No middleman. No trust needed.

## Stack

- **Solidity** — Escrow smart contract
- **Arc Testnet** — EVM L1, USDC native gas ($0.01/tx)
- **ethers.js** — Frontend wallet integration
- **HTML/JS** — Simple UI (no framework needed)

## Quick Start

### Prerequisites

- Node.js v22+
- MetaMask or compatible wallet
- Testnet USDC from [Circle Faucet](https://faucet.circle.com)

### Setup

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env — add your PRIVATE_KEY

# Compile contracts
npx hardhat compile

# Deploy to Arc Testnet
npx hardhat run scripts/deploy.js --network arcTestnet
```

### Update Frontend

After deploying, update `ESCROW_ADDRESS` in `frontend/index.html` with your deployed contract address.

### Test

```bash
# Run local tests
npx hardhat test
```

## Contract

### Flow

1. **Create Deal** — Client calls `createDeal(freelancer, amount, description)`
2. **Fund Deal** — Client approves USDC spend, then calls `fundDeal(dealId)`
3. **Approve** — Client calls `approveDeal(dealId)` → USDC releases to freelancer
4. **Refund** — Client calls `refundDeal(dealId)` → USDC returns (before approval)

### Events

All state changes emit events for easy indexing:
- `DealCreated` — new escrow created
- `DealFunded` — USDC deposited
- `DealCompleted` — USDC released to freelancer
- `DealRefunded` — USDC returned to client

## Network

| Property | Value |
|----------|-------|
| Network | Arc Testnet |
| Chain ID | 9001 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |

## License

MIT
