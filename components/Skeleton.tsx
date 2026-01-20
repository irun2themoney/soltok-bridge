import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
    <Skeleton className="aspect-square w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  </div>
);

export const OrderCardSkeleton: React.FC = () => (
  <div className="bg-[#111] rounded-2xl p-6 border border-white/5">
    <div className="flex gap-4">
      <Skeleton className="w-20 h-20 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
  </div>
);

export const DatabaseStatus: React.FC<{ 
  connected: boolean; 
  loading?: boolean;
  orderCount?: number;
}> = ({ connected, loading, orderCount }) => (
  <div className="flex items-center gap-2 text-xs">
    <div className={`w-2 h-2 rounded-full ${
      loading ? 'bg-yellow-500 animate-pulse' : 
      connected ? 'bg-emerald-500' : 'bg-gray-500'
    }`} />
    <span className="text-gray-500">
      {loading ? 'Syncing...' : 
       connected ? `Cloud (${orderCount || 0})` : 'Local only'}
    </span>
  </div>
);

export default Skeleton;
