import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
);

export const ProductSkeleton: React.FC = () => (
  <div className="max-w-xl mx-auto glass p-10 rounded-[48px] border-white/10 space-y-8">
    <div className="flex gap-8 items-start">
      <Skeleton className="w-32 h-32 rounded-3xl" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20 ml-auto" />
        <Skeleton className="h-6 w-32 ml-auto" />
      </div>
    </div>
    <Skeleton className="h-16 w-full rounded-3xl" />
  </div>
);

export const OrderSkeleton: React.FC = () => (
  <div className="glass p-10 rounded-[48px] border border-white/5 space-y-8">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-10 w-24 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
    <div className="flex gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="flex-1 h-20 rounded-xl" />
      ))}
    </div>
  </div>
);

export default Skeleton;
