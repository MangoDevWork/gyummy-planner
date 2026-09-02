import React, { useState, useRef } from 'react';
import type { MasterIngredient } from '../../types';
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
  const { language, formatCategory } = useLanguage();
  // Default to showing stocked pantry items first per user request!
  const [viewScope, setViewScope] = useState<'pantry' | 'all'>('pantry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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
      showToast(language === 'zh-CN' ? `已从储藏室移出 "${clean}"` : `Removed "${clean}" from Pantry.`);
    } else {
      next = [...pantryIngredients, clean];
      showToast(language === 'zh-CN' ? `🏡 已将 "${clean}" 加入储藏室！` : `🏡 Added "${clean}" to Home Pantry!`);
    }
    onUpdatePantryIngredients(next);
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

  // Infinite scrolling intersection observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleLimit((prev) => prev + 30);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filtered.length]);

  const handleEnterEditMode = () => {
    setEditableList(JSON.parse(JSON.stringify(ingredients)));
    setIsEditMode(true);
    setViewScope('all');
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditableList(ingredients);
    setIsEditMode(false);
    setValidationError(null);
  };

  const handleSaveEdit = () => {
    // Basic validation: check for duplicates and empty names
    const names = new Set<string>();
    for (const item of editableList) {
      const cleanName = item.name.trim();
      if (!cleanName) {
        setValidationError(language === 'zh-CN' ? '食材名称不能为空' : 'Ingredient name cannot be empty.');
        return;
      }
      const lower = cleanName.toLowerCase();
      if (names.has(lower)) {
        setValidationError(language === 'zh-CN' ? `存在重复食材: "${cleanName}"` : `Duplicate ingredient: "${cleanName}"`);
        return;
      }
      names.add(lower);
    }

    onSaveIngredients(editableList);
    setIsEditMode(false);
    setValidationError(null);
    showToast(language === 'zh-CN' ? '✅ 食材库修改已保存！' : '✅ Ingredients database updated!');
  };

  const handleUpdateItem = (index: number, updates: Partial<MasterIngredient>) => {
    setEditableList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleAddNewItem = () => {
    const newItem: MasterIngredient = {
      id: `custom_ing_${Date.now()}`,
      name: '',
      defaultValue: 100,
      defaultUnit: 'g',
      category: 'Produce'
    };
    setEditableList((prev) => [newItem, ...prev]);
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const handleDeleteItem = (id: string) => {
    setEditableList((prev) => prev.filter((i) => i.id !== id));
  };

  const stockedCount = pantryIngredients.length;

  return (
    <div className="relative">
      <div className="px-4 pb-28 pt-4 max-w-md mx-auto">
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
            <span>{language === 'zh-CN' ? '5,000+ 食材库' : 'Browse Ingredients'}</span>
          </button>
        </div>

        {/* Search Bar + Smart Edit DB Button */}
        <div className="relative mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89F95]" />
            <input
              type="text"
              placeholder={
                viewScope === 'pantry'
                  ? (language === 'zh-CN' ? '在已有库存中搜索...' : 'Search your in-stock pantry...')
                  : (language === 'zh-CN' ? '搜索 5,000+ 种食材...' : 'Search all ingredients...')
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-[13px] text-[#1E1B2E] placeholder:text-[#A89F95] focus:border-[#FFD13B] focus:outline-none dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB] shadow-2xs"
            />
          </div>

          {!isEditMode && (
            <button
              type="button"
              onClick={handleEnterEditMode}
              title={language === 'zh-CN' ? '管理食材数据库' : 'Manage Database'}
              className="p-2.5 rounded-xl border border-[#EDE8DF] bg-white text-[#786F66] hover:text-[#1E1B2E] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90] dark:hover:text-[#F5F2EB] shadow-2xs transition cursor-pointer shrink-0"
              aria-label="Edit database"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
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
                {cat === 'All' ? (language === 'zh-CN' ? '全部' : 'All') : formatCategory(cat)}
              </button>
            );
          })}
        </div>

        {/* Edit Mode Toolbar */}
        {isEditMode && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                ✏️ {language === 'zh-CN' ? '编辑全局食材数据库' : 'Editing Master Database'}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg border border-[#EDE8DF] bg-white px-2.5 py-1 text-xs font-semibold text-[#786F66] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90] cursor-pointer"
                >
                  {language === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-[#FFD13B] px-3 py-1 text-xs font-bold text-[#1E1B2E] hover:bg-[#FFC720] transition cursor-pointer shadow-2xs"
                >
                  {language === 'zh-CN' ? '保存更改' : 'Save Changes'}
                </button>
              </div>
            </div>

            {validationError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                ⚠️ {validationError}
              </p>
            )}

            <button
              type="button"
              onClick={handleAddNewItem}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-white/70 py-2 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-[#2A2520] dark:text-amber-300 hover:bg-amber-100/50 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'zh-CN' ? '+ 新增食材到数据库' : '+ Add New Master Ingredient'}</span>
            </button>
          </div>
        )}

        {/* Ingredients List */}
        <div className="space-y-4">
          {groupedItems.map(({ category, items }) => {
            const displayItems = items.slice(0, visibleLimit);
            if (displayItems.length === 0) return null;

            return (
              <section key={category} className="space-y-1.5">
                <h3 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-[#A89F95]">
                  {formatCategory(category)} ({items.length})
                </h3>

                <div className="divide-y divide-[#EDE8DF] rounded-2xl border border-[#EDE8DF] bg-white dark:divide-[#3D362E] dark:border-[#3D362E] dark:bg-[#2A2520] shadow-2xs overflow-hidden">
                  {displayItems.map((item) => {
                    const originalIndex = activeList.findIndex((i) => i.id === item.id);
                    const loc = getLocalizedMasterIngredient(item, language);
                    const isInPantry = pantryIngredients.some(
                      (p) => p.toLowerCase() === item.name.toLowerCase().trim() || p.toLowerCase() === loc.name.toLowerCase().trim()
                    );

                    if (isEditMode) {
                      return (
                        <div key={item.id} className="flex items-center gap-2 p-2.5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(originalIndex, { name: e.target.value })}
                            placeholder={language === 'zh-CN' ? '食材名称' : 'Ingredient Name'}
                            className="flex-1 rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB] focus:outline-none focus:border-[#FFD13B]"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(originalIndex, { category: e.target.value as any })}
                            className="rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-2 py-1.5 text-xs text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
                          >
                            {GROCERY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{formatCategory(c)}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTogglePantryItem(item.name)}
                        className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                          isInPantry
                            ? 'bg-[#E8F5ED]/40 dark:bg-[#1E2E24]/30 hover:bg-[#E8F5ED]/60'
                            : 'hover:bg-[#FAF8F5] dark:hover:bg-[#221E1A]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-semibold truncate ${
                            isInPantry
                              ? 'text-[#2D6A4A] dark:text-[#5ECB8D] font-bold'
                              : 'text-[#1E1B2E] dark:text-[#F5F2EB]'
                          }`}>
                            {loc.name}
                          </p>
                          <p className="text-[11px] text-[#A89F95]">
                            {item.defaultValue} {item.defaultUnit}
                          </p>
                        </div>

                        {/* In-Pantry Toggle Indicator Button */}
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform active:scale-90 ${
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
                  ? (language === 'zh-CN' ? '储藏室暂无该分类食材。切换到上方“食材库”即可随时添加！' : 'No items in this category in your pantry. Switch to "Browse Ingredients" to add them!')
                  : (language === 'zh-CN' ? `未找到食材 "${searchQuery}"` : `No ingredients found matching "${searchQuery}"`)}
              </p>
              
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePantryItem(searchQuery.trim());
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFD13B] px-3.5 py-2 text-xs font-bold text-[#1E1B2E] shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                  <span>{language === 'zh-CN' ? `存入 "${searchQuery}" 到储藏室` : `Add "${searchQuery}" to Pantry`}</span>
                </button>
              ) : (
                viewScope === 'pantry' && (
                  <button
                    type="button"
                    onClick={() => setViewScope('all')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFD13B] px-3.5 py-2 text-xs font-bold text-[#1E1B2E] shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                    <span>{language === 'zh-CN' ? '去添加食材' : 'Browse Ingredients'}</span>
                  </button>
                )
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
    </div>
  );
};
