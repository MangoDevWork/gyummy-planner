import React, { useState } from 'react';
import type {
  Dish,
  MealPlan,
  MealScheduleConfig,
  MemberPreferences,
  FamilyPersonalisation,
  MealScheduleEntry,
  UserProfile
} from '../../types';
import {
  Sparkles,
  X,
  Users,
  Calendar,
  Check,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Settings2,
  UtensilsCrossed,
  AlertCircle,
  Search,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  generateOfflineAiMealPlan,
  swapSingleMealDish,
  swapWholeMealForDay,
  removeDishFromMeal,
  addDishToMeal,
  getHeadcountRecommendation,
  inferDishRole,
  matchesCuisine,
  ACCOMPANIMENT_OPTIONS,
  type AiPlannerMode,
  type AiPlannerFocus,
  type MealAccompaniment,
  type PlannedDayMeal,
  type AiMealPlanResult
} from '../../services/aiMealPlannerService';
import { loadMasterSystemRecipes, getCachedSystemRecipes } from '../../services/systemRecipesService';
import { DishDetailModal } from '../dishes/DishDetailModal';

interface AiMealPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: UserProfile | null;
  startDateISO: string;
  familyCookbookDishes: Dish[];
  allSystemDishes: Dish[];
  mealSchedules?: MealScheduleConfig[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
  familyMembers?: string[];
  recentMealPlan?: MealPlan;
  onApplyMealPlan: (
    newScheduleEntries: Record<string, Record<string, MealScheduleEntry>>,
    daysCount: number
  ) => void;
  onGoToGrocery?: (startISO: string, endISO: string) => void;
  onOpenPersonalisation?: () => void;
  onNavigateToLibrary?: (cuisine: string) => void;
}

const COMMON_PERISHABLES = [
  { id: 'chicken', labelEn: 'Chicken', labelZh: '鸡肉', icon: '🍗', cat: 'meat' },
  { id: 'pork', labelEn: 'Pork', labelZh: '猪肉/排骨', icon: '🥩', cat: 'meat' },
  { id: 'beef', labelEn: 'Beef', labelZh: '牛肉', icon: '🥩', cat: 'meat' },
  { id: 'fish', labelEn: 'Fish', labelZh: '鱼/海鲜', icon: '🐟', cat: 'meat' },
  { id: 'shrimp', labelEn: 'Shrimp', labelZh: '虾仁', icon: '🦐', cat: 'meat' },
  { id: 'egg', labelEn: 'Eggs', labelZh: '鸡蛋', icon: '🥚', cat: 'dairy' },
  { id: 'tofu', labelEn: 'Tofu', labelZh: '豆腐', icon: '🧈', cat: 'dairy' },
  { id: 'cheese', labelEn: 'Cheese', labelZh: '奶酪/芝士', icon: '🧀', cat: 'dairy' },
  { id: 'milk', labelEn: 'Milk/Cream', labelZh: '牛奶/奶油', icon: '🥛', cat: 'dairy' },
  { id: 'bok_choy', labelEn: 'Bok Choy', labelZh: '青菜/菜心', icon: '🥬', cat: 'produce' },
  { id: 'broccoli', labelEn: 'Broccoli', labelZh: '西兰花', icon: '🥦', cat: 'produce' },
  { id: 'spinach', labelEn: 'Spinach', labelZh: '菠菜', icon: '🥬', cat: 'produce' },
  { id: 'tomato', labelEn: 'Tomatoes', labelZh: '西红柿', icon: '🍅', cat: 'produce' },
  { id: 'mushroom', labelEn: 'Mushrooms', labelZh: '菌菇', icon: '🍄', cat: 'produce' }
];

const CUISINE_OPTIONS = [
  { id: 'All Cuisines', en: 'All Cuisines', zh: '全部菜系', icon: '🌍' },
  { id: 'Chinese', en: 'Chinese', zh: '中餐', icon: '🥢' },
  { id: 'Cantonese', en: 'Cantonese', zh: '粤菜', icon: '🥟' },
  { id: 'Japanese', en: 'Japanese', zh: '日式', icon: '🍱' },
  { id: 'Korean', en: 'Korean', zh: '韩式', icon: '🍲' },
  { id: 'Western', en: 'Western', zh: '西餐', icon: '🍝' },
  { id: 'Italian', en: 'Italian', zh: '意式', icon: '🍕' },
  { id: 'Thai', en: 'Thai', zh: '泰式', icon: '🍛' },
  { id: 'Vietnamese', en: 'Vietnamese', zh: '越式', icon: '🍜' },
  { id: 'Mexican', en: 'Mexican', zh: '墨西哥', icon: '🌮' },
  { id: 'Mediterranean', en: 'Mediterranean', zh: '地中海', icon: '🥗' },
  { id: 'Indian', en: 'Indian', zh: '印度', icon: '🍛' }
];

export const AiMealPlannerModal: React.FC<AiMealPlannerModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  startDateISO,
  familyCookbookDishes,
  allSystemDishes,
  mealSchedules = [],
  memberProfiles = {},
  familyPersonalisation,
  familyMembers = [],
  recentMealPlan = {},
  onApplyMealPlan,
  onGoToGrocery,
  onOpenPersonalisation,
  onNavigateToLibrary
}) => {
  const { language } = useLanguage();

  // ─── STEP 1: WHO & WHEN ───
  const defaultDiners = Math.max(1, familyMembers.length || 1);
  const [dinersCount, setDinersCount] = useState<number>(defaultDiners);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [includedDays, setIncludedDays] = useState<number[]>(() =>
    familyPersonalisation?.defaultCookingDays && familyPersonalisation.defaultCookingDays.length > 0
      ? familyPersonalisation.defaultCookingDays
      : [1, 2, 3, 4, 5, 6, 0]
  );

  // ─── STEP 2: MOOD & CUISINE ───
  const [mode, setMode] = useState<AiPlannerMode>(() =>
    familyPersonalisation?.defaultPlanningStrategy || 'best_of_both'
  );
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All Cuisines');
  const [cuisineWarning, setCuisineWarning] = useState<string | null>(null);

  // ─── STEP 3: FRIDGE CLEAN-OUT (PERISHABLES) ───
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const [customIngInput, setCustomIngInput] = useState<string>('');
  const [prioritizeExpiringEarlier, setPrioritizeExpiringEarlier] = useState<boolean>(true);

  // ─── ADVANCED PREFERENCES (OPTION A: SLIDE-OVER SHEET) ───
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [focus, setFocus] = useState<AiPlannerFocus>(() =>
    familyPersonalisation?.defaultDietaryFocus || 'balanced'
  );
  const [defaultStaple, setDefaultStaple] = useState<MealAccompaniment>(() =>
    familyPersonalisation?.defaultStaple || 'jasmine_rice'
  );
  const [spiceTolerance, setSpiceTolerance] = useState<'none' | 'mild' | 'medium' | 'spicy'>(() =>
    familyPersonalisation?.spiceTolerance || (familyPersonalisation?.cookingForKids ? 'none' : 'mild')
  );

  // ─── WIZARD PROGRESSION ───
  // 1: Diners & Horizon, 2: Style & Cuisine, 3: Fridge Clean-out, 4: Confirmation Deck
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ─── STEP 4: CONFIRMATION STATE ───
  const [planResult, setPlanResult] = useState<AiMealPlanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [swappingDishId, setSwappingDishId] = useState<string | null>(null);
  const [swappingMealKey, setSwappingMealKey] = useState<string | null>(null);
  const [addingDishMealKey, setAddingDishMealKey] = useState<string | null>(null);
  const [editingStapleMealKey, setEditingStapleMealKey] = useState<string | null>(null);
  const [previewingDish, setPreviewingDish] = useState<Dish | null>(null);
  const [skippedMealKeys, setSkippedMealKeys] = useState<Set<string>>(new Set());

  // Master System Dishes State
  const [effectiveSystemDishes, setEffectiveSystemDishes] = useState<Dish[]>(() => {
    if (allSystemDishes && allSystemDishes.length >= 50) return allSystemDishes;
    const cached = getCachedSystemRecipes();
    return cached && cached.length >= 50 ? cached : allSystemDishes;
  });

  React.useEffect(() => {
    if (allSystemDishes && allSystemDishes.length >= 50) {
      setEffectiveSystemDishes(allSystemDishes);
    } else {
      loadMasterSystemRecipes().then((loaded) => {
        if (loaded && loaded.length >= 50) {
          setEffectiveSystemDishes(loaded);
        }
      });
    }
  }, [allSystemDishes]);

  // Reset when opening
  const prevIsOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
      setCurrentStep(1);
      setDinersCount(Math.max(1, familyMembers.length || 1));
      setDefaultStaple(familyPersonalisation?.defaultStaple || 'jasmine_rice');
      setIncludedDays(
        familyPersonalisation?.defaultCookingDays && familyPersonalisation.defaultCookingDays.length > 0
          ? familyPersonalisation.defaultCookingDays
          : [1, 2, 3, 4, 5, 6, 0]
      );
      setFocus(familyPersonalisation?.defaultDietaryFocus || 'balanced');
      setMode(familyPersonalisation?.defaultPlanningStrategy || 'best_of_both');
      setSpiceTolerance(
        familyPersonalisation?.spiceTolerance || (familyPersonalisation?.cookingForKids ? 'none' : 'mild')
      );
      setSelectedCuisine('All Cuisines');
      setCuisineWarning(null);
      setFridgeIngredients([]);
      setSkippedMealKeys(new Set());
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  const headcountGuide = getHeadcountRecommendation(dinersCount);

  // Toggle fridge ingredient chip
  const handleToggleFridgeIngredient = (ingName: string) => {
    setFridgeIngredients((prev) =>
      prev.includes(ingName) ? prev.filter((i) => i !== ingName) : [...prev, ingName]
    );
  };

  // Add custom typed ingredient
  const handleAddCustomIngredient = () => {
    const clean = customIngInput.trim();
    if (!clean) return;
    if (!fridgeIngredients.some((i) => i.toLowerCase() === clean.toLowerCase())) {
      setFridgeIngredients((prev) => [...prev, clean]);
    }
    setCustomIngInput('');
  };

  // Cuisine selection with Guardrail Check
  const handleSelectCuisine = (cuisineId: string) => {
    setSelectedCuisine(cuisineId);
    if (cuisineId !== 'All Cuisines' && (mode === 'easy_meals' || mode === 'best_of_both')) {
      const matchCount = familyCookbookDishes.filter((d) => matchesCuisine(d, cuisineId)).length;
      if (matchCount < 3) {
        setCuisineWarning(cuisineId);
      } else {
        setCuisineWarning(null);
      }
    } else {
      setCuisineWarning(null);
    }
  };

  // Proceed from Step 2 to Step 3
  const handleStep2Next = () => {
    if (selectedCuisine !== 'All Cuisines' && (mode === 'easy_meals' || mode === 'best_of_both')) {
      const matchCount = familyCookbookDishes.filter((d) => matchesCuisine(d, selectedCuisine)).length;
      if (matchCount < 3) {
        setCuisineWarning(selectedCuisine);
        return;
      }
    }
    setCurrentStep(3);
  };

  // Run generation
  const handleGenerate = async () => {
    setIsGenerating(true);

    let systemPool = effectiveSystemDishes;
    if (!systemPool || systemPool.length < 50) {
      const loaded = await loadMasterSystemRecipes();
      if (loaded && loaded.length >= 50) {
        systemPool = loaded;
        setEffectiveSystemDishes(loaded);
      }
    }
    if (!systemPool || systemPool.length === 0) {
      systemPool = familyCookbookDishes;
    }

    setTimeout(() => {
      const result = generateOfflineAiMealPlan({
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        includedDays,
        targetSlotId: 'dinner',
        mealSchedules,
        selectedCuisine,
        fridgeExpiringIngredients: fridgeIngredients,
        prioritizeExpiringEarlier,
        defaultStaple,
        spiceToleranceOverride: spiceTolerance,
        familyCookbookDishes,
        allSystemDishes: systemPool,
        memberProfiles,
        familyPersonalisation,
        familyMembers,
        recentMealPlan
      });
      setPlanResult(result);
      setSkippedMealKeys(new Set());
      setIsGenerating(false);
      setCurrentStep(4);
    }, 150);
  };

  // Toggle skip meal on confirmation deck
  const handleToggleSkipMeal = (mealKey: string) => {
    setSkippedMealKeys((prev) => {
      const next = new Set(prev);
      if (next.has(mealKey)) next.delete(mealKey);
      else next.add(mealKey);
      return next;
    });
  };

  // Swap an individual dish in a meal
  const handleSwapIndividualDish = (meal: PlannedDayMeal, dishIdToSwap: string) => {
    if (!planResult) return;
    setSwappingDishId(dishIdToSwap);

    setTimeout(() => {
      const updated = swapSingleMealDish(
        dishIdToSwap,
        meal,
        planResult.suggestions,
        {
          mode,
          focus,
          dinersCount,
          durationDays,
          startDateISO,
          includedDays,
          targetSlotId: meal.slotId,
          mealSchedules,
          selectedCuisine,
          fridgeExpiringIngredients: fridgeIngredients,
          prioritizeExpiringEarlier,
          defaultStaple,
          spiceToleranceOverride: spiceTolerance,
          familyCookbookDishes,
          allSystemDishes: effectiveSystemDishes,
          memberProfiles,
          familyPersonalisation,
          familyMembers,
          recentMealPlan
        }
      );

      if (updated) {
        const nextSuggestions = planResult.suggestions.map((s) =>
          s.dateISO === meal.dateISO && s.slotId === meal.slotId ? updated : s
        );
        setPlanResult({ ...planResult, suggestions: nextSuggestions });
      }
      setSwappingDishId(null);
    }, 120);
  };

  // Swap whole meal combination
  const handleSwapWholeMeal = (meal: PlannedDayMeal) => {
    if (!planResult) return;
    const mealKey = `${meal.dateISO}_${meal.slotId}`;
    setSwappingMealKey(mealKey);

    setTimeout(() => {
      const updated = swapWholeMealForDay(meal, planResult.suggestions, {
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        includedDays,
        targetSlotId: meal.slotId,
        mealSchedules,
        selectedCuisine,
        fridgeExpiringIngredients: fridgeIngredients,
        prioritizeExpiringEarlier,
        defaultStaple,
        spiceToleranceOverride: spiceTolerance,
        familyCookbookDishes,
        allSystemDishes: effectiveSystemDishes,
        memberProfiles,
        familyPersonalisation,
        familyMembers,
        recentMealPlan
      });

      if (updated) {
        const nextSuggestions = planResult.suggestions.map((s) =>
          s.dateISO === meal.dateISO && s.slotId === meal.slotId ? updated : s
        );
        setPlanResult({ ...planResult, suggestions: nextSuggestions });
      }
      setSwappingMealKey(null);
    }, 120);
  };

  // Remove an individual dish
  const handleRemoveDish = (meal: PlannedDayMeal, dishIdToRemove: string) => {
    if (!planResult) return;
    const updated = removeDishFromMeal(meal, dishIdToRemove, defaultStaple);
    const nextSuggestions = planResult.suggestions.map((s) =>
      s.dateISO === meal.dateISO && s.slotId === meal.slotId ? updated : s
    );
    setPlanResult({ ...planResult, suggestions: nextSuggestions });
  };

  // Add a complementary dish
  const handleAddDish = (meal: PlannedDayMeal) => {
    if (!planResult) return;
    const mealKey = `${meal.dateISO}_${meal.slotId}`;
    setAddingDishMealKey(mealKey);

    setTimeout(() => {
      const updated = addDishToMeal(meal, planResult.suggestions, {
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        includedDays,
        targetSlotId: meal.slotId,
        mealSchedules,
        selectedCuisine,
        fridgeExpiringIngredients: fridgeIngredients,
        prioritizeExpiringEarlier,
        defaultStaple,
        spiceToleranceOverride: spiceTolerance,
        familyCookbookDishes,
        allSystemDishes: effectiveSystemDishes,
        memberProfiles,
        familyPersonalisation,
        familyMembers,
        recentMealPlan
      });

      if (updated) {
        const nextSuggestions = planResult.suggestions.map((s) =>
          s.dateISO === meal.dateISO && s.slotId === meal.slotId ? updated : s
        );
        setPlanResult({ ...planResult, suggestions: nextSuggestions });
      }
      setAddingDishMealKey(null);
    }, 120);
  };

  // Change staple accompaniment
  const handleChangeMealStaple = (dateISO: string, slotId: string, newStaple: MealAccompaniment) => {
    if (!planResult) return;
    const stapleInfo = ACCOMPANIMENT_OPTIONS[newStaple] || ACCOMPANIMENT_OPTIONS.jasmine_rice;

    const nextSuggestions = planResult.suggestions.map((m) => {
      if (m.dateISO !== dateISO || m.slotId !== slotId) return m;
      const dishesCal = m.dishes.reduce((sum, d) => sum + (d.nutrition?.calories || 480), 0);
      return {
        ...m,
        accompaniment: newStaple,
        perPersonCalories: Math.round(dishesCal + stapleInfo.caloriesPerPerson)
      };
    });

    setPlanResult({ ...planResult, suggestions: nextSuggestions });
  };

  // Apply non-skipped meals to calendar
  const handleApplyToCalendar = () => {
    if (!planResult) return;

    const scheduleEntries: Record<string, Record<string, MealScheduleEntry>> = {};
    let appliedCount = 0;

    planResult.suggestions.forEach((item) => {
      const mealKey = `${item.dateISO}_${item.slotId}`;
      if (skippedMealKeys.has(mealKey)) return; // Exclude skipped meal slots!

      if (!scheduleEntries[item.dateISO]) {
        scheduleEntries[item.dateISO] = {};
      }

      const stapleInfo = ACCOMPANIMENT_OPTIONS[item.accompaniment];
      const stapleText = item.accompaniment === 'none_builtin'
        ? (language === 'zh-CN' ? '菜品自带主食' : 'Starch built-in')
        : (language === 'zh-CN' ? `佐餐主食: ${stapleInfo.labelZh}` : `Accompaniment: ${stapleInfo.labelEn}`);

      scheduleEntries[item.dateISO][item.slotId] = {
        dishId: item.dishes[0]?.id || item.dish.id,
        dishIds: item.dishes.map((d) => d.id),
        servingsMultiplier: 1,
        notes: `${item.comboStructure} · ${stapleText}`
      };
      appliedCount++;
    });

    onApplyMealPlan(scheduleEntries, appliedCount);
    onClose();

    if (onGoToGrocery && appliedCount > 0) {
      const activeSuggestions = planResult.suggestions.filter(
        (s) => !skippedMealKeys.has(`${s.dateISO}_${s.slotId}`)
      );
      const dates = activeSuggestions.map((s) => s.dateISO).sort();
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const promptText = language === 'zh-CN'
        ? `🎉 成功排定 ${appliedCount} 顿膳食！是否立即查看生成的采购清单？`
        : `🎉 Scheduled ${appliedCount} meals! Open Grocery List now?`;
      if (window.confirm(promptText)) {
        onGoToGrocery(firstDate, lastDate);
      }
    }
  };

  const getDishRoleBadge = (dish: Dish) => {
    const role = inferDishRole(dish);
    if (role === 'one_pot_meal') {
      return { label: language === 'zh-CN' ? '一锅搞定' : 'One-Pot', emoji: '🍚', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' };
    }
    if (role === 'vegetable_side') {
      return { label: language === 'zh-CN' ? '营养时蔬' : 'Veg Side', emoji: '🥗', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' };
    }
    if (role === 'soup') {
      return { label: language === 'zh-CN' ? '滋补靓汤' : 'Soup', emoji: '🍲', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' };
    }
    return { label: language === 'zh-CN' ? '主荤主菜' : 'Main Protein', emoji: '🥩', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' };
  };

  const activeMeals = planResult
    ? planResult.suggestions.filter((m) => !skippedMealKeys.has(`${m.dateISO}_${m.slotId}`))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#EDE8DF] bg-[#FAF8F5] shadow-2xl dark:border-[#3D362E] dark:bg-[#1E1B18] animate-in zoom-in-95 duration-200">
        
        {/* Header with Wizard Step Indicators & Preferences Icon */}
        <div className="flex items-center justify-between border-b border-[#EDE8DF] bg-white px-5 py-3.5 dark:border-[#3D362E] dark:bg-[#252220]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFD13B] text-[#2D2640] shadow-2xs shrink-0">
              <Sparkles className="h-4 w-4 fill-[#2D2640]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#2D2640] dark:text-[#F0EDE8] truncate">
                  {language === 'zh-CN' ? '快速智能排餐' : 'Quick Meal Plan'}
                </h2>
                {currentStep <= 3 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 shrink-0">
                    {language === 'zh-CN' ? `步骤 ${currentStep}/3` : `Step ${currentStep}/3`}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E] truncate">
                {currentStep === 1 && (language === 'zh-CN' ? '就餐人数与跨度' : 'Diners & Planning Horizon')}
                {currentStep === 2 && (language === 'zh-CN' ? '风格倾向与菜系偏好' : 'Cooking Style & Cuisine')}
                {currentStep === 3 && (language === 'zh-CN' ? '优先消耗冰箱临期食材' : 'Use Up Expiring Fridge Items')}
                {currentStep === 4 && (language === 'zh-CN' ? '点击菜品可查看菜谱，随时调整或跳过' : 'Tap dish to inspect · Swap or skip anytime')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Preferences Cog (Option A) */}
            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#7A6E64] hover:bg-[#EDE8DF] hover:text-[#2D2640] dark:bg-[#2E2A26] dark:text-[#9A9088] dark:hover:text-[#F0EDE8] transition cursor-pointer"
              title={language === 'zh-CN' ? '高级偏好（辣度/侧重/主食）' : 'Preferences (Spice/Focus/Staple)'}
            >
              <Settings2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#7A6E64] hover:bg-[#EDE8DF] dark:bg-[#2E2A26] dark:text-[#9A9088] cursor-pointer transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* ─── STEP 1: DINERS & HORIZON ─── */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Question 1: Diners */}
              <div className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#FFD13B]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                      {language === 'zh-CN' ? '就餐人数 (Diners)' : 'Who Are We Cooking For?'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDinersCount((prev) => Math.max(1, prev - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#2D2640] hover:bg-[#EDE8DF] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <span className="w-8 text-center text-base font-black text-[#2D2640] dark:text-[#F0EDE8]">
                      {dinersCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDinersCount((prev) => Math.min(12, prev + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFD13B] text-[#2D2640] hover:bg-[#FFC200] transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Subtle Table Helper */}
                <div className="rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 border border-[#EDE8DF] dark:border-[#38332E] flex items-center gap-2 text-[11px] text-[#7A6E64] dark:text-[#9A9088]">
                  <span>💡</span>
                  <span className="font-bold text-[#7A5C00] dark:text-[#FFD13B]">
                    {language === 'zh-CN' ? headcountGuide.descriptionZh : headcountGuide.descriptionEn}
                  </span>
                </div>
              </div>

              {/* Question 2: Duration / Planning Horizon */}
              <div className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#FFD13B]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                    {language === 'zh-CN' ? '排餐跨度 (Planning Horizon)' : 'Planning Horizon'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { days: 7, label: language === 'zh-CN' ? '7 天 (整周)' : '7 Days (Full Week)' },
                    { days: 5, label: language === 'zh-CN' ? '5 天 (工作日)' : '5 Days (Workdays)' },
                    { days: 3, label: language === 'zh-CN' ? '3 天 (短周期)' : '3 Days (Short)' },
                    { days: 14, label: language === 'zh-CN' ? '14 天 (两周)' : '14 Days (2 Weeks)' }
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setDurationDays(opt.days)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        durationDays === opt.days
                          ? 'border-[#FFD13B] bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] ring-1 ring-[#FFD13B]/40'
                          : 'border-[#EDE8DF] bg-[#FAF8F5] text-[#7A6E64] hover:border-[#FFD13B] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Customized Meal Schedules Indicator */}
                {mealSchedules && mealSchedules.length > 0 && (
                  <div className="rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#7A6E64] dark:text-[#9A9088]">
                      <span>🗓️</span>
                      <span>
                        {language === 'zh-CN' ? '已自动按“自定义餐段”设置排餐' : 'Aligned with your configured meal schedules'}
                      </span>
                    </div>
                    <span className="font-bold text-[#7A5C00] dark:text-[#FFD13B]">
                      {mealSchedules.filter((s) => s.defaultEnabled).map((s) => s.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2: MOOD & CUISINE ─── */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Question: Strategy */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '本周想吃什么风格？' : 'What Are You in the Mood For?'}
                </h3>

                {/* Best of Both */}
                <div
                  onClick={() => setMode('best_of_both')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    mode === 'best_of_both'
                      ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/50'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🌟</span>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '黄金组合 (Best of Both · 推荐)' : 'Best of Both (Recommended)'}
                        </h4>
                        <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '工作日熟悉的家常菜，周末尝试精选灵感新菜' : 'Familiar family favorites + inspiring discoveries on weekends'}
                        </p>
                      </div>
                    </div>
                    {mode === 'best_of_both' && <Check className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]" />}
                  </div>
                </div>

                {/* Family Classics */}
                <div
                  onClick={() => setMode('easy_meals')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    mode === 'easy_meals'
                      ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/50'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🏠</span>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '家常熟菜 (Family Classics)' : 'Family Classics'}
                        </h4>
                        <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '高度优先家庭菜谱中的私房菜，省心省事' : 'Focuses primarily on dishes in your Family Cookbook'}
                        </p>
                      </div>
                    </div>
                    {mode === 'easy_meals' && <Check className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]" />}
                  </div>
                </div>

                {/* Something New */}
                <div
                  onClick={() => setMode('give_me_ideas')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    mode === 'give_me_ideas'
                      ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/50'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">✨</span>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '灵感新菜 (Something New)' : 'Something New'}
                        </h4>
                        <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '从 3,000+ 甄选菜谱中探索新口味' : 'Fresh curated recipes from the 3,000+ master library'}
                        </p>
                      </div>
                    </div>
                    {mode === 'give_me_ideas' && <Check className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Optional Cuisine Filter */}
              <div className="rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                    {language === 'zh-CN' ? '菜系限定 (可选)' : 'Cuisine Filter (Optional)'}
                  </h3>
                  <span className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                    {selectedCuisine === 'All Cuisines'
                      ? (language === 'zh-CN' ? '不限菜系' : 'Any cuisine')
                      : selectedCuisine}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CUISINE_OPTIONS.map((c) => {
                    const isSelected = selectedCuisine === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCuisine(c.id)}
                        className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-2xs ring-1 ring-[#2D2640]/20'
                            : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                        }`}
                      >
                        <span>{c.icon}</span>
                        <span>{language === 'zh-CN' ? c.zh : c.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: FRIDGE CLEAN-OUT ─── */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                    {language === 'zh-CN' ? '冰箱清库 · 临期食材优先' : 'Fridge Clean-out · Use It Up'}
                  </h3>
                  <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                    {language === 'zh-CN'
                      ? '选择你冰箱里需要尽快消耗的肉类、生鲜或蔬菜，AI 将智能优选相关菜品'
                      : 'Pick perishables in your fridge to use up first; AI will prioritize recipes using them'}
                  </p>
                </div>

                {/* Common Perishables Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_PERISHABLES.map((p) => {
                    const isSelected = fridgeIngredients.includes(p.labelEn) || fridgeIngredients.includes(p.labelZh);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleFridgeIngredient(language === 'zh-CN' ? p.labelZh : p.labelEn)}
                        className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-2xs'
                            : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{language === 'zh-CN' ? p.labelZh : p.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Ingredient Search / Input */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A7A70]" />
                    <input
                      type="text"
                      value={customIngInput}
                      onChange={(e) => setCustomIngInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomIngredient();
                        }
                      }}
                      placeholder={language === 'zh-CN' ? '输入其他食材 (如: 西葫芦、牛油果)...' : 'Type custom ingredient (e.g. Zucchini)...'}
                      className="w-full rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] pl-8 pr-3 py-1.5 text-xs text-[#2D2640] placeholder-[#8A7A70] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#F0EDE8] focus:outline-hidden focus:ring-1 focus:ring-[#FFD13B]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomIngredient}
                    disabled={!customIngInput.trim()}
                    className="rounded-xl bg-[#F5F0E8] px-3 py-1.5 text-xs font-bold text-[#2D2640] hover:bg-[#FFD13B] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer disabled:opacity-40"
                  >
                    {language === 'zh-CN' ? '+ 添加' : '+ Add'}
                  </button>
                </div>

                {/* Selected Ingredients Strip */}
                {fridgeIngredients.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#EDE8DF] dark:border-[#38332E]">
                    <span className="text-[10px] font-bold text-[#8A7A70] dark:text-[#9A8A7E]">
                      {language === 'zh-CN' ? '已选优先消耗:' : 'Expiring to use:'}
                    </span>
                    {fridgeIngredients.map((ing) => (
                      <span
                        key={ing}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 text-[11px] font-bold"
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={() => handleToggleFridgeIngredient(ing)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Prioritize quicker-expiring ingredients earlier in the week toggle */}
                <label className="flex items-center gap-2.5 pt-2 border-t border-[#EDE8DF] dark:border-[#38332E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prioritizeExpiringEarlier}
                    onChange={(e) => setPrioritizeExpiringEarlier(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-[#EDE8DF] text-[#FFD13B] focus:ring-[#FFD13B]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                      {language === 'zh-CN' ? '将易坏食材安排在前几天制作' : 'Prioritize quicker-expiring ingredients earlier in the week'}
                    </span>
                    <p className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E]">
                      {language === 'zh-CN' ? '生鲜与叶菜排在周前段，耐储食材排在周末' : 'Prepares fresh meats & greens in days 1-3 to prevent food waste'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ─── STEP 4: CONFIRMATION & REVIEW (OPTION A) ─── */}
          {currentStep === 4 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              
              {/* Summary Stats Banner */}
              {planResult && (
                <div className="rounded-2xl border border-[#EDE8DF] bg-white p-3 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#2D6A4A] dark:text-[#4CAF82]" />
                      <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '100% 符合家庭过敏与口味规则' : '100% Safe (0 Allergens Found)'}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-bold text-[#FFD13B] bg-[#2D2640] px-2.5 py-0.5 rounded-full">
                      {activeMeals.length} {language === 'zh-CN' ? '顿膳食待排定' : 'meals scheduled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2 rounded-xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                        ~{planResult.averageCalories} kcal
                      </span>
                      <span className="text-[9px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '人均热量' : 'Cal/Person'}
                      </span>
                    </div>
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2 rounded-xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-[#2D6A4A] dark:text-[#4CAF82]">
                        ~{planResult.averageProtein}g
                      </span>
                      <span className="text-[9px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '人均蛋白质' : 'Protein'}
                      </span>
                    </div>
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2 rounded-xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-[#B8860B] dark:text-[#FFD13B]">
                        {dinersCount} {language === 'zh-CN' ? '人' : 'diners'}
                      </span>
                      <span className="text-[9px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '就餐人数' : 'Headcount'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Day-by-Day Cards */}
              <div className="space-y-3">
                {planResult?.suggestions.map((meal) => {
                  const mealKey = `${meal.dateISO}_${meal.slotId}`;
                  const isSkipped = skippedMealKeys.has(mealKey);
                  const staple = ACCOMPANIMENT_OPTIONS[meal.accompaniment] || ACCOMPANIMENT_OPTIONS.jasmine_rice;
                  const isEditingStaple = editingStapleMealKey === mealKey;
                  const isSwappingMeal = swappingMealKey === mealKey;
                  const isAddingDish = addingDishMealKey === mealKey;

                  if (isSkipped) {
                    return (
                      <div
                        key={mealKey}
                        className="rounded-2xl border border-dashed border-[#EDE8DF] bg-[#FAF8F5] p-3 dark:border-[#38332E] dark:bg-[#1A1816] flex items-center justify-between opacity-80"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🍽️</span>
                          <div>
                            <span className="text-xs font-black text-[#7A6E64] dark:text-[#9A9088]">
                              {meal.dayName} · {meal.slotName}
                            </span>
                            <p className="text-[10px] text-[#A89F95] dark:text-[#7A6E64]">
                              {language === 'zh-CN' ? '已标记外出就餐/自理 (不录入日程)' : 'Skipped (Dining out or self-arranged)'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSkipMeal(mealKey)}
                          className="text-[11px] font-bold text-[#7A5C00] dark:text-[#FFD13B] hover:underline cursor-pointer"
                        >
                          {language === 'zh-CN' ? '恢复计划 ↩️' : 'Restore ↩️'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={mealKey}
                      className={`rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2.5 transition-all ${
                        isSwappingMeal ? 'opacity-40 scale-[0.98]' : ''
                      }`}
                    >
                      {/* Day Header Row */}
                      <div className="flex items-center justify-between border-b border-[#EDE8DF] pb-2 dark:border-[#38332E] gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                            {meal.dayName}
                          </span>
                          <span className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                            {meal.dateISO.slice(5)}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#FFD13B] text-[#2D2640] border border-[#2D2640]/10 shadow-xs">
                            {meal.slotName}
                          </span>

                          {/* Minimized Staple Accompaniment Badge */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setEditingStapleMealKey(isEditingStaple ? null : mealKey)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/30 hover:border-[#FFD13B] transition cursor-pointer"
                              title={language === 'zh-CN' ? '调整主食搭配' : 'Change staple accompaniment'}
                            >
                              {staple.emoji} {language === 'zh-CN' ? staple.labelZh : staple.labelEn} ▾
                            </button>

                            {/* Staple Dropdown */}
                            {isEditingStaple && (
                              <div className="absolute top-full left-0 z-30 mt-1.5 p-2 rounded-2xl bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#3D362E] shadow-xl grid grid-cols-2 gap-1.5 w-64 animate-in fade-in zoom-in-95">
                                {Object.values(ACCOMPANIMENT_OPTIONS).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      handleChangeMealStaple(meal.dateISO, meal.slotId, opt.id);
                                      setEditingStapleMealKey(null);
                                    }}
                                    className={`p-1.5 rounded-xl border text-left text-[10.5px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                      meal.accompaniment === opt.id
                                        ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                                        : 'bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E]'
                                    }`}
                                  >
                                    <span>{opt.emoji}</span>
                                    <span className="truncate">{language === 'zh-CN' ? opt.labelZh : opt.labelEn}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top Actions: Swap Meal & Skip Meal */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Swap Whole Meal Button */}
                          <button
                            type="button"
                            disabled={isSwappingMeal || swappingDishId !== null}
                            onClick={() => handleSwapWholeMeal(meal)}
                            className="flex items-center gap-1 py-1 px-2 rounded-xl border border-[#EDE8DF] bg-[#FAF7F2] text-[10.5px] font-bold text-[#2D2640] hover:bg-[#FFD13B] hover:border-[#2D2640]/10 dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#F0EDE8] transition cursor-pointer shrink-0"
                            title={language === 'zh-CN' ? `重新生成${meal.slotName}的整套搭配` : `Regenerate entire ${meal.slotName} combination`}
                          >
                            <RotateCw className={`h-3 w-3 ${isSwappingMeal ? 'animate-spin' : ''}`} />
                            <span>{language === 'zh-CN' ? '换整餐' : 'Swap Meal'}</span>
                          </button>

                          {/* Skip Meal Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSkipMeal(mealKey)}
                            className="flex items-center gap-1 py-1 px-2 rounded-xl border border-[#EDE8DF] bg-[#FAF7F2] text-[10.5px] font-bold text-[#7A6E64] hover:text-rose-600 hover:border-rose-200 dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088] transition cursor-pointer shrink-0"
                            title={language === 'zh-CN' ? '不计划此餐 (外出就餐/自理)' : 'Skip this meal (Eating out / Takeaway)'}
                          >
                            <UtensilsCrossed className="h-3 w-3" />
                            <span>{language === 'zh-CN' ? '外食/跳过' : 'Skip'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Dishes in this Meal */}
                      <div className="space-y-2">
                        {meal.dishes.map((dish) => {
                          const isSwapping = swappingDishId === dish.id;
                          const roleBadge = getDishRoleBadge(dish);

                          return (
                            <div
                              key={dish.id}
                              className={`flex items-center justify-between p-2 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] dark:border-[#38332E] dark:bg-[#1E1B18] transition-all hover:border-[#FFD13B]/60 ${
                                isSwapping ? 'opacity-40 scale-[0.98]' : ''
                              }`}
                            >
                              {/* Click to inspect recipe details */}
                              <div
                                onClick={() => setPreviewingDish(dish)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                                title={language === 'zh-CN' ? '点击查看完整菜谱' : 'Click to view recipe details'}
                              >
                                <div className="h-10 w-10 rounded-lg overflow-hidden bg-white dark:bg-[#252220] shrink-0 border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-center">
                                  {dish.imageUrl ? (
                                    <img src={dish.imageUrl} alt={dish.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-xl">{dish.imageEmoji || '🍲'}</span>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${roleBadge.color}`}>
                                      {roleBadge.emoji} {roleBadge.label}
                                    </span>
                                    <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8] truncate hover:text-[#B8860B] transition">
                                      {dish.name}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[9.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                                    <span>⏱️ {dish.totalTimeMinutes || dish.prepTimeMinutes || 25}m</span>
                                    <span>·</span>
                                    <span>🔥 {dish.nutrition?.calories || 480} kcal</span>
                                    <span>·</span>
                                    <span>🥩 {dish.nutrition?.protein || 24}g pro</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons: Swap + Remove */}
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  type="button"
                                  disabled={isSwapping}
                                  onClick={() => handleSwapIndividualDish(meal, dish.id)}
                                  className="flex items-center gap-1 py-1 px-2 rounded-lg border border-[#EDE8DF] bg-white text-[10px] font-bold text-[#2D2640] hover:bg-[#FFD13B] hover:border-[#2D2640]/10 dark:border-[#38332E] dark:bg-[#252220] dark:text-[#F0EDE8] transition cursor-pointer"
                                  title={language === 'zh-CN' ? '换这道菜' : 'Swap this dish'}
                                >
                                  <RotateCw className={`h-2.5 w-2.5 ${isSwapping ? 'animate-spin' : ''}`} />
                                  <span>{language === 'zh-CN' ? '换这道' : 'Swap'}</span>
                                </button>

                                {meal.dishes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDish(meal, dish.id)}
                                    className="flex items-center justify-center h-6 w-6 rounded-lg text-[#9A8A7E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                    title={language === 'zh-CN' ? '从本餐中移除此菜品' : 'Remove dish from this meal'}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Dish Button */}
                        <button
                          type="button"
                          disabled={isAddingDish || meal.dishes.length >= 8}
                          onClick={() => handleAddDish(meal)}
                          className="flex w-full items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-dashed border-[#EDE8DF] bg-[#FAF8F5] text-[10.5px] font-bold text-[#7A6E64] hover:border-[#FFD13B] hover:text-[#2D2640] hover:bg-[#FFF8E6] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088] dark:hover:text-[#FFD13B] transition cursor-pointer disabled:opacity-50"
                        >
                          {isAddingDish ? (
                            <>
                              <RotateCw className="h-3.5 w-3.5 animate-spin text-[#FFD13B]" />
                              <span>{language === 'zh-CN' ? 'AI 正在智能规划新菜...' : 'AI planning complementary dish...'}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 text-[#FFD13B]" />
                              <span>{language === 'zh-CN' ? `+ 为${meal.slotName}加一道菜 (AI 智能优选)` : `+ Add Dish to ${meal.slotName} (AI Complementary)`}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#EDE8DF] bg-white px-4 py-3 dark:border-[#3D362E] dark:bg-[#252220]">
          {currentStep === 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                {language === 'zh-CN' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer"
              >
                <span>{language === 'zh-CN' ? '下一步: 菜系与风格' : 'Next: Style & Cuisine'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center justify-center gap-1 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{language === 'zh-CN' ? '上一步' : 'Back'}</span>
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer"
              >
                <span>{language === 'zh-CN' ? '下一步: 冰箱清库' : 'Next: Fridge Clean-out'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center justify-center gap-1 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{language === 'zh-CN' ? '上一步' : 'Back'}</span>
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>{language === 'zh-CN' ? '正在智能排餐...' : 'Generating Meals...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-[#2D2640]" />
                    <span>{language === 'zh-CN' ? `⚡ 快速排餐 (${durationDays}天 · ${dinersCount}人份)` : `⚡ Quick Plan (${dinersCount} Diners · ${durationDays} Days)`}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center justify-center gap-1 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-3.5 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{language === 'zh-CN' ? '重设' : 'Reset'}</span>
              </button>

              <button
                type="button"
                onClick={handleApplyToCalendar}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{language === 'zh-CN' ? `应用 ${activeMeals.length} 顿排餐 🚀` : `Apply ${activeMeals.length} Meals 🚀`}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ─── CUISINE GUARDRAIL MODAL (REQUIREMENT 2) ─── */}
      {cuisineWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#EDE8DF] bg-white p-5 shadow-2xl dark:border-[#3D362E] dark:bg-[#252220] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '家庭菜谱菜量提示' : 'Cookbook Recipes Notice'}
                </h3>
                <p className="text-xs text-[#8A7A70] dark:text-[#9A8A7E]">
                  {language === 'zh-CN'
                    ? `您的家庭菜谱中【${cuisineWarning}】菜系的菜品较少（少于3道），是否前往菜谱库挑选并添加更多？`
                    : `You do not have enough ${cuisineWarning} cuisine in your family Cookbook, would you like to add more to your cookbook?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCuisineWarning(null)}
                className="px-4 py-2 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-xs font-bold text-[#7A6E64] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088] transition cursor-pointer"
              >
                {language === 'zh-CN' ? '否 (继续排餐)' : 'No, Keep Going'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetCuisine = cuisineWarning;
                  setCuisineWarning(null);
                  onClose();
                  if (onNavigateToLibrary) {
                    onNavigateToLibrary(targetCuisine);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD13B] text-xs font-black text-[#2D2640] hover:bg-[#FFC200] transition cursor-pointer shadow-2xs"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>{language === 'zh-CN' ? '是 (前往菜谱库)' : 'Yes, Browse Library'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADVANCED PREFERENCES MODAL / SHEET (OPTION A) ─── */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#EDE8DF] bg-white p-5 shadow-2xl dark:border-[#3D362E] dark:bg-[#252220] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EDE8DF] pb-3 dark:border-[#3D362E]">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-[#FFD13B]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '高级偏好设置' : 'Advanced Preferences'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#F5F0E8] text-[#7A6E64] dark:bg-[#2E2A26] dark:text-[#9A9088] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Spice Ceiling */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7A6E64] dark:text-[#9A9088]">
                  {language === 'zh-CN' ? '全家安全辣度上限' : 'Family Spice Ceiling'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'none', zh: '不辣', en: 'None', emoji: '🟢' },
                    { id: 'mild', zh: '微辣', en: 'Mild', emoji: '🟡' },
                    { id: 'medium', zh: '中辣', en: 'Medium', emoji: '🟠' },
                    { id: 'spicy', zh: '特辣', en: 'Fiery', emoji: '🔴' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpiceTolerance(s.id as any)}
                      className={`py-1.5 rounded-xl border text-[10.5px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                        spiceTolerance === s.id
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                          : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                      }`}
                    >
                      <span className="text-xs">{s.emoji}</span>
                      <span>{language === 'zh-CN' ? s.zh : s.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Focus */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7A6E64] dark:text-[#9A9088]">
                  {language === 'zh-CN' ? '膳食侧重' : 'Dietary Focus'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'balanced', icon: '⚖️', label: language === 'zh-CN' ? '均衡营养' : 'Balanced' },
                    { id: 'quick', icon: '⚡', label: language === 'zh-CN' ? '快手省时 (≤25m)' : 'Fast (≤25m)' },
                    { id: 'high_protein', icon: '💪', label: language === 'zh-CN' ? '高蛋白' : 'High Protein' },
                    { id: 'light', icon: '🥗', label: language === 'zh-CN' ? '轻食低卡' : 'Light & Fresh' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFocus(f.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        focus === f.id
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                          : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Staple */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7A6E64] dark:text-[#9A9088]">
                  {language === 'zh-CN' ? '默认主食搭配' : 'Default Staple'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'jasmine_rice', emoji: '🍚', en: 'Steamed Rice', zh: '白米饭' },
                    { id: 'brown_rice', emoji: '🌾', en: 'Brown Rice', zh: '糙米饭' },
                    { id: 'bread_buns', emoji: '🥖', en: 'Bread/Buns', zh: '佐餐面点' },
                    { id: 'plain_noodles', emoji: '🍜', en: 'Noodles', zh: '佐餐面条' },
                    { id: 'cauliflower_rice', emoji: '🥗', en: 'Cauliflower', zh: '花椰菜米' },
                    { id: 'none_low_carb', emoji: '🥩', en: 'No Starch', zh: '纯菜肉' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDefaultStaple(s.id as any)}
                      className={`py-1.5 px-2 rounded-xl border text-[10.5px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        defaultStaple === s.id
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                          : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{language === 'zh-CN' ? s.zh : s.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permanent Personalisation Link */}
              {onOpenPersonalisation && (
                <div className="pt-2 border-t border-[#EDE8DF] dark:border-[#38332E]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreferencesOpen(false);
                      onClose();
                      onOpenPersonalisation();
                    }}
                    className="w-full py-2 rounded-xl bg-[#FAF7F2] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 text-xs font-black transition cursor-pointer"
                  >
                    ⚙️ {language === 'zh-CN' ? '进入家庭个性化中心' : 'Manage Family Profiles'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPreferencesOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-[#FFD13B] text-xs font-black text-[#2D2640] shadow-2xs hover:bg-[#FFC200] transition cursor-pointer"
            >
              {language === 'zh-CN' ? '保存并返回' : 'Done'}
            </button>
          </div>
        </div>
      )}

      {/* ─── RECIPE DETAIL INSPECTION MODAL (REQUIREMENT 4) ─── */}
      {previewingDish && (
        <DishDetailModal
          isOpen={Boolean(previewingDish)}
          dish={previewingDish}
          currentProfile={currentProfile || null}
          familyMembers={familyMembers}
          memberProfiles={memberProfiles}
          familyPersonalisation={familyPersonalisation}
          onClose={() => setPreviewingDish(null)}
          onEdit={() => {}}
          onToggleFavorite={() => {}}
          onToggleFamilyCookbook={() => {}}
        />
      )}

    </div>
  );
};
