import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, TrendingUp, Users, DollarSign } from 'lucide-react';

// Fire confetti with emerald/gold theme
export const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#10b981', '#34d399', '#fbbf24', '#ffffff'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  // Big burst in the middle
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: colors,
    });
  }, 200);
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return count;
}

// Stats display for landing page
interface StatsCounterProps {
  className?: string;
}

export const StatsCounter: React.FC<StatsCounterProps> = ({ className = '' }) => {
  // Simulated stats - in production these would come from Supabase
  const baseOrders = 12847;
  const baseVolume = 847392;
  const baseUsers = 3241;
  
  // Add some "live" variation
  const [liveOffset, setLiveOffset] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveOffset(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const orders = useAnimatedCounter(baseOrders + liveOffset, 2500);
  const volume = useAnimatedCounter(baseVolume + (liveOffset * 65), 2500);
  const users = useAnimatedCounter(baseUsers + Math.floor(liveOffset / 4), 2500);

  return (
    <div className={`grid grid-cols-3 gap-4 md:gap-8 ${className}`}>
      <div className="text-center p-4 md:p-6 bg-white/[0.02] rounded-2xl border border-white/5">
        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="text-2xl md:text-4xl font-black text-white tabular-nums">
          {orders.toLocaleString()}
        </div>
        <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1">
          Orders Bridged
        </div>
      </div>
      
      <div className="text-center p-4 md:p-6 bg-white/[0.02] rounded-2xl border border-white/5">
        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
          <DollarSign className="w-4 h-4" />
        </div>
        <div className="text-2xl md:text-4xl font-black text-white tabular-nums">
          ${(volume / 1000).toFixed(0)}K
        </div>
        <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1">
          USDC Volume
        </div>
      </div>
      
      <div className="text-center p-4 md:p-6 bg-white/[0.02] rounded-2xl border border-white/5">
        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
          <Users className="w-4 h-4" />
        </div>
        <div className="text-2xl md:text-4xl font-black text-white tabular-nums">
          {users.toLocaleString()}
        </div>
        <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1">
          Active Users
        </div>
      </div>
    </div>
  );
};

// Success modal with buyer number
interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productName: string;
  amount: number;
  buyerNumber: number;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderId,
  productName,
  amount,
  buyerNumber,
}) => {
  useEffect(() => {
    if (isOpen) {
      fireConfetti();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0a0a0a] rounded-[32px] border border-emerald-500/20 p-8 md:p-12 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-[32px] pointer-events-none" />
        
        {/* Success icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
            <Sparkles className="w-10 h-10 text-black" />
          </div>
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl -z-10" />
        </div>

        {/* Buyer number badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
          <span className="text-emerald-400 text-sm font-bold">
            You're Bridge User #{buyerNumber.toLocaleString()}
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
          Order Confirmed!
        </h2>
        
        <p className="text-gray-400 mb-6">
          Your bridge transaction is being processed
        </p>

        {/* Order details */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6 text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Product</span>
            <span className="text-white font-medium truncate ml-4">{productName}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Amount</span>
            <span className="text-emerald-400 font-bold">{amount.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Order ID</span>
            <span className="text-gray-400 font-mono text-xs">{orderId}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all hover:scale-[1.02]"
        >
          View Order Status
        </button>

        {/* Share hint */}
        <p className="text-gray-600 text-xs mt-4">
          🎉 Share your bridge experience on X/Twitter
        </p>
      </div>
    </div>
  );
};

export default { fireConfetti, StatsCounter, OrderSuccessModal };
