
import React from 'react';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { TikTokProduct } from '../types';

interface WishlistViewProps {
  wishlist: TikTokProduct[];
  onRemove: (id: string) => void;
  onAddToCart: (product: TikTokProduct) => void;
  onOpenProduct: (product: TikTokProduct) => void;
}

const WishlistView: React.FC<WishlistViewProps> = ({ wishlist, onRemove, onAddToCart, onOpenProduct }) => {
  if (wishlist.length === 0) {
    return (
      <div className="py-20 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-10 h-10 text-gray-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Your wishlist is empty</h2>
          <p className="text-gray-500 max-w-sm mx-auto">Save items you like and come back later to complete your Solana-to-TikTok bridge purchase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
          <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
          Saved Items
        </h2>
        <span className="text-sm font-bold text-gray-500">{wishlist.length} Products</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {wishlist.map((product) => (
          <div key={product.id} className="glass rounded-2xl p-4 group hover:bg-white/[0.05] transition-all border border-white/5 flex flex-col">
            <div className="relative aspect-square rounded-xl overflow-hidden mb-4 cursor-pointer" onClick={() => onOpenProduct(product)}>
              <img 
                src={`https://picsum.photos/seed/${product.id}/600`} 
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(product.id); }}
                className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-2 rounded-full text-pink-500 hover:scale-110 transition-transform"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-gray-100 line-clamp-1 cursor-pointer" onClick={() => onOpenProduct(product)}>{product.title}</h3>
                <span className="text-emerald-400 font-bold font-heading">${product.price}</span>
              </div>
              <p className="text-xs text-gray-500">{product.seller}</p>
            </div>
            <button 
              onClick={() => onAddToCart(product)}
              className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WishlistView;
