import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Dish, MasterIngredient, UserProfile, MemberPreferences, FamilyPersonalisation } from '../../types';
import {
  Search,
  Plus,
  Clock,
  Heart,
  ChevronDown,
  ShieldCheck,
  BookmarkCheck,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { DishDetailModal } from './DishDetailModal';
import { DishFormModal } from './DishFormModal';
import { loadMasterSystemRecipes } from '../../services/systemRecipesService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish, searchMatchesLocalizedDish } from '../../services/dataLocalizationService';
import { checkDishAllergenRisk, getAllergenById } from '../../services/personalisationService';

interface DishesViewProps {
  familyName: string;
  currentProfile: UserProfile | null;
  familyMembers?: string[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
  dishes: Dish[];
  masterIngredients: MasterIngredient[];
  initialScope?: 'family' | 'system';
  showSystemGuideHint?: boolean;
  onSaveDish: (dish: Dish) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleFavoriteDish: (dishId: string) => void;
  onToggleFamilyRecipe?: (dishId: string) => void;
  onAddMasterIngredient?: (ing: MasterIngredient) => void;
  onImportDishes?: (dishes: Dish[]) => void;
  onQuickPlanDish?: (dish: Dish) => void;
  isCreatorOpen: boolean;
  setIsCreatorOpen: (open: boolean) => void;
}

const CUISINES = [
  'All Cuisines',
  'Chinese',
  'Cantonese',
  'Japanese',
  'Korean',
  'Asian',
  'Western',
  'Italian',
  'American',
  'French',
  'Thai',
  'Vietnamese',
  'Mexican',
  'Mediterranean',
  'Indian',
  'Other'
];

function matchesCuisineFilter(dish: Dish, selectedCuisine: string): boolean {
  if (!selectedCuisine || selectedCuisine === 'All Cuisines') return true;
  const target = selectedCuisine.toLowerCase().trim();

  const cuisineAliases: Record<string, string[]> = {
    'chinese': ['chinese', 'cantonese', 'sichuan', 'taiwanese', '中餐', '粤菜', '川菜', '鲁菜', '中国', '中华料理', '港式', '广府', '华裔', 'asian/chinese'],
    'cantonese': ['cantonese', 'chinese', '粤菜', '中餐', '广府', '港式', '中华料理', '中国'],
    'japanese': ['japanese', 'japan', '日料', '日式', '和风', '日本', 'teriyaki', 'ramen', 'udon', 'sushi', 'miso', 'yakitori'],
    'korean': ['korean', 'korea', '韩料', '韩式', '韩国', 'bulgogi', 'kimchi', 'bibimbap'],
    'asian': ['asian', 'chinese', 'cantonese', 'japanese', 'korean', 'thai', 'vietnamese', 'malaysian', 'indonesian', 'filipino', 'singapore', '亚洲', '中餐', '日料', '韩料', '泰式', '越式', '东南亚'],
    'western': ['western', 'american', 'european', 'italian', 'french', 'british', 'australian', 'spanish', 'german', '西餐', '欧美', '美式', '意式', '法餐', 'pasta', 'burger', 'steak'],
    'italian': ['italian', 'italy', 'italia', '意式', '意大利', '意餐', 'pasta', 'pizza', 'risotto', 'lasagna', 'bolognese'],
    'american': ['american', 'usa', 'us', 'burger', 'bbq', '美式', '美国', 'cajun', 'tex-mex', 'fried chicken'],
    'french': ['french', 'france', '法餐', '法式', '法国', 'butter', 'wine', 'quiche'],
    'thai': ['thai', 'thailand', '泰式', '泰国', '泰餐', 'curry', 'pad thai', 'tom yum'],
    'vietnamese': ['vietnamese', 'vietnam', '越式', '越南', 'pho', 'lemongrass', 'banh mi'],
    'mexican': ['mexican', 'mexico', 'tex-mex', '墨西哥', 'taco', 'burrito', 'quesadilla', 'salsa', 'enchilada'],
    'mediterranean': ['mediterranean', 'greek', 'greece', '地中海', '希腊', 'tzatziki'],
    'indian': ['indian', 'india', 'curry', '印度', '咖喱', 'tikka', 'masala', 'naan'],
    'other': ['other', '其他']
  };

  const aliases = cuisineAliases[target] || [target];

  const check = (val?: any): boolean => {
    if (!val || typeof val !== 'string') return false;
    const lower = val.toLowerCase().trim();
    return aliases.some((a) => lower.includes(a) || a.includes(lower));
  };

  if (check(dish.cuisine)) return true;
  if (Array.isArray(dish.tags)) {
    if (dish.tags.some((t) => check(t))) return true;
  }
  if (check(dish.name)) return true;
  return false;
}

const QUICK_FILTERS = [
  { id: 'under_20m', label: '⚡ Under 20 Mins', labelZh: '⚡ 20分钟快手菜', type: 'time', maxTime: 20 },
  { id: 'chicken', label: '🍗 Chicken', labelZh: '🍗 鸡肉料理', type: 'keyword', keyword: 'chicken 鸡' },
  { id: 'beef_pork', label: '🥩 Beef & Pork', labelZh: '🥩 牛肉/猪肉', type: 'keyword', keyword: 'beef pork 牛 猪' },
  { id: 'seafood', label: '🐟 Seafood', labelZh: '🐟 海鲜水产', type: 'keyword', keyword: 'fish salmon shrimp prawn seafood 鱼 虾 蟹 海鲜' },
  { id: 'veggie', label: '🥦 Veggie & Tofu', labelZh: '🥦 素食与豆腐', type: 'keyword', keyword: 'tofu vegetable broccoli mushroom vegetarian 豆腐 素 蔬菜' },
  { id: 'noodles_rice', label: '🍜 Noodles & Rice', labelZh: '🍜 饭面主食', type: 'keyword', keyword: 'rice noodle pasta udon ramen fried rice 面 饭 粉' }
];

const INITIAL_BATCH_SIZE = 30;

export const DishesView: React.FC<DishesViewProps> = ({
  currentProfile,
  familyMembers = [],
  memberProfiles,
  familyPersonalisation,
  dishes,
  masterIngredients,
  onSaveDish,
  onDeleteDish,
  onToggleFavoriteDish,
  onToggleFamilyRecipe,
  onQuickPlanDish,
  isCreatorOpen,
  setIsCreatorOpen,
  initialScope = 'family'
}) => {
  const { language, formatCategory, formatCuisine } = useLanguage();
  const [scope, setScope] = useState<'family' | 'system'>(initialScope);

  useEffect(() => {
    setScope(initialScope || 'family');
  }, [initialScope]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All Cuisines');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'timesPlanned' | 'prepTime' | 'name'>('timesPlanned');
  
  // Auto-flag "Safe for family" if Family Safety Mode (strictAllergyFilter) is active
  const [safeOnly, setSafeOnly] = useState<boolean>(() => {
    return familyPersonalisation?.strictAllergyFilter !== false;
  });

  useEffect(() => {
    if (familyPersonalisation?.strictAllergyFilter !== undefined) {
      setSafeOnly(familyPersonalisation.strictAllergyFilter);
    }
  }, [familyPersonalisation?.strictAllergyFilter]);

  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [systemRecipes, setSystemRecipes] = useState<Dish[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Animated flying icon state
  const [flyingDish, setFlyingDish] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const [isCookbookPulsing, setIsCookbookPulsing] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const currentMember = currentProfile?.memberName || '';

  // Load system recipe dataset
  useEffect(() => {
    let isMounted = true;
    const fetchSystem = async () => {
      try {
        const loaded = await loadMasterSystemRecipes();
        if (isMounted) setSystemRecipes(loaded);
      } catch (err) {
        console.error('Failed to load system recipes:', err);
      }
    };
    fetchSystem();
    return () => { isMounted = false; };
  }, []);

  // Family cookbook vs Library
  const activeDataset = useMemo(() => {
    if (scope === 'family') {
      return dishes.filter((d) => d.isFamilyRecipe !== false);
    }
    // Recipe Library: system recipes + user custom dishes that aren't yet in family cookbook
    const familyMap = new Map<string, Dish>();
    dishes.forEach((d) => familyMap.set(d.id, d));
    const combined = [...dishes];
    systemRecipes.forEach((sys) => {
      if (!familyMap.has(sys.id)) combined.push(sys);
    });
    return combined;
  }, [scope, dishes, systemRecipes]);

  // Filtering & Sorting
  const filteredDishes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return activeDataset.filter((dish) => {
      const loc = getLocalizedDish(dish, language);

      if (q && !searchMatchesLocalizedDish(dish, q, language)) return false;
      if (!matchesCuisineFilter(dish, selectedCuisine)) return false;

      if (selectedQuickFilter) {
        const qf = QUICK_FILTERS.find((f) => f.id === selectedQuickFilter);
        if (qf?.type === 'time' && (dish.prepTimeMinutes || 0) > (qf.maxTime || 0)) return false;
        if (qf?.type === 'keyword' && qf.keyword) {
          const keys = qf.keyword.split(' ');
          const combinedStr = `${dish.name} ${loc.name} ${dish.category} ${dish.cuisine || ''} ${dish.ingredients.map((i) => i.name).join(' ')}`.toLowerCase();
          if (!keys.some((k) => combinedStr.includes(k))) return false;
        }
      }

      if (safeOnly) {
        const risk = checkDishAllergenRisk(dish, memberProfiles, familyMembers, familyPersonalisation);
        if (risk.hasRisk) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'timesPlanned') {
        const planA = a.timesPlanned || 0;
        const planB = b.timesPlanned || 0;
        if (planB !== planA) return planB - planA;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'prepTime') return (a.prepTimeMinutes || 0) - (b.prepTimeMinutes || 0);
      return a.name.localeCompare(b.name);
    });
  }, [activeDataset, searchQuery, selectedCuisine, selectedQuickFilter, safeOnly, sortBy, language, memberProfiles, familyMembers]);

  // Infinite scroll
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedCuisine, selectedQuickFilter, safeOnly, sortBy, scope]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + INITIAL_BATCH_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredDishes.length]);

  const displayedDishes = useMemo(() => {
    return filteredDishes.slice(0, visibleCount);
  }, [filteredDishes, visibleCount]);

  const familySavedCount = useMemo(() => {
    return dishes.filter((d) => d.isFamilyRecipe !== false).length;
  }, [dishes]);

  // Helper to format human-friendly allergen names
  const formatAllergenList = (allergens: string[]) => {
    return allergens.map((a) => {
      const def = getAllergenById(a);
      if (def) {
        return language === 'zh-CN' ? def.nameZh : def.nameEn;
      }
      // Convert raw snake_case like "cow_milk" -> "Milk"
      return a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }).join(', ');
  };

  // Add to Cookbook with flying animation & feedback
  const handleAddToCookbook = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    if (!onToggleFamilyRecipe) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setFlyingDish({
      id: dish.id,
      name: dish.name,
      x: rect.left + rect.width / 2,
      y: rect.top
    });

    onToggleFamilyRecipe(dish.id);
    setIsCookbookPulsing(true);
    showToast(language === 'zh-CN' ? `📖 已加入家庭菜谱：${dish.name}` : `📖 Added "${dish.name}" to Family Cookbook!`);

    setTimeout(() => {
      setFlyingDish(null);
      setTimeout(() => setIsCookbookPulsing(false), 600);
    }, 800);
  };

  return (
    <div className="px-4 pb-28 pt-4 max-w-md mx-auto relative">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1E1B2E] dark:bg-[#F5F2EB] text-white dark:text-[#1E1B2E] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#1E1B2E]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Floating Flying Animation Element */}
      {flyingDish && (
        <div
          className="fixed pointer-events-none z-50 text-2xl flex items-center justify-center animate-out transition-all duration-700 ease-in-out"
          style={{
            left: `${flyingDish.x}px`,
            top: `${flyingDish.y}px`,
            transform: 'translate(-50%, -50%) scale(0.6)',
            animation: 'flyToCookbook 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
          }}
        >
          <div className="bg-[#FFD13B] text-[#1E1B2E] p-2 rounded-2xl shadow-2xl border border-white flex items-center gap-1 text-xs font-bold">
            <BookOpen className="w-4 h-4" />
            <span>+1</span>
          </div>
        </div>
      )}

      {/* Scope Switcher with Book icon & feedback pulse */}
      <div className="mb-4 flex rounded-full border border-[#EDE8DF] bg-white p-1 dark:border-[#3D362E] dark:bg-[#2A2520] shadow-2xs">
        <button
          type="button"
          onClick={() => setScope('family')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] font-bold transition-all cursor-pointer ${
            scope === 'family'
              ? 'bg-[#FFD13B] text-[#1E1B2E] shadow-xs'
              : 'text-[#786F66] hover:text-[#1E1B2E] dark:text-[#A39C90] dark:hover:text-[#F5F2EB]'
          } ${isCookbookPulsing ? 'scale-105 ring-2 ring-[#FFD13B] transition-transform duration-300' : ''}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{language === 'zh-CN' ? `家庭菜谱 (${familySavedCount})` : `Family Cookbook (${familySavedCount})`}</span>
        </button>
        <button
          type="button"
          onClick={() => setScope('system')}
          className={`flex-1 rounded-full py-2 text-[12.5px] font-bold transition-all cursor-pointer ${
            scope === 'system'
              ? 'bg-[#FFD13B] text-[#1E1B2E] shadow-xs'
              : 'text-[#786F66] hover:text-[#1E1B2E] dark:text-[#A39C90] dark:hover:text-[#F5F2EB]'
          }`}
        >
          <span>{language === 'zh-CN' ? '3,000+ 菜谱库' : 'Recipe Library'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89F95]" />
        <input
          type="text"
          placeholder={language === 'zh-CN' ? '搜索 3,000+ 道菜谱或食材...' : 'Search 3,000+ recipes...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-[13px] text-[#1E1B2E] placeholder:text-[#A89F95] focus:border-[#FFD13B] focus:outline-none dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB] shadow-2xs"
        />
      </div>

      {/* Filter Row */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSafeOnly(!safeOnly)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-all cursor-pointer ${
            safeOnly
              ? 'border-[#2D6A4A]/30 bg-[#E8F5ED] text-[#2D6A4A] dark:bg-[#1E2E24] dark:text-[#5ECB8D] shadow-2xs'
              : 'border-[#EDE8DF] bg-white text-[#786F66] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90]'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{language === 'zh-CN' ? '全家无过敏' : 'Safe for family'}</span>
        </button>

        {/* Cuisine Select Dropdown */}
        <div className="relative">
          <select
            value={selectedCuisine}
            onChange={(e) => setSelectedCuisine(e.target.value)}
            className="appearance-none inline-flex items-center gap-1 rounded-full border border-[#EDE8DF] bg-white pl-3 pr-7 py-1.5 text-[11.5px] font-bold text-[#786F66] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90] focus:outline-none cursor-pointer"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c === 'All Cuisines' ? (language === 'zh-CN' ? '全部菜系' : 'All Cuisines') : formatCuisine(c)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#786F66]" />
        </div>

        {/* Sort Select */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none inline-flex items-center gap-1 rounded-full border border-[#EDE8DF] bg-white pl-3 pr-7 py-1.5 text-[11.5px] font-bold text-[#786F66] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90] focus:outline-none cursor-pointer"
          >
            <option value="timesPlanned">{language === 'zh-CN' ? '按排餐偏好' : 'Most Popular'}</option>
            <option value="prepTime">{language === 'zh-CN' ? '按耗时最短' : 'Quickest'}</option>
            <option value="name">{language === 'zh-CN' ? '按名称排序' : 'Alphabetical'}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#786F66]" />
        </div>
      </div>

      {/* Quick Filters Row */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {QUICK_FILTERS.map((qf) => {
          const isSel = selectedQuickFilter === qf.id;
          return (
            <button
              key={qf.id}
              type="button"
              onClick={() => setSelectedQuickFilter(isSel ? null : qf.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                isSel
                  ? 'bg-[#FFD13B] text-[#1E1B2E] font-bold shadow-2xs'
                  : 'border border-[#EDE8DF] bg-white text-[#786F66] hover:bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90]'
              }`}
            >
              {language === 'zh-CN' ? qf.labelZh : qf.label}
            </button>
          );
        })}
      </div>

      {/* ─── Family Cookbook Scope: 2-Column Grid ─── */}
      {scope === 'family' ? (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#A89F95]">
            {filteredDishes.length} {language === 'zh-CN' ? '道已存菜谱' : 'saved recipes'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {displayedDishes.map((recipe) => {
              const loc = getLocalizedDish(recipe, language);
              const isFav = currentMember ? recipe.favoritedByMembers?.includes(currentMember) : false;

              return (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedDish(recipe)}
                  className="relative flex flex-col items-start rounded-2xl border border-[#EDE8DF] bg-white p-3 text-left shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520] cursor-pointer transition-all active:scale-98 hover:border-[#FFD13B]/70 hover:shadow-sm overflow-hidden group"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavoriteDish(recipe.id);
                    }}
                    className={`absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer backdrop-blur-xs ${
                      isFav ? 'bg-rose-50 text-[#E05050] dark:bg-rose-950/40' : 'bg-white/80 dark:bg-[#2A2520]/80 text-[#A89F95]'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${isFav ? 'fill-[#E05050]' : ''}`}
                    />
                  </button>

                  {/* Real Food Photo or Emoji */}
                  <div className="w-full h-28 rounded-xl bg-[#FAF8F5] dark:bg-[#221E1A] overflow-hidden flex items-center justify-center mb-2 border border-[#F0ECE1] dark:border-[#383129]">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl" aria-hidden="true">
                        {recipe.imageEmoji || '🍲'}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 w-full">
                    <p className="text-[13.5px] font-bold leading-tight text-[#1E1B2E] truncate dark:text-[#F5F2EB]">
                      {loc.name}
                    </p>
                    
                    {/* Allergen warning tag on Family Cookbook card */}
                    {(() => {
                      const risk = checkDishAllergenRisk(recipe, memberProfiles, familyMembers, familyPersonalisation);
                      if (!risk.hasRisk || !risk.affectedMembers || risk.affectedMembers.length === 0) return null;
                      return (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 truncate max-w-full">
                            ⚠️ {risk.affectedMembers.map((m) => `${m.memberName}: ${formatAllergenList(m.allergens)}`).join('; ')}
                          </span>
                        </div>
                      );
                    })()}

                    <p className="mt-1 text-[11px] text-[#786F66] dark:text-[#A39C90] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A89F95]" />
                      <span>{recipe.prepTimeMinutes || 20} min</span>
                      <span className="text-[#D0C8C0]">•</span>
                      <span className="truncate">{recipe.cuisine ? formatCuisine(recipe.cuisine) : formatCategory(recipe.category)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Recipe Library Scope: Neatly structured, never overflowing ─── */
        <div className="space-y-3">
          {displayedDishes.map((recipe) => {
            const loc = getLocalizedDish(recipe, language);
            const isInCookbook = recipe.isFamilyRecipe !== false;
            const risk = checkDishAllergenRisk(recipe, memberProfiles, familyMembers, familyPersonalisation);

            return (
              <div
                key={recipe.id}
                className="rounded-2xl border border-[#EDE8DF] bg-white p-3 shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520] hover:border-[#FFD13B]/60 transition-all overflow-hidden"
              >
                <div className="flex gap-3 items-start">
                  {/* Recipe Image / Thumbnail */}
                  <button
                    type="button"
                    onClick={() => setSelectedDish(recipe)}
                    className="w-22 h-22 shrink-0 rounded-2xl bg-[#FAF8F5] dark:bg-[#221E1A] overflow-hidden flex items-center justify-center cursor-pointer border border-[#F0ECE1] dark:border-[#383129] relative group mt-0.5"
                    aria-label={`Open ${loc.name}`}
                  >
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl">
                        {recipe.imageEmoji || '🍲'}
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    {/* Title */}
                    <p
                      onClick={() => setSelectedDish(recipe)}
                      className="text-[14px] font-bold leading-snug text-[#1E1B2E] line-clamp-2 dark:text-[#F5F2EB] cursor-pointer hover:text-[#FFC720] transition-colors"
                    >
                      {loc.name}
                    </p>

                    {/* Allergen Warning Banner (Wrapped neatly without clipping) */}
                    {risk.hasRisk && risk.affectedMembers && risk.affectedMembers.length > 0 && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 max-w-full text-wrap leading-tight">
                          ⚠️ {risk.affectedMembers.map((m) => `${m.memberName}: ${formatAllergenList(m.allergens)}`).join('; ')}
                        </span>
                      </div>
                    )}

                    {/* Metadata tags */}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#786F66] dark:text-[#A39C90] flex-wrap">
                      <span className="px-1.5 py-0.2 rounded-md bg-[#FAF8F5] dark:bg-[#221E1A] font-semibold border border-[#EDE8DF] dark:border-[#3D362E]">
                        {recipe.cuisine ? formatCuisine(recipe.cuisine) : formatCategory(recipe.category)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#A89F95]" />
                        {recipe.prepTimeMinutes || 20} min
                      </span>
                      <span>{recipe.ingredients.length} {language === 'zh-CN' ? '种食材' : 'ingr.'}</span>
                    </div>

                    {/* Single Clean Button: Add to Cookbook (No double plus) */}
                    <div className="mt-2.5">
                      {onToggleFamilyRecipe && (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCookbook(e, recipe)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-bold transition-all cursor-pointer ${
                            isInCookbook
                              ? 'border border-[#FFD13B]/50 bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A2000] dark:text-[#FFD13B]'
                              : 'border border-[#1E1B2E]/10 bg-[#FFD13B] text-[#1E1B2E] hover:bg-[#FFC720] shadow-2xs active:scale-95'
                          }`}
                        >
                          {isInCookbook ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5" />
                              <span>{language === 'zh-CN' ? '已入菜谱' : 'In Cookbook'}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                              <span>{language === 'zh-CN' ? '加入家庭菜谱' : 'Add to Cookbook'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredDishes.length === 0 && (
        <div className="py-10 text-center text-[13px] text-[#786F66] dark:text-[#A39C90] space-y-3 bg-white dark:bg-[#2A2520] rounded-2xl border border-dashed border-[#EDE8DF] dark:border-[#3D362E] p-6">
          {safeOnly && activeDataset.length > 0 ? (
            <>
              <p className="font-semibold text-rose-600 dark:text-rose-400">
                🛡️ {language === 'zh-CN' ? '当前已存菜谱均含有家庭成员的过敏原，已被“全家无过敏”过滤隐藏。' : 'All recipes contain allergens for your family and are hidden by the "Safe for family" filter.'}
              </p>
              <button
                type="button"
                onClick={() => setSafeOnly(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFD13B] px-4 py-2 text-xs font-bold text-[#1E1B2E] shadow-2xs transition active:scale-95 cursor-pointer"
              >
                {language === 'zh-CN' ? '关闭过敏过滤，查看全部菜谱' : 'Disable Safe Filter to Show All Recipes'}
              </button>
            </>
          ) : (
            <p>🍳 {language === 'zh-CN' ? '未找到符合条件的菜谱' : 'No recipes matched your search.'}</p>
          )}
        </div>
      )}

      {/* Sentinel for infinite scroll */}
      {filteredDishes.length > visibleCount && (
        <div ref={loadMoreRef} className="py-4 text-center text-xs text-[#786F66]">
          Loading more recipes...
        </div>
      )}

      {/* Dish Detail Modal */}
      <DishDetailModal
        dish={selectedDish}
        isOpen={Boolean(selectedDish)}
        currentProfile={currentProfile}
        familyMembers={familyMembers}
        memberProfiles={memberProfiles}
        familyPersonalisation={familyPersonalisation}
        onClose={() => setSelectedDish(null)}
        onEdit={(d) => {
          setSelectedDish(null);
          setEditingDish(d);
        }}
        onDelete={(id) => {
          onDeleteDish(id);
          setSelectedDish(null);
        }}
        onToggleFavorite={onToggleFavoriteDish}
        onToggleFamilyCookbook={(d) => {
          onToggleFamilyRecipe?.(d.id);
          setSelectedDish((prev) =>
            prev && prev.id === d.id ? { ...prev, isFamilyRecipe: !prev.isFamilyRecipe } : prev
          );
        }}
        onQuickPlan={(d) => {
          setSelectedDish(null);
          onQuickPlanDish?.(d);
        }}
      />

      {/* Dish Create/Edit Form Modal */}
      <DishFormModal
        isOpen={isCreatorOpen || Boolean(editingDish)}
        initialDish={editingDish}
        masterIngredients={masterIngredients}
        onClose={() => {
          setIsCreatorOpen(false);
          setEditingDish(null);
        }}
        onSave={(d) => {
          onSaveDish(d);
          setIsCreatorOpen(false);
          setEditingDish(null);
          setSelectedDish(d);
        }}
      />
    </div>
  );
};
