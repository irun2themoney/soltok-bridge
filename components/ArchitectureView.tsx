
import React from 'react';
import { 
  Server, 
  ShieldAlert, 
  ArrowRightLeft, 
  CreditCard, 
  Zap, 
  Database,
  Search,
  Wallet
} from 'lucide-react';

const ArchitectureView: React.FC = () => {
  const modules = [
    {
      title: "Scraper Engine",
      icon: <Search className="w-6 h-6 text-emerald-400" />,
      desc: "Playwright-based headless browser with stealth plugins. Bypasses Akamai/Cloudflare via rotating residential proxies.",
      tools: ["Playwright", "Residential Proxies", "Stealth Plugin"]
    },
    {
      title: "Payment Splitter",
      icon: <Wallet className="w-6 h-6 text-purple-400" />,
      desc: "Anchor program splits funds: 5% Treasury, 95% Fulfillment Wallet. Ensures non-custodial fee capture.",
      tools: ["Solana Anchor", "USDC SPL", "Phantom"]
    },
    {
      title: "Fiat Bridge",
      icon: <ArrowRightLeft className="w-6 h-6 text-blue-400" />,
      desc: "Automatically off-ramps USDC via Bridge.xyz or Circle APIs into a dedicated USD business account.",
      tools: ["Bridge.xyz", "Circle", "Stripe Bridge"]
    },
    {
      title: "Fulfillment Bot",
      icon: <Zap className="w-6 h-6 text-pink-400" />,
      desc: "Bot generates Virtual Credit Cards (VCCs) via Marqeta, logs into TikTok, and executes proxy purchase.",
      tools: ["Marqeta API", "Puppeteer", "Privacy.com"]
    }
  ];

  return (
    <div className="space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-heading font-bold text-white">System Architecture</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          A low-latency bridge between decentralized finance and centralized social commerce.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((m, i) => (
          <div key={i} className="glass p-6 rounded-2xl hover:bg-white/[0.05] transition-colors group">
            <div className="mb-4 bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              {m.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{m.title}</h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{m.desc}</p>
            <div className="flex flex-wrap gap-2">
              {m.tools.map((t, idx) => (
                <span key={idx} className="text-[10px] uppercase font-bold tracking-widest bg-white/5 px-2 py-1 rounded text-gray-500">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="bg-red-500/20 p-4 rounded-full">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-red-100">Critical Compliance Notice</h4>
          <p className="text-red-200/60 text-sm max-w-3xl">
            This architecture handles value transfer between digital assets and fiat. In the US, this is classified as a Money Service Business (MSB) requiring a federal FinCEN registration and state-level Money Transmitter Licenses (MTL). Proxy buying also violates TikTok Shop TOS, necessitating robust shadow-account management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureView;
