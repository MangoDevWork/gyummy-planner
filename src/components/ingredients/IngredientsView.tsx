import React, { useState, useRef } from 'react';
import type { MasterIngredient, GroceryCategory } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { Search, Edit3, Plus, Trash2, Save, Download, Upload, AlertCircle, CheckCircle2, Home, Check } from 'lucide-react';
import { exportToZip, parseUploadedDataFile } from '../../services/zipExportService';
import { useLanguage } from '../../i18n/LanguageContext';

interface IngredientsViewProps {
  familyName: string;
  ingredients: MasterIngredient[];
  pantryIngredients: string[];
  onSaveIngredients: (updated: MasterIngredient[]) => void;
  onUpdatePantryIngredients: (updatedPantry: string[]) => void;
}

const COMMON_UNITS = ['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'pcs', 'slices', 'can', 'packet', 'stalks', 'cloves', 'cup', 'pinch'];

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  familyName,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const isItemInPantry = pantryIngredients.some((p) => p.toLowerCase() === item.name.toLowerCase().trim());
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

  const handleExportZip = async () => {
    try {
      const filename = await exportToZip(familyName, 'Ingredients', {
        masterIngredients: ingredients,
        pantryIngredients
      });
      showToast(`📦 Exported ${filename}`);
    } catch (err: any) {
      showToast(`❌ Export failed: ${err.message}`);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await parseUploadedDataFile(file);
    if (!res.success || !res.data) {
      showToast(`❌ ${res.message}`);
      return;
    }

    if (res.type !== 'ingredients' && res.type !== 'full') {
      showToast('⚠️ Please choose an Ingredients Zip/JSON file.');
      return;
    }

    const incoming: MasterIngredient[] =
      res.type === 'ingredients' ? res.data : res.data.masterIngredients || [];

    if (incoming.length === 0) {
      showToast('⚠️ No ingredients found in file.');
      return;
    }

    const existingNames = new Set(ingredients.map((i) => i.name.toLowerCase().trim()));
    const merged = [...ingredients];
    let newCount = 0;

    incoming.forEach((item) => {
      const norm = item.name.toLowerCase().trim();
      if (norm && !existingNames.has(norm)) {
        merged.push(item);
        existingNames.add(norm);
        newCount++;
      }
    });

    onSaveIngredients(merged);
    showToast(`✅ Added ${newCount} new master ingredients!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-3.5 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".zip,.json"
        className="hidden"
      />

      {/* Search Bar & Sharing Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'zh-CN' ? '搜索食材总库...' : 'Search master ingredients...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-9 pr-4 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={handleExportZip}
          className="p-2.5 rounded-xl border border-[#EAE6DF] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          title="Export Ingredients Zip"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl border border-[#EAE6DF] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          title="Import Ingredients Zip/JSON"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* In My Pantry Overview & Live Benefit Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#F4F1EA]">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t('pantry.inMyPantryTitle', { count: pantryIngredients.length })}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyPantry(!showOnlyPantry)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer border ${
              showOnlyPantry
                ? 'bg-[#2B2D42] text-white border-[#2B2D42]'
                : 'bg-[#F4F1EA] text-slate-700 border-[#EAE6DF] hover:bg-[#EAE6DF]'
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
              className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs"
            >
              <span>🏡 {item}</span>
              <button
                type="button"
                onClick={() => handleTogglePantryItem(item)}
                className="w-4 h-4 rounded-full hover:bg-emerald-200 flex items-center justify-center text-emerald-700 cursor-pointer ml-0.5"
                title={`Remove ${item} from pantry`}
              >
                ×
              </button>
            </span>
          ))}
          {pantryIngredients.length === 0 && (
            <p className="text-xs text-slate-400 italic">{t('pantry.noPantryItems')}</p>
          )}
        </div>

        {/* Smart Substitution Engine Live Notice */}
        <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE6DF] text-[11px] text-slate-600 flex items-start gap-2">
          <span className="text-sm">✨</span>
          <p className="leading-snug">
            <strong>{t('pantry.smartSubNoticeTitle')}</strong> {t('pantry.smartSubNoticeDesc')}
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-[#2B2D42] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-[#EAE6DF] hover:bg-slate-50'
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
                  ? 'bg-[#2B2D42] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#EAE6DF] hover:bg-slate-50'
              }`}
            >
              {formatCategory(cat)} ({count})
            </button>
          );
        })}
      </div>

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Action Header & Mode Toggle */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          {t('pantry.libraryCount', { count: filtered.length })}
        </span>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={handleAddNewRow}
                className="flex items-center gap-1 text-xs font-semibold text-slate-800 bg-[#F4F1EA] hover:bg-[#EAE6DF] px-2.5 py-1 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('pantry.addItem')}</span>
              </button>

              <button
                onClick={handleCancelEditMode}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={handleSaveAll}
                className="flex items-center gap-1 text-xs font-bold bg-[#2B2D42] hover:bg-[#1E1F2E] text-white px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleEnterEditMode}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white border border-[#EAE6DF] hover:bg-slate-50 px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('common.editMode')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Master Ingredients Cards in Pure White #FFFFFF */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-[#EAE6DF] text-xs text-slate-400 shadow-sm">
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
                className={`bg-white rounded-xl p-3 border transition-all shadow-2xs ${
                  isNameEmpty && isEditMode
                    ? 'border-rose-500 bg-rose-50/50'
                    : isInPantry
                    ? 'border-emerald-300/80 bg-emerald-50/20'
                    : 'border-[#EAE6DF] hover:border-slate-300'
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
                        className={`flex-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-[#FDFBF7] text-slate-900 focus:outline-hidden ${
                          isNameEmpty
                            ? 'border-rose-500 bg-rose-50'
                            : 'border-[#EAE6DF] focus:border-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
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
                          className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 focus:outline-hidden focus:border-slate-400 text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                          Default Unit
                        </label>
                        <select
                          value={item.defaultUnit}
                          onChange={(e) => handleFieldChange(item.id, 'defaultUnit', e.target.value)}
                          className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 focus:outline-hidden focus:border-slate-400"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                          Category
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                          className="w-full text-xs font-medium px-1.5 py-1 rounded-lg border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 focus:outline-hidden focus:border-slate-400"
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePantryItem(item.name)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                          isInPantry
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-400 border-[#EAE6DF] hover:text-emerald-700 hover:border-emerald-300'
                        }`}
                        title={isInPantry ? 'In Pantry (Click to remove)' : 'Click to add to Home Pantry'}
                      >
                        <Home className="w-3.5 h-3.5" />
                      </button>

                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">{item.name}</span>
                        {isInPantry && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            In Home Pantry (Auto half-marks on grocery list)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.defaultValue !== null && (
                        <span className="text-xs font-bold text-slate-700 bg-[#F4F1EA] border border-[#EAE6DF] px-2 py-0.5 rounded-md">
                          {item.defaultValue} {item.defaultUnit}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-[#FDFBF7] px-2 py-0.5 rounded-md font-medium border border-[#EAE6DF]">
                        {item.category}
                      </span>
                    </div>
                  </div>
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
              className="px-5 py-2 rounded-xl bg-white border border-[#EAE6DF] text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              Showing {Math.min(visibleLimit, filtered.length)} of {filtered.length.toLocaleString()} ingredients • Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
