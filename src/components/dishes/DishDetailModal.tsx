import React, { useState } from 'react';
import type { Dish, UserProfile } from '../../types';
import { ArrowLeft, Clock, Users, Edit3, Trash2, CalendarPlus, Tag, Heart, Download, Star, Plus, Minus, FileText } from 'lucide-react';
import { exportToZip } from '../../services/zipExportService';

interface DishDetailModalProps {
  dish: Dish | null;
  isOpen: boolean;
  currentProfile: UserProfile | null;
  onClose: () => void;
  onEdit: (dish: Dish) => void;
  onDelete: (dishId: string) => void;
  onToggleFavorite: (dishId: string) => void;
  onQuickPlan?: (dish: Dish) => void;
  onShowToast?: (msg: string) => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  dish,
  isOpen,
  currentProfile,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onQuickPlan,
  onShowToast
}) => {
  if (!isOpen || !dish) return null;

  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [quickNote, setQuickNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const currentMember = currentProfile?.memberName || '';
  const favoritedBy = dish.favoritedByMembers || [];
  const isFavoritedByMe = currentMember ? favoritedBy.includes(currentMember) : false;

  const handleExportSingle = async () => {
    try {
      const filename = await exportToZip(
        currentProfile?.familyName || 'Family',
        'SingleDish',
        { dishes: [dish] },
        dish.name
      );
      if (onShowToast) onShowToast(`📦 Exported ${filename}`);
    } catch (err: any) {
      if (onShowToast) onShowToast(`❌ Export failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[92vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden border border-[#EAE6DF] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Top Hero Photo Section */}
        <div className="relative h-60 w-full bg-[#F4F1EA] overflow-hidden shrink-0">
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F4F1EA] text-6xl">
              {dish.imageEmoji || '🍲'}
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

          {/* Floating Back Pill & Top Actions */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSingle}
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer"
                title="Export / Share Recipe"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => onToggleFavorite(dish.id)}
                className={`w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer ${
                  isFavoritedByMe ? 'text-rose-500' : 'text-slate-400'
                }`}
                title={isFavoritedByMe ? 'Favorited' : 'Add to Favorites'}
              >
                <Heart className={`w-4 h-4 ${isFavoritedByMe ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Hero Banner Star Rating & Title */}
          <div className="absolute bottom-3 left-4 right-4 text-white space-y-1">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-slate-900 shadow-xs">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>4.8</span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2B2D42] text-white shadow-xs">
                {dish.category}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white leading-tight drop-shadow-sm">
              {dish.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Details Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFBF7]">
          
          {/* Quick Metrics (Servings & Prep Time) */}
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE6DF] shadow-2xs">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">{dish.servings * servingMultiplier} Servings</span>
            </div>

            {dish.prepTimeMinutes && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE6DF] shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold">{dish.prepTimeMinutes} mins</span>
              </div>
            )}

            {favoritedBy.length > 0 && (
              <div className="flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 text-[11px]">
                <Heart className="w-3 h-3 fill-rose-500" />
                <span>{favoritedBy.join(', ')}</span>
              </div>
            )}
          </div>

          {/* "Add Note Here" section */}
          <div className="bg-white rounded-xl p-3 border border-[#EAE6DF] space-y-2 shadow-2xs">
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Add note here</span>
              </div>
              <span className="text-[11px] text-slate-500">{isAddingNote ? 'Close' : '+ Note'}</span>
            </button>

            {isAddingNote && (
              <textarea
                rows={2}
                placeholder="e.g. Extra spicy, substitute tofu, cook for guests..."
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="w-full text-xs text-slate-900 p-2.5 rounded-xl bg-[#FDFBF7] border border-[#EAE6DF] focus:outline-hidden focus:border-slate-400"
              />
            )}
          </div>

          {/* Servings Counter & Quick Plan Action */}
          <div className="bg-white rounded-xl p-3 border border-[#EAE6DF] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Batch Scale:
              </span>
              <div className="flex items-center bg-[#F4F1EA] rounded-xl border border-[#EAE6DF] px-1 py-0.5">
                <button
                  onClick={() => setServingMultiplier(Math.max(1, servingMultiplier - 1))}
                  className="p-1 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-slate-900">
                  {servingMultiplier}x
                </span>
                <button
                  onClick={() => setServingMultiplier(servingMultiplier + 1)}
                  className="p-1 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {onQuickPlan && (
              <button
                onClick={() => {
                  onQuickPlan(dish);
                  onClose();
                }}
                className="px-4 py-2 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition cursor-pointer"
              >
                ADD TO SCHEDULE
              </button>
            )}
          </div>

          {/* Tags */}
          {dish.tags && dish.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dish.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-white text-slate-600 rounded-xl border border-[#EAE6DF] shadow-2xs"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients Checklist */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Ingredients ({dish.ingredients.length})</span>
            </h3>
            {dish.ingredients.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No ingredients listed.</p>
            ) : (
              <div className="bg-white rounded-xl p-3 border border-[#EAE6DF] space-y-2 shadow-2xs">
                {dish.ingredients.map((ing, idx) => (
                  <div
                    key={ing.id || idx}
                    className="flex items-center justify-between text-xs py-1 border-b border-[#F4F1EA] last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{ing.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ing.amount !== null && (
                        <span className="font-bold text-slate-800 bg-[#F4F1EA] border border-[#EAE6DF] px-2 py-0.5 rounded-md text-[11px]">
                          {Math.round(ing.amount * servingMultiplier * 100) / 100} {ing.unit}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-[#FDFBF7] px-1.5 py-0.5 rounded-md font-medium border border-[#EAE6DF]">
                        {ing.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cooking Instructions / Notes */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Recipe Steps & Cooking Notes
            </h3>
            {dish.instructions ? (
              <div className="bg-white p-3.5 rounded-xl border border-[#EAE6DF] text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line shadow-2xs">
                {dish.instructions}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-[#EAE6DF]">
                No cooking instructions added yet. Tap 'Edit' to add the recipe steps.
              </p>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 border-t border-[#F4F1EA] bg-white flex items-center justify-between gap-2 pb-safe">
          <button
            onClick={() => {
              if (window.confirm(`Delete "${dish.name}" from recipe library?`)) {
                onDelete(dish.id);
                onClose();
              }
            }}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            title="Delete Recipe"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(dish)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EAE6DF] bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit</span>
            </button>

            {onQuickPlan && (
              <button
                onClick={() => {
                  onQuickPlan(dish);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Add to Schedule</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
