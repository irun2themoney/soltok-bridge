
import React from 'react';
import { CheckCircle2, Clock, Loader2, CreditCard, ShoppingCart, Truck, Wallet, ArrowRightLeft } from 'lucide-react';
import { FulfillmentStep } from '../types';

interface FulfillmentTrackerProps {
  steps: FulfillmentStep[];
  isGlobal?: boolean;
}

const FulfillmentTracker: React.FC<FulfillmentTrackerProps> = ({ steps, isGlobal = false }) => {
  const getIcon = (iconName: string, status: string) => {
    const color = status === 'completed' ? 'text-emerald-400' : status === 'processing' ? 'text-blue-400' : 'text-gray-500';
    switch (iconName) {
      case 'wallet': return <Wallet className={`w-5 h-5 ${color}`} />;
      case 'card': return <CreditCard className={`w-5 h-5 ${color}`} />;
      case 'cart': return <ShoppingCart className={`w-5 h-5 ${color}`} />;
      case 'truck': return <Truck className={`w-5 h-5 ${color}`} />;
      case 'bridge': return <ArrowRightLeft className={`w-5 h-5 ${color}`} />;
      default: return <Clock className={`w-5 h-5 ${color}`} />;
    }
  };

  const activeStep = steps.find(s => s.status === 'processing');

  return (
    <div className={`glass rounded-2xl p-6 border border-white/5 ${isGlobal ? 'bg-emerald-500/5' : ''}`}>
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        {activeStep ? (
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        )}
        {activeStep ? 'Active Fulfillment Sequence' : 'Order Lifecycle'}
      </h3>
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative pl-8 pb-4 last:pb-0">
            {idx !== steps.length - 1 && (
              <div className={`absolute left-[15px] top-8 bottom-0 w-[2px] transition-colors duration-500 ${step.status === 'completed' ? 'bg-emerald-500/30' : 'bg-white/5'}`} />
            )}
            <div className="absolute left-0 top-0 transition-all duration-500">
              {step.status === 'completed' ? (
                <div className="bg-emerald-500/20 p-1.5 rounded-full scale-110">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              ) : step.status === 'processing' ? (
                <div className="bg-blue-500/20 p-1.5 rounded-full animate-pulse ring-2 ring-blue-500/20">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white/5 p-1.5 rounded-full">
                  <div className="w-4 h-4 rounded-full border border-gray-600" />
                </div>
              )}
            </div>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className={`text-sm font-bold transition-colors ${step.status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
                  {step.label}
                </h4>
                <p className="text-xs text-gray-400 mt-1">{step.description}</p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                {getIcon(step.icon, step.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FulfillmentTracker;
