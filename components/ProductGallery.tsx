import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Star, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  Package,
  Zap
} from 'lucide-react';
import { TikTokProduct } from '../types';

interface ProductGalleryProps {
  products: TikTokProduct[];
  onSelectProduct: (product: TikTokProduct) => void;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  products,
  onSelectProduct,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-bold mb-4">
          <Sparkles className="w-4 h-4" />
          Demo Mode Active
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-3">
          Trending on <span className="text-emerald-400">TikTok Shop</span>
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Select any product below to experience the full bridge flow with simulated transactions
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="group relative bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.04] cursor-pointer"
            onMouseEnter={() => setHoveredId(product.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectProduct(product)}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${hoveredId === product.id ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute bottom-4 left-4 right-4">
                  <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Zap className="w-4 h-4" />
                    Quick Bridge
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {product.category}
                </span>
              </div>

              {/* Trending Badge */}
              {index < 2 && (
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Hot
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Seller */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <ShoppingBag className="w-3 h-3 text-black" />
                </div>
                <span className="text-xs text-gray-500 font-medium">{product.seller}</span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-white mb-3 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                {product.title}
              </h3>

              {/* Stats Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-white">{product.rating}</span>
                  </div>
                  
                  {/* Stock */}
                  <div className="flex items-center gap-1 text-gray-500">
                    <Package className="w-3 h-3" />
                    <span className="text-xs">{product.inventory?.toLocaleString()} sold</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400">${product.price}</span>
                  <span className="text-xs text-gray-500 ml-1">USDC</span>
                </div>
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transition-transform duration-300 origin-left ${hoveredId === product.id ? 'scale-x-100' : 'scale-x-0'}`} />
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="text-center mt-10">
        <p className="text-gray-600 text-sm">
          Or paste any TikTok Shop URL above to verify a real product
        </p>
      </div>
    </div>
  );
};

export default ProductGallery;
