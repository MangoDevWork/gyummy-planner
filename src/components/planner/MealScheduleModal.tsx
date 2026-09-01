import React, { useState, useMemo } from 'react';
import type { Dish, MealScheduleEntry, MemberPreferences, FamilyPersonalisation, UserProfile } from '../../types';
import { X, Search, Plus, Trash2, Utensils, Check, BookOpen, Heart, Eye } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish, searchMatchesLocalizedDish } from '../../services/dataLocalizationService';
import { DishDetailModal } from '../dishes/DishDetailModal';
import { checkDishAllergenRisk } from '../../services/personalisationService';

// Clean, high-impact taste & style filter chips
const TASTE_FILTERS = [
  { id: 'under_20m', label: '⚡ <20m Quick', labelZh: '⚡ <20m 快手菜', type: 'time', maxTime: 20 },
  { id: 'chicken', label: '🍗 Chicken', labelZh: '🍗 鸡肉', type: 'keyword', keyword: 'chicken' },
  { id: 'beef_pork', label: '🥩 Beef / Pork', labelZh: '🥩 牛/猪肉', type: 'keyword', keyword: 'beef pork' },
  { id: 'seafood', label: '🐟 Seafood', labelZh: '🐟 海鲜', type: 'keyword', keyword: 'fish salmon shrimp prawn seafood' },
  { id: 'veggie', label: '🥦 Veggie', labelZh: '🥦 素食/蔬菜', type: 'keyword', keyword: 'tofu vegetable broccoli mushroom vegetarian' },
  { id: 'noodles_rice', label: '🍜 Noodles/Rice', labelZh: '🍜 饭面主食', type: 'keyword', keyword: 'rice noodle pasta udon ramen' }
];

function matchesQuickFilter(dish: Dish, filterId: string): boolean {
  const filter = TASTE_FILTERS.find((f) => f.id === filterId);
  if (!filter) return true;

  if (filter.type === 'time' && filter.maxTime) {
    const time = dish.prepTimeMinutes || 20;
    return time <= filter.maxTime;
  }

  if (filter.type === 'keyword' && filter.keyword) {
    const kwList = filter.keyword.toLowerCase().split(' ');
    const check = (str?: string) => {
      if (!str) return false;
      const lower = str.toLowerCase();
      return kwList.some((kw) => lower.includes(kw));
    };

    if (check(dish.name)) return true;
    if (check(dish.cuisine)) return true;
    if (check(dish.category)) return true;
    if (dish.ingredients.some((ing) => check(ing.name))) return true;
    if (Array.isArray(dish.tags) && dish.tags.some((t) => check(t))) return true;
    return false;
  }

  return true;
}

interface MealScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  scheduleId: string;
  scheduleName: string;
  currentProfile?: UserProfile | null;
  familyMembers?: string[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
  currentEntry?: MealScheduleEntry;
  dishes: Dish[];
  onSaveEntry: (date: string, scheduleId: string, entry: MealScheduleEntry | null) => void;
  onCreateNewDish: () => void;
  onToggleFamilyRecipe?: (dishId: string) => void;
  onToggleFavoriteDish?: (dishId: string) => void;
}

export const MealScheduleModal: React.FC<MealScheduleModalProps> = ({
  isOpen,
  onClose,
  date,
  scheduleId,
  scheduleName,
  currentProfile,
  familyMembers = [],
  memberProfiles,
  familyPersonalisation,
  currentEntry,
  dishes,
  onSaveEntry,
  onCreateNewDish,
  onToggleFamilyRecipe,
  onToggleFavoriteDish
}) => {
  const { language, t, formatCategory, formatScheduleName, formatDate } = useLanguage();

  const initialSelectedIds = useMemo(() => {
    if (currentEntry?.dishIds && currentEntry.dishIds.length > 0) return currentEntry.dishIds;
    if (currentEntry?.dishId) return [currentEntry.dishId];
    return [];
  }, [currentEntry]);

  const [selectedDishIds, setSelectedDishIds] = useState<string[]>(initialSelectedIds);
  const [activeTab, setActiveTab] = useState<'family' | 'system' | 'custom'>('family');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTasteFilter, setSelectedTasteFilter] = useState<string | null>(null);
  const [isFamilySafeOnly, setIsFamilySafeOnly] = useState<boolean>(familyPersonalisation?.strictAllergyFilter !== false);
  const [customText, setCustomText] = useState(currentEntry?.customText || '');
  const servingsMultiplier = currentEntry?.servingsMultiplier || 1;
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // Recipe Detail Inspection Modal State
  const [previewingDish, setPreviewingDish] = useState<Dish | null>(null);

  const formattedDate = formatDate(date);

  // Split dishes into Family Cookbook vs System Library
  const familyDishes = useMemo(() => {
    return dishes.filter((d) => d.isFamilyRecipe !== false);
  }, [dishes]);

  const systemDishes = dishes;

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    const list = activeTab === 'family' ? familyDishes : systemDishes;
    return list.filter((dish) => {
      // Family Safe Exclusions
      if (isFamilySafeOnly) {
        const risk = checkDishAllergenRisk(dish, memberProfiles, familyMembers);
        if (risk.hasRisk) return false;
      }

      const matchesSearch = searchMatchesLocalizedDish(dish, searchQuery, language);
      const matchesFav = !showOnlyFavorites || Boolean(dish.favoritedByMembers && dish.favoritedByMembers.length > 0);
      const matchesCat = selectedCategory === 'All' || dish.category === selectedCategory;
      const matchesTaste = !selectedTasteFilter || matchesQuickFilter(dish, selectedTasteFilter);
      return matchesSearch && matchesFav && matchesCat && matchesTaste;
    });
  }, [activeTab, familyDishes, systemDishes, isFamilySafeOnly, memberProfiles, familyMembers, searchQuery, showOnlyFavorites, selectedCategory, selectedTasteFilter, language]);

  const handleToggleDish = (dish: Dish) => {
    // If selecting a system dish that is not yet in family cookbook, add it to family cookbook
    if (dish.isFamilyRecipe === false && onToggleFamilyRecipe) {
      onToggleFamilyRecipe(dish.id);
    }

    setSelectedDishIds((prev) => {
      if (prev.includes(dish.id)) {
        return prev.filter((id) => id !== dish.id);
      } else {
        return [...prev, dish.id];
      }
    });
  };

  const handleSaveAll = () => {
    if (selectedDishIds.length === 0) {
      if (customText.trim()) {
        onSaveEntry(date, scheduleId, {
          customText: customText.trim(),
          servingsMultiplier
        });
      } else {
        onSaveEntry(date, scheduleId, null);
      }
    } else {
      onSaveEntry(date, scheduleId, {
        dishId: selectedDishIds[0],
        dishIds: selectedDishIds,
        customText: customText.trim() || undefined,
        servingsMultiplier
      });
    }
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() && selectedDishIds.length === 0) return;
    handleSaveAll();
  };

  const handleClearSchedule = () => {
    onSaveEntry(date, scheduleId, null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[#F7F4EF] dark:bg-[#1A1714] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-[#EDE8DF] dark:border-[#38332E] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-2xl">🍲</span>
            <div>
              <h2 className="text-sm font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                {t('planner.planScheduleTitle', { name: formatScheduleName(scheduleName) })}
              </h2>
              <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64] font-medium">{formattedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#7A6E64] dark:text-[#9A9088] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Way Tab Switcher: Family Cookbook vs Recipe Library vs Quick Note */}
        <div className="p-2 border-b border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220] grid grid-cols-3 gap-1">
          <button
            onClick={() => {
              setActiveTab('family');
              setVisibleLimit(30);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'family'
                ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="truncate">{t('planner.cookbookTab', { count: familyDishes.length })}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('system');
              setVisibleLimit(30);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">{t('planner.libraryTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
            }`}
          >
            <span>{t('planner.quickNoteTab')}</span>
          </button>
        </div>

        {/* Body Content */}
        {activeTab === 'family' || activeTab === 'system' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 bg-[#F7F4EF] dark:bg-[#1A1714]">
            {/* Selected Recipes Tray Banner if multiple recipes chosen */}
            {selectedDishIds.length > 0 && (
              <div className="bg-white dark:bg-[#252220] p-2.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-1.5 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6E64] dark:text-[#9A9088] flex items-center gap-1">
                    <span>✨ Selected for this Meal ({selectedDishIds.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDishIds([])}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                  {selectedDishIds.map((dId) => {
                    const d = dishes.find((item) => item.id === dId);
                    if (!d) return null;
                    return (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#F0EDE8] text-xs font-bold px-2.5 py-1 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-2xs"
                      >
                        <span>{d.imageEmoji || '🍲'} {d.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDishIds((prev) => prev.filter((id) => id !== d.id))}
                          className="w-4 h-4 rounded-full hover:bg-[#E8E0D5] dark:hover:bg-[#38332E] flex items-center justify-center text-[#9A8A7E] dark:text-[#7A6E64] cursor-pointer ml-0.5"
                          title="Remove recipe"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Simplified Single-Row Search & Filters */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#B8AFA4] dark:text-[#5A5450] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'family'
                        ? (language === 'zh-CN' ? '搜索家庭常备菜谱...' : 'Search your family recipes...')
                        : (language === 'zh-CN' ? '搜索菜谱库...' : 'Search recipe library...')
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleLimit(30);
                    }}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] rounded-xl border border-[#E8E0D5] dark:border-[#38332E] focus:outline-hidden focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#B8AFA4] dark:text-[#5A5450] hover:text-[#3D3530] dark:hover:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setVisibleLimit(30);
                  }}
                  aria-label="Filter by meal category"
                  className="shrink-0 text-xs font-bold px-2.5 py-1.5 bg-white dark:bg-[#252220] text-[#3D3530] dark:text-[#D0C8C0] rounded-xl border border-[#EDE8DF] dark:border-[#38332E] focus:outline-hidden cursor-pointer shadow-2xs"
                >
                  <option value="All">{language === 'zh-CN' ? '全部' : 'All'}</option>
                  <option value="Dinner">{language === 'zh-CN' ? '晚餐' : 'Dinner'}</option>
                  <option value="Lunch">{language === 'zh-CN' ? '午餐' : 'Lunch'}</option>
                  <option value="Breakfast">{language === 'zh-CN' ? '早餐' : 'Breakfast'}</option>
                  <option value="Side Dish">{language === 'zh-CN' ? '配菜' : 'Side'}</option>
                  <option value="Soup">{language === 'zh-CN' ? '汤品' : 'Soup'}</option>
                  <option value="Dessert">{language === 'zh-CN' ? '甜品' : 'Dessert'}</option>
                  <option value="Snack">{language === 'zh-CN' ? '小吃' : 'Snack'}</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className={`shrink-0 flex items-center justify-center p-2 rounded-xl transition cursor-pointer border shadow-2xs ${
                    showOnlyFavorites
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900 shadow-xs'
                      : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                  }`}
                  title={language === 'zh-CN' ? '仅显示收藏' : 'Filter favorites'}
                >
                  <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-rose-700 text-rose-700 dark:fill-rose-400 dark:text-rose-400' : 'text-[#7A6E64] dark:text-[#9A9088]'}`} />
                </button>
                
                {activeTab === 'family' && (
                  <button
                    onClick={() => {
                      onClose();
                      onCreateNewDish();
                    }}
                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#2D2640] dark:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] border border-[#EDE8DF] dark:border-[#38332E] px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                    title="Create a new recipe"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'zh-CN' ? '新建' : 'New'}</span>
                  </button>
                )}
              </div>

              {/* Minimal Taste Chips Bar */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                {/* Family Safe Toggle Chip */}
                <button
                  type="button"
                  onClick={() => setIsFamilySafeOnly(!isFamilySafeOnly)}
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg transition cursor-pointer border whitespace-nowrap shadow-2xs flex items-center gap-1 ${
                    isFamilySafeOnly
                      ? 'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border-[#A8D8BC] dark:border-[#1D4A2A] shadow-xs'
                      : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                  }`}
                  title={language === 'zh-CN' ? '自动屏蔽全家过敏食材' : 'Hide dishes with family allergens'}
                >
                  <span>🛡️</span>
                  <span>{language === 'zh-CN' ? '安全' : 'Safe'}</span>
                </button>

                {TASTE_FILTERS.map((chip) => {
                  const isSelected = selectedTasteFilter === chip.id;
                  const label = language === 'zh-CN' ? chip.labelZh : chip.label;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setSelectedTasteFilter(isSelected ? null : chip.id);
                        setVisibleLimit(30);
                      }}
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg transition cursor-pointer border whitespace-nowrap shadow-2xs ${
                        isSelected
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                          : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dishes list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {filteredDishes.length === 0 ? (
                <div className="text-center py-8 text-[#B8AFA4] dark:text-[#5A5450] space-y-3 bg-white dark:bg-[#252220] rounded-2xl border border-dashed border-[#EDE8DF] dark:border-[#38332E] p-6">
                  <Utensils className="w-8 h-8 mx-auto opacity-40 text-[#B8AFA4] dark:text-[#5A5450]" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#3D3530] dark:text-[#D0C8C0]">
                      {activeTab === 'family'
                        ? (language === 'zh-CN' ? '家庭常备中暂无菜谱' : 'No recipes in Family Cookbook yet.')
                        : (language === 'zh-CN' ? '未找到相关菜谱' : 'No matching recipes found.')}
                    </p>
                    <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                      {activeTab === 'family'
                        ? (language === 'zh-CN' ? '从菜谱库中添加喜欢的菜肴开始排餐吧！' : 'Add dishes from the Recipe Library to start planning!')
                        : (language === 'zh-CN' ? '尝试搜索其他关键词或清除筛选' : 'Try adjusting your filters.')}
                    </p>
                  </div>
                  {activeTab === 'family' && (
                    <button
                      onClick={() => {
                        setActiveTab('system');
                        setVisibleLimit(30);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D2640] bg-[#FFD13B] hover:bg-[#FFC200] border border-[#2D2640]/10 px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{language === 'zh-CN' ? '浏览菜谱库' : 'Browse Recipe Library'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filteredDishes.slice(0, visibleLimit).map((dish) => {
                    const isSelected = selectedDishIds.includes(dish.id);
                    const localized = getLocalizedDish(dish, language);

                    return (
                      <div
                        key={dish.id}
                        onClick={() => setPreviewingDish(dish)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] group ${
                          isSelected
                            ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/30 shadow-sm'
                            : 'border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B]/50 bg-white dark:bg-[#252220] shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {dish.imageUrl ? (
                            <img
                              src={dish.imageUrl}
                              alt={localized.name}
                              className="w-11 h-11 rounded-lg object-cover border border-[#EDE8DF] dark:border-[#38332E] shrink-0"
                            />
                          ) : (
                            <span className="text-2xl p-1 bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-lg shrink-0">
                              {dish.imageEmoji || '🍲'}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#7A6E64] dark:text-[#9A9088] bg-[#F5F0E8] dark:bg-[#2E2A26] px-1.5 py-0.2 rounded-md">
                                {formatCategory(dish.category)}
                              </span>
                              {dish.timesPlanned && dish.timesPlanned > 0 ? (
                                <span className="text-[9px] font-bold text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 px-1.5 py-0.2 rounded-md">
                                  🔥 {dish.timesPlanned}x
                                </span>
                              ) : null}
                              {(() => {
                                const risk = checkDishAllergenRisk(dish, memberProfiles, familyMembers);
                                if (risk.hasRisk) {
                                  return (
                                    <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded-md">
                                      ⚠️ {risk.affectedMembers.map((m) => m.memberName).join(', ')}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {localized.fallbackTag && (
                                <span className="text-[9px] font-semibold text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 px-1.5 py-0.2 rounded-md">
                                  {localized.fallbackTag}
                                </span>
                              )}
                              <span className="text-[9px] font-medium text-[#9A8A7E] dark:text-[#7A6E64] bg-[#F5F0E8] dark:bg-[#2E2A26] px-1.5 py-0.2 rounded-md">
                                ⏱ {dish.prepTimeMinutes || 20}m
                              </span>
                              <span className="text-[9px] font-medium text-[#9A8A7E] dark:text-[#7A6E64] bg-[#F5F0E8] dark:bg-[#2E2A26] px-1.5 py-0.2 rounded-md">
                                👤 {dish.servings || 4} serv
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate group-hover:text-[#3D3530] dark:group-hover:text-[#D0C8C0]">{localized.name}</h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          {/* Quick details preview button icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewingDish(dish);
                            }}
                            className="p-1.5 text-[#9A8A7E] dark:text-[#7A6E64] hover:text-[#3D3530] dark:hover:text-[#D0C8C0] hover:bg-[#F5F0E8] dark:hover:bg-[#2E2A26] rounded-lg transition"
                            title="View recipe details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDish(dish);
                            }}
                            className={`flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'bg-[#FFD13B] text-[#2D2640] border border-[#2D2640]/10'
                                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{language === 'zh-CN' ? '已选' : 'Added'}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>{language === 'zh-CN' ? '选择' : 'Add'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more button if large search */}
                  {filteredDishes.length > visibleLimit && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => setVisibleLimit((prev) => prev + 30)}
                        className="px-4 py-1.5 text-xs font-bold text-[#3D3530] dark:text-[#D0C8C0] bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#F7F4EF] dark:hover:bg-[#2E2A26] transition cursor-pointer shadow-2xs"
                      >
                        Showing {visibleLimit} of {filteredDishes.length} • Load More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Quick Custom Note */
          <form onSubmit={handleSaveCustom} className="p-5 space-y-4 bg-[#F7F4EF] dark:bg-[#1A1714]">
            <div>
              <label className="block text-[11px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider mb-1.5">
                Quick Meal Note
              </label>
              <input
                type="text"
                placeholder="e.g. Leftovers, Takeout Thai, Pizza Night"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                autoFocus
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-hidden focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-2xs"
              />
              <p className="text-[11px] text-[#B8AFA4] dark:text-[#5A5450] mt-1">
                Note: Custom notes won't auto-generate grocery ingredients unless assigned to a recipe.
              </p>
            </div>

            <button
              type="submit"
              disabled={!customText.trim() && selectedDishIds.length === 0}
              className="w-full py-3 rounded-xl bg-[#FFD13B] hover:bg-[#FFC200] disabled:opacity-50 text-[#2D2640] font-extrabold border border-[#2D2640]/10 shadow-xs active:scale-95 transition cursor-pointer"
            >
              Save Meal Note
            </button>
          </form>
        )}

        {/* Footer with Save Plan CTA and Clear Schedule */}
        <div className="p-3 border-t border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220] flex items-center justify-between gap-2 pb-safe">
          {(currentEntry?.dishId || (currentEntry?.dishIds && currentEntry.dishIds.length > 0) || currentEntry?.customText) ? (
            <button
              type="button"
              onClick={handleClearSchedule}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className="flex-1 py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {selectedDishIds.length === 0
                ? 'Save Entry'
                : `Save Plan (${selectedDishIds.length} Recipe${selectedDishIds.length === 1 ? '' : 's'})`}
            </span>
          </button>
        </div>
      </div>

      {/* Recipe Detail Inspection Modal inside Planning Window */}
      {previewingDish && (
        <DishDetailModal
          isOpen={Boolean(previewingDish)}
          dish={previewingDish}
          currentProfile={currentProfile || null}
          familyMembers={familyMembers}
          memberProfiles={memberProfiles}
          onClose={() => setPreviewingDish(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleFavorite={(dishId) => {
            if (onToggleFavoriteDish) onToggleFavoriteDish(dishId);
          }}
          onToggleFamilyCookbook={(dish) => {
            if (onToggleFamilyRecipe) onToggleFamilyRecipe(dish.id);
          }}
          selectAction={{
            label: selectedDishIds.includes(previewingDish.id)
              ? (language === 'zh-CN' ? '已选入排餐 (点击移除)' : 'In Meal (Tap to remove)')
              : (language === 'zh-CN' ? '选入排餐' : 'Add to Schedule'),
            isSelected: selectedDishIds.includes(previewingDish.id),
            onSelect: (dish) => {
              handleToggleDish(dish);
            }
          }}
        />
      )}
    </div>
  );
};
