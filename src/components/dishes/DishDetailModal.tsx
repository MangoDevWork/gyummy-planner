import React, { useState } from 'react';
import type { Dish, UserProfile } from '../../types';
import { ArrowLeft, Clock, Users, Edit3, Trash2, CalendarPlus, Tag, Heart, Download, Star, Plus, Minus, FileText, BookmarkCheck, BookmarkPlus, Check } from 'lucide-react';
import { exportToZip } from '../../services/zipExportService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish } from '../../services/dataLocalizationService';

interface DishDetailModalProps {
  dish: Dish | null;
  isOpen: boolean;
  currentProfile: UserProfile | null;
  onClose: () => void;
  onEdit: (dish: Dish) => void;
  onDelete: (dishId: string) => void;
  onToggleFavorite: (dishId: string) => void;
  onToggleFamilyCookbook?: (dish: Dish) => void;
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
  onToggleFamilyCookbook,
  onQuickPlan,
  onShowToast
}) => {
  if (!isOpen || !dish) return null;

  const { language, t, formatCategory, formatCuisine } = useLanguage();
  const localized = getLocalizedDish(dish, language);

  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [quickNote, setQuickNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const currentMember = currentProfile?.memberName || '';
  const favoritedBy = dish.favoritedByMembers || [];
  const isFavoritedByMe = currentMember ? favoritedBy.includes(currentMember) : false;
  const isInFamilyCookbook = dish.isFamilyRecipe !== false;

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
              {/* Family Cookbook Toggle Button */}
              {onToggleFamilyCookbook && (
                <button
                  onClick={() => onToggleFamilyCookbook(dish)}
                  className={`w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer ${
                    isInFamilyCookbook ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title={isInFamilyCookbook ? 'In Family Cookbook' : 'Add to Family Cookbook'}
                >
                  {isInFamilyCookbook ? (
                    <BookmarkCheck className="w-4 h-4 fill-slate-800 text-white" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4" />
                  )}
                </button>
              )}

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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-slate-900 shadow-xs">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>4.8</span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2B2D42] text-white shadow-xs">
                {formatCategory(dish.category)}
              </span>

              {dish.cuisine && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md">
                  {formatCuisine(dish.cuisine)}
                </span>
              )}

              {localized.fallbackTag && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                  {localized.fallbackTag}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white leading-tight drop-shadow-sm">
              {localized.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Details Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFBF7]">
          
          {/* Untranslated Language Fallback Notice Banner */}
          {localized.fallbackTag && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
              <span className="text-base leading-none">🌐</span>
              <p className="leading-snug">
                <strong>
                  {language === 'zh-CN' ? '未提供中文翻译' : 'Untranslated Recipe'}
                </strong>
                <span className="block text-[11px] text-amber-800 mt-0.5">
                  {language === 'zh-CN'
                    ? '此菜谱暂无中文译本，已为您显示原作者编写的语言内容。'
                    : 'This recipe is not translated yet, displaying in available language.'}
                </span>
              </p>
            </div>
          )}

          {/* Quick Metrics (Servings & Prep Time) */}
          <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE6DF] shadow-2xs">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">
                {dish.servings * servingMultiplier} {language === 'zh-CN' ? '人份' : 'Servings'}
              </span>
            </div>

            {dish.prepTimeMinutes && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE6DF] shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold">
                  {dish.prepTimeMinutes} {language === 'zh-CN' ? '分钟' : 'mins'}
                </span>
              </div>
            )}

            {isInFamilyCookbook ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-[11px] font-semibold">
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('dishes.addedToCookbook')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold">
                <span>{t('dishes.libraryTab')}</span>
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
                <span>{language === 'zh-CN' ? '添加个人随手记 / 烹饪心得' : 'Add note here'}</span>
              </div>
              <span className="text-[11px] text-slate-500">{isAddingNote ? t('common.close') : `+ ${t('common.notes')}`}</span>
            </button>

            {isAddingNote && (
              <textarea
                rows={2}
                placeholder={language === 'zh-CN' ? '例如：少放辣、多焖5分钟、换成嫩豆腐...' : 'e.g. Extra spicy, substitute tofu, cook for guests...'}
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
                {language === 'zh-CN' ? '分量倍数:' : 'Batch Scale:'}
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
                {language === 'zh-CN' ? '+ 加入排餐' : 'ADD TO SCHEDULE'}
              </button>
            )}
          </div>

          {/* Tags */}
          {localized.tags && localized.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {localized.tags.map((tag, idx) => (
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
              <span>{t('dishes.ingredientsSection')} ({localized.ingredients.length})</span>
            </h3>
            {localized.ingredients.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {language === 'zh-CN' ? '暂无食材清单。' : 'No ingredients listed.'}
              </p>
            ) : (
              <div className="bg-white rounded-xl p-3 border border-[#EAE6DF] space-y-2 shadow-2xs">
                {localized.ingredients.map((ing, idx) => {
                  const isChecked = checkedIngredients.has(idx);
                  return (
                    <div
                      key={ing.id || idx}
                      onClick={() => {
                        setCheckedIngredients((prev) => {
                          const next = new Set(prev);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          return next;
                        });
                      }}
                      className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg border-b border-[#F4F1EA] last:border-0 cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/20 opacity-60' : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`font-semibold text-slate-800 truncate ${isChecked ? 'line-through text-slate-400' : ''}`}>
                          {ing.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ing.amount !== null && (
                          <span className="font-bold text-slate-800 bg-[#F4F1EA] border border-[#EAE6DF] px-2 py-0.5 rounded-md text-[11px]">
                            {Math.round(ing.amount * servingMultiplier * 100) / 100} {ing.unit}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 bg-[#FDFBF7] px-1.5 py-0.5 rounded-md font-medium border border-[#EAE6DF]">
                          {formatCategory(ing.category)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cooking Instructions / Notes */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              {t('dishes.instructionsSection')}
            </h3>
            {localized.instructions ? (
              <div className="bg-white p-4 rounded-xl border border-[#EAE6DF] text-xs font-normal leading-relaxed whitespace-pre-line text-slate-800 shadow-2xs">
                {localized.instructions}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-[#EAE6DF]">
                {language === 'zh-CN' ? '暂未添加烹饪步骤。点击下方“编辑”即可补充！' : "No cooking instructions added yet. Tap 'Edit' to add the recipe steps."}
              </p>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 border-t border-[#F4F1EA] bg-white flex items-center justify-between gap-2 pb-safe">
          <button
            onClick={() => {
              if (window.confirm(language === 'zh-CN' ? `确定要从菜谱库中删除 "${localized.name}" 吗？` : `Delete "${dish.name}" from recipe library?`)) {
                onDelete(dish.id);
                onClose();
              }
            }}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            title={language === 'zh-CN' ? '删除菜谱' : 'Delete Recipe'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(dish)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EAE6DF] bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'zh-CN' ? '编辑' : 'Edit'}</span>
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
                <span>{language === 'zh-CN' ? '加入排餐' : 'Add to Schedule'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
