import React, { useState, useRef } from 'react';
import type { MasterIngredient, GroceryCategory } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { Search, Edit3, Plus, Trash2, CheckCircle2, Check, Home } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showOnlyPantry, setShowOnlyPantry] = useState(false);
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
      showToast(`Removed "${clean}" from Pantry.`);
    } else {
      next = [...pantryIngredients, clean];
      showToast(`🏡 Added "${clean}" to Pantry!`);
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
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#2D2640]" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Summary Card */}
        <div className="mb-4 rounded-2xl border border-[#EDE8DF] bg-white px-4 py-3 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
                {language === 'zh-CN' ? '家庭储藏室' : 'Your Pantry'}
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                {stockedCount} {language === 'zh-CN' ? '种常备食材已有库存' : `of ${totalMasterCount} ingredients stocked`}
              </p>
            </div>
            {!isEditMode && (
              <button
                type="button"
                onClick={handleEnterEditMode}
                className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0E8] px-2.5 py-1 text-[11px] font-semibold text-[#2D2640] dark:bg-[#201C18] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{language === 'zh-CN' ? '管理库' : 'Edit DB'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B0A5]" />
          <input
            type="text"
            placeholder={language === 'zh-CN' ? '搜索食材或按分类筛选...' : 'Search pantry items...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] py-2.5 pl-9 pr-3 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:border-[#A0867A] focus:outline-none dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
          />
        </div>

        {/* Categories Chip Row */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setShowOnlyPantry(!showOnlyPantry)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer border ${
              showOnlyPantry
                ? 'border-[#4E9E72]/30 bg-[#EBF5EE] text-[#4E9E72]'
                : 'border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]'
            }`}
          >
            <Home className="h-3 w-3" />
            <span>{language === 'zh-CN' ? '已有库存' : 'In Stock Only'}</span>
          </button>

          {['All', ...GROCERY_CATEGORIES].map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                  isSel
                    ? 'bg-[#FFD13B] text-[#2D2640]'
                    : 'border border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]'
                }`}
              >
                {cat === 'All' ? (language === 'zh-CN' ? '全部' : 'All') : formatCategory(cat as any)}
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
                className="inline-flex items-center gap-1 rounded-lg bg-[#FFD13B] px-2.5 py-1 text-[11px] font-semibold text-[#2D2640] cursor-pointer"
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
                className="flex-1 py-1.5 rounded-xl border border-[#EDE8DF] bg-white text-xs font-semibold text-[#8A7A70] cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEditList}
                className="flex-1 py-1.5 rounded-xl bg-[#FFD13B] border border-[#2D2640]/10 text-xs font-semibold text-[#2D2640] cursor-pointer shadow-xs"
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
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#8A7A70] dark:text-[#9A8A7E]">
                  {formatCategory(group.category as any)}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-[#EDE8DF] bg-white shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
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
                            idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3A332C]' : ''
                          }`}
                        >
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                            placeholder="Name"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] text-xs text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                            className="px-2 py-1.5 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] text-xs text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
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
                          idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3A332C]' : ''
                        } ${isInPantry ? 'bg-[#EBF5EE]/60 dark:bg-[#4E9E72]/10' : 'hover:bg-[#FAF7F2] dark:hover:bg-[#201C18]'}`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p
                            className={`text-[13.5px] font-medium ${
                              isInPantry ? 'text-[#4E9E72]' : 'text-[#4A3F35] dark:text-[#F0EDE8]'
                            }`}
                          >
                            {loc.name}
                          </p>
                          {loc.name !== item.name && (
                            <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] truncate">{item.name}</p>
                          )}
                        </div>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isInPantry
                              ? 'border-[#4E9E72] bg-[#4E9E72]'
                              : 'border-[#D8CCC0] bg-transparent'
                          }`}
                        >
                          {isInPantry ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-[#8A7A70] dark:text-[#9A8A7E] space-y-1">
              <p>🌾 {language === 'zh-CN' ? '未找到匹配的食材' : 'No matching ingredients found.'}</p>
            </div>
          )}

          {/* Sentinel element for infinite scroll */}
          {filtered.length > visibleLimit && (
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-[#8A7A70]">
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
              className="flex items-center gap-2 rounded-2xl border border-[#2D2640]/10 bg-white/95 p-2 shadow-lg backdrop-blur-md dark:border-[#3A332C] dark:bg-[#28231E]/95"
            >
              <input
                type="text"
                placeholder={language === 'zh-CN' ? '快速添加食材到储藏室...' : 'Add a pantry item...'}
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                className="flex-1 rounded-xl bg-[#FAF7F2] px-3 py-2 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:outline-none dark:bg-[#201C18] dark:text-[#F0EDE8]"
              />
              <button
                type="submit"
                disabled={!quickAddName.trim()}
                className="flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-4 py-2 text-[13px] font-semibold text-[#2D2640] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
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
