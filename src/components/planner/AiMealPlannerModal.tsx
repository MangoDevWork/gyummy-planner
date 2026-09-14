import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  BookOpen,
  Eye,
  Flame,
  Clock,
  Leaf
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
  getMatchingFridgeIngredients,
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
  // Meat & Seafood
  { id: 'chicken', labelEn: 'Chicken', labelZh: '鸡肉', icon: '🍗', category: 'meat' },
  { id: 'pork', labelEn: 'Pork', labelZh: '猪肉/排骨', icon: '🥩', category: 'meat' },
  { id: 'beef', labelEn: 'Beef', labelZh: '牛肉', icon: '🥩', category: 'meat' },
  { id: 'fish', labelEn: 'Fish', labelZh: '鲜鱼', icon: '🐟', category: 'meat' },
  { id: 'shrimp', labelEn: 'Shrimp', labelZh: '大虾/虾仁', icon: '🦐', category: 'meat' },
  // Dairy & Protein
  { id: 'egg', labelEn: 'Eggs', labelZh: '鸡蛋', icon: '🥚', category: 'dairy' },
  { id: 'tofu', labelEn: 'Tofu', labelZh: '豆腐', icon: '🧈', category: 'dairy' },
  { id: 'cheese', labelEn: 'Cheese', labelZh: '奶酪/芝士', icon: '🧀', category: 'dairy' },
  { id: 'milk', labelEn: 'Milk/Cream', labelZh: '牛奶/鲜奶油', icon: '🥛', category: 'dairy' },
  // Fresh Greens & Veggies
  { id: 'bok_choy', labelEn: 'Bok Choy', labelZh: '青菜/菜心', icon: '🥬', category: 'produce' },
  { id: 'broccoli', labelEn: 'Broccoli', labelZh: '西兰花', icon: '🥦', category: 'produce' },
  { id: 'spinach', labelEn: 'Spinach', labelZh: '菠菜', icon: '🥬', category: 'produce' },
  { id: 'tomato', labelEn: 'Tomatoes', labelZh: '番茄/西红柿', icon: '🍅', category: 'produce' },
  { id: 'mushroom', labelEn: 'Mushrooms', labelZh: '菌菇', icon: '🍄', category: 'produce' }
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

  // ─── STEP 1: DINERS & HORIZON ───
  const defaultDiners = Math.max(1, familyMembers.length || 1);
  const [dinersCount, setDinersCount] = useState<number>(defaultDiners);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [includedDays, setIncludedDays] = useState<number[]>(() =>
    familyPersonalisation?.defaultCookingDays && familyPersonalisation.defaultCookingDays.length > 0
      ? familyPersonalisation.defaultCookingDays
      : [1, 2, 3, 4, 5, 6, 0]
  );

  // ─── STEP 2: MOOD & MULTI-CUISINE ───
  const [mode, setMode] = useState<AiPlannerMode>(() =>
    familyPersonalisation?.defaultPlanningStrategy || 'best_of_both'
  );
  // Multi-cuisine state
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['All Cuisines']);
  const [cuisineWarning, setCuisineWarning] = useState<{ count: number; cuisines: string[] } | null>(null);

  // ─── STEP 3: FRIDGE CLEAN-OUT ───
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const [customIngInput, setCustomIngInput] = useState<string>('');
  const [prioritizeExpiringEarlier, setPrioritizeExpiringEarlier] = useState<boolean>(true);

  // ─── ADVANCED PREFERENCES DRAWER (OPTION A) ───
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ─── STEP 4: CONFIRMATION & REVIEW ───
  const [planResult, setPlanResult] = useState<AiMealPlanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
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

  useEffect(() => {
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
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
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
      setSelectedCuisines(['All Cuisines']);
      setCuisineWarning(null);
      setFridgeIngredients([]);
      setSelectedDayFilter('all');
      setSkippedMealKeys(new Set());
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const headcountGuide = getHeadcountRecommendation(dinersCount);

  // Toggle multi-cuisine option
  const handleToggleCuisine = (cuisineId: string) => {
    if (cuisineId === 'All Cuisines') {
      setSelectedCuisines(['All Cuisines']);
      setCuisineWarning(null);
      return;
    }

    let updated: string[];
    const activeWithoutAll = selectedCuisines.filter((c) => c !== 'All Cuisines');
    if (activeWithoutAll.includes(cuisineId)) {
      updated = activeWithoutAll.filter((c) => c !== cuisineId);
      if (updated.length === 0) {
        updated = ['All Cuisines'];
      }
    } else {
      updated = [...activeWithoutAll, cuisineId];
    }
    setSelectedCuisines(updated);

    // Guardrail Check across selected cuisines
    if (updated.length > 0 && !updated.includes('All Cuisines') && (mode === 'easy_meals' || mode === 'best_of_both')) {
      const matchCount = familyCookbookDishes.filter((d) => matchesCuisine(d, updated)).length;
      if (matchCount < 3) {
        setCuisineWarning({ count: matchCount, cuisines: updated });
      } else {
        setCuisineWarning(null);
      }
    } else {
      setCuisineWarning(null);
    }
  };

  // Step 2 Proceed Guard
  const handleStep2Next = () => {
    const activeWithoutAll = selectedCuisines.filter((c) => c !== 'All Cuisines');
    if (activeWithoutAll.length > 0 && (mode === 'easy_meals' || mode === 'best_of_both')) {
      const matchCount = familyCookbookDishes.filter((d) => matchesCuisine(d, activeWithoutAll)).length;
      if (matchCount < 3) {
        setCuisineWarning({ count: matchCount, cuisines: activeWithoutAll });
        return;
      }
    }
    setCurrentStep(3);
  };

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
        selectedCuisines,
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
      setSelectedDayFilter('all');
      setIsGenerating(false);
      setCurrentStep(4);
    }, 280);
  };

  // Swap individual dish
  const handleSwapIndividualDish = (meal: PlannedDayMeal, targetDishId: string) => {
    if (!planResult) return;
    setSwappingDishId(targetDishId);

    setTimeout(() => {
      let systemPool = effectiveSystemDishes;
      if (!systemPool || systemPool.length === 0) systemPool = familyCookbookDishes;

      const updatedMeal = swapSingleMealDish(targetDishId, meal, planResult.suggestions, {
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        mealSchedules,
        selectedCuisines,
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

      if (updatedMeal) {
        setPlanResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            suggestions: prev.suggestions.map((m) =>
              m.dateISO === meal.dateISO && m.slotId === meal.slotId ? updatedMeal : m
            )
          };
        });
      }
      setSwappingDishId(null);
    }, 150);
  };

  // Swap whole meal for day
  const handleSwapWholeMeal = (meal: PlannedDayMeal) => {
    if (!planResult) return;
    const mealKey = `${meal.dateISO}_${meal.slotId}`;
    setSwappingMealKey(mealKey);

    setTimeout(() => {
      let systemPool = effectiveSystemDishes;
      if (!systemPool || systemPool.length === 0) systemPool = familyCookbookDishes;

      const updatedMeal = swapWholeMealForDay(meal, planResult.suggestions, {
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        mealSchedules,
        selectedCuisines,
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

      if (updatedMeal) {
        setPlanResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            suggestions: prev.suggestions.map((m) =>
              m.dateISO === meal.dateISO && m.slotId === meal.slotId ? updatedMeal : m
            )
          };
        });
      }
      setSwappingMealKey(null);
    }, 200);
  };

  // Remove dish from meal
  const handleRemoveDish = (meal: PlannedDayMeal, dishId: string) => {
    if (!planResult) return;
    const updated = removeDishFromMeal(meal, dishId, defaultStaple);
    setPlanResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        suggestions: prev.suggestions.map((m) =>
          m.dateISO === meal.dateISO && m.slotId === meal.slotId ? updated : m
        )
      };
    });
  };

  // Add dish to meal
  const handleAddDish = (meal: PlannedDayMeal) => {
    if (!planResult) return;
    const mealKey = `${meal.dateISO}_${meal.slotId}`;
    setAddingDishMealKey(mealKey);

    setTimeout(() => {
      let systemPool = effectiveSystemDishes;
      if (!systemPool || systemPool.length === 0) systemPool = familyCookbookDishes;

      const updated = addDishToMeal(meal, planResult.suggestions, {
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        mealSchedules,
        selectedCuisines,
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

      if (updated) {
        setPlanResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            suggestions: prev.suggestions.map((m) =>
              m.dateISO === meal.dateISO && m.slotId === meal.slotId ? updated : m
            )
          };
        });
      }
      setAddingDishMealKey(null);
    }, 180);
  };

  // Change meal staple
  const handleChangeMealStaple = (dateISO: string, slotId: string, newStaple: MealAccompaniment) => {
    if (!planResult) return;
    setPlanResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        suggestions: prev.suggestions.map((m) =>
          m.dateISO === dateISO && m.slotId === slotId ? { ...m, accompaniment: newStaple } : m
        )
      };
    });
  };

  // Skip meal toggle
  const handleToggleSkipMeal = (mealKey: string) => {
    setSkippedMealKeys((prev) => {
      const next = new Set(prev);
      if (next.has(mealKey)) {
        next.delete(mealKey);
      } else {
        next.add(mealKey);
      }
      return next;
    });
  };

  // Apply to calendar
  const handleApplyToCalendar = () => {
    if (!planResult) return;

    const newScheduleEntries: Record<string, Record<string, MealScheduleEntry>> = {};
    let appliedCount = 0;

    planResult.suggestions.forEach((meal) => {
      const mealKey = `${meal.dateISO}_${meal.slotId}`;
      if (skippedMealKeys.has(mealKey)) {
        return;
      }

      if (!newScheduleEntries[meal.dateISO]) {
        newScheduleEntries[meal.dateISO] = {};
      }

      const primary = meal.dishes[0] || meal.dish;
      const companionIds = meal.dishes.map((d) => d.id);

      newScheduleEntries[meal.dateISO][meal.slotId] = {
        dishId: primary.id,
        dishIds: companionIds,
        notes: `AI Quick Plan (${meal.dinersCount} diners · ${meal.comboStructure})`
      };
      appliedCount++;
    });

    onApplyMealPlan(newScheduleEntries, durationDays);
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
      return { label: language === 'zh-CN' ? '一锅搞定' : 'One-Pot', emoji: '🍚', color: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' };
    }
    if (role === 'vegetable_side') {
      return { label: language === 'zh-CN' ? '营养时蔬' : 'Veg Side', emoji: '🥗', color: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
    }
    if (role === 'soup') {
      return { label: language === 'zh-CN' ? '滋补靓汤' : 'Soup', emoji: '🍲', color: 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' };
    }
    return { label: language === 'zh-CN' ? '主荤大菜' : 'Main Protein', emoji: '🥩', color: 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' };
  };

  const activeMeals = planResult
    ? planResult.suggestions.filter((m) => !skippedMealKeys.has(`${m.dateISO}_${m.slotId}`))
    : [];

  // Displayed suggestions in Step 4 based on day filter
  const displayedSuggestions = useMemo(() => {
    if (!planResult) return [];
    if (selectedDayFilter === 'all') return planResult.suggestions;
    return planResult.suggestions.filter((m) => m.dateISO === selectedDayFilter);
  }, [planResult, selectedDayFilter]);

  // Format active cuisines label
  const activeCuisinesText = useMemo(() => {
    const withoutAll = selectedCuisines.filter((c) => c !== 'All Cuisines');
    if (withoutAll.length === 0) {
      return language === 'zh-CN' ? '全部菜系' : 'All Cuisines';
    }
    return withoutAll.join(', ');
  }, [selectedCuisines, language]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#EDE8DF] bg-[#FAF8F5] shadow-2xl dark:border-[#3D362E] dark:bg-[#1E1B18] animate-in zoom-in-95 duration-200">
        
        {/* Header with Wizard Step Indicators & Preferences Icon */}
        <div className="border-b border-[#EDE8DF] bg-white px-5 py-3.5 dark:border-[#3D362E] dark:bg-[#252220]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFD13B] text-[#2D2640] shadow-xs shrink-0">
                <Sparkles className="h-5 w-5 fill-[#2D2640]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[#2D2640] dark:text-[#F0EDE8] truncate">
                    {language === 'zh-CN' ? '快速智能排餐' : 'Quick Meal Plan'}
                  </h2>
                  {currentStep <= 3 ? (
                    <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 shrink-0">
                      {language === 'zh-CN' ? `步骤 ${currentStep}/3` : `Step ${currentStep}/3`}
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      {language === 'zh-CN' ? '确认排餐' : 'Review & Confirm'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] truncate mt-0.5">
                  {currentStep === 1 && (language === 'zh-CN' ? '设定就餐人数与跨度 · 智能适配桌餐组合' : 'Diners & Planning Horizon · Auto-structures meals')}
                  {currentStep === 2 && (language === 'zh-CN' ? '选择风格倾向与菜系偏好 (支持多选)' : 'Cooking Style & Cuisine Filter (Multi-select)')}
                  {currentStep === 3 && (language === 'zh-CN' ? '优先消耗冰箱临期食材 · 零浪费模式' : 'Use Up Expiring Fridge Perishables · Zero Waste')}
                  {currentStep === 4 && (language === 'zh-CN' ? '高颜值食谱大图预览 · 点击可查阅完整菜谱' : 'Gourmet meal preview · Tap any dish to inspect recipe')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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

          {/* Sleek 3-Step Progress Bar */}
          {currentStep <= 3 && (
            <div className="grid grid-cols-3 gap-1.5 pt-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    currentStep >= s ? 'bg-[#FFD13B]' : 'bg-[#EDE8DF] dark:bg-[#38332E]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ─── STEP 1: DINERS & HORIZON ─── */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Question 1: Diners Headcount */}
              <div className="rounded-3xl border border-[#EDE8DF] bg-white p-4 sm:p-5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                      <Users className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '就餐人数 (Diners)' : 'Who Are We Cooking For?'}
                      </h3>
                      <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                        {language === 'zh-CN' ? '根据人数智能规划每餐大荤、素菜与靓汤配比' : 'Auto-tailors protein, veg side, and soup ratios'}
                      </p>
                    </div>
                  </div>

                  {/* Precision Stepper */}
                  <div className="flex items-center gap-2 bg-[#FAF7F2] dark:bg-[#1E1B18] p-1 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E]">
                    <button
                      type="button"
                      onClick={() => setDinersCount((prev) => Math.max(1, prev - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#2D2640] hover:bg-[#EDE8DF] dark:bg-[#252220] dark:text-[#F0EDE8] transition cursor-pointer shadow-2xs"
                    >
                      <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <span className="w-8 text-center text-base font-black text-[#2D2640] dark:text-[#F0EDE8]">
                      {dinersCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDinersCount((prev) => Math.min(12, prev + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#FFD13B] text-[#2D2640] hover:bg-[#FFC200] transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Diners Avatar Preset Chips */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { count: 1, emoji: '👤', zh: '一人食', en: 'Solo (1)' },
                    { count: 2, emoji: '👫', zh: '二人世界', en: 'Couple (2)' },
                    { count: 3, emoji: '👨‍👩‍👧', zh: '三口之家', en: 'Family (3)' },
                    { count: 4, emoji: '👨‍👩‍👧‍👦', zh: '大家庭', en: '4+ Diners' }
                  ].map((preset) => (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => setDinersCount(preset.count)}
                      className={`py-2 px-2 rounded-2xl border text-center transition cursor-pointer ${
                        dinersCount === preset.count
                          ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/40 shadow-xs'
                          : 'border-[#EDE8DF] bg-[#FAF8F5] hover:border-[#FFD13B] dark:border-[#38332E] dark:bg-[#1E1B18]'
                      }`}
                    >
                      <span className="block text-lg">{preset.emoji}</span>
                      <span className="block text-[10.5px] font-black text-[#2D2640] dark:text-[#F0EDE8] truncate mt-0.5">
                        {language === 'zh-CN' ? preset.zh : preset.en}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Table Spread Visual Recommendation Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-[#FFF8E6] to-[#FAF7F2] dark:from-[#2A1E00] dark:to-[#1E1B18] p-3 border border-[#FFD13B]/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">🍽️</span>
                    <div>
                      <span className="block text-xs font-black text-[#7A5C00] dark:text-[#FFD13B]">
                        {language === 'zh-CN' ? headcountGuide.descriptionZh : headcountGuide.descriptionEn}
                      </span>
                      <span className="block text-[10px] text-[#8A7A70] dark:text-[#9A8A7E]">
                        {language === 'zh-CN' ? '每餐黄金搭配结构' : 'Optimal meal combo balance'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10.5px] font-black px-2.5 py-1 rounded-xl bg-[#FFF3D6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 shadow-2xs">
                      {language === 'zh-CN' ? headcountGuide.rolesSummaryZh : headcountGuide.rolesSummaryEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Question 2: Planning Horizon */}
              <div className="rounded-3xl border border-[#EDE8DF] bg-white p-4 sm:p-5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    <Calendar className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                      {language === 'zh-CN' ? '排餐跨度 (Planning Horizon)' : 'Planning Horizon'}
                    </h3>
                    <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                      {language === 'zh-CN' ? '选择你想一次性生成的排餐周期' : 'Choose how far ahead you want to plan'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { days: 7, label: language === 'zh-CN' ? '7 天 (整周推荐)' : '7 Days (Full Week)', badge: '⭐ Most Popular', icon: '🗓️' },
                    { days: 5, label: language === 'zh-CN' ? '5 天 (工作日)' : '5 Days (Workdays)', badge: '💼 Weekdays', icon: '⚡' },
                    { days: 3, label: language === 'zh-CN' ? '3 天 (短周期试水)' : '3 Days (Short)', badge: '🌱 Fast Plan', icon: '🥣' },
                    { days: 14, label: language === 'zh-CN' ? '14 天 (两周大循环)' : '14 Days (2 Weeks)', badge: '🎯 Long-Term', icon: '📅' }
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setDurationDays(opt.days)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                        durationDays === opt.days
                          ? 'border-[#FFD13B] bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] ring-2 ring-[#FFD13B]/40 shadow-xs'
                          : 'border-[#EDE8DF] bg-[#FAF8F5] text-[#7A6E64] hover:border-[#FFD13B] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{opt.icon}</span>
                        <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/40 text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/30">
                          {opt.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8] mt-2">
                        {opt.label}
                      </h4>
                    </button>
                  ))}
                </div>

                {/* Customized Meal Schedules Aligned Indicator */}
                {mealSchedules && mealSchedules.length > 0 && (
                  <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-[#7A6E64] dark:text-[#9A9088] min-w-0">
                      <span>🗓️</span>
                      <span className="truncate">
                        {language === 'zh-CN' ? '已自动对齐您的“自定义餐段”配置' : 'Slots aligned with your configured schedules'}
                      </span>
                    </div>
                    <span className="font-black text-[#7A5C00] dark:text-[#FFD13B] shrink-0 ml-2">
                      {mealSchedules.filter((s) => s.defaultEnabled).map((s) => s.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ─── STEP 2: MOOD & MULTI-CUISINE ─── */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Question: Recipe Strategy */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                    {language === 'zh-CN' ? '本周想吃什么风格？' : 'What Are You in the Mood For?'}
                  </h3>
                  <span className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                    {language === 'zh-CN' ? '点击选择偏向' : 'Select a primary vibe'}
                  </span>
                </div>

                {/* Best of Both */}
                <div
                  onClick={() => setMode('best_of_both')}
                  className={`p-4 rounded-3xl border transition cursor-pointer relative ${
                    mode === 'best_of_both'
                      ? 'border-[#FFD13B] bg-gradient-to-r from-[#FFF8E6] to-amber-50/50 dark:from-[#2A1E00] dark:to-[#221B0B] ring-2 ring-[#FFD13B]/50 shadow-sm'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFD13B]/30 text-xl shrink-0">
                        🌟
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                            {language === 'zh-CN' ? '黄金组合 (Best of Both · 推荐)' : 'Best of Both (Recommended)'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                          {language === 'zh-CN' ? '工作日熟悉的家常菜，周末尝试精选灵感新菜' : 'Familiar family classics on weekdays + inspiring weekend discoveries'}
                        </p>
                      </div>
                    </div>
                    {mode === 'best_of_both' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD13B] text-[#2D2640]">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Family Classics */}
                <div
                  onClick={() => setMode('easy_meals')}
                  className={`p-4 rounded-3xl border transition cursor-pointer relative ${
                    mode === 'easy_meals'
                      ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/50 shadow-sm'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-xl shrink-0 dark:bg-amber-950/40">
                        🏠
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '家常熟菜 (Family Classics)' : 'Family Classics'}
                        </h4>
                        <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                          {language === 'zh-CN' ? '高度优先家庭菜谱中的私房菜，省心省事' : 'Focuses primarily on dishes in your Family Cookbook'}
                        </p>
                      </div>
                    </div>
                    {mode === 'easy_meals' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD13B] text-[#2D2640]">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Something New */}
                <div
                  onClick={() => setMode('give_me_ideas')}
                  className={`p-4 rounded-3xl border transition cursor-pointer relative ${
                    mode === 'give_me_ideas'
                      ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/50 shadow-sm'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-xl shrink-0 dark:bg-amber-950/40">
                        ✨
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '灵感新菜 (Something New)' : 'Something New'}
                        </h4>
                        <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                          {language === 'zh-CN' ? '从 3,000+ 甄选菜谱中探索新口味' : 'Fresh curated recipes from the 3,000+ master library'}
                        </p>
                      </div>
                    </div>
                    {mode === 'give_me_ideas' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD13B] text-[#2D2640]">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── CUISINE (OPTIONAL) MULTI-SELECT ─── */}
              <div className="rounded-3xl border border-[#EDE8DF] bg-white p-4 sm:p-5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                      {language === 'zh-CN' ? '菜系 (可选) · CUISINE (OPTIONAL)' : 'CUISINE (OPTIONAL)'}
                    </h3>
                    <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                      {language === 'zh-CN' ? '支持多选 · 选中多个将混合推荐' : 'Choose multiple cuisines or keep all'}
                    </p>
                  </div>
                  <span className="text-[10.5px] font-black px-2.5 py-1 rounded-full bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40">
                    {activeCuisinesText}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {CUISINE_OPTIONS.map((c) => {
                    const isSelected = selectedCuisines.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleCuisine(c.id)}
                        className={`py-2 px-3 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/15 shadow-xs ring-2 ring-[#FFD13B]/30 font-black'
                            : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                        }`}
                      >
                        <span className="text-base">{c.icon}</span>
                        <span>{language === 'zh-CN' ? c.zh : c.en}</span>
                        {isSelected && c.id !== 'All Cuisines' && (
                          <span className="text-[10px] ml-0.5 bg-[#2D2640] text-[#FFD13B] rounded-full h-4 w-4 flex items-center justify-center">
                            ✓
                          </span>
                        )}
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
              <div className="rounded-3xl border border-[#EDE8DF] bg-white p-4 sm:p-5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🧊</span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                      {language === 'zh-CN' ? '冰箱清库 · 优先消耗临期食材' : 'Fridge Clean-out · Use It Up'}
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                    {language === 'zh-CN'
                      ? '勾选冰箱里需要尽快吃完的肉类、生鲜或蔬菜，AI 将智能优选含这些食材的菜谱'
                      : 'Pick perishables to use up first; AI will prioritize matching dishes on your plan'}
                  </p>
                </div>

                {/* Grouped Perishables: Meat, Dairy, Veggies */}
                <div className="space-y-3 pt-1">
                  {/* Meat & Seafood */}
                  <div>
                    <span className="text-[10.5px] font-black text-[#8A7A70] uppercase tracking-wider dark:text-[#9A8A7E]">
                      🥩 {language === 'zh-CN' ? '肉类与生鲜' : 'Meat & Seafood'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {COMMON_PERISHABLES.filter((p) => p.category === 'meat').map((p) => {
                        const isSelected = fridgeIngredients.includes(p.labelEn) || fridgeIngredients.includes(p.labelZh);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleFridgeIngredient(language === 'zh-CN' ? p.labelZh : p.labelEn)}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/15 shadow-xs font-black'
                                : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                            }`}
                          >
                            <span>{p.icon}</span>
                            <span>{language === 'zh-CN' ? p.labelZh : p.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dairy & Protein */}
                  <div>
                    <span className="text-[10.5px] font-black text-[#8A7A70] uppercase tracking-wider dark:text-[#9A8A7E]">
                      🥛 {language === 'zh-CN' ? '蛋奶与豆品' : 'Dairy & Protein'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {COMMON_PERISHABLES.filter((p) => p.category === 'dairy').map((p) => {
                        const isSelected = fridgeIngredients.includes(p.labelEn) || fridgeIngredients.includes(p.labelZh);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleFridgeIngredient(language === 'zh-CN' ? p.labelZh : p.labelEn)}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/15 shadow-xs font-black'
                                : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                            }`}
                          >
                            <span>{p.icon}</span>
                            <span>{language === 'zh-CN' ? p.labelZh : p.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fresh Produce */}
                  <div>
                    <span className="text-[10.5px] font-black text-[#8A7A70] uppercase tracking-wider dark:text-[#9A8A7E]">
                      🥬 {language === 'zh-CN' ? '新鲜蔬菜' : 'Fresh Produce'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {COMMON_PERISHABLES.filter((p) => p.category === 'produce').map((p) => {
                        const isSelected = fridgeIngredients.includes(p.labelEn) || fridgeIngredients.includes(p.labelZh);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleFridgeIngredient(language === 'zh-CN' ? p.labelZh : p.labelEn)}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/15 shadow-xs font-black'
                                : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                            }`}
                          >
                            <span>{p.icon}</span>
                            <span>{language === 'zh-CN' ? p.labelZh : p.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Custom Ingredient Search / Input */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#EDE8DF] dark:border-[#38332E]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A7A70]" />
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
                      placeholder={language === 'zh-CN' ? '输入其他临期食材 (如: 西葫芦、牛油果)...' : 'Type custom perishable (e.g. Zucchini)...'}
                      className="w-full rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] pl-9 pr-3 py-2 text-xs text-[#2D2640] placeholder-[#8A7A70] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#F0EDE8] focus:outline-hidden focus:ring-2 focus:ring-[#FFD13B]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomIngredient}
                    disabled={!customIngInput.trim()}
                    className="rounded-2xl bg-[#FFD13B] px-4 py-2 text-xs font-black text-[#2D2640] hover:bg-[#FFC200] transition cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    {language === 'zh-CN' ? '+ 添加' : '+ Add'}
                  </button>
                </div>

                {/* Selected Ingredients Strip */}
                {fridgeIngredients.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    <span className="text-[11px] font-black text-[#8A7A70] dark:text-[#9A8A7E]">
                      {language === 'zh-CN' ? '已选优先消耗:' : 'Expiring to use:'}
                    </span>
                    {fridgeIngredients.map((ing) => (
                      <span
                        key={ing}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 text-xs font-bold shadow-2xs"
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={() => handleToggleFridgeIngredient(ing)}
                          className="hover:text-rose-600 font-black cursor-pointer text-sm"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Zero Waste Mode Toggle */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] cursor-pointer hover:border-[#FFD13B] transition">
                  <input
                    type="checkbox"
                    checked={prioritizeExpiringEarlier}
                    onChange={(e) => setPrioritizeExpiringEarlier(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-sm border-[#EDE8DF] text-[#FFD13B] focus:ring-[#FFD13B]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '零浪费优先：将易坏食材安排在前几天制作' : 'Zero Waste: Prioritize quicker-expiring items earlier in the week'}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">
                      {language === 'zh-CN' ? '生鲜与叶菜排在周前段，耐储食材排在周末，杜绝冰箱食材过期遗忘' : 'Prepares fresh meats & leafy greens on days 1-3 to prevent waste'}
                    </p>
                  </div>
                </label>

              </div>
            </div>
          )}

          {/* ─── STEP 4: CONFIRMATION & REVIEW (MAXIMIZING FOOD PHOTO APPEAL) ─── */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Summary Stats Banner */}
              {planResult && (
                <div className="rounded-3xl border border-[#EDE8DF] bg-white p-4 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8] block">
                          {language === 'zh-CN' ? '100% 严防过敏 · 安全美味' : '100% Family Safe (0 Allergens)'}
                        </span>
                        <span className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '严格遵循全家禁忌与就餐偏好' : 'Every dish verified against household rules'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-[#2D2640] bg-[#FFD13B] px-3 py-1 rounded-full shadow-2xs">
                      {activeMeals.length} {language === 'zh-CN' ? '顿排餐' : 'meals active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                        ~{planResult.averageCalories} kcal
                      </span>
                      <span className="text-[9.5px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '人均热量' : 'Cal/Person'}
                      </span>
                    </div>
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-emerald-700 dark:text-emerald-400">
                        ~{planResult.averageProtein}g
                      </span>
                      <span className="text-[9.5px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '人均蛋白质' : 'Protein'}
                      </span>
                    </div>
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-[#7A5C00] dark:text-[#FFD13B]">
                        {dinersCount} {language === 'zh-CN' ? '位食客' : 'Diners'}
                      </span>
                      <span className="text-[9.5px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '就餐规模' : 'Headcount'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── HORIZONTAL DAY NAVIGATION STRIP (REQUIREMENT: EASY DAY-BY-DAY EXAMINATION) ─── */}
              {planResult && planResult.suggestions.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedDayFilter('all')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                      selectedDayFilter === 'all'
                        ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/15 font-black shadow-xs'
                        : 'bg-white text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#252220] dark:border-[#38332E] dark:text-[#9A9088]'
                    }`}
                  >
                    <span>{language === 'zh-CN' ? '全部膳食' : 'All Meals'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2D2640]/10 dark:bg-white/10">
                      {planResult.suggestions.length}
                    </span>
                  </button>

                  {/* Day Pills */}
                  {Array.from(new Set(planResult.suggestions.map((s) => s.dateISO))).map((date) => {
                    const sample = planResult.suggestions.find((s) => s.dateISO === date);
                    const isSelected = selectedDayFilter === date;
                    const dateMeals = planResult.suggestions.filter((s) => s.dateISO === date);
                    const allSkipped = dateMeals.every((m) => skippedMealKeys.has(`${m.dateISO}_${m.slotId}`));

                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDayFilter(date)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/15 font-black shadow-xs'
                            : 'bg-white text-[#7A6E64] border-[#EDE8DF] hover:border-[#FFD13B] dark:bg-[#252220] dark:border-[#38332E] dark:text-[#9A9088]'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${allSkipped ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                        <span>{sample?.dayName || date.slice(5)}</span>
                        <span className="text-[10px] opacity-70">{date.slice(5)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Day-by-Day Cards */}
              <div className="space-y-4">
                {displayedSuggestions.map((meal) => {
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
                        className="rounded-3xl border border-dashed border-[#EDE8DF] bg-[#FAF8F5] p-4 dark:border-[#38332E] dark:bg-[#1A1816] flex items-center justify-between opacity-80"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🍽️</span>
                          <div>
                            <span className="text-xs font-black text-[#7A6E64] dark:text-[#9A9088]">
                              {meal.dayName} · {meal.dateISO.slice(5)} · {meal.slotName}
                            </span>
                            <p className="text-[11px] text-[#A89F95] dark:text-[#7A6E64]">
                              {language === 'zh-CN' ? '已标记外出就餐/自理 (不录入日程)' : 'Skipped (Dining out / Self-arranged)'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSkipMeal(mealKey)}
                          className="text-xs font-black text-[#7A5C00] dark:text-[#FFD13B] hover:underline cursor-pointer px-3 py-1.5 rounded-xl bg-[#FFF8E6] dark:bg-[#2A1E00] border border-[#FFD13B]/40"
                        >
                          {language === 'zh-CN' ? '恢复排餐 ↩️' : 'Restore ↩️'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={mealKey}
                      className={`rounded-3xl border border-[#EDE8DF] bg-white p-4 sm:p-5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-3.5 transition-all ${
                        isSwappingMeal ? 'opacity-40 scale-[0.98]' : ''
                      }`}
                    >
                      {/* Day Header Row */}
                      <div className="flex items-center justify-between border-b border-[#EDE8DF] pb-3 dark:border-[#38332E] gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-[#2D2640] dark:text-[#F0EDE8]">
                            {meal.dayName}
                          </span>
                          <span className="text-xs text-[#8A7A70] dark:text-[#9A8A7E]">
                            {meal.dateISO.slice(5)}
                          </span>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#FFD13B] text-[#2D2640] border border-[#2D2640]/10 shadow-2xs">
                            {meal.slotName}
                          </span>

                          {/* Minimized Staple Accompaniment Badge */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setEditingStapleMealKey(isEditingStaple ? null : mealKey)}
                              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/30 hover:border-[#FFD13B] transition cursor-pointer flex items-center gap-1"
                              title={language === 'zh-CN' ? '调整主食搭配' : 'Change staple accompaniment'}
                            >
                              <span>{staple.emoji}</span>
                              <span>{language === 'zh-CN' ? staple.labelZh : staple.labelEn}</span>
                              <span className="text-[9px]">▾</span>
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
                                    className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                      meal.accompaniment === opt.id
                                        ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 font-black'
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
                            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF7F2] text-xs font-bold text-[#2D2640] hover:bg-[#FFD13B] hover:border-[#2D2640]/10 dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#F0EDE8] transition cursor-pointer shrink-0"
                            title={language === 'zh-CN' ? `重新生成${meal.slotName}的整套搭配` : `Regenerate entire ${meal.slotName} combination`}
                          >
                            <RotateCw className={`h-3 w-3 ${isSwappingMeal ? 'animate-spin' : ''}`} />
                            <span>{language === 'zh-CN' ? '换整餐' : 'Swap Meal'}</span>
                          </button>

                          {/* Skip Meal Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSkipMeal(mealKey)}
                            className="flex items-center gap-1 py-1 px-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF7F2] text-xs font-bold text-[#7A6E64] hover:text-rose-600 hover:border-rose-200 dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088] transition cursor-pointer shrink-0"
                            title={language === 'zh-CN' ? '不计划此餐 (外出就餐/自理)' : 'Skip this meal (Eating out / Takeaway)'}
                          >
                            <UtensilsCrossed className="h-3 w-3" />
                            <span>{language === 'zh-CN' ? '外食/跳过' : 'Skip'}</span>
                          </button>
                        </div>
                      </div>

                      {/* ─── PROMINENT FOOD PHOTO DISH CARDS (MAXIMIZING VISUAL APPEAL) ─── */}
                      <div className="space-y-3">
                        {meal.dishes.map((dish) => {
                          const isSwapping = swappingDishId === dish.id;
                          const roleBadge = getDishRoleBadge(dish);
                          const matchedFridge = getMatchingFridgeIngredients(dish, fridgeIngredients);

                          return (
                            <div
                              key={dish.id}
                              className={`group relative rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] p-3 sm:p-3.5 dark:border-[#38332E] dark:bg-[#1E1B18] transition-all hover:border-[#FFD13B] hover:shadow-md ${
                                isSwapping ? 'opacity-40 scale-[0.98]' : ''
                              }`}
                            >
                              <div className="flex gap-3.5 items-start">
                                
                                {/* Generous Food Photo Thumbnail (w-24 h-24 sm:w-28 sm:h-28) */}
                                <div
                                  onClick={() => setPreviewingDish(dish)}
                                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFF3D6] via-[#FFE4B5] to-[#FFD13B] dark:from-[#2E2000] dark:to-[#4A3500] shrink-0 border border-[#EDE8DF] dark:border-[#38332E] shadow-2xs relative cursor-pointer group-hover:scale-102 transition-transform duration-200"
                                  title={language === 'zh-CN' ? '点击查阅完整高清食谱' : 'Click to inspect full recipe details'}
                                >
                                  {dish.imageUrl ? (
                                    <img
                                      src={dish.imageUrl}
                                      alt={dish.name}
                                      className="h-full w-full object-cover group-hover:scale-106 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center p-2">
                                      <span className="text-3xl sm:text-4xl filter drop-shadow-sm">
                                        {dish.imageEmoji || '🍲'}
                                      </span>
                                    </div>
                                  )}

                                  {/* Visual Eye Overlay Hint */}
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye className="h-5 w-5 drop-shadow-md" />
                                  </div>
                                </div>

                                {/* Dish Details & Smart Badges */}
                                <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
                                  <div>
                                    {/* Badges Row: Role + Fridge Hero Tag */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border ${roleBadge.color}`}>
                                        {roleBadge.emoji} {roleBadge.label}
                                      </span>

                                      {/* Fridge hero badge: Shows which expiring ingredient it uses! */}
                                      {matchedFridge.length > 0 && (
                                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                          <Leaf className="h-2.5 w-2.5 text-emerald-600" />
                                          <span>
                                            {language === 'zh-CN'
                                              ? `消耗 ${matchedFridge.join('、')}`
                                              : `Uses ${matchedFridge.join(', ')}`}
                                          </span>
                                        </span>
                                      )}

                                      {dish.favoritedByMembers && dish.favoritedByMembers.length > 0 && (
                                        <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                          ⭐ {language === 'zh-CN' ? '家庭最爱' : 'Favorite'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Dish Title (Clickable to inspect) */}
                                    <div
                                      onClick={() => setPreviewingDish(dish)}
                                      className="cursor-pointer mt-1"
                                    >
                                      <h4 className="text-sm font-black text-[#2D2640] dark:text-[#F0EDE8] hover:text-[#B8860B] transition leading-snug line-clamp-2">
                                        {dish.name}
                                      </h4>
                                    </div>

                                    {/* Nutrition & Time Row */}
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E] flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{dish.totalTimeMinutes || dish.prepTimeMinutes || 25}m</span>
                                      </span>
                                      <span>·</span>
                                      <span className="flex items-center gap-1">
                                        <Flame className="h-3 w-3 text-amber-500" />
                                        <span>{dish.nutrition?.calories || 480} kcal</span>
                                      </span>
                                      <span>·</span>
                                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                        🥩 {dish.nutrition?.protein || 24}g pro
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action Buttons: Swap Dish & Remove */}
                                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#EDE8DF]/60 dark:border-[#38332E]/60">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingDish(dish)}
                                      className="text-[11px] font-bold text-[#7A6E64] hover:text-[#2D2640] dark:text-[#9A9088] dark:hover:text-[#F0EDE8] transition cursor-pointer flex items-center gap-1"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>{language === 'zh-CN' ? '查看食谱 ↗' : 'Inspect ↗'}</span>
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        disabled={isSwapping}
                                        onClick={() => handleSwapIndividualDish(meal, dish.id)}
                                        className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl border border-[#EDE8DF] bg-white text-xs font-black text-[#2D2640] hover:bg-[#FFD13B] hover:border-[#2D2640]/10 dark:border-[#38332E] dark:bg-[#252220] dark:text-[#F0EDE8] transition cursor-pointer shadow-2xs"
                                        title={language === 'zh-CN' ? '换这道菜' : 'Swap this dish'}
                                      >
                                        <RotateCw className={`h-3 w-3 ${isSwapping ? 'animate-spin' : ''}`} />
                                        <span>{language === 'zh-CN' ? '换这道' : 'Swap'}</span>
                                      </button>

                                      {meal.dishes.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDish(meal, dish.id)}
                                          className="flex items-center justify-center h-7 w-7 rounded-xl text-[#9A8A7E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                          title={language === 'zh-CN' ? '从本餐中移除此菜品' : 'Remove dish from this meal'}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Dish Button */}
                        <button
                          type="button"
                          disabled={isAddingDish || meal.dishes.length >= 8}
                          onClick={() => handleAddDish(meal)}
                          className="flex w-full items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-dashed border-[#EDE8DF] bg-[#FAF8F5] text-xs font-black text-[#7A6E64] hover:border-[#FFD13B] hover:text-[#2D2640] hover:bg-[#FFF8E6] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088] dark:hover:text-[#FFD13B] transition cursor-pointer disabled:opacity-50"
                        >
                          {isAddingDish ? (
                            <>
                              <RotateCw className="h-3.5 w-3.5 animate-spin text-[#FFD13B]" />
                              <span>{language === 'zh-CN' ? 'AI 正在智能规划搭配新菜...' : 'AI planning complementary dish...'}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 text-[#7A5C00] dark:text-[#FFD13B]" />
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
        <div className="border-t border-[#EDE8DF] bg-white px-5 py-3.5 dark:border-[#3D362E] dark:bg-[#252220]">
          {currentStep === 1 && (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-5 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                {language === 'zh-CN' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer"
              >
                <span>{language === 'zh-CN' ? '下一步: 菜系与风格' : 'Next: Style & Cuisine'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{language === 'zh-CN' ? '上一步' : 'Back'}</span>
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer"
              >
                <span>{language === 'zh-CN' ? '下一步: 冰箱清库' : 'Next: Fridge Clean-out'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
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
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
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

      {/* ─── CUISINE GUARDRAIL NOTICE MODAL ─── */}
      {cuisineWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#EDE8DF] bg-white p-5 shadow-2xl dark:border-[#3D362E] dark:bg-[#252220] space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '家庭菜谱菜量提示' : 'Cookbook Recipes Notice'}
                </h3>
                <p className="text-xs text-[#8A7A70] dark:text-[#9A8A7E] mt-1 leading-relaxed">
                  {language === 'zh-CN'
                    ? `您的家庭菜谱中【${cuisineWarning.cuisines.join('、')}】菜系的菜品较少（共仅 ${cuisineWarning.count} 道），是否前往菜谱库挑选并添加更多？`
                    : `You only have ${cuisineWarning.count} recipe(s) in your family Cookbook for ${cuisineWarning.cuisines.join(', ')}. Would you like to explore and add more from the Recipe Library?`}
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
                  const targetCuisine = cuisineWarning.cuisines[0] || 'Chinese';
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

      {/* ─── ADVANCED PREFERENCES SHEET (OPTION A) ─── */}
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
                      className={`py-2 rounded-xl border text-[10.5px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                        spiceTolerance === s.id
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 font-black shadow-2xs'
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
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        focus === f.id
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 font-black shadow-2xs'
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
                      className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        defaultStaple === s.id
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 font-black shadow-2xs'
                          : 'bg-[#FAF8F5] text-[#7A6E64] border-[#EDE8DF] dark:bg-[#1E1B18] dark:border-[#38332E] dark:text-[#9A9088]'
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{language === 'zh-CN' ? s.zh : s.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personalisation Link */}
              {onOpenPersonalisation && (
                <div className="pt-2 border-t border-[#EDE8DF] dark:border-[#38332E]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreferencesOpen(false);
                      onClose();
                      onOpenPersonalisation();
                    }}
                    className="w-full py-2.5 rounded-2xl bg-[#FAF7F2] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] border border-[#FFD13B]/40 text-xs font-black transition cursor-pointer"
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

      {/* ─── RECIPE DETAIL INSPECTION MODAL ─── */}
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