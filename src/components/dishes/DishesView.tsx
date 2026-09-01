import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Dish, MasterIngredient, UserProfile, MemberPreferences, FamilyPersonalisation } from '../../types';
import {
  Search,
  Plus,
  Clock,
  Heart,
  ChevronDown,
  ShieldCheck,
  CalendarPlus,
  BookmarkCheck
} from 'lucide-react';
import { DishDetailModal } from './DishDetailModal';
import { DishFormModal } from './DishFormModal';
import { loadMasterSystemRecipes } from '../../services/systemRecipesService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish, searchMatchesLocalizedDish } from '../../services/dataLocalizationService';
import { checkDishAllergenRisk } from '../../services/personalisationService';

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
  { id: 'chicken', label: '🍗 Chicken', labelZh: '🍗 鸡肉料理', type: 'keyword', keyword: 'chicken' },
  { id: 'beef_pork', label: '🥩 Beef & Pork', labelZh: '🥩 牛肉/猪肉', type: 'keyword', keyword: 'beef pork' },
  { id: 'seafood', label: '🐟 Seafood', labelZh: '🐟 海鲜水产', type: 'keyword', keyword: 'fish salmon shrimp prawn seafood' },
  { id: 'veggie', label: '🥦 Veggie & Tofu', labelZh: '🥦 素食与豆腐', type: 'keyword', keyword: 'tofu vegetable broccoli mushroom vegetarian' },
  { id: 'noodles_rice', label: '🍜 Noodles & Rice', labelZh: '🍜 饭面主食', type: 'keyword', keyword: 'rice noodle pasta udon ramen fried rice' }
];

const INITIAL_BATCH_SIZE = 30;

export const DishesView: React.FC<DishesViewProps> = ({
  currentProfile,
  familyMembers = [],
  memberProfiles,
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
  const [sortBy, setSortBy] = useState<'prepTime' | 'name' | 'timesPlanned'>('timesPlanned');
  const [safeOnly, setSafeOnly] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [systemRecipes, setSystemRecipes] = useState<Dish[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

      if (safeOnly && memberProfiles) {
        const risk = checkDishAllergenRisk(dish, memberProfiles);
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
  }, [activeDataset, searchQuery, selectedCuisine, selectedQuickFilter, safeOnly, sortBy, language, memberProfiles]);

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

  return (
    <div className="px-4 pb-28 pt-4 max-w-md mx-auto">
      {/* Scope Switcher */}
      <div className="mb-4 flex rounded-full border border-[#EDE8DF] bg-white p-1 dark:border-[#3A332C] dark:bg-[#28231E]">
        <button
          type="button"
          onClick={() => setScope('family')}
          className={`flex-1 rounded-full py-2 text-[12.5px] font-semibold transition-colors cursor-pointer ${
            scope === 'family'
              ? 'bg-[#FFD13B] text-[#2D2640]'
              : 'text-[#8A7A70] dark:text-[#9A8A7E]'
          }`}
        >
          {language === 'zh-CN' ? `家庭菜谱 (${familySavedCount})` : `Family Cookbook (${familySavedCount})`}
        </button>
        <button
          type="button"
          onClick={() => setScope('system')}
          className={`flex-1 rounded-full py-2 text-[12.5px] font-semibold transition-colors cursor-pointer ${
            scope === 'system'
              ? 'bg-[#FFD13B] text-[#2D2640]'
              : 'text-[#8A7A70] dark:text-[#9A8A7E]'
          }`}
        >
          {language === 'zh-CN' ? '3,000+ 灵感库' : 'Recipe Library'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B0A5]" />
        <input
          type="text"
          placeholder={language === 'zh-CN' ? '搜索 3,000+ 道菜谱或食材...' : 'Search 3,000+ recipes...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] py-2.5 pl-9 pr-3 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:border-[#A0867A] focus:outline-none dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
        />
      </div>

      {/* Filter Row: Safe for Family, Cuisine Dropdown, Sort Dropdown */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSafeOnly(!safeOnly)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
            safeOnly
              ? 'border-[#4E9E72]/30 bg-[#EBF5EE] text-[#4E9E72]'
              : 'border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]'
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
            className="appearance-none inline-flex items-center gap-1 rounded-full border border-[#EDE8DF] bg-white pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E] focus:outline-none cursor-pointer"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c === 'All Cuisines' ? (language === 'zh-CN' ? '全部菜系' : 'All Cuisines') : formatCuisine(c)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A7A70]" />
        </div>

        {/* Sort Select */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none inline-flex items-center gap-1 rounded-full border border-[#EDE8DF] bg-white pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E] focus:outline-none cursor-pointer"
          >
            <option value="timesPlanned">{language === 'zh-CN' ? '按排餐偏好' : 'Most Popular'}</option>
            <option value="prepTime">{language === 'zh-CN' ? '按耗时最短' : 'Quickest'}</option>
            <option value="name">{language === 'zh-CN' ? '按名称排序' : 'Alphabetical'}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A7A70]" />
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
              className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors cursor-pointer ${
                isSel
                  ? 'bg-[#FFD13B] text-[#2D2640]'
                  : 'border border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]'
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
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
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
                  className="relative flex flex-col items-start gap-2 rounded-2xl border border-[#EDE8DF] bg-white p-3 text-left shadow-sm dark:border-[#3A332C] dark:bg-[#28231E] cursor-pointer transition-transform active:scale-98 hover:border-[#FFD13B]/60"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavoriteDish(recipe.id);
                    }}
                    className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer ${
                      isFav ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-[#FAF7F2] dark:bg-[#201C18]'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${isFav ? 'fill-[#E05050] text-[#E05050]' : 'text-[#C4B0A5]'}`}
                    />
                  </button>

                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FAF7F2] text-3xl dark:bg-[#201C18]" aria-hidden="true">
                    {recipe.imageEmoji || '🍲'}
                  </span>

                  <div className="min-w-0 flex-1 w-full">
                    <p className="text-[14px] font-semibold leading-tight text-[#2D2640] truncate dark:text-[#F0EDE8]">
                      {loc.name}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                      {recipe.cuisine ? formatCuisine(recipe.cuisine) : formatCategory(recipe.category)} • {recipe.prepTimeMinutes || 20} min
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Recipe Library Scope: Detailed List ─── */
        <div className="space-y-3">
          {displayedDishes.map((recipe) => {
            const loc = getLocalizedDish(recipe, language);
            const isInCookbook = recipe.isFamilyRecipe !== false;
            const risk = memberProfiles ? checkDishAllergenRisk(recipe, memberProfiles) : { hasRisk: false };

            return (
              <div
                key={recipe.id}
                className="rounded-2xl border border-[#EDE8DF] bg-white p-3 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]"
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDish(recipe)}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FAF7F2] text-4xl dark:bg-[#201C18] cursor-pointer"
                    aria-label={`Open ${loc.name}`}
                  >
                    {recipe.imageEmoji || '🍲'}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        onClick={() => setSelectedDish(recipe)}
                        className="text-[14px] font-semibold leading-tight text-[#2D2640] text-pretty dark:text-[#F0EDE8] cursor-pointer hover:underline"
                      >
                        {loc.name}
                      </p>
                      {risk.hasRisk && (
                        <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-[#E05050] dark:bg-rose-500/10">
                          Allergen
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                      {recipe.cuisine ? formatCuisine(recipe.cuisine) : formatCategory(recipe.category)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {recipe.prepTimeMinutes || 20} min
                      </span>
                      <span>{recipe.ingredients.length} {language === 'zh-CN' ? '种食材' : 'ingredients'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {onToggleFamilyRecipe && (
                    <button
                      type="button"
                      onClick={() => onToggleFamilyRecipe(recipe.id)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition cursor-pointer ${
                        isInCookbook
                          ? 'border border-[#FFD13B]/40 bg-[#FFF3D6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B]'
                          : 'border border-[#E8DDD5] bg-[#F5F0E8] text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]'
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
                          <span>{language === 'zh-CN' ? '+ 入菜谱' : 'Cookbook'}</span>
                        </>
                      )}
                    </button>
                  )}

                  {onQuickPlanDish && (
                    <button
                      type="button"
                      onClick={() => onQuickPlanDish(recipe)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] py-2 text-[12px] font-semibold text-[#2D2640] transition cursor-pointer active:scale-95 shadow-xs"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
                      <span>{language === 'zh-CN' ? '+ 排餐' : 'Plan'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredDishes.length === 0 && (
        <div className="py-12 text-center text-[13px] text-[#8A7A70] dark:text-[#9A8A7E] space-y-1">
          <p>🍳 {language === 'zh-CN' ? '未找到符合条件的菜谱' : 'No recipes matched your search.'}</p>
        </div>
      )}

      {/* Sentinel for infinite scroll */}
      {filteredDishes.length > visibleCount && (
        <div ref={loadMoreRef} className="py-4 text-center text-xs text-[#8A7A70]">
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
        onToggleFamilyCookbook={(d) => onToggleFamilyRecipe?.(d.id)}
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
        }}
      />
    </div>
  );
};
