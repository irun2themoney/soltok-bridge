<div align="center">

# 🌉 SolTok Bridge

**Pay for TikTok Shop items with Solana USDC**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://soltok-bridge.vercel.app)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF)](https://solana.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Live Demo](https://soltok-bridge.vercel.app) • [How It Works](#how-it-works) • [Quick Start](#quick-start) • [Architecture](#architecture)

</div>

---

## What is SolTok Bridge?

SolTok Bridge enables crypto-native buyers to purchase TikTok Shop products using **Solana USDC**. It bridges the gap between Web3 wallets and traditional e-commerce by:

1. **Verifying** TikTok product links in real-time using Google Gemini
2. **Locking** USDC in a Solana escrow smart contract
3. **Converting** crypto to fiat via off-ramp services
4. **Executing** the TikTok Shop purchase through a proxy agent
5. **Tracking** fulfillment and syncing carrier info back to the buyer

> **Try it now:** Visit [soltok-bridge.vercel.app](https://soltok-bridge.vercel.app) and click "Try Demo" for a simulated experience with 500 USDC.

---

## Features

### For Buyers
- 🔗 **Paste any TikTok Shop URL** - Product details verified automatically
- 💳 **Pay with USDC** - Connect Phantom or other Solana wallets
- 🔒 **Escrow Protection** - Funds locked until order ships
- 📦 **Real-time Tracking** - Fulfillment status synced to your dashboard
- 🎉 **Celebration Animations** - Confetti and buyer milestones
- 🔗 **Shareable Order Links** - Let others track your order

### For Operators
- 🛡️ **Operator Dashboard** - Manage orders, release escrow, process refunds
- 📊 **Live Statistics** - Track volume, pending orders, completion rates
- 🔍 **Search & Filter** - Find orders by ID, product, or customer

### Technical
- ⚡ **Solana Smart Contract** - Anchor-based escrow program
- 🗄️ **Supabase Backend** - Real-time order persistence
- 📱 **Mobile Responsive** - Optimized for all screen sizes
- 🎨 **Modern UI** - Glass morphism, animations, dark theme

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SolTok Bridge Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │  Buyer  │───▶│ Paste TikTok │───▶│   Verify    │───▶│  Lock USDC in  │  │
│  │         │    │   Shop URL   │    │  via Gemini │    │    Escrow      │  │
│  └─────────┘    └──────────────┘    └─────────────┘    └────────────────┘  │
│                                                                │            │
│                                                                ▼            │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │ Receive │◀───│    Sync      │◀───│   Execute   │◀───│   Off-Ramp     │  │
│  │ Package │    │   Tracking   │    │   Purchase  │    │   USDC→USD     │  │
│  └─────────┘    └──────────────┘    └─────────────┘    └────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Product Verification** - Buyer pastes a TikTok Shop URL. Gemini AI extracts product details and current price.

2. **Escrow Lock** - Buyer connects their Solana wallet and deposits USDC (product price + 5% bridge fee) into the escrow smart contract.

3. **Fiat Off-Ramp** - The bridge converts USDC to USD through an off-ramp service (Bridge.xyz integration).

4. **Proxy Purchase** - A virtual card is issued and the product is purchased on TikTok Shop, shipped to the buyer's address.

5. **Fulfillment Sync** - Tracking information is synced back to the buyer's dashboard with real-time updates.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Solana CLI (optional, for smart contract deployment)
- Phantom Wallet (or any Solana wallet)

### Installation

```bash
# Clone the repository
git clone https://github.com/irun2themoney/soltok-bridge.git
cd soltok-bridge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Environment Variables

```env
# Required for product verification
GEMINI_API_KEY=your_gemini_api_key

# Optional: Supabase for persistent storage
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Demo Mode

No setup required! Visit the app and click **"Try Demo"** to explore with:
- 500 USDC simulated balance
- Sample TikTok products
- Full checkout flow simulation
- Order tracking and fulfillment

---

## Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Solana Wallet Adapter** for wallet connections
- **Lucide Icons** for UI elements

### Backend
- **Vercel Serverless Functions** for API routes
- **Supabase** for real-time database
- **Google Gemini** for product verification

### Smart Contract
- **Anchor Framework** on Solana
- Escrow program at: `BRiDGePgwjKTbQJuqJWhNsUebmqLDJH6wWwjQQwU7Vet`
- Handles deposit, release, and refund instructions

### Project Structure

```
soltok-bridge/
├── App.tsx                 # Main application component
├── components/             # React components
│   ├── ArchitectureView    # Protocol diagram
│   ├── Celebration         # Confetti & success modals
│   ├── FulfillmentTracker  # Order progress steps
│   ├── OperatorDashboard   # Admin order management
│   ├── OrderStatusPage     # Shareable order page
│   └── ProductGallery      # Demo product grid
├── src/
│   ├── hooks/              # Custom React hooks
│   │   ├── useDemoMode     # Demo state management
│   │   ├── useEscrow       # Solana escrow interactions
│   │   └── useOrders       # Order CRUD with Supabase
│   └── lib/
│       └── supabase.ts     # Database client
├── programs/
│   └── escrow/             # Anchor smart contract
│       └── src/lib.rs      # Escrow program logic
└── api/                    # Vercel serverless functions
    ├── create-order.ts
    └── verify-product.ts
```

---

## Deployment

### Vercel (Recommended)

The app is configured for one-click Vercel deployment:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/irun2themoney/soltok-bridge)

After deployment, add environment variables in Vercel dashboard:
- `GEMINI_API_KEY`
- `VITE_SUPABASE_URL` (optional)
- `VITE_SUPABASE_ANON_KEY` (optional)

### Smart Contract

To deploy the escrow program to Solana devnet:

```bash
cd programs/escrow
anchor build
anchor deploy --provider.cluster devnet
```

Update the program ID in `src/hooks/useEscrow.ts` after deployment.

---

## Operator Access

The operator dashboard allows managing orders and escrow:

1. Click the shield icon in the navbar
2. Enter operator key: `operator-demo-2024`
3. Access the dashboard to:
   - View all orders
   - Advance order status
   - Release escrow on delivery
   - Process refunds

---

## Roadmap

- [x] Demo mode with simulated transactions
- [x] Solana escrow smart contract
- [x] Real-time order persistence (Supabase)
- [x] Mobile-responsive design
- [x] Shareable order links
- [x] Celebration animations
- [ ] Real TikTok Shop API integration
- [ ] Email/SMS notifications
- [ ] Multi-wallet support (Solflare, Backpack)
- [ ] Analytics dashboard
- [ ] Mainnet deployment

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Links

- 🌐 **Live Demo:** [soltok-bridge.vercel.app](https://soltok-bridge.vercel.app)
- 📦 **GitHub:** [github.com/irun2themoney/soltok-bridge](https://github.com/irun2themoney/soltok-bridge)
- 🔗 **Solana Explorer:** [View Program on Solscan](https://solscan.io/account/BRiDGePgwjKTbQJuqJWhNsUebmqLDJH6wWwjQQwU7Vet?cluster=devnet)

---

<div align="center">

**Built with ❤️ for the Solana ecosystem**

</div>
