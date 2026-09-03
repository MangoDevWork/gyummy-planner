import React, { useState, useMemo } from 'react';
import type { GroceryItem } from '../../types';
import {
  X,
  Check,
  ExternalLink,
  Copy,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Home,
  Store,
  Layers
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  type AustralianSupermarket,
  type StandardizedSupermarketItem,
  SUPERMARKET_AISLES,
  standardizeToAustralianSupermarket,
  buildWoolworthsSearchUrl,
  buildColesSearchUrl,
  formatSupermarketShoppingList,
  buildSupermarketEdiPayload
} from '../../services/australianSupermarketService';

interface SupermarketCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawGroceryItems: GroceryItem[];
  familyName: string;
  dateRangeText?: string;
  onShowToast?: (msg: string) => void;
}

export const SupermarketCartModal: React.FC<SupermarketCartModalProps> = ({
  isOpen,
  onClose,
  rawGroceryItems,
  familyName,
  dateRangeText = 'Weekly Meals',
  onShowToast
}) => {
  const { language } = useLanguage();

  const [supermarket, setSupermarket] = useState<AustralianSupermarket>('woolworths');
  const [showPantryItems, setShowPantryItems] = useState(false);

  // Initialize standardized items from raw groceries
  const [items, setItems] = useState<StandardizedSupermarketItem[]>(() => {
    return rawGroceryItems.map((g) =>
      standardizeToAustralianSupermarket({
        id: g.id,
        name: g.name,
        amount: g.amount,
        unit: g.unit,
        category: g.category,
        inPantry: g.inPantry,
        sourceDishes: g.sourceDishes ? Array.from(g.sourceDishes) : []
      })
    );
  });

  // Custom Item Input
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  if (!isOpen) return null;

  const selectedCount = items.filter((i) => i.selected).length;
  const pantryCount = items.filter((i) => i.inPantry).length;

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add custom manual item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newItemName.trim();
    if (!clean) return;

    const customStandard = standardizeToAustralianSupermarket({
      name: clean,
      amount: 1,
      unit: newItemQty.trim() || '1 pack',
      inPantry: false
    });

    setItems((prev) => [customStandard, ...prev]);
    setNewItemName('');
    setNewItemQty('');
    if (onShowToast) onShowToast(`+ Added "${clean}"`);
  };

  // Copy shopping list
  const handleCopyList = () => {
    const formatted = formatSupermarketShoppingList(supermarket, items, dateRangeText);
    navigator.clipboard.writeText(formatted);
    if (onShowToast) {
      onShowToast(
        language === 'zh-CN'
          ? `📋 已复制 ${supermarket === 'woolworths' ? 'Woolworths' : 'Coles'} 采购清单！`
          : `📋 Copied ${supermarket === 'woolworths' ? 'Woolworths' : 'Coles'} list to clipboard!`
      );
    }
  };

  // Download / Copy EDI Payload
  const handleExportEdi = () => {
    const payload = buildSupermarketEdiPayload(supermarket, items, {
      familyName,
      weekRange: dateRangeText
    });
    const jsonStr = JSON.stringify(payload, null, 2);

    // Create a downloadable file
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gyummy_edi_${supermarket}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onShowToast) onShowToast('💾 Downloaded supermarket EDI / JSON payload');
  };

  // Group items by aisle
  const groupedAisles = useMemo(() => {
    const map = new Map<string, StandardizedSupermarketItem[]>();

    SUPERMARKET_AISLES.forEach((aisle) => map.set(aisle, []));

    items.forEach((item) => {
      // If item is in pantry and pantry drawer is collapsed, skip
      if (item.inPantry && !showPantryItems && !item.selected) return;

      const list = map.get(item.aisle) || [];
      list.push(item);
      map.set(item.aisle, list);
    });

    return map;
  }, [items, showPantryItems]);

  const isWoolworths = supermarket === 'woolworths';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#EDE8DF] bg-[#FAF8F5] shadow-2xl dark:border-[#3D362E] dark:bg-[#1E1B18] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EDE8DF] bg-white px-5 py-4 dark:border-[#3D362E] dark:bg-[#252220]">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-xs ${
              isWoolworths ? 'bg-[#00703C]' : 'bg-[#E01A22]'
            }`}>
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#2D2640] dark:text-[#F0EDE8]">
                {language === 'zh-CN' ? '澳洲超市采购清单 (Woolworths & Coles)' : 'Australian Supermarket Staging'}
              </h2>
              <p className="text-[11px] font-semibold text-[#8A7A70] dark:text-[#9A8A7E]">
                {language === 'zh-CN' ? '已自动排除储藏室既有食材 · 支持在线直通与 EDI' : 'Auto-excludes in-pantry staples · 1-click store search & EDI'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#7A6E64] hover:bg-[#EDE8DF] dark:bg-[#2E2A26] dark:text-[#9A9088] cursor-pointer transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Supermarket Selector Tabs */}
        <div className="bg-white px-5 pt-1 pb-3 border-b border-[#EDE8DF] dark:border-[#3D362E] dark:bg-[#252220]">
          <div className="flex rounded-2xl bg-[#F5F0E8] dark:bg-[#2E2A26] p-1 gap-1 border border-[#EDE8DF] dark:border-[#38332E]">
            <button
              type="button"
              onClick={() => setSupermarket('woolworths')}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isWoolworths
                  ? 'bg-[#00703C] text-white shadow-sm'
                  : 'text-[#7A6E64] hover:text-[#2D2640] dark:text-[#9A9088]'
              }`}
            >
              <span>🍏</span>
              <span>Woolworths (Woolies)</span>
            </button>
            <button
              type="button"
              onClick={() => setSupermarket('coles')}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                !isWoolworths
                  ? 'bg-[#E01A22] text-white shadow-sm'
                  : 'text-[#7A6E64] hover:text-[#2D2640] dark:text-[#9A9088]'
              }`}
            >
              <span>❤️</span>
              <span>Coles Supermarkets</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Pantry Filter Banner & Toggle */}
          <div className="rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-[#2D6A4A] dark:text-[#4CAF82]" />
                <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN'
                    ? `待采 ${selectedCount} 项 · 已自动过滤 ${pantryCount} 项已有调味品`
                    : `${selectedCount} items queued · ${pantryCount} pantry staples auto-excluded`}
                </span>
              </div>

              {pantryCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPantryItems(!showPantryItems)}
                  className="flex items-center gap-0.5 text-[11px] font-bold text-[#7A5C00] dark:text-[#FFD13B] hover:underline cursor-pointer"
                >
                  <span>{showPantryItems ? (language === 'zh-CN' ? '隐藏储藏室' : 'Hide Pantry') : (language === 'zh-CN' ? '查看已排除' : 'Show Excluded')}</span>
                  {showPantryItems ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {showPantryItems && (
              <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E] border-t border-[#EDE8DF] pt-2 dark:border-[#38332E]">
                {language === 'zh-CN'
                  ? '💡 提示：若米、油、酱油等调味品已用完，勾选即可将其重新加入采购单。'
                  : '💡 Tip: If you ran out of staples like oil, rice, or soy sauce, check them to include them.'}
              </p>
            )}
          </div>

          {/* Quick Add Custom Item */}
          <form onSubmit={handleAddCustomItem} className="flex gap-2">
            <input
              type="text"
              placeholder={language === 'zh-CN' ? '+ 添加额外采购 (如: 全脂牛奶, 咖啡, 苹果)' : '+ Add extra item (e.g. Milk, Bread, Coffee)'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 rounded-xl border border-[#EDE8DF] bg-white px-3.5 py-2 text-xs font-bold text-[#2D2640] placeholder:text-[#A89F95] focus:border-[#FFD13B] focus:outline-none dark:border-[#3D362E] dark:bg-[#252220] dark:text-[#F0EDE8] shadow-2xs"
            />
            <input
              type="text"
              placeholder="Qty (2L, 1kg)"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="w-24 rounded-xl border border-[#EDE8DF] bg-white px-2.5 py-2 text-xs font-bold text-[#2D2640] placeholder:text-[#A89F95] focus:border-[#FFD13B] focus:outline-none dark:border-[#3D362E] dark:bg-[#252220] dark:text-[#F0EDE8] shadow-2xs"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-[#FFD13B] px-3 py-2 text-xs font-black text-[#2D2640] hover:bg-[#FFC200] transition cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{language === 'zh-CN' ? '添加' : 'Add'}</span>
            </button>
          </form>

          {/* Aisle Groups */}
          <div className="space-y-4">
            {SUPERMARKET_AISLES.map((aisle) => {
              const aisleItems = groupedAisles.get(aisle) || [];
              if (aisleItems.length === 0) return null;

              return (
                <div
                  key={aisle}
                  className="rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-[#EDE8DF] pb-2 dark:border-[#38332E]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#FFD13B]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                        {aisle} ({aisleItems.length})
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {aisleItems.map((item) => {
                      const searchUrl = isWoolworths
                        ? buildWoolworthsSearchUrl(item.australianSearchTerm)
                        : buildColesSearchUrl(item.australianSearchTerm);

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            item.selected
                              ? 'bg-[#FAF7F2] border-[#EDE8DF] dark:bg-[#1E1B18] dark:border-[#38332E]'
                              : 'bg-white border-dashed border-[#EDE8DF] opacity-50 dark:bg-[#252220] dark:border-[#38332E]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleItemSelection(item.id)}
                              className={`h-5 w-5 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                item.selected
                                  ? 'bg-[#FFD13B] border-[#2D2640]/10 text-[#2D2640]'
                                  : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#28231E]'
                              }`}
                            >
                              {item.selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </button>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className={`text-xs font-black truncate block ${
                                  item.selected ? 'text-[#2D2640] dark:text-[#F0EDE8]' : 'text-[#8A7A70] line-through'
                                }`}>
                                  {item.australianSearchTerm}
                                </span>
                                <span className="text-[11px] font-bold text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] px-1.5 py-0.2 rounded-md">
                                  {item.quantityText}
                                </span>
                              </div>

                              {item.originalName !== item.australianSearchTerm && (
                                <span className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E] truncate block">
                                  {item.originalName}
                                </span>
                              )}
                              
                              {item.inPantry && (
                                <span className="text-[9px] font-bold text-[#2D6A4A] dark:text-[#4CAF82]">
                                  🏠 {language === 'zh-CN' ? '储藏室既有' : 'In Pantry'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions: Store Search Link + Delete */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <a
                              href={searchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`py-1 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition ${
                                isWoolworths
                                  ? 'bg-[#00703C]/10 text-[#00703C] hover:bg-[#00703C] hover:text-white dark:bg-[#00703C]/20 dark:text-[#4CAF82]'
                                  : 'bg-[#E01A22]/10 text-[#E01A22] hover:bg-[#E01A22] hover:text-white dark:bg-[#E01A22]/20 dark:text-rose-400'
                              }`}
                              title={`Search "${item.australianSearchTerm}" on ${isWoolworths ? 'Woolworths' : 'Coles'}`}
                            >
                              <span>{isWoolworths ? 'Woolies' : 'Coles'}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-[#A89F95] hover:text-rose-600 transition cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="border-t border-[#EDE8DF] bg-white px-5 py-3.5 dark:border-[#3D362E] dark:bg-[#252220] flex items-center justify-between gap-2">
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyList}
              className="flex items-center gap-1.5 rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#252220] dark:text-[#F0EDE8] transition cursor-pointer"
              title="Copy formatted list to clipboard"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{language === 'zh-CN' ? '复制清单' : 'Copy List'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportEdi}
              className="flex items-center gap-1.5 rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#252220] dark:text-[#F0EDE8] transition cursor-pointer"
              title="Download B2B / EDI JSON structure"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{language === 'zh-CN' ? '导出 EDI' : 'EDI JSON'}</span>
            </button>
          </div>

          <a
            href={isWoolworths ? 'https://www.woolworths.com.au' : 'https://www.coles.com.au'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 rounded-2xl py-2.5 px-4 text-xs font-black text-white shadow-sm active:scale-95 transition ${
              isWoolworths ? 'bg-[#00703C] hover:bg-[#005a30]' : 'bg-[#E01A22] hover:bg-[#c2141c]'
            }`}
          >
            <span>{isWoolworths ? '打开 Woolworths 官网' : '打开 Coles 官网'}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

        </div>

      </div>
    </div>
  );
};
