import React, { useState } from 'react';
import type { Dish, UserProfile, MemberPreferences } from '../../types';
import {
  ArrowLeft,
  Clock,
  Heart,
  Download,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  CalendarPlus,
  Edit3,
  Trash2
} from 'lucide-react';
import { exportToZip } from '../../services/zipExportService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish } from '../../services/dataLocalizationService';
import { checkDishAllergenRisk, getAllergenById } from '../../services/personalisationService';

interface DishDetailModalProps {
  dish: Dish | null;
  isOpen: boolean;
  currentProfile: UserProfile | null;
  familyMembers?: string[];
  memberProfiles?: Record<string, MemberPreferences>;
  onClose: () => void;
  onEdit: (dish: Dish) => void;
  onDelete: (dishId: string) => void;
  onToggleFavorite: (dishId: string) => void;
  onToggleFamilyCookbook?: (dish: Dish) => void;
  onQuickPlan?: (dish: Dish) => void;
  onShowToast?: (msg: string) => void;
  selectAction?: {
    label: string;
    isSelected?: boolean;
    onSelect: (dish: Dish) => void;
  };
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  dish,
  isOpen,
  currentProfile,
  memberProfiles,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleFamilyCookbook,
  onQuickPlan,
  onShowToast,
  selectAction
}) => {
  const { language, t, formatCategory, formatCuisine } = useLanguage();
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  if (!isOpen || !dish) return null;

  const localized = getLocalizedDish(dish, language);
  const currentMember = currentProfile?.memberName || '';
  const favoritedBy = dish.favoritedByMembers || [];
  const isFavoritedByMe = currentMember ? favoritedBy.includes(currentMember) : false;
  const isInFamilyCookbook = dish.isFamilyRecipe !== false;

  const baseServings = dish.servings || 4;
  const currentServings = Math.max(1, Math.round(baseServings * servingMultiplier));

  // Toggle ingredient checked for cooking
  const toggleIngredientCheck = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

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

  // Allergen risk detection for family members
  const allergenRisk = memberProfiles
    ? checkDishAllergenRisk(dish, memberProfiles)
    : { hasRisk: false, dishAllergens: [], affectedMembers: [] };

  const instructionSteps = typeof localized.instructions === 'string'
    ? localized.instructions.split('\n').map((s) => s.trim()).filter(Boolean)
    : (typeof dish.instructions === 'string' ? dish.instructions.split('\n').map((s) => s.trim()).filter(Boolean) : []);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[448px] flex-col bg-[#F8F5F0] dark:bg-[#1C1917] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Hero Section */}
        <div className="relative flex h-56 shrink-0 items-center justify-center bg-gradient-to-b from-[#FDEAE3] to-[#FADFD3] dark:from-[#3A2A24] dark:to-[#2A1F1A] overflow-hidden">
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-7xl" aria-hidden="true">
              {dish.imageEmoji || '🍲'}
            </span>
          )}

          {dish.imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />}

          {/* Top Floating Buttons */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-[#28231E]/80 text-[#2D2640] dark:text-[#F0EDE8] backdrop-blur transition-transform active:scale-95 cursor-pointer shadow-sm"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {onToggleFamilyCookbook && (
                <button
                  type="button"
                  onClick={() => onToggleFamilyCookbook(dish)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-[#28231E]/80 backdrop-blur transition-transform active:scale-95 cursor-pointer shadow-sm ${
                    isInFamilyCookbook ? 'text-[#2D2640] dark:text-[#F0EDE8]' : 'text-[#B8AFA4] dark:text-[#9A8A7E]'
                  }`}
                  title={isInFamilyCookbook ? 'In Cookbook' : 'Save to Cookbook'}
                >
                  {isInFamilyCookbook ? (
                    <BookmarkCheck className="h-4 w-4 fill-[#2D2640] dark:fill-[#F0EDE8] text-white dark:text-[#28231E]" />
                  ) : (
                    <BookmarkPlus className="h-4 w-4" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleExportSingle}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-[#28231E]/80 text-[#2D2640] dark:text-[#F0EDE8] backdrop-blur transition-transform active:scale-95 cursor-pointer shadow-sm"
                title="Export"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onToggleFavorite(dish.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-[#28231E]/80 backdrop-blur transition-transform active:scale-95 cursor-pointer shadow-sm ${
                  isFavoritedByMe ? 'text-rose-500' : 'text-[#B8AFA4] dark:text-[#9A8A7E]'
                }`}
                title="Favorite"
              >
                <Heart className={`h-4 w-4 ${isFavoritedByMe ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Hero Bottom Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-block rounded-full bg-white/80 dark:bg-[#28231E]/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#8A7A70] dark:text-[#9A8A7E] backdrop-blur shadow-2xs">
                {dish.cuisine ? formatCuisine(dish.cuisine) : formatCategory(dish.category)}
              </span>
              {isInFamilyCookbook && (
                <span className="inline-block rounded-full bg-[#FFF3D6] dark:bg-[#2A1E00] px-2 py-0.5 text-[10px] font-bold text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/40">
                  {language === 'zh-CN' ? '家庭菜谱' : 'In Cookbook'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#2D2640] dark:text-[#F0EDE8] text-balance leading-tight drop-shadow-2xs">
              {localized.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 space-y-4">
          
          {/* Metadata & Servings Card */}
          <div className="flex items-center justify-between rounded-2xl border border-[#EDE8DF] bg-white px-4 py-3 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
            <div className="flex items-center gap-2 text-[#4A3F35] dark:text-[#F0EDE8]">
              <Clock className="h-4 w-4 text-[#9A8A7E]" />
              <span className="text-[13px] font-medium">{dish.prepTimeMinutes || 20} {language === 'zh-CN' ? '分钟' : 'min'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-[#8A7A70] dark:text-[#9A8A7E]">
                {language === 'zh-CN' ? '份量' : 'Servings'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setServingMultiplier((prev) => Math.max(0.25, prev - 0.25))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF7F2] text-[#4A3F35] dark:bg-[#201C18] dark:text-[#F0EDE8] transition cursor-pointer"
                  aria-label="Fewer servings"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
                </button>
                <span className="w-6 text-center text-[14px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                  {currentServings}
                </span>
                <button
                  type="button"
                  onClick={() => setServingMultiplier((prev) => prev + 0.25)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFD13B] text-[#2D2640] transition cursor-pointer"
                  aria-label="More servings"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>

          {/* Allergen Warning Banner */}
          {allergenRisk.hasRisk && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/25 dark:bg-rose-500/10 animate-in fade-in">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#E05050]" />
              <div>
                <p className="text-[13px] font-semibold text-[#E05050]">
                  {language === 'zh-CN' ? '过敏原预警' : 'Allergy Warning'}
                </p>
                <p className="text-[12px] text-rose-600/90 dark:text-rose-300/90 mt-0.5">
                  {language === 'zh-CN'
                    ? `含有 ${allergenRisk.dishAllergens.map((id) => getAllergenById(id)?.nameZh || id).join(', ')} — ${allergenRisk.affectedMembers.map((m) => m.memberName).join('、')} 对此过敏。`
                    : `Contains ${allergenRisk.dishAllergens.map((id) => getAllergenById(id)?.nameEn || id).join(', ')} — ${allergenRisk.affectedMembers.map((m) => m.memberName).join(', ')} allergic.`}
                </p>
              </div>
            </div>
          )}

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
                {language === 'zh-CN' ? `所需食材 (${dish.ingredients.length})` : `Ingredients (${dish.ingredients.length})`}
              </h3>
              {checkedIngredients.size > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckedIngredients(new Set())}
                  className="text-[10px] text-[#8A7A70] hover:underline cursor-pointer"
                >
                  {language === 'zh-CN' ? '重置勾选' : 'Reset checklist'}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {dish.ingredients.map((ing, idx) => {
                const isChecked = checkedIngredients.has(idx);
                const scaledAmount = ing.amount ? Number((ing.amount * servingMultiplier).toFixed(1)) : null;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIngredientCheck(idx)}
                    className={`flex w-full items-center justify-between rounded-xl border border-[#EDE8DF] bg-white px-3 py-2.5 text-left transition-colors cursor-pointer dark:border-[#3A332C] dark:bg-[#28231E] ${
                      isChecked ? 'bg-[#FAF7F2] dark:bg-[#201C18]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isChecked
                            ? 'border-[#4E9E72] bg-[#EBF5EE]'
                            : 'border-[#D8CCC0] bg-transparent'
                        }`}
                      >
                        {isChecked ? (
                          <Check className="h-3.5 w-3.5 text-[#4E9E72]" strokeWidth={3} />
                        ) : null}
                      </span>
                      <span
                        className={`text-[13.5px] truncate ${
                          isChecked
                            ? 'text-[#B8AFA4] line-through dark:text-[#5A5450]'
                            : 'text-[#4A3F35] dark:text-[#F0EDE8]'
                        }`}
                      >
                        {ing.name}
                      </span>
                    </div>

                    <span className="text-[12px] font-semibold text-[#8A7A70] dark:text-[#9A8A7E] shrink-0">
                      {scaledAmount !== null ? `${scaledAmount} ` : ''}{ing.unit || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructions Section */}
          {instructionSteps.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
                {language === 'zh-CN' ? '烹饪步骤' : 'Instructions'}
              </h3>
              <ol className="space-y-3">
                {instructionSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFD13B] text-[13px] font-bold text-[#2D2640]">
                      {i + 1}
                    </span>
                    <p className="pt-0.5 text-[13.5px] leading-relaxed text-[#4A3F35] dark:text-[#F0EDE8]">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onEdit(dish)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E8DDD5] bg-[#F5F0E8] text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8] text-xs font-semibold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('common.edit')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${dish.name}"?`)) onDelete(dish.id);
              }}
              className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer transition"
              title="Delete dish"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="sticky bottom-0 z-20 border-t border-[#EDE8DF] bg-white/95 backdrop-blur-md px-4 py-3 dark:border-[#3A332C] dark:bg-[#28231E]/95">
          {selectAction ? (
            <button
              type="button"
              onClick={() => selectAction.onSelect(dish)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-transform active:scale-95 cursor-pointer shadow-md bg-[#FFD13B] text-[#2D2640] border border-[#2D2640]/10"
            >
              <Check className="w-4 h-4 stroke-[2.4]" />
              <span>{selectAction.label}</span>
            </button>
          ) : (
            <div className="flex gap-2">
              {onQuickPlan && (
                <button
                  type="button"
                  onClick={() => onQuickPlan(dish)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#FFD13B] border border-[#2D2640]/10 text-[#2D2640] font-semibold text-sm transition-transform active:scale-95 cursor-pointer shadow-md"
                >
                  <CalendarPlus className="w-4 h-4" strokeWidth={2.4} />
                  <span>{language === 'zh-CN' ? '加入排餐' : 'Add to Plan'}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
