
import React, { useState } from 'react';
import { X, Star, MessageSquare, ShieldCheck } from 'lucide-react';
import { TikTokProduct, Review } from '../types';

interface ProductModalProps {
  product: TikTokProduct;
  reviews: Review[];
  onClose: () => void;
  onAddReview: (review: Omit<Review, 'id' | 'date' | 'isVerified'>) => void;
  walletConnected: boolean;
  userAddress: string;
}

const ProductModal: React.FC<ProductModalProps> = ({ 
  product, 
  reviews, 
  onClose, 
  onAddReview, 
  walletConnected,
  userAddress 
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onAddReview({ productId: product.id, userAddress, rating, comment });
    setComment('');
  };

  const productReviews = reviews.filter(r => r.productId === product.id);
  const avgRating = productReviews.length > 0 
    ? (productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length).toFixed(1)
    : product.rating.toFixed(1);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full z-10">
          <X className="w-6 h-6" />
        </button>

        <div className="md:w-1/2 h-64 md:h-auto">
          <img 
            src={`https://picsum.photos/seed/${product.id}/800`} 
            alt={product.title} 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="md:w-1/2 p-8 overflow-y-auto space-y-6">
          <div>
            <span className="text-emerald-400 font-bold tracking-widest text-xs uppercase">{product.category}</span>
            <h2 className="text-3xl font-heading font-bold mt-2">{product.title}</h2>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-bold text-lg">{avgRating}</span>
              </div>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{productReviews.length} Verified Reviews</span>
            </div>
          </div>

          <p className="text-gray-400 leading-relaxed">
            Directly bridged from TikTok Shop. This product is eligible for proxy purchase using Solana USDC. 
            All orders include verified shipping tracking and escrow protection.
          </p>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Customer Reviews
            </h3>
            
            {productReviews.length === 0 ? (
              <p className="text-gray-600 italic">No reviews yet. Be the first to share your experience!</p>
            ) : (
              <div className="space-y-4">
                {productReviews.map((review) => (
                  <div key={review.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-emerald-400">{review.userAddress.slice(0, 4)}...{review.userAddress.slice(-4)}</span>
                        {review.isVerified && (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-3 h-3" /> Verified Buy
                          </span>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">{review.comment}</p>
                    <span className="text-[10px] text-gray-600 block mt-2">{review.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {walletConnected && (
            <form onSubmit={handleSubmit} className="pt-6 border-t border-white/10 space-y-4">
              <h4 className="font-bold">Leave a Review</h4>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button 
                    key={s} 
                    type="button" 
                    onClick={() => setRating(s)}
                    className="focus:outline-none"
                  >
                    <Star className={`w-6 h-6 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the fulfillment process?"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[100px]"
              />
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2 rounded-xl text-sm transition-all"
              >
                Submit Review
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
