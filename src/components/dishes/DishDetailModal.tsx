import React, { useState } from 'react';
import type { Dish, UserProfile, MemberPreferences } from '../../types';
import { ArrowLeft, Clock, Users, Edit3, Trash2, CalendarPlus, Tag, Heart, Download, Star, Plus, Minus, FileText, BookmarkCheck, BookmarkPlus, Check, ShieldAlert, Calendar } from 'lucide-react';
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
  familyMembers = [],
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
  const [quickNote, setQuickNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  if (!isOpen || !dish) return null;

  const localized = getLocalizedDish(dish, language);
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
      <div className="bg-white dark:bg-[#252220] w-full max-w-md max-h-[92vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden border border-[#EDE8DF] dark:border-[#38332E] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Top Hero Photo Section */}
        <div className="relative h-60 w-full bg-[#F5F0E8] dark:bg-[#2E2A26] overflow-hidden shrink-0">
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {dish.imageEmoji || '🍲'}
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

          {/* Floating Back Pill & Top Actions */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#252220]/90 hover:bg-white dark:hover:bg-[#2E2A26] text-[#2D2640] dark:text-[#F0EDE8] flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {/* Family Cookbook Toggle Button */}
              {onToggleFamilyCookbook && (
                <button
                  onClick={() => onToggleFamilyCookbook(dish)}
                  className={`w-9 h-9 rounded-full bg-white/90 dark:bg-[#252220]/90 hover:bg-white dark:hover:bg-[#2E2A26] flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer ${
                    isInFamilyCookbook ? 'text-[#2D2640] dark:text-[#F0EDE8]' : 'text-[#B8AFA4] dark:text-[#5A5450] hover:text-[#3D3530] dark:hover:text-[#D0C8C0]'
                  }`}
                  title={isInFamilyCookbook ? 'In Family Cookbook' : 'Add to Family Cookbook'}
                >
                  {isInFamilyCookbook ? (
                    <BookmarkCheck className="w-4 h-4 fill-[#2D2640] dark:fill-[#F0EDE8] text-white dark:text-[#252220]" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={handleExportSingle}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#252220]/90 hover:bg-white dark:hover:bg-[#2E2A26] text-[#2D2640] dark:text-[#F0EDE8] flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer"
                title="Export / Share Recipe"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => onToggleFavorite(dish.id)}
                className={`w-9 h-9 rounded-full bg-white/90 dark:bg-[#252220]/90 hover:bg-white dark:hover:bg-[#2E2A26] flex items-center justify-center backdrop-blur-md transition shadow-sm active:scale-95 cursor-pointer ${
                  isFavoritedByMe ? 'text-rose-500' : 'text-[#B8AFA4] dark:text-[#5A5450]'
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
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-[#252220]/90 text-[#2D2640] dark:text-[#F0EDE8] shadow-xs">
                <Star className="w-3 h-3 fill-[#FFD13B] text-[#FFD13B]" />
                <span>4.8</span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2D2640]/80 dark:bg-[#F0EDE8]/20 text-white dark:text-[#F0EDE8] shadow-xs">
                {formatCategory(dish.category)}
              </span>

              {dish.cuisine && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md">
                  {formatCuisine(dish.cuisine)}
                </span>
              )}

              {localized.fallbackTag && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFD13B] text-[#2D2640] shadow-xs">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F7F4EF] dark:bg-[#1A1714]">
          
          {/* Untranslated Language Fallback Notice Banner */}
          {localized.fallbackTag && (
            <div className="bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#7A5C00] dark:text-[#FFD13B] shadow-2xs">
              <span className="text-base leading-none">🌐</span>
              <p className="leading-snug">
                <strong>
                  {language === 'zh-CN' ? '未提供中文翻译' : 'Untranslated Recipe'}
                </strong>
                <span className="block text-[11px] mt-0.5 opacity-80">
                  {language === 'zh-CN'
                    ? '此菜谱暂无中文译本，已为您显示原作者编写的语言内容。'
                    : 'This recipe is not translated yet, displaying in available language.'}
                </span>
              </p>
            </div>
          )}

          {/* Quick Metrics (Servings & Prep Time) */}
          <div className="flex items-center gap-2 text-xs text-[#3D3530] dark:text-[#D0C8C0] flex-wrap">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#252220] px-3 py-1.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-2xs">
              <Users className="w-3.5 h-3.5 text-[#9A8A7E] dark:text-[#7A6E64]" />
              <span className="font-semibold text-[#2D2640] dark:text-[#F0EDE8]">
                {dish.servings * servingMultiplier} {language === 'zh-CN' ? '人份' : 'Servings'}
              </span>
            </div>

            {dish.prepTimeMinutes && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#252220] px-3 py-1.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#9A8A7E] dark:text-[#7A6E64]" />
                <span className="font-semibold text-[#2D2640] dark:text-[#F0EDE8]">
                  {dish.prepTimeMinutes} {language === 'zh-CN' ? '分钟' : 'mins'}
                </span>
              </div>
            )}

            {isInFamilyCookbook ? (
              <div className="flex items-center gap-1.5 bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] px-3 py-1.5 rounded-xl border border-[#FFD13B]/40 text-[11px] font-semibold">
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{t('dishes.addedToCookbook')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] px-3 py-1.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] text-[11px] font-semibold">
                <span>{t('dishes.libraryTab')}</span>
              </div>
            )}

            {dish.timesPlanned && dish.timesPlanned > 0 ? (
              <div className="flex items-center gap-1.5 bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] px-3 py-1.5 rounded-xl border border-[#FFD13B]/40 text-[11px] font-bold">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {language === 'zh-CN'
                    ? `已做过 ${dish.timesPlanned} 次`
                    : `Cooked ${dish.timesPlanned} times`}
                </span>
                {dish.lastPlannedAt && (
                  <span className="text-[10px] opacity-80 font-normal">
                    ({dish.lastPlannedAt})
                  </span>
                )}
              </div>
            ) : null}

            {favoritedBy.length > 0 && (
              <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-[11px]">
                <Heart className="w-3 h-3 fill-rose-500" />
                <span>{favoritedBy.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Allergen Assessment Banner */}
          {(() => {
            const risk = checkDishAllergenRisk(dish, memberProfiles, familyMembers);
            if (risk.hasRisk) {
              return (
                <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900 rounded-2xl p-3.5 text-xs text-rose-700 dark:text-rose-400 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>
                      {language === 'zh-CN'
                        ? '⚠️ 家庭过敏原预警 (包含忌口成分)'
                        : '⚠️ Family Allergen Warning'}
                    </span>
                  </div>
                  <div className="space-y-1 pl-7 text-[11px]">
                    {risk.affectedMembers.map((m) => (
                      <div key={m.memberName} className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold">👤 {m.memberName}:</span>
                        {m.allergens.map((algId) => {
                          const def = getAllergenById(algId);
                          return (
                            <span
                              key={algId}
                              className="bg-rose-200/80 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 font-bold px-2 py-0.5 rounded-md text-[10px]"
                            >
                              {def?.emoji || '⚠️'} {language === 'zh-CN' ? def?.nameZh || algId : def?.nameEn || algId}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            if (risk.dishAllergens.length > 0) {
              return (
                <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-2.5 flex items-center gap-2 flex-wrap text-[11px] text-[#7A6E64] dark:text-[#9A9088]">
                  <span className="font-bold text-[#2D2640] dark:text-[#F0EDE8] shrink-0">
                    {language === 'zh-CN' ? '🏷️ 涉及食材分类:' : '🏷️ Contains:'}
                  </span>
                  {risk.dishAllergens.map((algId) => {
                    const def = getAllergenById(algId);
                    return (
                      <span
                        key={algId}
                        className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#3D3530] dark:text-[#D0C8C0]"
                      >
                        {def?.emoji || '•'} {language === 'zh-CN' ? def?.nameZh || algId : def?.nameEn || algId}
                      </span>
                    );
                  })}
                </div>
              );
            }
            return null;
          })()}

          {/* "Add Note Here" section */}
          <div className="bg-white dark:bg-[#252220] rounded-xl p-3 border border-[#EDE8DF] dark:border-[#38332E] space-y-2 shadow-2xs">
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#3D3530] dark:text-[#D0C8C0] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#9A8A7E] dark:text-[#7A6E64]" />
                <span>{language === 'zh-CN' ? '添加个人随手记 / 烹饪心得' : 'Add note here'}</span>
              </div>
              <span className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">{isAddingNote ? t('common.close') : `+ ${t('common.notes')}`}</span>
            </button>

            {isAddingNote && (
              <textarea
                rows={2}
                placeholder={language === 'zh-CN' ? '例如：少放辣、多焖5分钟、换成嫩豆腐...' : 'e.g. Extra spicy, substitute tofu, cook for guests...'}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="w-full text-xs text-[#2D2640] dark:text-[#F0EDE8] p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] focus:outline-hidden focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
              />
            )}
          </div>

          {/* Servings Counter & Quick Plan Action */}
          <div className="bg-white dark:bg-[#252220] rounded-xl p-3 border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider">
                {language === 'zh-CN' ? '分量倍数:' : 'Batch Scale:'}
              </span>
              <div className="flex items-center bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-xl border border-[#EDE8DF] dark:border-[#38332E] px-1 py-0.5">
                <button
                  onClick={() => setServingMultiplier(Math.max(1, servingMultiplier - 1))}
                  className="p-1 text-[#7A6E64] dark:text-[#9A9088] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                  {servingMultiplier}x
                </span>
                <button
                  onClick={() => setServingMultiplier(servingMultiplier + 1)}
                  className="p-1 text-[#7A6E64] dark:text-[#9A9088] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] transition cursor-pointer"
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
                className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold rounded-xl border border-[#2D2640]/10 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
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
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-white dark:bg-[#252220] text-[#7A6E64] dark:text-[#9A9088] rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-2xs"
                >
                  <Tag className="w-2.5 h-2.5 text-[#B8AFA4] dark:text-[#5A5450]" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients Checklist */}
          <div>
            <h3 className="text-[11px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{t('dishes.ingredientsSection')} ({localized.ingredients.length})</span>
            </h3>
            {localized.ingredients.length === 0 ? (
              <p className="text-xs text-[#B8AFA4] dark:text-[#5A5450] italic">
                {language === 'zh-CN' ? '暂无食材清单。' : 'No ingredients listed.'}
              </p>
            ) : (
              <div className="bg-white dark:bg-[#252220] rounded-xl p-3 border border-[#EDE8DF] dark:border-[#38332E] space-y-2 shadow-2xs">
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
                      className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg border-b border-[#F0EAE0] dark:border-[#38332E] last:border-0 cursor-pointer transition-colors ${
                        isChecked ? 'bg-[#FFF8E6]/40 dark:bg-[#2A1E00]/30 opacity-70' : 'hover:bg-[#FAF7F2] dark:hover:bg-[#1E1B18]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#FFD13B] border-[#2D2640]/20 text-[#2D2640]'
                            : 'border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220]'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`font-semibold text-[#2D2640] dark:text-[#F0EDE8] truncate ${isChecked ? 'line-through text-[#9A8A7E] dark:text-[#7A6E64]' : ''}`}>
                          {ing.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ing.amount !== null && (
                          <span className="font-bold text-[#2D2640] dark:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] border border-[#EDE8DF] dark:border-[#38332E] px-2 py-0.5 rounded-md text-[11px]">
                            {Math.round(ing.amount * servingMultiplier * 100) / 100} {ing.unit}
                          </span>
                        )}
                        <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] bg-[#FAF7F2] dark:bg-[#1E1B18] px-1.5 py-0.5 rounded-md font-medium border border-[#EDE8DF] dark:border-[#38332E]">
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
            <h3 className="text-[11px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider mb-2">
              {t('dishes.instructionsSection')}
            </h3>
            {localized.instructions ? (
              <div className="bg-white dark:bg-[#252220] p-4 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] text-xs font-normal leading-relaxed whitespace-pre-line text-[#2D2640] dark:text-[#F0EDE8] shadow-2xs">
                {localized.instructions}
              </div>
            ) : (
              <p className="text-xs text-[#B8AFA4] dark:text-[#5A5450] italic bg-white dark:bg-[#252220] p-3 rounded-xl border border-[#EDE8DF] dark:border-[#38332E]">
                {language === 'zh-CN' ? '暂未添加烹饪步骤。点击下方“编辑”即可补充！' : "No cooking instructions added yet. Tap 'Edit' to add the recipe steps."}
              </p>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 border-t border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220] flex items-center justify-between gap-2 pb-safe">
          <button
            onClick={() => {
              if (window.confirm(language === 'zh-CN' ? `确定要从菜谱库中删除 "${localized.name}" 吗？` : `Delete "${dish.name}" from recipe library?`)) {
                onDelete(dish.id);
                onClose();
              }
            }}
            className="p-2.5 text-[#B8AFA4] dark:text-[#5A5450] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
            title={language === 'zh-CN' ? '删除菜谱' : 'Delete Recipe'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(dish)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] bg-[#F5F0E8] dark:bg-[#2E2A26] text-xs font-bold text-[#2D2640] dark:text-[#D0C8C0] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] active:scale-95 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#9A8A7E] dark:text-[#7A6E64]" />
              <span>{language === 'zh-CN' ? '编辑' : 'Edit'}</span>
            </button>

            {selectAction ? (
              <button
                onClick={() => {
                  selectAction.onSelect(dish);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-[0.98] transition-all cursor-pointer ${
                  selectAction.isSelected
                    ? 'bg-[#FFD13B] text-[#2D2640] border border-[#2D2640]/10'
                    : 'bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] border border-[#2D2640]/10'
                }`}
              >
                {selectAction.isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{selectAction.label}</span>
              </button>
            ) : onQuickPlan ? (
              <button
                onClick={() => {
                  onQuickPlan(dish);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold border border-[#2D2640]/10 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>{language === 'zh-CN' ? '加入排餐' : 'Add to Schedule'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
