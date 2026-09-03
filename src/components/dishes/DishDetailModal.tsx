import React, { useState } from 'react';
import type { Dish, UserProfile, MemberPreferences, FamilyPersonalisation } from '../../types';
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
import { getLocalizedDish, formatDisplayIngredientName } from '../../services/dataLocalizationService';
import { checkDishAllergenRisk, getAllergenById } from '../../services/personalisationService';
import { LegalTermsModal } from '../common/LegalTermsModal';

interface DishDetailModalProps {
  dish: Dish | null;
  isOpen: boolean;
  currentProfile: UserProfile | null;
  familyMembers?: string[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
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
  familyMembers = [],
  memberProfiles,
  familyPersonalisation,
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
  const [showLegalModal, setShowLegalModal] = useState(false);

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
    ? checkDishAllergenRisk(dish, memberProfiles, familyMembers, familyPersonalisation)
    : { hasRisk: false, dishAllergens: [], affectedMembers: [] };

  const instructionSteps = (dish.stepList && dish.stepList.length > 0)
    ? dish.stepList
    : (typeof localized.instructions === 'string'
      ? localized.instructions.split('\n\n').flatMap((p) => p.split('\n')).map((s) => s.trim().replace(/^\d+[\.\)]\s*/, '')).filter(Boolean)
      : (typeof dish.instructions === 'string'
        ? dish.instructions.split('\n\n').flatMap((p) => p.split('\n')).map((s) => s.trim().replace(/^\d+[\.\)]\s*/, '')).filter(Boolean)
        : []));

  const nutrition = dish.nutrition || {
    calories: dish.dishRole === 'one_pot_meal' ? 520 : dish.dishRole === 'vegetable_side' ? 120 : dish.dishRole === 'soup' ? 180 : 410,
    protein: dish.dishRole === 'one_pot_meal' ? 28 : dish.dishRole === 'vegetable_side' ? 4 : dish.dishRole === 'soup' ? 12 : 36,
    carbs: dish.dishRole === 'one_pot_meal' ? 58 : dish.dishRole === 'vegetable_side' ? 12 : dish.dishRole === 'soup' ? 15 : 14,
    fat: dish.dishRole === 'one_pot_meal' ? 16 : dish.dishRole === 'vegetable_side' ? 5 : dish.dishRole === 'soup' ? 7 : 18,
    fiber: 3,
    sodium: 520
  };

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
              {dish.dishRole && (
                <span className="inline-block rounded-full bg-white/80 dark:bg-[#28231E]/80 px-2 py-0.5 text-[10px] font-bold text-[#2D2640] dark:text-[#F0EDE8] backdrop-blur shadow-2xs">
                  {dish.dishRole === 'one_pot_meal' ? (language === 'zh-CN' ? '🍲 一锅端/主食' : '🍲 One-Pot Meal') :
                   dish.dishRole === 'main_protein' ? (language === 'zh-CN' ? '🥩 主菜荤菜' : '🥩 Main Dish') :
                   dish.dishRole === 'vegetable_side' ? (language === 'zh-CN' ? '🥗 素菜配菜' : '🥗 Side Dish') :
                   dish.dishRole === 'soup' ? (language === 'zh-CN' ? '🥣 靓汤' : '🥣 Soup') :
                   (language === 'zh-CN' ? '🥫 酱料/调味' : '🥫 Sauce')}
                </span>
              )}
              {dish.spiceLevel && dish.spiceLevel > 0 ? (
                <span className="inline-block rounded-full bg-amber-100/90 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-300 backdrop-blur shadow-2xs">
                  {dish.spiceLevel === 1 ? '🟡 微辣' : dish.spiceLevel === 2 ? '🟠 中辣' : '🔥 麻辣'}
                </span>
              ) : null}
              {dish.kidFriendly && (
                <span className="inline-block rounded-full bg-[#E8F5ED] dark:bg-[#0D2E1A] px-2 py-0.5 text-[10px] font-bold text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC]/50 backdrop-blur shadow-2xs">
                  👶 {language === 'zh-CN' ? '儿童友好' : 'Kid-Friendly'}
                </span>
              )}
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

          {/* Macro Nutrition Summary Card */}
          <div className="rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-xs dark:border-[#3A332C] dark:bg-[#28231E]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">⚡</span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '每份营养估算' : 'Nutrition (Per Serving)'}
                </span>
              </div>
              {currentServings !== baseServings && (
                <span className="text-[10px] font-semibold text-[#9A8A7E] dark:text-[#7A6E64]">
                  {language === 'zh-CN' ? `按 ${currentServings} 份 (~${Math.round(nutrition.calories * currentServings)} kcal)` : `Batch: ~${Math.round(nutrition.calories * currentServings)} kcal`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {/* Calories */}
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E]">
                <span className="text-[14px] font-black text-[#2D2640] dark:text-[#F0EDE8] leading-none">
                  {nutrition.calories}
                </span>
                <span className="text-[9px] font-bold text-[#9A8A7E] dark:text-[#7A6E64] uppercase tracking-wider mt-1">
                  kcal
                </span>
              </div>

              {/* Protein */}
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E]">
                <span className="text-[14px] font-black text-[#2D6A4A] dark:text-[#4CAF82] leading-none">
                  {nutrition.protein}g
                </span>
                <span className="text-[9px] font-bold text-[#9A8A7E] dark:text-[#7A6E64] uppercase tracking-wider mt-1">
                  {language === 'zh-CN' ? '蛋白质' : 'Protein'}
                </span>
              </div>

              {/* Carbs */}
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E]">
                <span className="text-[14px] font-black text-[#B8860B] dark:text-[#FFD13B] leading-none">
                  {nutrition.carbs}g
                </span>
                <span className="text-[9px] font-bold text-[#9A8A7E] dark:text-[#7A6E64] uppercase tracking-wider mt-1">
                  {language === 'zh-CN' ? '碳水' : 'Carbs'}
                </span>
              </div>

              {/* Fat */}
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E]">
                <span className="text-[14px] font-black text-[#C25E34] dark:text-[#E2875C] leading-none">
                  {nutrition.fat}g
                </span>
                <span className="text-[9px] font-bold text-[#9A8A7E] dark:text-[#7A6E64] uppercase tracking-wider mt-1">
                  {language === 'zh-CN' ? '脂肪' : 'Fat'}
                </span>
              </div>
            </div>

            {(nutrition.fiber || nutrition.sodium) && (
              <div className="mt-2 pt-2 border-t border-[#EDE8DF]/70 dark:border-[#38332E]/70 flex items-center justify-between text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] px-1">
                {nutrition.fiber ? (
                  <span>🌱 {language === 'zh-CN' ? '膳食纤维' : 'Fiber'}: ~{nutrition.fiber}g</span>
                ) : <span />}
                {nutrition.sodium ? (
                  <span>🧂 {language === 'zh-CN' ? '钠' : 'Sodium'}: ~{nutrition.sodium}mg</span>
                ) : null}
              </div>
            )}
          </div>
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
                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80 mt-1 flex items-center gap-1">
                  <span>ℹ️ {language === 'zh-CN' ? '算法估算仅供参考，切勿替代物理包装检查' : 'Algorithmic estimate only. Always verify product packaging.'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLegalModal(true);
                    }}
                    className="underline font-bold hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
                  >
                    {language === 'zh-CN' ? '免责声明' : 'Disclaimer'}
                  </button>
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
                        {formatDisplayIngredientName(ing.name)}
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

      {/* Legal Terms & Health Disclaimer Modal */}
      <LegalTermsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab="allergies"
      />
    </div>
  );
};
