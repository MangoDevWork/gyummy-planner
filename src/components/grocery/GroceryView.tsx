import React, { useState, useMemo } from 'react';
import type { AppData, Dish, GroceryCategory, GroceryItem, MealPlan } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { generateGroceryList } from '../../services/storage';
import {
  Check,
  CheckCircle2,
  Plus,
  MessageSquareShare,
  Home,
  Sparkles,
  Calendar,
  Trash2
} from 'lucide-react';
import { copyGroceryListAsMessage } from '../../services/zipExportService';
import { matchPantryIngredient } from '../../services/pantryMatching';
import { useLanguage } from '../../i18n/LanguageContext';
import { SupermarketCartModal } from './SupermarketCartModal';

interface GroceryViewProps {
  familyName: string;
  dishes: Dish[];
  mealPlan: MealPlan;
  pantryIngredients: string[];
  groceryList: AppData['groceryList'];
  onUpdateGroceryList: (newList: AppData['groceryList']) => void;
  onTogglePantryItem?: (ingName: string) => void;
}

const COMMON_UNITS = ['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'pcs', 'slices', 'can', 'packet', 'stalks', 'cloves', 'cup', 'pinch'];

export const GroceryView: React.FC<GroceryViewProps> = ({
  familyName = 'Family',
  dishes,
  mealPlan,
  pantryIngredients,
  groceryList,
  onUpdateGroceryList,
  onTogglePantryItem
}) => {
  const { language, t, formatCategory } = useLanguage();
  const [filter, setFilter] = useState<'pending' | 'checked' | 'all'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSupermarketModalOpen, setIsSupermarketModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { items, startDate, endDate, undoStack } = groceryList;

  // Date Range Generator State
  const defaultToday = new Date().toISOString().split('T')[0];
  const defaultNextWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();

  const [rangeStart, setRangeStart] = useState<string>(startDate || defaultToday);
  const [rangeEnd, setRangeEnd] = useState<string>(endDate || defaultNextWeek);
  const [isDateEditorOpen, setIsDateEditorOpen] = useState(false);

  // Manual Item Add Modal
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState<number | ''>('');
  const [manualUnit, setManualUnit] = useState('pcs');
  const [manualCategory, setManualCategory] = useState<GroceryCategory>('Produce');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Count planned meals within the selected date range
  const plannedMealsInRange = useMemo(() => {
    let count = 0;
    if (!rangeStart || !rangeEnd) return 0;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);

    Object.entries(mealPlan).forEach(([dateStr, dayPlan]) => {
      const d = new Date(dateStr);
      if (d >= start && d <= end && dayPlan) {
        Object.values(dayPlan).forEach((slot) => {
          if ((slot?.dishIds && slot.dishIds.length > 0) || slot?.dishId || slot?.customText) count++;
        });
      }
    });
    return count;
  }, [mealPlan, rangeStart, rangeEnd]);

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  // Toggle item checked
  const handleToggleItem = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });

    onUpdateGroceryList({
      ...groceryList,
      items: updated
    });
  };

  // Generate / Regenerate List from Plan
  const handleGenerate = (customStart?: string, customEnd?: string) => {
    const effectiveStart = customStart || rangeStart || defaultToday;
    const effectiveEnd = customEnd || rangeEnd || defaultNextWeek;

    const newItems = generateGroceryList(
      dishes,
      mealPlan,
      effectiveStart,
      effectiveEnd,
      items,
      pantryIngredients,
      language
    );

    onUpdateGroceryList({
      ...groceryList,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      items: newItems
    });
    setIsDateEditorOpen(false);
    showToast(`🛒 Generated ${newItems.length} items from planned meals.`);
  };

  // Quick Date Presets
  const handleApplyDatePreset = (preset: 'this_week' | 'next_week' | 'next_7_days') => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (preset === 'this_week') {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      s.setDate(now.getDate() - diff);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (preset === 'next_week') {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      s.setDate(now.getDate() - diff + 7);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (preset === 'next_7_days') {
      s = new Date(now);
      e = new Date(now);
      e.setDate(now.getDate() + 6);
    }

    const sISO = s.toISOString().split('T')[0];
    const eISO = e.toISOString().split('T')[0];
    setRangeStart(sISO);
    setRangeEnd(eISO);
    handleGenerate(sISO, eISO);
  };

  // Toggle Pantry
  const handleTogglePantry = (item: GroceryItem) => {
    const match = matchPantryIngredient(item.name, pantryIngredients);
    let nextPantry: string[];

    if (match.inPantry && match.matchedPantryItem) {
      nextPantry = pantryIngredients.filter((p) => p.toLowerCase() !== match.matchedPantryItem?.toLowerCase());
      showToast(`Removed "${item.name}" from Pantry.`);
    } else {
      nextPantry = [...pantryIngredients, item.name.trim()];
      showToast(`🏡 Added "${item.name}" to Home Pantry!`);
    }

    const updated = items.map((i) => {
      const isThisMatch = matchPantryIngredient(i.name, nextPantry);
      return {
        ...i,
        inPantry: isThisMatch.inPantry,
        pantrySubstituteNote: isThisMatch.substituteNote
      };
    });

    onUpdateGroceryList({
      ...groceryList,
      items: updated
    });
    onTogglePantryItem?.(item.name);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    if (!itemToDelete) return;

    const newUndoStack = [
      ...(undoStack || []),
      {
        id: `undo_${Date.now()}`,
        timestamp: Date.now(),
        description: `Delete ${itemToDelete.name}`,
        items: [...items]
      }
    ];

    onUpdateGroceryList({
      ...groceryList,
      items: items.filter((i) => i.id !== id),
      undoStack: newUndoStack
    });
    showToast(`Deleted "${itemToDelete.name}".`);
  };

  // Done shopping button action
  const handleDoneShopping = () => {
    if (checkedCount === 0) {
      showToast(language === 'zh-CN' ? '尚未勾选已购物品。' : 'No items checked yet.');
      return;
    }
    setShowCelebration(true);
  };

  // Add Manual Item
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const match = matchPantryIngredient(manualName.trim(), pantryIngredients);
    const newItem: GroceryItem = {
      id: `manual_${Date.now()}`,
      name: manualName.trim(),
      amount: typeof manualAmount === 'number' ? manualAmount : 1,
      unit: manualUnit.trim() || 'pcs',
      category: manualCategory,
      checked: false,
      inPantry: match.inPantry,
      pantrySubstituteNote: match.substituteNote,
      sourceDishes: [language === 'zh-CN' ? '手动添加' : 'Manual Item'],
      isManual: true
    };

    onUpdateGroceryList({
      ...groceryList,
      items: [newItem, ...items]
    });

    setManualName('');
    setManualAmount('');
    setIsManualAddOpen(false);
    showToast(`Added "${newItem.name}"`);
  };

  // Share list
  const handleShareList = async () => {
    const res = await copyGroceryListAsMessage(items, startDate, endDate, language);
    if (res.success) {
      showToast(language === 'zh-CN' ? '📋 已复制采购清单到剪贴板！' : '📋 Copied grocery list to clipboard!');
    } else {
      showToast(`⚠️ ${res.text}`);
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (filter === 'pending' && item.checked) return false;
    if (filter === 'checked' && !item.checked) return false;
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    return true;
  });

  // Group filtered items by category
  const groupedCategories = useMemo(() => {
    const map = new Map<GroceryCategory, GroceryItem[]>();
    filteredItems.forEach((item) => {
      const cat = item.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries()).map(([category, catItems]) => ({
      category,
      items: catItems
    }));
  }, [filteredItems]);

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

        {/* Week Selector + Generate Card */}
        <div className="mb-4 rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A89F95]">
                {language === 'zh-CN' ? '生成采购范围' : 'Generating for'}
              </p>
              <p className="text-[14px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                {rangeStart && rangeEnd ? `${rangeStart} ~ ${rangeEnd}` : 'This Week'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-medium text-[#786F66] dark:bg-[#221E1A] dark:text-[#A39C90] border border-[#EDE8DF] dark:border-[#3D362E]">
                {plannedMealsInRange} {language === 'zh-CN' ? '餐' : 'meals'}
              </span>
              <button
                type="button"
                onClick={() => setIsDateEditorOpen(!isDateEditorOpen)}
                className="p-1 text-[#786F66] hover:text-[#1E1B2E] dark:hover:text-[#F5F2EB] rounded-lg transition cursor-pointer"
                title="Change dates"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Date Picker Drawer */}
          {isDateEditorOpen && (
            <div className="mb-3 p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#221E1A] space-y-2.5 border border-[#EDE8DF] dark:border-[#3D362E]">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('this_week')}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-[#2A2520] border border-[#EDE8DF] dark:border-[#3D362E] text-[11px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB] cursor-pointer"
                >
                  {language === 'zh-CN' ? '本周' : 'This Week'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('next_week')}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-[#2A2520] border border-[#EDE8DF] dark:border-[#3D362E] text-[11px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB] cursor-pointer"
                >
                  {language === 'zh-CN' ? '下周' : 'Next Week'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('next_7_days')}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-[#2A2520] border border-[#EDE8DF] dark:border-[#3D362E] text-[11px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB] cursor-pointer"
                >
                  {language === 'zh-CN' ? '未来7天' : '7 Days'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-[#786F66] font-semibold uppercase mb-0.5">From</label>
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg border border-[#E8E4DC] bg-white text-xs text-[#1E1B2E] dark:bg-[#2A2520] dark:text-[#F5F2EB] dark:border-[#3D362E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#786F66] font-semibold uppercase mb-0.5">To</label>
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg border border-[#E8E4DC] bg-white text-xs text-[#1E1B2E] dark:bg-[#2A2520] dark:text-[#F5F2EB] dark:border-[#3D362E]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleGenerate()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#1E1B2E]/10 bg-[#FFD13B] py-2.5 text-[13px] font-bold text-[#1E1B2E] transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.4} />
              <span>{language === 'zh-CN' ? '从排餐生成清单' : 'Generate Grocery List'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsManualAddOpen(true)}
              className="px-3 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] dark:bg-[#221E1A] dark:border-[#3D362E] text-[#1E1B2E] dark:text-[#F5F2EB] text-[12px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="Add custom item"
            >
              <Plus className="h-4 w-4" />
              <span>{language === 'zh-CN' ? '手动加' : 'Add'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareList}
              className="p-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] dark:bg-[#221E1A] dark:border-[#3D362E] text-[#1E1B2E] dark:text-[#F5F2EB] transition cursor-pointer"
              title="Share as text"
            >
              <MessageSquareShare className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-[#1E1B2E] dark:text-[#F5F2EB]">
                {checkedCount} of {totalCount} {language === 'zh-CN' ? '件物品已入车' : 'items in cart'}
              </span>
              <span className="font-bold text-[#786F66] dark:text-[#A39C90]">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EDE8DF] dark:bg-[#221E1A]">
              <div
                className="h-full rounded-full bg-[#FFD13B] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs Switcher */}
        <div className="mb-4 flex rounded-full border border-[#EDE8DF] bg-white p-1 dark:border-[#3D362E] dark:bg-[#2A2520] shadow-2xs">
          {[
            { id: 'pending', label: language === 'zh-CN' ? '待采购' : 'To Buy' },
            { id: 'checked', label: language === 'zh-CN' ? '已入车' : 'In Cart' },
            { id: 'all', label: language === 'zh-CN' ? '全部' : 'All' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id as any)}
              className={`flex-1 rounded-full py-1.5 text-[12.5px] font-bold transition-all cursor-pointer ${
                filter === t.id
                  ? 'bg-[#FFD13B] text-[#1E1B2E] shadow-2xs'
                  : 'text-[#786F66] hover:text-[#1E1B2E] dark:text-[#A39C90] dark:hover:text-[#F5F2EB]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category Filter Chips */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['All', ...GROCERY_CATEGORIES].map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
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

        {/* Groups */}
        <div className="space-y-4">
          {groupedCategories.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#786F66] dark:text-[#A39C90]">
                {formatCategory(group.category)}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-[#EDE8DF] bg-white shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520]">
                {group.items.map((item, idx) => {
                  const isDone = item.checked;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3D362E]' : ''
                      }`}
                    >
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item.id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                          isDone ? 'border-[#FFD13B] bg-[#FFD13B]' : 'border-[#D8CCC0] dark:border-[#5A5048]'
                        }`}
                        aria-label={isDone ? 'Uncheck' : 'Check off'}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5 text-[#1E1B2E]" strokeWidth={3} /> : null}
                      </button>

                      {/* Item Details + Substitute Note */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[13.5px] font-semibold ${
                            isDone
                              ? 'text-[#A89F95] line-through dark:text-[#5A5048]'
                              : 'text-[#1E1B2E] dark:text-[#F5F2EB]'
                          }`}
                        >
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] text-[#786F66] dark:text-[#A39C90]">
                            {item.amount !== null ? item.amount : ''} {item.unit}
                          </p>

                          {/* Pantry Substitute Note restored per user request */}
                          {item.pantrySubstituteNote && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md bg-[#E8F5ED] text-[#2D6A4A] dark:bg-[#1E2E24] dark:text-[#5ECB8D] text-[10.5px] font-medium">
                              💡 {item.pantrySubstituteNote}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* In Pantry Toggle Icon */}
                      <button
                        type="button"
                        onClick={() => handleTogglePantry(item)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                          item.inPantry
                            ? 'bg-[#E8F5ED] text-[#2D6A4A] dark:bg-[#1E2E24] dark:text-[#5ECB8D]'
                            : 'bg-[#FAF8F5] text-[#A89F95] hover:text-[#786F66] dark:bg-[#221E1A]'
                        }`}
                        title={item.inPantry ? 'Already in Pantry (Click to toggle)' : 'Not in pantry (Click to mark in pantry)'}
                      >
                        <Home className="h-4 w-4" />
                      </button>

                      {/* Delete item */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-[#A89F95] hover:text-rose-500 rounded-lg transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {groupedCategories.length === 0 && (
            <div className="py-12 text-center text-[13px] text-[#786F66] dark:text-[#A39C90] space-y-1 bg-white dark:bg-[#2A2520] rounded-2xl border border-dashed border-[#EDE8DF] dark:border-[#3D362E] p-6">
              <p>🛒 {language === 'zh-CN' ? '暂无待采购的物品。' : 'Nothing here yet.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Done Shopping Sticky Bottom Button */}
      {checkedCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={handleDoneShopping}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#1E1B2E]/10 bg-[#FFD13B] py-3.5 text-[14px] font-bold text-[#1E1B2E] shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Check className="h-4 w-4" strokeWidth={2.6} />
              <span>{language === 'zh-CN' ? `完成采购 (${checkedCount} 件)` : `Done Shopping (${checkedCount} items)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Item Add Modal */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <form
            onSubmit={handleAddManualItem}
            className="bg-white dark:bg-[#2A2520] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[#EDE8DF] dark:border-[#3D362E] space-y-3"
          >
            <h3 className="text-sm font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
              {language === 'zh-CN' ? '手动添加采购物品' : 'Add Custom Grocery Item'}
            </h3>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#786F66] mb-1">Item Name</label>
              <input
                type="text"
                required
                autoFocus
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Avocado, Oat Milk"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#786F66] mb-1">Amount</label>
                <input
                  type="number"
                  step="any"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="1"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#786F66] mb-1">Unit</label>
                <select
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#786F66] mb-1">Category</label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value as GroceryCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
              >
                {GROCERY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{formatCategory(c)}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualAddOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-[#EDE8DF] bg-white text-[#786F66] cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#FFD13B] border border-[#1E1B2E]/10 text-[#1E1B2E] cursor-pointer shadow-xs"
              >
                {language === 'zh-CN' ? '确认添加' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#2A2520] w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-[#EDE8DF] dark:border-[#3D362E]">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5ED] text-[#2D6A4A] flex items-center justify-center text-2xl">
              🎉
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                {language === 'zh-CN' ? '采购大功告成！' : 'Shopping Complete!'}
              </h3>
              <p className="text-xs text-[#786F66] dark:text-[#A39C90] mt-1">
                {language === 'zh-CN' ? `已成功采买 ${checkedCount} 种食材。要清除已购项目并更新清单吗？` : `You picked up ${checkedCount} items. Would you like to clear checked items?`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-[#EDE8DF] bg-white text-[#786F66] cursor-pointer"
              >
                {language === 'zh-CN' ? '保留已购' : 'Keep in list'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateGroceryList({
                    ...groceryList,
                    items: items.filter((i) => !i.checked)
                  });
                  setShowCelebration(false);
                  showToast('🧹 Cleared purchased items.');
                }}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#FFD13B] border border-[#1E1B2E]/10 text-[#1E1B2E] cursor-pointer shadow-xs"
              >
                {language === 'zh-CN' ? '清除已购' : 'Clear checked'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Australian Supermarket (Woolworths & Coles) Staging Modal */}
      <SupermarketCartModal
        isOpen={isSupermarketModalOpen}
        onClose={() => setIsSupermarketModalOpen(false)}
        rawGroceryItems={items}
        familyName={familyName}
        dateRangeText={rangeStart && rangeEnd ? `${rangeStart} ~ ${rangeEnd}` : 'Weekly Meals'}
        onShowToast={showToast}
      />
    </div>
  );
};
