import React, { useState, useRef, useEffect } from 'react';
import type { Dish, GroceryCategory, Ingredient, MasterIngredient } from '../../types';
import { GROCERY_CATEGORIES } from '../../types';
import { X, Plus, Trash2, BookmarkPlus, Check, Camera, Image as ImageIcon, ArrowDown, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { useLanguage } from '../../i18n/LanguageContext';

const DISH_EMOJIS = ['🍲', '🧆', '🍝', '🍗', '🥩', '🍣', '🌮', '🥑', '🥗', '🍛', '🍕', '🍤', '🥪', '🥘', '🍳', '🥞', '🥣'];
const COMMON_UNITS = ['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'pcs', 'slices', 'can', 'packet', 'stalks', 'cloves', 'cup', 'pinch'];

interface DishFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dish: Dish) => void;
  initialDish?: Dish | null;
  masterIngredients: MasterIngredient[];
  onAddMasterIngredient?: (ing: MasterIngredient) => void;
}

export const DishFormModal: React.FC<DishFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDish,
  masterIngredients,
  onAddMasterIngredient
}) => {
  const { language, t, formatCategory, formatCuisine } = useLanguage();
  const targetTranslationLang = language === 'zh-CN' ? 'en' : 'zh-CN';

  const [name, setName] = useState(initialDish?.name || '');
  const [category, setCategory] = useState(initialDish?.category || 'Dinner');
  const [cuisine, setCuisine] = useState(initialDish?.cuisine || 'Asian');
  const [servings, setServings] = useState(initialDish?.servings || 4);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | undefined>(initialDish?.prepTimeMinutes || 20);
  const [imageEmoji, setImageEmoji] = useState(initialDish?.imageEmoji || '🍲');
  const [imageUrl, setImageUrl] = useState(initialDish?.imageUrl || '');
  const [instructions, setInstructions] = useState(initialDish?.instructions || '');
  const [tagsInput, setTagsInput] = useState(initialDish?.tags?.join(', ') || '');
  const [isFamilyRecipe, setIsFamilyRecipe] = useState(initialDish?.isFamilyRecipe ?? true);

  // Optional Multilingual Translation State
  const existingAltTrans = initialDish?.translations?.[targetTranslationLang];
  const [showTranslationSection, setShowTranslationSection] = useState(Boolean(existingAltTrans?.name));
  const [altName, setAltName] = useState(existingAltTrans?.name || '');
  const [altInstructions, setAltInstructions] = useState(existingAltTrans?.instructions || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialDish?.ingredients && initialDish.ingredients.length > 0
      ? initialDish.ingredients
      : [
          { id: 'ing_temp_1', name: '', amount: null, unit: 'g', category: 'Produce' }
        ]
  );
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  const [addedToLibraryMap, setAddedToLibraryMap] = useState<Record<number, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [ingredientAddedToast, setIngredientAddedToast] = useState(false);

  const recipePhotoInputRef = useRef<HTMLInputElement>(null);
  const ingredientsEndRef = useRef<HTMLDivElement>(null);
  const newlyAddedInputRef = useRef<HTMLInputElement>(null);
  const [focusNewIndex, setFocusNewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusNewIndex !== null) {
      // Scroll into view and focus
      ingredientsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setIngredientAddedToast(true);
      const timer = setTimeout(() => setIngredientAddedToast(false), 2500);
      setFocusNewIndex(null);
      return () => clearTimeout(timer);
    }
  }, [focusNewIndex]);

  const handleRecipePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 600, 600, 0.8);
      setImageUrl(compressed);
    } catch (err) {
      setErrorMsg('Failed to process image file.');
    }
  };

  const handleAddIngredient = () => {
    const newIdx = ingredients.length;
    setIngredients([
      ...ingredients,
      {
        id: `ing_${Date.now()}_${ingredients.length + 1}`,
        name: '',
        amount: null,
        unit: 'pcs',
        category: 'Produce'
      }
    ]);
    setFocusNewIndex(newIdx);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) {
      setIngredients([{ id: `ing_${Date.now()}`, name: '', amount: null, unit: 'pcs', category: 'Produce' }]);
      return;
    }
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSelectSuggestion = (index: number, master: MasterIngredient) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      name: master.name,
      amount: master.defaultValue !== null ? master.defaultValue : updated[index].amount,
      unit: master.defaultUnit || updated[index].unit || 'pcs',
      category: master.category || updated[index].category
    };
    setIngredients(updated);
    setActiveSuggestionRow(null);
  };

  const handleQuickAddToLibrary = (index: number) => {
    const ing = ingredients[index];
    if (!ing.name.trim() || !onAddMasterIngredient) return;

    const newMaster: MasterIngredient = {
      id: `ing_lib_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: ing.name.trim(),
      defaultValue: ing.amount,
      defaultUnit: ing.unit || '',
      category: ing.category || 'Produce'
    };

    onAddMasterIngredient(newMaster);
    setAddedToLibraryMap((prev) => ({ ...prev, [index]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a recipe name.');
      return;
    }

    const validIngredients = ingredients
      .filter((ing) => ing.name.trim().length > 0)
      .map((ing) => ({
        ...ing,
        name: ing.name.trim(),
        amount: ing.amount ? Number(ing.amount) : null,
        unit: ing.unit.trim(),
        category: ing.category || 'Other'
      }));

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const translations: Dish['translations'] = {
      ...(initialDish?.translations || {})
    };

    if (altName.trim()) {
      translations[targetTranslationLang] = {
        name: altName.trim(),
        instructions: altInstructions.trim() || undefined
      };
    } else if (translations[targetTranslationLang]) {
      delete translations[targetTranslationLang];
    }

    const savedDish: Dish = {
      id: initialDish?.id || `dish_${Date.now()}`,
      canonicalId: initialDish?.canonicalId || initialDish?.id || `dish_${Date.now()}`,
      language: initialDish?.language || language,
      name: name.trim(),
      category: category.trim() || 'Dinner',
      cuisine: cuisine.trim() || 'Asian',
      servings: Number(servings) || 4,
      prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : undefined,
      imageEmoji,
      imageUrl: imageUrl || undefined,
      instructions: instructions.trim(),
      tags,
      favoritedByMembers: initialDish?.favoritedByMembers || [],
      isFamilyRecipe,
      ingredients: validIngredients,
      translations: Object.keys(translations).length > 0 ? translations : undefined,
      createdAt: initialDish?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(savedDish);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[92vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden border border-[#EAE6DF] animate-in slide-in-from-bottom-4 duration-300 relative">
        
        {/* Ingredient Added Feedback Toast Indicator */}
        {ingredientAddedToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#2B2D42] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
            <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
            <span>New ingredient line added below ↓</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F1EA] bg-[#FDFBF7]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{imageEmoji}</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {initialDish
                  ? (language === 'zh-CN' ? '编辑菜谱' : 'Edit Recipe')
                  : (language === 'zh-CN' ? '新建菜谱' : 'New Recipe')}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'zh-CN' ? '配图、食材清单与烹饪步骤' : 'Photo, ingredients & cooking notes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FDFBF7]">
          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-2 rounded-xl border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Family Cookbook Inclusion Toggle */}
          <div className="bg-white p-3.5 rounded-xl border border-[#EAE6DF] flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                {language === 'zh-CN' ? '收录至家庭常备菜谱' : 'Include in Family Cookbook'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {isFamilyRecipe
                  ? (language === 'zh-CN' ? '在家庭自制菜谱中可见' : 'Visible in Family Homemade Cookbook')
                  : (language === 'zh-CN' ? '仅保存于菜谱库' : 'Saved to System Library only')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFamilyRecipe(!isFamilyRecipe)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                isFamilyRecipe ? 'bg-[#2B2D42]' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  isFamilyRecipe ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Recipe Photo Attachment Section */}
          <div className="bg-white p-3.5 rounded-xl border border-[#EAE6DF] space-y-2 shadow-2xs">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {language === 'zh-CN' ? '菜谱封面照片 (可选)' : 'Recipe Photo (Optional)'}
            </label>

            <input
              type="file"
              ref={recipePhotoInputRef}
              accept="image/*"
              onChange={handleRecipePhotoUpload}
              className="hidden"
            />

            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-[#EAE6DF] group">
                <img
                  src={imageUrl}
                  alt="Recipe Preview"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => recipePhotoInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-700" />
                    <span>{language === 'zh-CN' ? '更换' : 'Change'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 hover:bg-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'zh-CN' ? '删除' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => recipePhotoInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-xl bg-white text-slate-500 hover:text-slate-800 flex flex-col items-center justify-center gap-1 transition active:scale-[0.99] cursor-pointer shadow-2xs"
              >
                <ImageIcon className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-semibold">
                  {language === 'zh-CN' ? '+ 上传菜谱照片' : '+ Upload Recipe Photo'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {language === 'zh-CN' ? '拍照或从相册中选取' : 'Camera or photo library'}
                </span>
              </button>
            )}
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Recipe Icon Emoji
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {DISH_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setImageEmoji(emoji)}
                  className={`text-xl p-2 rounded-xl border transition-all cursor-pointer ${
                    imageEmoji === emoji
                      ? 'border-slate-800 bg-white scale-105 shadow-xs ring-1 ring-slate-800'
                      : 'border-[#EAE6DF] bg-white hover:border-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Dish Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Recipe Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Japanese Chicken Teriyaki"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 shadow-2xs"
            />
          </div>

          {/* Category, Cuisine, Servings & Prep Time */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === 'zh-CN' ? '分类' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-500 shadow-2xs"
              >
                {['Dinner', 'Lunch', 'Breakfast', 'Snack', 'Dessert'].map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === 'zh-CN' ? '菜系' : 'Cuisine'}
              </label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-500 shadow-2xs"
              >
                {['Asian', 'Japanese', 'Korean', 'Cantonese', 'Thai', 'Vietnamese', 'Western', 'Italian', 'Mexican', 'Mediterranean', 'Other'].map((c) => (
                  <option key={c} value={c}>
                    {formatCuisine(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Servings
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-500 text-center shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Time (mins)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="20"
                value={prepTimeMinutes || ''}
                onChange={(e) => setPrepTimeMinutes(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-500 text-center shadow-2xs"
              />
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="border-t border-[#EAE6DF] pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {language === 'zh-CN' ? `食材清单 (${ingredients.length})` : `Ingredients List (${ingredients.length})`}
                </label>
                <p className="text-[10px] text-slate-500">
                  {language === 'zh-CN' ? '从食材库中匹配或自定义输入' : 'Search Master Library or type custom'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1 text-xs font-semibold text-slate-800 bg-[#EDF2F4] hover:bg-[#E2E8F0] px-3 py-1.5 rounded-xl border border-[#E2E8F0] transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600" />
                <span>{language === 'zh-CN' ? '+ 添加食材' : '+ Add Item'}</span>
              </button>
            </div>

            <div className="space-y-2.5 mt-2.5">
              {ingredients.map((ing, idx) => {
                const normName = ing.name.trim().toLowerCase();
                const matchingSuggestions = normName.length >= 1
                  ? masterIngredients
                      .filter((m) => m.name.toLowerCase().includes(normName))
                      .slice(0, 5)
                  : [];
                
                const exactMatch = masterIngredients.some((m) => m.name.toLowerCase() === normName);
                const isAddedToLib = addedToLibraryMap[idx];

                return (
                  <div
                    key={ing.id || idx}
                    className="bg-white p-3 rounded-xl border border-[#EAE6DF] space-y-2 relative shadow-2xs animate-in fade-in"
                  >
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          ref={idx === ingredients.length - 1 ? newlyAddedInputRef : null}
                          placeholder={language === 'zh-CN' ? '输入食材名称...' : 'Search ingredient...'}
                          value={ing.name}
                          onFocus={() => setActiveSuggestionRow(idx)}
                          onChange={(e) => {
                            handleIngredientChange(idx, 'name', e.target.value);
                            setActiveSuggestionRow(idx);
                          }}
                          className="flex-1 text-xs font-medium px-2.5 py-2 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Remove ingredient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Autocomplete Suggestions Dropdown */}
                      {activeSuggestionRow === idx && matchingSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-8 mt-1 z-30 bg-white rounded-xl shadow-xl border border-[#EAE6DF] py-1.5 overflow-hidden">
                          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'zh-CN' ? '食材库匹配项:' : 'Master Library Matches:'}
                          </div>
                          {matchingSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(idx, suggestion)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F1EA] text-slate-800 flex items-center justify-between transition cursor-pointer"
                            >
                              <span className="font-semibold text-slate-900">{suggestion.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {suggestion.defaultValue ? `${suggestion.defaultValue} ` : ''}
                                {suggestion.defaultUnit || ''} • {suggestion.category}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Add to Master Library */}
                    {ing.name.trim() && !exactMatch && onAddMasterIngredient && (
                      <div className="flex items-center justify-between bg-[#F4F1EA] px-2.5 py-1.5 rounded-lg text-[11px] text-slate-700">
                        <span>{language === 'zh-CN' ? '食材库暂未收录:' : 'Not in Library yet:'}</span>
                        <button
                          type="button"
                          disabled={isAddedToLib}
                          onClick={() => handleQuickAddToLibrary(idx)}
                          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition cursor-pointer ${
                            isAddedToLib
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-[#2B2D42] text-white shadow-2xs'
                          }`}
                        >
                          {isAddedToLib ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>{language === 'zh-CN' ? '已收录' : 'Added'}</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3 h-3" />
                              <span>{language === 'zh-CN' ? '+ 收录入库' : '+ Add to Library'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Quantity, Unit, Category */}
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={language === 'zh-CN' ? '用量' : 'Qty'}
                        value={ing.amount !== null && ing.amount !== undefined ? ing.amount : ''}
                        onChange={(e) =>
                          handleIngredientChange(
                            idx,
                            'amount',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        className="text-xs font-medium px-2 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 text-center"
                      />

                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="text-xs font-medium px-2 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>

                      <select
                        value={ing.category}
                        onChange={(e) =>
                          handleIngredientChange(idx, 'category', e.target.value as GroceryCategory)
                        }
                        className="text-xs font-medium px-1.5 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400"
                      >
                        {GROCERY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
              <div ref={ingredientsEndRef} />
            </div>

            {/* Bottom Add Button for convenience */}
            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full py-2.5 mt-2 rounded-xl border border-dashed border-slate-300 hover:border-slate-500 bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'zh-CN' ? '+ 添加另一行食材' : '+ Add Another Ingredient Line'}</span>
            </button>
          </div>

          {/* Cooking Instructions / Notes */}
          <div className="border-t border-[#EAE6DF] pt-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('dishes.instructionsSection')}
            </label>
            <textarea
              rows={4}
              placeholder={language === 'zh-CN' ? '1. 鸡肉腌制10分钟...&#10;2. 热油下锅煎至金黄...&#10;3. 淋入酱汁大火收汁...' : "1. Season chicken...&#10;2. Pan sear in oil for 6 mins...&#10;3. Glaze with sauce..."}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
            />
          </div>

          {/* Optional Multilingual Translation Accordion */}
          <div className="border border-dashed border-[#D6CEBF] rounded-xl p-3 bg-[#FAF8F5]">
            <button
              type="button"
              onClick={() => setShowTranslationSection(!showTranslationSection)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <span>
                  {language === 'zh-CN' ? '🌐 提供英文双语翻译 (可选)' : '🌐 Add Chinese Translation (Optional)'}
                </span>
              </div>
              {showTranslationSection ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showTranslationSection && (
              <div className="mt-3 pt-3 border-t border-[#EAE6DF] space-y-3 animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-500">
                  {language === 'zh-CN'
                    ? '输入英文菜名与步骤后，切换至英文界面时即可自动展示对应英文版本。'
                    : 'Provide the Chinese dish name and steps so users on Chinese settings see the translated version.'}
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'zh-CN' ? '英文菜名 (English Name)' : '中文菜名 (Chinese Name)'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'zh-CN' ? 'e.g. Tomato Meat Ball' : '例如：茄汁牛肉丸'}
                    value={altName}
                    onChange={(e) => setAltName(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'zh-CN' ? '英文步骤 (English Instructions)' : '中文步骤 (Chinese Instructions)'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={language === 'zh-CN' ? '1. Season ground beef...' : '1. 牛肉馅加盐调味...'}
                    value={altInstructions}
                    onChange={(e) => setAltInstructions(e.target.value)}
                    className="w-full text-xs font-medium p-3 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              {language === 'zh-CN' ? '标签 (逗号分隔)' : 'Tags (comma separated)'}
            </label>
            <input
              type="text"
              placeholder={language === 'zh-CN' ? '例如：日料, 20分钟, 快手菜' : 'e.g. Japanese, 20 mins, Kid Friendly'}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
            />
          </div>
        </form>

        {/* Modal Action Bar */}
        <div className="p-4 border-t border-[#F4F1EA] bg-white flex items-center justify-end gap-2 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            {initialDish
              ? (language === 'zh-CN' ? '保存修改' : 'Save Changes')
              : (language === 'zh-CN' ? '创建菜谱' : 'Create Recipe')}
          </button>
        </div>
      </div>
    </div>
  );
};
