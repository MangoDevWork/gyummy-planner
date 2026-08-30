import React, { useState, useRef } from 'react';
import type { AppData, Dish, GroceryCategory, GroceryItem, MealPlan } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { generateGroceryList } from '../../services/storage';
import {
  Check,
  RotateCcw,
  ShoppingBag,
  CheckCircle2,
  Download,
  Upload,
  Plus,
  Edit2,
  MessageSquareShare,
  Home
} from 'lucide-react';
import {
  exportToZip,
  parseUploadedDataFile,
  copyGroceryListAsMessage
} from '../../services/zipExportService';
import { matchPantryIngredient } from '../../services/pantryMatching';

interface GroceryViewProps {
  familyName: string;
  dishes: Dish[];
  mealPlan: MealPlan;
  pantryIngredients: string[];
  groceryList: AppData['groceryList'];
  onUpdateGroceryList: (newList: AppData['groceryList']) => void;
}

const COMMON_UNITS = ['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'pcs', 'slices', 'can', 'packet', 'stalks', 'cloves', 'cup', 'pinch'];

export const GroceryView: React.FC<GroceryViewProps> = ({
  familyName,
  dishes,
  mealPlan,
  pantryIngredients,
  groceryList,
  onUpdateGroceryList
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'checked' | 'all'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCelebration, setShowCelebration] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Manual Item Add Modal
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState<number | ''>('');
  const [manualUnit, setManualUnit] = useState('pcs');
  const [manualCategory, setManualCategory] = useState<GroceryCategory>('Produce');

  // Inline Quantity Edit
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number | ''>('');
  const [editingUnit, setEditingUnit] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const { items, startDate, endDate, undoStack } = groceryList;

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const inPantryCount = items.filter((i) => i.inPantry).length;
  const pendingCount = totalCount - checkedCount;
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

  // Regenerate List from Plan
  const handleRegenerate = () => {
    if (!startDate || !endDate) {
      showToast('⚠️ Please select a date range from Planner first');
      return;
    }

    const newItems = generateGroceryList(dishes, mealPlan, startDate, endDate, items, pantryIngredients);
    onUpdateGroceryList({
      ...groceryList,
      items: newItems
    });
    showToast('🔄 Refreshed grocery list from Meal Plan!');
  };

  // Manual Item Add
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = manualName.trim();
    if (!cleanName) return;

    const pantryMatch = matchPantryIngredient(cleanName, pantryIngredients);

    const newItem: GroceryItem = {
      id: `groc_manual_${Date.now()}`,
      name: cleanName,
      amount: manualAmount !== '' ? Number(manualAmount) : null,
      unit: manualUnit,
      category: manualCategory,
      checked: false,
      inPantry: pantryMatch.inPantry,
      pantrySubstituteNote: pantryMatch.substituteNote,
      sourceDishes: ['Manual Add'],
      isManual: true,
      dateRange: { start: startDate, end: endDate }
    };

    onUpdateGroceryList({
      ...groceryList,
      items: [newItem, ...items]
    });

    setManualName('');
    setManualAmount('');
    setIsManualAddOpen(false);
    showToast(`Added "${cleanName}" to grocery list!`);
  };

  // Start Inline Edit
  const handleStartEdit = (item: GroceryItem) => {
    setEditingItemId(item.id);
    setEditingAmount(item.amount !== null ? item.amount : '');
    setEditingUnit(item.unit || '');
  };

  const handleSaveEdit = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          amount: editingAmount !== '' ? Number(editingAmount) : null,
          unit: editingUnit.trim()
        };
      }
      return item;
    });

    onUpdateGroceryList({
      ...groceryList,
      items: updated
    });
    setEditingItemId(null);
  };

  // Done Clearing with Snapshot Undo
  const handleDoneShopping = () => {
    const checkedItems = items.filter((i) => i.checked);
    if (checkedItems.length === 0) {
      showToast('⚠️ No items are checked off yet.');
      return;
    }

    const snapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      description: `Cleared ${checkedItems.length} purchased items`,
      items: [...items]
    };

    const remainingItems = items.filter((i) => !i.checked);

    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);

    onUpdateGroceryList({
      ...groceryList,
      items: remainingItems,
      undoStack: [snapshot, ...undoStack.slice(0, 4)]
    });

    showToast(`🎉 Cleared ${checkedItems.length} items! Tap Undo to restore.`);
  };

  // Undo Snapshot
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [latest, ...rest] = undoStack;

    onUpdateGroceryList({
      ...groceryList,
      items: latest.items,
      undoStack: rest
    });

    showToast('⏪ Restored grocery checklist snapshot!');
  };

  // Copy as Text Message
  const handleCopyAsMessage = async () => {
    const res = await copyGroceryListAsMessage(items, startDate, endDate);
    if (res.success) {
      showToast('📋 Copied formatted grocery list to clipboard!');
    } else {
      showToast(`❌ ${res.text}`);
    }
  };

  // Export Zip
  const handleExportZip = async () => {
    try {
      const filename = await exportToZip(familyName, 'GroceryList', { groceryList });
      showToast(`📦 Exported ${filename}`);
    } catch (err: any) {
      showToast(`❌ Export failed: ${err.message}`);
    }
  };

  // Import Zip / JSON
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await parseUploadedDataFile(file);
    if (!res.success || !res.data) {
      showToast(`❌ ${res.message}`);
      return;
    }

    if (res.type !== 'groceryList' && res.type !== 'full') {
      showToast('⚠️ Please choose a Grocery List Zip/JSON file.');
      return;
    }

    const incomingItems: GroceryItem[] =
      res.type === 'groceryList' ? (res.data.items || res.data) : (res.data.groceryList?.items || []);

    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    const merged = [...items];
    let newCount = 0;

    incomingItems.forEach((it) => {
      const norm = it.name.toLowerCase().trim();
      if (!existingNames.has(norm)) {
        merged.push(it);
        existingNames.add(norm);
        newCount++;
      }
    });

    onUpdateGroceryList({
      ...groceryList,
      items: merged
    });

    showToast(`✅ Imported ${newCount} grocery items!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter items for display
  const displayItems = items.filter((item) => {
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && !item.checked) ||
      (activeTab === 'checked' && item.checked);

    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;

    return matchTab && matchCat;
  });

  // Group by category
  const groupedByCategory = displayItems.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-4 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Celebration Overlay Banner */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE6DF] p-6 rounded-2xl text-center shadow-2xl space-y-2">
            <div className="text-4xl animate-bounce">🎉 🛒 🌟</div>
            <h3 className="text-base font-bold text-slate-900">All Done Shopping!</h3>
            <p className="text-xs text-slate-600">Items purchased and cleared cleanly</p>
          </div>
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

      {/* Progress & Overview Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Grocery Checklist</h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span>{pendingCount} remaining of {totalCount} items</span>
                {inPantryCount > 0 && (
                  <span className="text-emerald-700 font-semibold">• {inPantryCount} in Pantry</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Copy As Message, Zip Export/Import) */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyAsMessage}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Copy formatted list to clipboard for messaging"
            >
              <MessageSquareShare className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportZip}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Export Grocery Zip"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Import Grocery Zip/JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar (Sage Olive Accent) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-500">
            <span>Shopping Progress</span>
            <span className="text-slate-800">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-[#F4F1EA] rounded-full overflow-hidden border border-[#EAE6DF]">
            <div
              className="h-full bg-[#2B2D42] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Top Control Bar: Manual Item Add & Done Action */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <button
            onClick={() => setIsManualAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EDF2F4] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-slate-800 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Once-off Item</span>
          </button>

          <div className="flex items-center gap-2">
            {undoStack.length > 0 && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                title="Undo last done clearing"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}

            <button
              onClick={handleDoneShopping}
              disabled={checkedCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Done ({checkedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Item Add Form Modal */}
      {isManualAddOpen && (
        <form
          onSubmit={handleAddManualItem}
          className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-1 border-b border-[#F4F1EA]">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              + Add Once-off Item
            </h3>
            <button
              type="button"
              onClick={() => setIsManualAddOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div>
            <input
              type="text"
              required
              placeholder="e.g. Paper Towels, Oat Milk, Sourdough..."
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              autoFocus
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Qty (e.g. 2)"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="text-xs font-medium px-2 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 text-center shadow-2xs"
            />

            <select
              value={manualUnit}
              onChange={(e) => setManualUnit(e.target.value)}
              className="text-xs font-medium px-2 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value as GroceryCategory)}
              className="text-xs font-medium px-1.5 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
            >
              {GROCERY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Add to List
          </button>
        </form>
      )}

      {/* Filter Tabs & Category Selector */}
      <div className="flex items-center justify-between gap-2">
        <div className="grid grid-cols-3 bg-[#F4F1EA] p-1 rounded-xl flex-1 border border-[#EAE6DF]">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            To Buy ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('checked')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'checked'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            In Cart ({checkedCount})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({totalCount})
          </button>
        </div>

        <button
          onClick={handleRegenerate}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#EAE6DF] text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
          title="Refresh items from Meal Plan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-[#2B2D42] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-[#EAE6DF] hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>

        {GROCERY_CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat).length;
          if (count === 0) return null;
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
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Items List Grouped by Category in Pure White #FFFFFF Cards */}
      {displayItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-[#EAE6DF] space-y-2 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto opacity-60" />
          <h4 className="text-sm font-bold text-slate-900">
            {activeTab === 'checked' ? 'No items in cart' : 'All items purchased!'}
          </h4>
          <p className="text-xs text-slate-500">
            Plan recipes in your calendar or add manual items to build your grocery list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([cat, catItems]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {cat} ({catItems.length})
                </h4>
              </div>

              <div className="bg-white rounded-2xl p-2 border border-[#EAE6DF] divide-y divide-[#F4F1EA] shadow-sm">
                {catItems.map((item) => {
                  const isEditing = editingItemId === item.id;
                  const isInPantry = item.inPantry;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isEditing && handleToggleItem(item.id)}
                      className={`p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                        item.checked
                          ? 'bg-[#FDFBF7]/60 opacity-50'
                          : isInPantry
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-[#FDFBF7]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                            item.checked
                              ? 'bg-[#2B2D42] text-white shadow-xs'
                              : isInPantry
                              ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border border-slate-300 bg-white'
                          }`}
                          title={isInPantry ? 'Already in Pantry stock' : undefined}
                        >
                          {item.checked ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : isInPantry ? (
                            <Home className="w-3 h-3 text-emerald-700" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs font-bold truncate ${
                                item.checked
                                  ? 'line-through text-slate-400'
                                  : isInPantry
                                  ? 'text-emerald-900 font-semibold'
                                  : 'text-slate-800'
                              }`}
                            >
                              {item.name}
                            </span>

                            {/* Pantry Auto Half-Mark Badge with Substitute Notice */}
                            {isInPantry && !item.checked && (
                              <span className="text-[9px] font-extrabold tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                                <span>🏡</span>
                                <span>{item.pantrySubstituteNote ? item.pantrySubstituteNote : 'In Pantry (Have at home)'}</span>
                              </span>
                            )}
                          </div>
                          
                          {item.sourceDishes && item.sourceDishes.length > 0 && (
                            <span className="text-[10px] text-slate-400 truncate block">
                              For: {item.sourceDishes.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity display / Inline Editor */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 pl-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={editingAmount}
                              onChange={(e) =>
                                setEditingAmount(e.target.value === '' ? '' : Number(e.target.value))
                              }
                              className="w-14 text-xs font-bold px-1.5 py-1 bg-white text-slate-900 border border-slate-400 rounded-lg text-center"
                            />
                            <input
                              type="text"
                              value={editingUnit}
                              onChange={(e) => setEditingUnit(e.target.value)}
                              className="w-12 text-xs font-bold px-1.5 py-1 bg-white text-slate-900 border border-slate-400 rounded-lg text-center"
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1 bg-[#2B2D42] text-white rounded-lg text-xs font-bold"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-[#F4F1EA] border border-[#EAE6DF] px-2 py-1 rounded-lg hover:bg-[#EAE6DF] transition cursor-pointer"
                            title="Edit quantity"
                          >
                            <span>
                              {item.amount !== null ? `${item.amount} ` : ''}
                              {item.unit || 'pcs'}
                            </span>
                            <Edit2 className="w-2.5 h-2.5 opacity-50" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
