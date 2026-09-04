import React, { useState } from 'react';
import type {
  Dish,
  MealPlan,
  MemberPreferences,
  FamilyPersonalisation,
  MealScheduleEntry
} from '../../types';
import {
  Sparkles,
  X,
  Users,
  Calendar,
  Check,
  RotateCw,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sliders
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
  ACCOMPANIMENT_OPTIONS,
  type AiPlannerMode,
  type AiPlannerFocus,
  type MealAccompaniment,
  type PlannedDayMeal,
  type AiMealPlanResult
} from '../../services/aiMealPlannerService';
import { loadMasterSystemRecipes, getCachedSystemRecipes } from '../../services/systemRecipesService';

interface AiMealPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDateISO: string;
  familyCookbookDishes: Dish[];
  allSystemDishes: Dish[];
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
}

export const AiMealPlannerModal: React.FC<AiMealPlannerModalProps> = ({
  isOpen,
  onClose,
  startDateISO,
  familyCookbookDishes,
  allSystemDishes,
  memberProfiles = {},
  familyPersonalisation = { strictAllergyFilter: true },
  familyMembers = [],
  recentMealPlan = {},
  onApplyMealPlan,
  onGoToGrocery,
  onOpenPersonalisation
}) => {
  const { language } = useLanguage();

  // ─── STEP 1: PRE-FLIGHT VOLATILE SETTINGS ───
  const defaultDiners = Math.max(1, familyMembers.length || 1);
  const [dinersCount, setDinersCount] = useState<number>(defaultDiners);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [includedDays, setIncludedDays] = useState<number[]>(() =>
    familyPersonalisation?.defaultCookingDays && familyPersonalisation.defaultCookingDays.length > 0
      ? familyPersonalisation.defaultCookingDays
      : [1, 2, 3, 4, 5, 6, 0]
  );
  const [focus, setFocus] = useState<AiPlannerFocus>(() =>
    familyPersonalisation?.defaultDietaryFocus || 'balanced'
  );
  const [mode, setMode] = useState<AiPlannerMode>(() =>
    familyPersonalisation?.defaultPlanningStrategy || 'best_of_both'
  );
  const [defaultStaple, setDefaultStaple] = useState<MealAccompaniment>(() =>
    familyPersonalisation?.defaultStaple || 'jasmine_rice'
  );
  const [spiceTolerance, setSpiceTolerance] = useState<'none' | 'mild' | 'medium' | 'spicy'>(() =>
    familyPersonalisation?.spiceTolerance || (familyPersonalisation?.cookingForKids ? 'none' : 'mild')
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);

  const prevIsOpenRef = React.useRef(false);

  // Sync state ONLY when modal transitions from closed to open!
  React.useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
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
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, familyMembers.length, familyPersonalisation]);

  // Master System Dishes State (ensuring all 3,000+ recipes are available offline)
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

  // ─── STEP 2: GENERATED PLAN STATE ───
  const [currentStep, setCurrentStep] = useState<'config' | 'preview'>('config');
  const [planResult, setPlanResult] = useState<AiMealPlanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [swappingDishId, setSwappingDishId] = useState<string | null>(null);
  const [swappingDate, setSwappingDate] = useState<string | null>(null);
  const [addingDishDate, setAddingDishDate] = useState<string | null>(null);
  const [editingStapleDate, setEditingStapleDate] = useState<string | null>(null);

  if (!isOpen) return null;

  const headcountGuide = getHeadcountRecommendation(dinersCount);

  const daysOfWeekLabels = [
    { num: 1, en: 'Mon', zh: '周一' },
    { num: 2, en: 'Tue', zh: '周二' },
    { num: 3, en: 'Wed', zh: '周三' },
    { num: 4, en: 'Thu', zh: '周四' },
    { num: 5, en: 'Fri', zh: '周五' },
    { num: 6, en: 'Sat', zh: '周六' },
    { num: 0, en: 'Sun', zh: '周日' }
  ];

  const toggleDay = (dayNum: number) => {
    setIncludedDays((prev) => {
      if (prev.includes(dayNum)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== dayNum);
      } else {
        return [...prev, dayNum];
      }
    });
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
    if (!systemPool || systemPool.length < 50) {
      const cached = getCachedSystemRecipes();
      if (cached && cached.length >= 50) {
        systemPool = cached;
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
        targetSlotId: 'slot_dinner',
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
      setIsGenerating(false);
      setCurrentStep('preview');
    }, 150);
  };

  // Swap an individual dish in a dinner
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
          s.dateISO === meal.dateISO ? updated : s
        );

        setPlanResult({
          ...planResult,
          suggestions: nextSuggestions
        });
      }
      setSwappingDishId(null);
    }, 120);
  };

  // Swap the entire dinner combination for a single day
  const handleSwapWholeMeal = (meal: PlannedDayMeal) => {
    if (!planResult) return;
    setSwappingDate(meal.dateISO);

    setTimeout(() => {
      const updated = swapWholeMealForDay(
        meal,
        planResult.suggestions,
        {
          mode,
          focus,
          dinersCount,
          durationDays,
          startDateISO,
          includedDays,
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
          s.dateISO === meal.dateISO ? updated : s
        );

        setPlanResult({
          ...planResult,
          suggestions: nextSuggestions
        });
      }
      setSwappingDate(null);
    }, 120);
  };

  // Remove an individual dish from a dinner
  const handleRemoveDish = (meal: PlannedDayMeal, dishIdToRemove: string) => {
    if (!planResult) return;
    const updated = removeDishFromMeal(meal, dishIdToRemove, defaultStaple);
    const nextSuggestions = planResult.suggestions.map((s) =>
      s.dateISO === meal.dateISO ? updated : s
    );
    setPlanResult({
      ...planResult,
      suggestions: nextSuggestions
    });
  };

  // AI plans and adds a complementary new dish to a dinner
  const handleAddDish = (meal: PlannedDayMeal) => {
    if (!planResult) return;
    setAddingDishDate(meal.dateISO);

    setTimeout(() => {
      const updated = addDishToMeal(meal, planResult.suggestions, {
        mode,
        focus,
        dinersCount,
        durationDays,
        startDateISO,
        includedDays,
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
          s.dateISO === meal.dateISO ? updated : s
        );
        setPlanResult({
          ...planResult,
          suggestions: nextSuggestions
        });
      }
      setAddingDishDate(null);
    }, 120);
  };

  // Change staple accompaniment for a single day
  const handleChangeMealStaple = (dateISO: string, newStaple: MealAccompaniment) => {
    if (!planResult) return;
    const stapleInfo = ACCOMPANIMENT_OPTIONS[newStaple] || ACCOMPANIMENT_OPTIONS.jasmine_rice;

    const nextSuggestions = planResult.suggestions.map((m) => {
      if (m.dateISO !== dateISO) return m;

      const dishesCal = m.dishes.reduce((sum, d) => sum + (d.nutrition?.calories || 480), 0);

      return {
        ...m,
        accompaniment: newStaple,
        perPersonCalories: Math.round(dishesCal + stapleInfo.caloriesPerPerson)
      };
    });

    setPlanResult({
      ...planResult,
      suggestions: nextSuggestions
    });
    setEditingStapleDate(null);
  };

  // Apply plan to calendar
  const handleApplyToCalendar = () => {
    if (!planResult || planResult.suggestions.length === 0) return;

    const scheduleEntries: Record<string, Record<string, MealScheduleEntry>> = {};

    planResult.suggestions.forEach((item) => {
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
    });

    onApplyMealPlan(scheduleEntries, planResult.suggestions.length);
    onClose();

    if (onGoToGrocery && planResult.suggestions.length > 0) {
      const dates = planResult.suggestions.map((s) => s.dateISO).sort();
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const promptText = language === 'zh-CN'
        ? `🎉 成功排定 ${planResult.suggestions.length} 顿膳食！是否立即查看生成的采购清单？`
        : `🎉 Scheduled ${planResult.suggestions.length} dinners! Open Grocery List now?`;
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

  const getStapleLabel = (s: MealAccompaniment) => {
    const opt = ACCOMPANIMENT_OPTIONS[s];
    if (!opt) return s;
    return language === 'zh-CN' ? opt.labelZh : opt.labelEn;
  };

  const getFocusLabel = (f: AiPlannerFocus) => {
    switch (f) {
      case 'quick':
        return language === 'zh-CN' ? '⚡ 快手省时' : '⚡ Weeknight Fast';
      case 'high_protein':
        return language === 'zh-CN' ? '💪 高蛋白' : '💪 High Protein';
      case 'light':
        return language === 'zh-CN' ? '🥗 轻食低卡' : '🥗 Light & Fresh';
      default:
        return language === 'zh-CN' ? '⚖️ 均衡营养' : '⚖️ Balanced';
    }
  };

  const getSpiceLabel = (s: 'none' | 'mild' | 'medium' | 'spicy') => {
    switch (s) {
      case 'none':
        return language === 'zh-CN' ? '🌶️ 不辣' : '🌶️ No Spice';
      case 'mild':
        return language === 'zh-CN' ? '🌶️ 微辣' : '🌶️ Mild';
      case 'medium':
        return language === 'zh-CN' ? '🌶️ 中辣' : '🌶️ Medium';
      case 'spicy':
        return language === 'zh-CN' ? '🌶️ 特辣' : '🌶️ Fiery';
      default:
        return language === 'zh-CN' ? '🌶️ 微辣' : '🌶️ Mild';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#EDE8DF] bg-[#FAF8F5] shadow-2xl dark:border-[#3D362E] dark:bg-[#1E1B18] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EDE8DF] bg-white px-5 py-4 dark:border-[#3D362E] dark:bg-[#252220]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFD13B] text-[#2D2640] shadow-xs">
              <Sparkles className="h-5 w-5 fill-[#2D2640]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#2D2640] dark:text-[#F0EDE8]">
                {language === 'zh-CN' ? '快速智能排餐' : 'Quick Meal Plan'}
              </h2>
              <p className="text-[11px] font-semibold text-[#8A7A70] dark:text-[#9A8A7E]">
                {currentStep === 'config'
                  ? (language === 'zh-CN' ? '极简快速排餐 · 智能计算餐桌菜道与主食搭配' : 'Instant smart meal planning · Auto-balanced dishes & staples')
                  : (language === 'zh-CN' ? '支持单道菜无损替换 · 点击主食标签可自由调整' : 'Swap any dish individually · Tap staple chip to customize')}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {currentStep === 'config' ? (
            /* ─── STEP 1: PRE-FLIGHT SETTINGS SCREEN (BIFURCATED ONBOARDING PATTERN) ─── */
            <div className="space-y-4">
              
              {/* 1. ESSENTIAL: Diners Stepper Card with Headcount Recommendation */}
              <div className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#FFD13B]" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '本周就餐人数 (Diners)' : 'Diners This Week'}
                      </h3>
                      <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                        {language === 'zh-CN' ? 'AI 自动分析并决定每餐所需的荤素道数' : 'AI automatically analyzes dishes needed to feed everyone'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDinersCount((prev) => Math.max(1, prev - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#2D2640] hover:bg-[#EDE8DF] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <span className="w-8 text-center text-sm font-black text-[#2D2640] dark:text-[#F0EDE8]">
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

                {/* Dynamic Headcount Guide Banner */}
                <div className="rounded-xl bg-[#FFF8E6] p-2.5 border border-[#FFD13B]/40 dark:bg-[#2A1E00] flex items-center gap-2">
                  <span className="text-sm">💡</span>
                  <div className="text-[11px] font-bold text-[#7A5C00] dark:text-[#FFD13B]">
                    <span>{language === 'zh-CN' ? '推荐餐桌配置: ' : 'Recommended Table: '}</span>
                    <span className="underline decoration-[#FFD13B] underline-offset-2">
                      {language === 'zh-CN' ? headcountGuide.descriptionZh : headcountGuide.descriptionEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. ESSENTIAL: Planning Horizon / Duration */}
              <div className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#FFD13B]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                    {language === 'zh-CN' ? '排餐跨度' : 'Planning Horizon'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { days: 7, label: language === 'zh-CN' ? '7 天 (1 周)' : '7 Days (1 Week)' },
                    { days: 14, label: language === 'zh-CN' ? '14 天 (2 周)' : '14 Days (2 Weeks)' },
                    { days: 5, label: language === 'zh-CN' ? '5 天 (工作日)' : '5 Days (Work Week)' },
                    { days: 3, label: language === 'zh-CN' ? '3 天 (周末/快闪)' : '3 Days (Short)' }
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setDurationDays(opt.days)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        durationDays === opt.days
                          ? 'border-[#FFD13B] bg-[#FFF8E6] text-[#7A5C00] dark:bg-[#2A1E00] dark:text-[#FFD13B] ring-1 ring-[#FFD13B]/40'
                          : 'border-[#EDE8DF] bg-[#FAF8F5] text-[#7A6E64] hover:border-[#FFD13B] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. ESSENTIAL: Strategy: Family Classics or Something New? */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '家常熟菜还是灵感新菜？' : 'Family Classics or Something New?'}
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
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌟</span>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '黄金组合 (Best of Both · 推荐)' : 'Best of Both (Recommended)'}
                        </h4>
                        <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '工作日做熟悉的家常菜，周末尝试 2~3 道精选灵感新菜' : 'Family favorites on busy weeknights + inspiring discoveries on weekends'}
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
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏠</span>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '家常熟菜 (Family Classics)' : 'Family Classics'}
                        </h4>
                        <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '高度优先您家庭菜谱中的私房菜与常做菜，口味熟悉，省心省事' : 'Focuses primarily on dishes in your Family Cookbook and top staples'}
                        </p>
                      </div>
                    </div>
                    {mode === 'easy_meals' && <Check className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]" />}
                  </div>
                </div>

                {/* Something New (Give Me Ideas) */}
                <div
                  onClick={() => setMode('give_me_ideas')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    mode === 'give_me_ideas'
                      ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/50'
                      : 'border-[#EDE8DF] bg-white dark:border-[#38332E] dark:bg-[#252220] hover:border-[#FFD13B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <div>
                        <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '灵感新菜 (Something New)' : 'Something New'}
                        </h4>
                        <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                          {language === 'zh-CN' ? '从 3,000+ 甄选菜谱中探索未做过的美味，彻底告别“今晚吃什么”' : 'Fresh, balanced recipes curated from the 3,000+ master library'}
                        </p>
                      </div>
                    </div>
                    {mode === 'give_me_ideas' && <Check className="h-4 w-4 text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* 4. COLLAPSED DETAILED SECTION: Bifurcated Accordion */}
              <div className="rounded-2xl border border-[#EDE8DF] bg-white shadow-xs dark:border-[#3D362E] dark:bg-[#252220] overflow-hidden transition-all">
                {/* Accordion Toggle Header */}
                <div
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-[#FAF8F5] dark:hover:bg-[#2E2A26] transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sliders className="h-4 w-4 text-[#FFD13B] shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '更多偏好设置' : 'Additional Preferences'}
                      </h3>
                      {!isDetailsExpanded && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] font-bold">
                            🍚 {getStapleLabel(defaultStaple)}
                          </span>
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] font-bold">
                            🗓️ {includedDays.length} {language === 'zh-CN' ? '天做饭' : 'Days Cooking'}
                          </span>
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] font-bold">
                            {getFocusLabel(focus)}
                          </span>
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] font-bold">
                            {getSpiceLabel(spiceTolerance)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[11px] font-bold text-[#7A5C00] dark:text-[#FFD13B]">
                      {isDetailsExpanded
                        ? (language === 'zh-CN' ? '收起' : 'Collapse')
                        : (language === 'zh-CN' ? '自定义' : 'Customize')}
                    </span>
                    {isDetailsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[#7A6E64] dark:text-[#9A9088]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#7A6E64] dark:text-[#9A9088]" />
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Content */}
                {isDetailsExpanded && (
                  <div className="border-t border-[#EDE8DF] dark:border-[#3D362E] p-3.5 space-y-4 bg-[#FAF8F5]/60 dark:bg-[#1E1B18]/60 animate-in fade-in-50 duration-200">
                    
                    {/* Settings Shortcut Button to Personalisation */}
                    {onOpenPersonalisation && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFF8E6] dark:bg-[#2A1E00] border border-[#FFD13B]/40">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">⚙️</span>
                          <p className="text-[11px] font-bold text-[#7A5C00] dark:text-[#FFD13B] truncate">
                            {language === 'zh-CN' ? '将偏好设为默认值？' : 'Set permanent defaults for future plans?'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenPersonalisation();
                          }}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-[11px] font-black transition cursor-pointer shadow-2xs"
                        >
                          <Settings2 className="h-3 w-3" />
                          <span>{language === 'zh-CN' ? '个性化设置' : 'Personalisation'}</span>
                        </button>
                      </div>
                    )}

                    {/* Default Staple Accompaniment (Rice, Bread, Noodles, Low-Carb) */}
                    <div className="rounded-xl border border-[#EDE8DF] bg-white p-3 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">🍚</span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                            {language === 'zh-CN' ? '默认主食搭配' : 'Default Staple Accompaniment'}
                          </h4>
                        </div>
                      </div>
                      <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                        {language === 'zh-CN' ? '炒饭炒面类自带主食，炒菜类自动搭配所选主食' : 'One-pot meals include starch; component dishes pair with staple'}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'jasmine_rice', emoji: '🍚', en: 'Steamed Rice', zh: '白米饭' },
                          { id: 'brown_rice', emoji: '🌾', en: 'Brown Rice', zh: '糙米饭' },
                          { id: 'bread_buns', emoji: '🥖', en: 'Bread / Buns', zh: '佐餐欧包/馒头' },
                          { id: 'plain_noodles', emoji: '🍜', en: 'Noodles', zh: '佐餐面条/米粉' },
                          { id: 'cauliflower_rice', emoji: '🥗', en: 'Cauliflower Rice', zh: '低碳花椰菜米' },
                          { id: 'none_low_carb', emoji: '🥩', en: 'No Starch (Keto)', zh: '无米面 (纯菜肉)' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setDefaultStaple(s.id as MealAccompaniment)}
                            className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                              defaultStaple === s.id
                                ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-1 ring-[#FFD13B]/40'
                                : 'border-[#EDE8DF] bg-[#FAF8F5] dark:border-[#38332E] dark:bg-[#1E1B18]'
                            }`}
                          >
                            <span className="text-base">{s.emoji}</span>
                            <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                              {language === 'zh-CN' ? s.zh : s.en}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cooking Days vs Dine Out */}
                    <div className="rounded-xl border border-[#EDE8DF] bg-white p-3 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                          {language === 'zh-CN' ? '烹饪日程 (可点选取消外食日)' : 'Cooking Days (Tap to skip dine-out nights)'}
                        </h4>
                        <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64]">
                          {includedDays.length} {language === 'zh-CN' ? '天在家吃' : 'days cooking'}
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        {daysOfWeekLabels.map((d) => {
                          const isSelected = includedDays.includes(d.num);
                          return (
                            <button
                              key={d.num}
                              type="button"
                              onClick={() => toggleDay(d.num)}
                              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-xs'
                                  : 'bg-[#F5F0E8] text-[#A89F95] border-[#EDE8DF] line-through dark:bg-[#2E2A26] dark:border-[#38332E] opacity-60'
                              }`}
                            >
                              {language === 'zh-CN' ? d.zh.slice(1) : d.en}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weekly Focus */}
                    <div className="rounded-xl border border-[#EDE8DF] bg-white p-3 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '膳食侧重' : 'Dietary Focus'}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'balanced', icon: '⚖️', label: language === 'zh-CN' ? '均衡营养' : 'Balanced', desc: '500-750 kcal' },
                          { id: 'quick', icon: '⚡', label: language === 'zh-CN' ? '快手省时' : 'Weeknight Fast', desc: '≤ 25 min' },
                          { id: 'high_protein', icon: '💪', label: language === 'zh-CN' ? '高蛋白' : 'High Protein', desc: '≥ 35g protein' },
                          { id: 'light', icon: '🥗', label: language === 'zh-CN' ? '轻食低卡' : 'Light & Fresh', desc: '≤ 480 kcal' }
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFocus(f.id as AiPlannerFocus)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              focus === f.id
                                ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-1 ring-[#FFD13B]/40'
                                : 'border-[#EDE8DF] bg-[#FAF8F5] dark:border-[#38332E] dark:bg-[#1E1B18]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{f.icon}</span>
                              <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">{f.label}</span>
                            </div>
                            <p className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E] mt-0.5">{f.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Family Safe Spice Level Override */}
                    <div className="rounded-xl border border-[#EDE8DF] bg-white p-3 shadow-2xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">🌶️</span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                            {language === 'zh-CN' ? '全家安全辣度上限' : 'Family Safe Spice Level'}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-[#2D6A4A] dark:text-[#4CAF82] bg-[#E8F5ED] dark:bg-[#0D2E1A] px-2 py-0.5 rounded-md border border-[#A8D8BC]">
                          {language === 'zh-CN' ? '🛡️ 全家安全' : '🛡️ Family Safe'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#8A7A70] dark:text-[#9A8A7E]">
                        {language === 'zh-CN' ? 'AI 严格只排符合所选辣度且无过敏原的菜品' : 'AI strictly plans meals matching this spice ceiling with zero allergens'}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: 'none', emoji: '🟢', zh: '不辣', en: 'No Spice' },
                          { id: 'mild', emoji: '🟡', zh: '微辣', en: 'Mild' },
                          { id: 'medium', emoji: '🟠', zh: '中辣', en: 'Medium' },
                          { id: 'spicy', emoji: '🔴', zh: '特辣', en: 'Fiery' }
                        ].map((spice) => {
                          const isSelected = spiceTolerance === spice.id;
                          return (
                            <button
                              key={spice.id}
                              type="button"
                              onClick={() => setSpiceTolerance(spice.id as any)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                                isSelected
                                  ? 'border-[#FFD13B] bg-[#FFF8E6] text-[#2D2640] dark:bg-[#2A1E00] dark:text-[#FFD13B] ring-1 ring-[#FFD13B]/50'
                                  : 'border-[#EDE8DF] bg-[#FAF8F5] dark:border-[#38332E] dark:bg-[#1E1B18] text-[#7A6E64] dark:text-[#9A9088]'
                              }`}
                            >
                              <span>{spice.emoji}</span>
                              <span>{language === 'zh-CN' ? spice.zh : spice.en}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          ) : (
            /* ─── STEP 2: INTERACTIVE MULTI-DISH PREVIEW & SWAP SCREEN ─── */
            <div className="space-y-3.5">
              
              {/* Summary Stats Banner */}
              {planResult && (
                <div className="rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#2D6A4A] dark:text-[#4CAF82]" />
                      <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                        {language === 'zh-CN' ? '100% 符合家庭过敏与口味规则' : '100% Safe (0 Allergens Found)'}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-bold text-[#FFD13B] bg-[#2D2640] px-2 py-0.5 rounded-full">
                      {planResult.totalDinners} {language === 'zh-CN' ? '顿完整晚餐' : 'full dinners'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                    <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2 rounded-xl border border-[#EDE8DF] dark:border-[#38332E]">
                      <span className="block text-xs font-black text-[#2D2640] dark:text-[#F0EDE8]">
                        ~{planResult.averageDishesPerMeal}
                      </span>
                      <span className="text-[9px] text-[#8A7A70] dark:text-[#9A8A7E] uppercase font-bold">
                        {language === 'zh-CN' ? '平均道数' : 'Dishes/Meal'}
                      </span>
                    </div>
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
                  const staple = ACCOMPANIMENT_OPTIONS[meal.accompaniment] || ACCOMPANIMENT_OPTIONS.jasmine_rice;
                  const isEditingStaple = editingStapleDate === meal.dateISO;

                  return (
                    <div
                      key={meal.dateISO}
                      className={`rounded-2xl border border-[#EDE8DF] bg-white p-3.5 shadow-xs dark:border-[#3D362E] dark:bg-[#252220] space-y-2.5 transition-all ${
                        swappingDate === meal.dateISO ? 'opacity-40 scale-[0.98]' : ''
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
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/30">
                            {meal.comboStructure}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E] font-bold">
                            🔥 {meal.perPersonCalories} {language === 'zh-CN' ? 'kcal / 人' : 'kcal / person'}
                          </div>

                          {/* Swap Whole Meal Button */}
                          <button
                            type="button"
                            disabled={swappingDate === meal.dateISO || swappingDishId !== null}
                            onClick={() => handleSwapWholeMeal(meal)}
                            className="flex items-center gap-1 py-1 px-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF7F2] text-[10.5px] font-bold text-[#2D2640] hover:bg-[#FFD13B] hover:border-[#2D2640]/10 dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#F0EDE8] transition cursor-pointer shrink-0"
                            title={language === 'zh-CN' ? '重新生成当天的整套搭配' : 'Regenerate entire dinner combination for this day'}
                          >
                            <RotateCw className={`h-3 w-3 ${swappingDate === meal.dateISO ? 'animate-spin' : ''}`} />
                            <span>{language === 'zh-CN' ? '换整餐' : 'Swap Meal'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Staple Accompaniment Chip (Interactive) */}
                      <div className="relative">
                        <div className="flex items-center justify-between bg-[#FAF7F2] dark:bg-[#1E1B18] p-2 rounded-xl border border-[#EDE8DF] dark:border-[#38332E]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{staple.emoji}</span>
                            <span className="text-[11px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                              {language === 'zh-CN' ? staple.labelZh : staple.labelEn}
                            </span>
                            {meal.accompaniment !== 'none_builtin' && (
                              <span className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E]">
                                (+{staple.caloriesPerPerson} kcal)
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingStapleDate(isEditingStaple ? null : meal.dateISO)}
                            className="text-[10.5px] font-bold text-[#7A5C00] dark:text-[#FFD13B] hover:underline cursor-pointer"
                          >
                            {language === 'zh-CN' ? '调整主食 ▾' : 'Change ▾'}
                          </button>
                        </div>

                        {/* Staple Switcher Dropdown */}
                        {isEditingStaple && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1.5 p-2 rounded-2xl bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#3D362E] shadow-xl grid grid-cols-2 gap-1.5 animate-in fade-in zoom-in-95">
                            {Object.values(ACCOMPANIMENT_OPTIONS).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleChangeMealStaple(meal.dateISO, opt.id)}
                                className={`p-1.5 rounded-xl border text-left text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
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

                      {/* Dishes in this Dinner */}
                      <div className="space-y-2">
                        {meal.dishes.map((dish) => {
                          const isSwapping = swappingDishId === dish.id;
                          const roleBadge = getDishRoleBadge(dish);

                          return (
                            <div
                              key={dish.id}
                              className={`flex items-center justify-between p-2 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] dark:border-[#38332E] dark:bg-[#1E1B18] transition-all ${
                                isSwapping ? 'opacity-40 scale-[0.98]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                                    <h4 className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8] truncate">
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
                                    title={language === 'zh-CN' ? '从本餐中移除此菜品' : 'Remove dish from this dinner'}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Dish Button (AI Plans Instantly) */}
                        <button
                          type="button"
                          disabled={addingDishDate === meal.dateISO || meal.dishes.length >= 8}
                          onClick={() => handleAddDish(meal)}
                          className="flex w-full items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-[#EDE8DF] bg-[#FAF8F5] text-[11px] font-bold text-[#7A6E64] hover:border-[#FFD13B] hover:text-[#2D2640] hover:bg-[#FFF8E6] dark:border-[#38332E] dark:bg-[#1E1B18] dark:text-[#9A9088] dark:hover:text-[#FFD13B] transition cursor-pointer disabled:opacity-50"
                        >
                          {addingDishDate === meal.dateISO ? (
                            <>
                              <RotateCw className="h-3.5 w-3.5 animate-spin text-[#FFD13B]" />
                              <span>{language === 'zh-CN' ? 'AI 正在智能规划新菜...' : 'AI planning complementary dish...'}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 text-[#FFD13B]" />
                              <span>{language === 'zh-CN' ? '+ AI 智能加一道菜 (荤素自动补位)' : '+ Add Dish (AI Plans Complementary Dish)'}</span>
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
          {currentStep === 'config' ? (
            <button
              type="button"
              disabled={isGenerating || includedDays.length === 0}
              onClick={handleGenerate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD13B] py-3 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>{language === 'zh-CN' ? '正在智能排餐...' : 'Generating Tailored Meals...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-[#2D2640]" />
                  <span>{language === 'zh-CN' ? `⚡ 快速排餐 (${includedDays.length}天 · ${dinersCount}人份)` : `⚡ Quick Plan (${dinersCount} Diners · ${includedDays.length} Days)`}</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('config')}
                className="flex items-center justify-center gap-1 rounded-2xl border border-[#EDE8DF] bg-[#F5F0E8] px-4 py-2.5 text-xs font-bold text-[#2D2640] hover:bg-[#EDE8DF] dark:border-[#38332E] dark:bg-[#2E2A26] dark:text-[#F0EDE8] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{language === 'zh-CN' ? '调整参数' : 'Edit Settings'}</span>
              </button>

              <button
                type="button"
                onClick={handleApplyToCalendar}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FFD13B] py-2.5 text-xs font-black text-[#2D2640] shadow-sm hover:bg-[#FFC200] active:scale-[0.98] transition cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{language === 'zh-CN' ? '一键应用到排餐表 🚀' : 'Apply to My Schedule 🚀'}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
