import React from 'react';
import { Heart, Sparkles } from 'lucide-react';

interface EasterEggModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const EasterEggModal: React.FC<EasterEggModalProps> = ({
  isOpen,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-rose-100 p-6 text-center space-y-4 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Animated Background Hearts */}
        <div className="absolute top-2 left-3 text-rose-300/40 text-2xl animate-pulse">
          💕
        </div>
        <div className="absolute bottom-3 right-3 text-rose-300/40 text-xl animate-pulse delay-200">
          💖
        </div>

        {/* Central Love Icon */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
            <Heart className="w-8 h-8 fill-rose-500 animate-bounce" />
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-spin" />
        </div>

        {/* Easter Egg Message */}
        <div className="space-y-1 relative z-10">
          <div className="text-2xl">😘 💕 ✨</div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            Muahhhh from your husband
          </h3>
          <p className="text-xs text-slate-500">
            Have a wonderful day planning our delicious meals!
          </p>
        </div>

        {/* Single Mandatory Button to continue */}
        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Muahhh ❤️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
