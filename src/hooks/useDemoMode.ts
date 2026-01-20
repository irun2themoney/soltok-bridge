import { useState, useCallback } from 'react';
import { TikTokProduct } from '../../types';

// Sample products for demo mode
export const DEMO_PRODUCTS: TikTokProduct[] = [
  {
    id: 'demo-1',
    title: 'Viral LED Sunset Lamp Projector',
    price: 24.99,
    imageUrl: 'https://picsum.photos/seed/sunset-lamp/400/400',
    seller: 'HomeVibes Official',
    category: 'Home & Living',
    rating: 4.8,
    inventory: 1247,
  },
  {
    id: 'demo-2', 
    title: 'Cloud Slides - Ultra Comfy Pillow Slippers',
    price: 19.99,
    imageUrl: 'https://picsum.photos/seed/cloud-slides/400/400',
    seller: 'ComfortWalk Store',
    category: 'Footwear',
    rating: 4.9,
    inventory: 3821,
  },
  {
    id: 'demo-3',
    title: 'Mini Portable Blender USB Rechargeable',
    price: 29.99,
    imageUrl: 'https://picsum.photos/seed/mini-blender/400/400',
    seller: 'KitchenTech Pro',
    category: 'Kitchen',
    rating: 4.7,
    inventory: 892,
  },
  {
    id: 'demo-4',
    title: 'Aesthetic Phone Case with Card Holder',
    price: 12.99,
    imageUrl: 'https://picsum.photos/seed/phone-case/400/400',
    seller: 'CaseCraft',
    category: 'Accessories',
    rating: 4.6,
    inventory: 5621,
  },
  {
    id: 'demo-5',
    title: 'Smart Posture Corrector with Vibration',
    price: 34.99,
    imageUrl: 'https://picsum.photos/seed/posture/400/400',
    seller: 'HealthTech Solutions',
    category: 'Health & Wellness',
    rating: 4.5,
    inventory: 432,
  },
];

interface DemoEscrowResult {
  success: boolean;
  txHash: string;
  escrowPDA: string;
}

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    // Check localStorage for demo mode preference
    const saved = localStorage.getItem('soltok_demo_mode');
    return saved === 'true';
  });

  const [demoWalletBalance, setDemoWalletBalance] = useState(500.00); // 500 USDC

  // Toggle demo mode
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newValue = !prev;
      localStorage.setItem('soltok_demo_mode', String(newValue));
      return newValue;
    });
  }, []);

  // Get a random demo product
  const getRandomProduct = useCallback((): TikTokProduct => {
    const idx = Math.floor(Math.random() * DEMO_PRODUCTS.length);
    return DEMO_PRODUCTS[idx];
  }, []);

  // Simulate product verification (with realistic delay)
  const verifyProduct = useCallback(async (url: string): Promise<TikTokProduct> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Return a random demo product with the URL's hash as seed for consistency
    const hash = url.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const idx = Math.abs(hash) % DEMO_PRODUCTS.length;
    return { ...DEMO_PRODUCTS[idx], id: `demo-${Date.now()}` };
  }, []);

  // Simulate escrow creation
  const createDemoEscrow = useCallback(async (
    orderId: string,
    amount: number
  ): Promise<DemoEscrowResult> => {
    // Check balance
    if (amount > demoWalletBalance) {
      throw new Error(`Insufficient balance. Have ${demoWalletBalance.toFixed(2)} USDC, need ${amount.toFixed(2)} USDC`);
    }

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    // Deduct from balance
    setDemoWalletBalance(prev => prev - amount);

    // Generate fake but realistic-looking hashes
    const txHash = Array.from({ length: 88 }, () => 
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)]
    ).join('');
    
    const escrowPDA = Array.from({ length: 44 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)]
    ).join('');

    return {
      success: true,
      txHash,
      escrowPDA,
    };
  }, [demoWalletBalance]);

  // Check demo USDC balance
  const checkDemoBalance = useCallback(async (requiredAmount: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      sufficient: demoWalletBalance >= requiredAmount,
      balance: demoWalletBalance,
    };
  }, [demoWalletBalance]);

  // Reset demo wallet
  const resetDemoWallet = useCallback(() => {
    setDemoWalletBalance(500.00);
  }, []);

  return {
    isDemoMode,
    toggleDemoMode,
    demoWalletBalance,
    resetDemoWallet,
    getRandomProduct,
    verifyProduct,
    createDemoEscrow,
    checkDemoBalance,
    DEMO_PRODUCTS,
  };
}

export default useDemoMode;
