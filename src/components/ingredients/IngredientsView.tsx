import React, { useState, useRef } from 'react';
import type { MasterIngredient, GroceryCategory } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { Search, Edit3, Plus, Trash2, Save, AlertCircle, CheckCircle2, Home, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedMasterIngredient } from '../../services/dataLocalizationService';

interface IngredientsViewProps {
  familyName: string;
  ingredients: MasterIngredient[];
  pantryIngredients: string[];
  onSaveIngredients: (updated: MasterIngredient[]) => void;
  onUpdatePantryIngredients: (updatedPantry: string[]) => void;
}

const COMMON_UNITS = ['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'pcs', 'slices', 'can', 'packet', 'stalks', 'cloves', 'cup', 'pinch'];

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  ingredients,
  pantryIngredients,
  onSaveIngredients,
  onUpdatePantryIngredients
}) => {
  const { language, t, formatCategory } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showOnlyPantry, setShowOnlyPantry] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableList, setEditableList] = useState<MasterIngredient[]>(ingredients);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const activeList = isEditMode ? editableList : ingredients;

  // Toggle ingredient in pantry stock
  const handleTogglePantryItem = (ingName: string) => {
    const clean = ingName.trim();
    if (!clean) return;

    const exists = pantryIngredients.some((p) => p.toLowerCase() === clean.toLowerCase());
    let next: string[];
    if (exists) {
      next = pantryIngredients.filter((p) => p.toLowerCase() !== clean.toLowerCase());
      showToast(`Removed "${clean}" from Home Pantry.`);
    } else {
      next = [...pantryIngredients, clean];
      showToast(`🏡 Added "${clean}" to Home Pantry!`);
    }
    onUpdatePantryIngredients(next);
  };

  // Filter ingredients
  const filtered = activeList.filter((item) => {
    const loc = getLocalizedMasterIngredient(item, language);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || loc.name.toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const isItemInPantry = pantryIngredients.some((p) => p.toLowerCase() === item.name.toLowerCase().trim() || p.toLowerCase() === loc.name.toLowerCase().trim());
    const matchesPantry = !showOnlyPantry || isItemInPantry;
    return matchesSearch && matchesCat && matchesPantry;
  });

  const [visibleLimit, setVisibleLimit] = useState(40);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset pagination on search or category filter change
  React.useEffect(() => {
    setVisibleLimit(40);
  }, [searchQuery, selectedCategory, showOnlyPantry]);

  // Infinite scroll observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleLimit((prev) => prev + 40);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [filtered.length]);

  const handleEnterEditMode = () => {
    setEditableList(JSON.parse(JSON.stringify(ingredients)));
    setIsEditMode(true);
    setValidationError(null);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setEditableList(ingredients);
    setValidationError(null);
  };

  const handleAddNewRow = () => {
    const newId = `ing_custom_${Date.now()}`;
    const newIng: MasterIngredient = {
      id: newId,
      name: '',
      defaultValue: 100,
      defaultUnit: 'g',
      category: selectedCategory !== 'All' ? (selectedCategory as GroceryCategory) : 'Produce'
    };
    setEditableList([newIng, ...editableList]);
  };

  const handleDeleteRow = (id: string) => {
    setEditableList(editableList.filter((item) => item.id !== id));
  };

  const handleFieldChange = (
    id: string,
    field: keyof MasterIngredient,
    value: any
  ) => {
    setEditableList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: value
        };
      })
    );
    if (field === 'name' && value.trim()) {
      setValidationError(null);
    }
  };

  const handleSaveAll = () => {
    const emptyNames = editableList.filter((item) => !item.name || !item.name.trim());
    if (emptyNames.length > 0) {
      setValidationError(
        `⚠️ Please enter an ingredient name for all items before saving. ${emptyNames.length} item(s) are missing a name.`
      );
      return;
    }

    const trimmed = editableList.map((item) => ({
      ...item,
      name: item.name.trim(),
      defaultUnit: item.defaultUnit ? item.defaultUnit.trim() : ''
    }));

    onSaveIngredients(trimmed);
    setIsEditMode(false);
    setValidationError(null);
    showToast(`✅ Saved ${trimmed.length} master ingredients!`);
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-3.5 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#4CAF82] dark:text-[#2D6A4A]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* In My Pantry Overview & Live Benefit Card */}
      <div className="bg-white dark:bg-[#252220] rounded-2xl p-4 border border-[#EDE8DF] dark:border-[#38332E] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#F0EAE0] dark:border-[#38332E]">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-[#2D6A4A] dark:text-[#4CAF82]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {t('pantry.inMyPantryTitle', { count: pantryIngredients.length })}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyPantry(!showOnlyPantry)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer border ${
              showOnlyPantry
                ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-xs'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
            }`}
          >
            {showOnlyPantry ? t('pantry.showAllCatalog') : t('pantry.filterPantryOnly')}
          </button>
        </div>

        {/* Stocked Pantry Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {pantryIngredients.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC] dark:border-[#1D4A2A] text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs"
            >
              <span>🏡 {item}</span>
              <button
                type="button"
                onClick={() => handleTogglePantryItem(item)}
                className="w-4 h-4 rounded-full hover:bg-[#A8D8BC]/50 dark:hover:bg-[#1D4A2A] flex items-center justify-center text-[#2D6A4A] dark:text-[#4CAF82] cursor-pointer ml-0.5"
                title={`Remove ${item} from pantry`}
              >
                ×
              </button>
            </span>
          ))}
          {pantryIngredients.length === 0 && (
            <p className="text-xs text-[#B8AFA4] dark:text-[#5A5450] italic">{t('pantry.noPantryItems')}</p>
          )}
        </div>

        {/* Quick Stock Top Staples */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider block">
            {language === 'zh-CN' ? '⚡ 常用主食与调味品 (点击一键收录)' : '⚡ Quick Stock Top Staples (Tap to toggle)'}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {[
              { en: 'Cooking Oil', label: language === 'zh-CN' ? '食用油' : 'Cooking Oil', icon: '🛢️' },
              { en: 'Salt', label: language === 'zh-CN' ? '食盐' : 'Salt', icon: '🧂' },
              { en: 'Soy Sauce', label: language === 'zh-CN' ? '生抽' : 'Soy Sauce', icon: '🍶' },
              { en: 'Eggs', label: language === 'zh-CN' ? '鸡蛋' : 'Eggs', icon: '🥚' },
              { en: 'Rice', label: language === 'zh-CN' ? '大米' : 'Rice', icon: '🍚' },
              { en: 'Garlic', label: language === 'zh-CN' ? '大蒜' : 'Garlic', icon: '🧄' },
              { en: 'Black Pepper', label: language === 'zh-CN' ? '黑胡椒' : 'Black Pepper', icon: '🧂' },
              { en: 'Sugar', label: language === 'zh-CN' ? '白糖' : 'Sugar', icon: '🍬' },
              { en: 'Butter', label: language === 'zh-CN' ? '黄油' : 'Butter', icon: '🧈' },
              { en: 'Cornstarch', label: language === 'zh-CN' ? '玉米淀粉' : 'Cornstarch', icon: '🌽' }
            ].map((item) => {
              const isStocked = pantryIngredients.some((p) => 
                p.toLowerCase() === item.en.toLowerCase() || p.toLowerCase() === item.label.toLowerCase()
              );
              return (
                <button
                  key={item.en}
                  type="button"
                  onClick={() => handleTogglePantryItem(language === 'zh-CN' ? item.label : item.en)}
                  className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer border ${
                    isStocked
                      ? 'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border-[#A8D8BC] dark:border-[#1D4A2A] shadow-xs'
                      : 'bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#3D3530] dark:text-[#D0C8C0] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#F5F0E8] dark:hover:bg-[#2E2A26]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {isStocked && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Smart Substitution Engine Live Notice */}
        <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] text-[11px] text-[#7A6E64] dark:text-[#9A9088] flex items-start gap-2">
          <span className="text-sm">✨</span>
          <p className="leading-snug">
            <strong className="text-[#2D2640] dark:text-[#F0EDE8]">{t('pantry.smartSubNoticeTitle')}</strong> {t('pantry.smartSubNoticeDesc')}
          </p>
        </div>
      </div>

      {/* Search Bar - Positioned above Ingredients Catalog for quick searching to flag/unflag */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9A8A7E] dark:text-[#7A6E64] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'zh-CN' ? '搜索食材总库以添加/移除常备...' : 'Search ingredient catalog to toggle in pantry...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-9 pr-8 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] rounded-xl text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9A8A7E] dark:text-[#7A6E64] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-[#FFD13B] text-[#2D2640] shadow-xs'
              : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
          }`}
        >
          {formatCategory('All')} ({activeList.length})
        </button>

        {GROCERY_CATEGORIES.map((cat) => {
          const count = activeList.filter((i) => i.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#FFD13B] text-[#2D2640] shadow-xs'
                  : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
              }`}
            >
              {formatCategory(cat)} ({count})
            </button>
          );
        })}
      </div>

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Action Header & Mode Toggle */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
          {t('pantry.libraryCount', { count: filtered.length })}
        </span>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={handleAddNewRow}
                className="flex items-center gap-1 text-xs font-semibold text-[#2D2640] dark:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] px-2.5 py-1 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('pantry.addItem')}</span>
              </button>

              <button
                onClick={handleCancelEditMode}
                className="text-xs font-semibold text-[#7A6E64] dark:text-[#9A9088] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] px-2 py-1 transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={handleSaveAll}
                className="flex items-center gap-1 text-xs font-extrabold bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] border border-[#2D2640]/10 px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleEnterEditMode}
              className="flex items-center gap-1.5 text-xs font-bold text-[#2D2640] dark:text-[#D0C8C0] bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#F7F4EF] dark:hover:bg-[#2E2A26] px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#7A6E64] dark:text-[#9A9088]" />
              <span>{t('common.editMode')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Master Ingredients Cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#252220] rounded-2xl p-8 text-center border border-dashed border-[#EDE8DF] dark:border-[#38332E] text-xs text-[#9A8A7E] dark:text-[#7A6E64] shadow-sm">
            {showOnlyPantry
              ? 'No pantry items found matching this filter.'
              : 'No ingredients found matching your search.'}
          </div>
        ) : (
          filtered.slice(0, visibleLimit).map((item) => {
            const originalIndex = activeList.findIndex((i) => i.id === item.id);
            const isNameEmpty = !item.name || !item.name.trim();
            const isInPantry = pantryIngredients.some(
              (p) => p.toLowerCase() === item.name.toLowerCase().trim()
            );

            return (
              <div
                key={item.id || originalIndex}
                className={`rounded-xl p-3 border transition-all shadow-2xs ${
                  isNameEmpty && isEditMode
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                    : isInPantry
                    ? 'bg-[#E8F5ED]/40 dark:bg-[#0D2E1A]/40 border-[#A8D8BC] dark:border-[#1D4A2A]'
                    : 'bg-white dark:bg-[#252220] border-[#EDE8DF] dark:border-[#38332E] hover:border-[#B8AFA4] dark:hover:border-[#5A5450]'
                }`}
              >
                {isEditMode ? (
                  /* Edit Row Form */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ingredient Name *"
                        value={item.name}
                        onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                        className={`flex-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border focus:outline-hidden ${
                          isNameEmpty
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                            : 'bg-[#FAF7F2] dark:bg-[#1E1B18] border-[#E8E0D5] dark:border-[#38332E] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:border-[#2D2640] dark:focus:border-[#F0EDE8]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(item.id)}
                        className="p-1.5 text-[#9A8A7E] dark:text-[#7A6E64] hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase mb-0.5">
                          Default Qty
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.defaultValue !== null ? item.defaultValue : ''}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'defaultValue',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] focus:outline-hidden focus:border-[#2D2640] dark:focus:border-[#F0EDE8] text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase mb-0.5">
                          Default Unit
                        </label>
                        <select
                          value={item.defaultUnit}
                          onChange={(e) => handleFieldChange(item.id, 'defaultUnit', e.target.value)}
                          className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] focus:outline-hidden focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase mb-0.5">
                          Category
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                          className="w-full text-xs font-medium px-1.5 py-1 rounded-lg border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] focus:outline-hidden focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
                        >
                          {GROCERY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Read Only Row */
                  (() => {
                    const loc = getLocalizedMasterIngredient(item, language);
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePantryItem(item.name)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                              isInPantry
                                ? 'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border-[#A8D8BC] dark:border-[#1D4A2A] shadow-2xs'
                                : 'bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#9A8A7E] dark:text-[#7A6E64] border-[#EDE8DF] dark:border-[#38332E] hover:text-[#2D6A4A] dark:hover:text-[#4CAF82] hover:border-[#A8D8BC] dark:hover:border-[#1D4A2A]'
                            }`}
                            title={isInPantry ? 'In Pantry (Click to remove)' : 'Click to add to Home Pantry'}
                          >
                            <Home className="w-3.5 h-3.5" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate block">{loc.name}</span>
                              {loc.isUntranslated && (
                                <span className="text-[9px] font-semibold text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 px-1 py-0.5 rounded shrink-0">
                                  {language === 'zh-CN' ? '英文' : 'Chinese'}
                                </span>
                              )}
                            </div>
                            {isInPantry && (
                              <span className="text-[10px] text-[#2D6A4A] dark:text-[#4CAF82] font-semibold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                {language === 'zh-CN' ? '常备食材 (清单自动半选标记)' : 'In Home Pantry (Auto half-marks on grocery list)'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.defaultValue !== null && (
                            <span className="text-xs font-bold text-[#3D3530] dark:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] border border-[#EDE8DF] dark:border-[#38332E] px-2 py-0.5 rounded-md">
                              {item.defaultValue} {item.defaultUnit}
                            </span>
                          )}
                          <span className="text-[10px] text-[#7A6E64] dark:text-[#9A9088] bg-[#FAF7F2] dark:bg-[#1E1B18] px-2 py-0.5 rounded-md font-medium border border-[#EDE8DF] dark:border-[#38332E]">
                            {formatCategory(item.category)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })
        )}

        {/* Progressive Loading Sentinel / Show More Trigger */}
        {filtered.length > visibleLimit && (
          <div ref={loadMoreRef} className="py-4 text-center">
            <button
              onClick={() => setVisibleLimit((prev) => prev + 40)}
              className="px-5 py-2 rounded-xl bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] text-xs font-bold text-[#2D2640] dark:text-[#D0C8C0] hover:bg-[#F7F4EF] dark:hover:bg-[#2E2A26] transition shadow-2xs cursor-pointer"
            >
              Showing {Math.min(visibleLimit, filtered.length)} of {filtered.length.toLocaleString()} ingredients • Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
