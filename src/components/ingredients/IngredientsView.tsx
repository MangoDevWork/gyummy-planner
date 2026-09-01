import React, { useState, useRef } from 'react';
import type { MasterIngredient, GroceryCategory } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { Search, Edit3, Plus, Trash2, CheckCircle2, Home } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedMasterIngredient } from '../../services/dataLocalizationService';

interface IngredientsViewProps {
  familyName: string;
  ingredients: MasterIngredient[];
  pantryIngredients: string[];
  onSaveIngredients: (updated: MasterIngredient[]) => void;
  onUpdatePantryIngredients: (updatedPantry: string[]) => void;
}

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  ingredients,
  pantryIngredients,
  onSaveIngredients,
  onUpdatePantryIngredients
}) => {
  const { language, t, formatCategory } = useLanguage();
  // Default to showing stocked pantry items first per user request!
  const [viewScope, setViewScope] = useState<'pantry' | 'all'>('pantry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableList, setEditableList] = useState<MasterIngredient[]>(ingredients);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [quickAddName, setQuickAddName] = useState('');

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
      showToast(language === 'zh-CN' ? `已从储藏室移出 "${clean}"` : `Removed "${clean}" from Pantry.`);
    } else {
      next = [...pantryIngredients, clean];
      showToast(language === 'zh-CN' ? `🏡 已将 "${clean}" 加入储藏室库存！` : `🏡 Added "${clean}" to Home Pantry!`);
    }
    onUpdatePantryIngredients(next);
  };

  // Quick add custom item
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickAddName.trim();
    if (!clean) return;

    handleTogglePantryItem(clean);
    setQuickAddName('');
  };

  // Filter ingredients based on viewScope (pantry vs all)
  const filtered = activeList.filter((item) => {
    const loc = getLocalizedMasterIngredient(item, language);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || loc.name.toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const isItemInPantry = pantryIngredients.some((p) => p.toLowerCase() === item.name.toLowerCase().trim() || p.toLowerCase() === loc.name.toLowerCase().trim());
    
    // When in 'pantry' viewScope, only show in-pantry items
    if (viewScope === 'pantry' && !isItemInPantry) return false;

    return matchesSearch && matchesCat;
  });

  // Group filtered items by category
  const groupedItems = React.useMemo(() => {
    const map = new Map<string, MasterIngredient[]>();
    filtered.forEach((item) => {
      const cat = item.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items
    }));
  }, [filtered]);

  const [visibleLimit, setVisibleLimit] = useState(40);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset pagination on search or category filter change
  React.useEffect(() => {
    setVisibleLimit(40);
  }, [searchQuery, selectedCategory, viewScope]);

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

  const handleSaveEditList = () => {
    const hasEmptyName = editableList.some((item) => !item.name.trim());
    if (hasEmptyName) {
      setValidationError('All ingredients must have a valid name.');
      return;
    }

    onSaveIngredients(editableList);
    setIsEditMode(false);
    showToast('✅ Saved pantry master database!');
  };

  const stockedCount = pantryIngredients.length;
  const totalMasterCount = ingredients.length;

  return (
    <div className="relative">
      <div className="px-4 pb-32 pt-4 max-w-md mx-auto">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1E1B2E] dark:bg-[#F5F2EB] text-white dark:text-[#1E1B2E] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#1E1B2E]" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* View Scope Switcher: In My Pantry vs Browse All */}
        <div className="mb-3 flex rounded-full border border-[#EDE8DF] bg-white p-1 dark:border-[#3D362E] dark:bg-[#2A2520] shadow-2xs">
          <button
            type="button"
            onClick={() => setViewScope('pantry')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] font-bold transition-all cursor-pointer ${
              viewScope === 'pantry'
                ? 'bg-[#FFD13B] text-[#1E1B2E] shadow-xs'
                : 'text-[#786F66] hover:text-[#1E1B2E] dark:text-[#A39C90] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{language === 'zh-CN' ? `家中库存 (${stockedCount})` : `In My Pantry (${stockedCount})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewScope('all')}
            className={`flex-1 rounded-full py-2 text-[12.5px] font-bold transition-all cursor-pointer ${
              viewScope === 'all'
                ? 'bg-[#FFD13B] text-[#1E1B2E] shadow-xs'
                : 'text-[#786F66] hover:text-[#1E1B2E] dark:text-[#A39C90] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <span>{language === 'zh-CN' ? `6,000+ 食材库` : `Browse 6,000+ Items`}</span>
          </button>
        </div>

        {/* Summary Card */}
        <div className="mb-3 rounded-2xl border border-[#EDE8DF] bg-white px-4 py-3 shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A89F95]">
                {language === 'zh-CN' ? '储藏室状态' : 'Pantry Status'}
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                {stockedCount} {language === 'zh-CN' ? '种食材在库' : `of ${totalMasterCount} ingredients stocked`}
              </p>
            </div>
            {!isEditMode && (
              <button
                type="button"
                onClick={handleEnterEditMode}
                className="inline-flex items-center gap-1 rounded-lg bg-[#FAF8F5] dark:bg-[#221E1A] border border-[#EDE8DF] dark:border-[#3D362E] px-2.5 py-1 text-[11px] font-semibold text-[#1E1B2E] dark:text-[#F5F2EB] transition cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{language === 'zh-CN' ? '管理库' : 'Edit DB'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89F95]" />
          <input
            type="text"
            placeholder={
              viewScope === 'pantry'
                ? (language === 'zh-CN' ? '在已有库存中搜索...' : 'Search your in-stock pantry...')
                : (language === 'zh-CN' ? '搜索 6,000+ 种食材...' : 'Search all 6,000+ ingredients...')
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-[13px] text-[#1E1B2E] placeholder:text-[#A89F95] focus:border-[#FFD13B] focus:outline-none dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB] shadow-2xs"
          />
        </div>

        {/* Categories Chip Row */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['All', ...GROCERY_CATEGORIES].map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all cursor-pointer ${
                  isSel
                    ? 'bg-[#FFD13B] text-[#1E1B2E] font-bold shadow-2xs'
                    : 'border border-[#EDE8DF] bg-white text-[#786F66] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90]'
                }`}
              >
                {cat === 'All' ? (language === 'zh-CN' ? '全部品类' : 'All Categories') : formatCategory(cat as any)}
              </button>
            );
          })}
        </div>

        {/* Edit Mode Toolbar */}
        {isEditMode && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                {language === 'zh-CN' ? '食材主数据库编辑模式' : 'Master Database Edit Mode'}
              </span>
              <button
                type="button"
                onClick={handleAddNewRow}
                className="inline-flex items-center gap-1 rounded-lg bg-[#FFD13B] px-2.5 py-1 text-[11px] font-semibold text-[#1E1B2E] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{language === 'zh-CN' ? '添加条目' : 'New Item'}</span>
              </button>
            </div>
            {validationError && (
              <p className="text-[11px] text-rose-600 font-semibold">{validationError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelEditMode}
                className="flex-1 py-1.5 rounded-xl border border-[#EDE8DF] bg-white text-xs font-semibold text-[#786F66] cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEditList}
                className="flex-1 py-1.5 rounded-xl bg-[#FFD13B] border border-[#1E1B2E]/10 text-xs font-bold text-[#1E1B2E] cursor-pointer shadow-xs"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        )}

        {/* Groups */}
        <div className="space-y-4">
          {groupedItems.map((group) => {
            const visibleItems = group.items.slice(0, visibleLimit);
            if (visibleItems.length === 0) return null;

            return (
              <section key={group.category}>
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#786F66] dark:text-[#A39C90]">
                  {formatCategory(group.category as any)} ({group.items.length})
                </h2>
                <div className="overflow-hidden rounded-2xl border border-[#EDE8DF] bg-white shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520]">
                  {visibleItems.map((item, idx) => {
                    const loc = getLocalizedMasterIngredient(item, language);
                    const isInPantry = pantryIngredients.some(
                      (p) => p.toLowerCase() === item.name.toLowerCase().trim() || p.toLowerCase() === loc.name.toLowerCase().trim()
                    );

                    if (isEditMode) {
                      return (
                        <div
                          key={item.id}
                          className={`p-3 flex items-center gap-2 ${
                            idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3D362E]' : ''
                          }`}
                        >
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                            placeholder="Name"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-xs text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                            className="px-2 py-1.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-xs text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
                          >
                            {GROCERY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{formatCategory(c)}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTogglePantryItem(item.name)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer ${
                          idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3D362E]' : ''
                        } ${isInPantry ? 'bg-[#E8F5ED]/70 dark:bg-[#1E2E24]/60' : 'hover:bg-[#FAF8F5] dark:hover:bg-[#221E1A]'}`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p
                            className={`text-[13.5px] font-semibold ${
                              isInPantry ? 'text-[#2D6A4A] dark:text-[#5ECB8D]' : 'text-[#1E1B2E] dark:text-[#F5F2EB]'
                            }`}
                          >
                            {loc.name}
                          </p>
                          {loc.name !== item.name && (
                            <p className="text-[11px] text-[#786F66] dark:text-[#A39C90] truncate">{item.name}</p>
                          )}
                        </div>

                        {/* Home Icon Indicator per user request */}
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                            isInPantry
                              ? 'bg-[#2D6A4A] text-white shadow-2xs'
                              : 'bg-[#FAF8F5] text-[#A89F95] border border-[#EDE8DF] dark:bg-[#221E1A] dark:border-[#3D362E]'
                          }`}
                          title={isInPantry ? 'In stock at home' : 'Click to add to pantry'}
                        >
                          <Home className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-[#786F66] dark:text-[#A39C90] space-y-3 bg-white dark:bg-[#2A2520] rounded-2xl border border-dashed border-[#EDE8DF] dark:border-[#3D362E] p-6">
              <Home className="w-8 h-8 mx-auto text-[#A89F95] opacity-50" />
              <p className="font-medium">
                {viewScope === 'pantry'
                  ? (language === 'zh-CN' ? '储藏室暂无该分类食材。切换到上方“6,000+ 食材库”即可随时添加！' : 'No items in this category in your pantry. Switch to "Browse 6,000+ Items" to add them!')
                  : (language === 'zh-CN' ? '未找到匹配的食材' : 'No matching ingredients found.')}
              </p>
              {viewScope === 'pantry' && (
                <button
                  type="button"
                  onClick={() => setViewScope('all')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFD13B] px-3.5 py-2 text-xs font-bold text-[#1E1B2E] shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                  <span>{language === 'zh-CN' ? '去添加食材' : 'Browse Ingredients'}</span>
                </button>
              )}
            </div>
          )}

          {/* Sentinel element for infinite scroll */}
          {filtered.length > visibleLimit && (
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-[#786F66]">
              Loading more ingredients...
            </div>
          )}
        </div>
      </div>

      {/* Quick-add bar sticky at bottom */}
      {!isEditMode && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <form
              onSubmit={handleQuickAdd}
              className="flex items-center gap-2 rounded-2xl border border-[#EDE8DF] bg-white/95 p-2 shadow-lg backdrop-blur-md dark:border-[#3D362E] dark:bg-[#2A2520]/95"
            >
              <input
                type="text"
                placeholder={language === 'zh-CN' ? '快速添加食材到储藏室...' : 'Add a custom pantry item...'}
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                className="flex-1 rounded-xl bg-[#FAF8F5] px-3 py-2 text-[13px] text-[#1E1B2E] placeholder:text-[#A89F95] focus:outline-none dark:bg-[#221E1A] dark:text-[#F5F2EB] border border-[#E8E4DC] dark:border-[#3D362E]"
              />
              <button
                type="submit"
                disabled={!quickAddName.trim()}
                className="flex items-center gap-1 rounded-xl border border-[#1E1B2E]/10 bg-[#FFD13B] px-4 py-2 text-[13px] font-bold text-[#1E1B2E] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                <span>{language === 'zh-CN' ? '存入' : 'Add'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
