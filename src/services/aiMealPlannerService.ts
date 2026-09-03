import type {
  Dish,
  MealPlan,
  MemberPreferences,
  FamilyPersonalisation,
  NutritionInfo
} from '../types';
import { detectDishAllergens, getFamilyAllergens } from './personalisationService';

export type AiPlannerMode = 'easy_meals' | 'give_me_ideas' | 'best_of_both';
export type AiPlannerFocus = 'balanced' | 'quick' | 'high_protein' | 'light';

export type MealAccompaniment =
  | 'jasmine_rice'
  | 'brown_rice'
  | 'bread_buns'
  | 'plain_noodles'
  | 'cauliflower_rice'
  | 'none_builtin'
  | 'none_low_carb';

export interface AccompanimentInfo {
  id: MealAccompaniment;
  labelEn: string;
  labelZh: string;
  emoji: string;
  caloriesPerPerson: number;
  carbsPerPerson: number;
  grocerySearchTerm: string;
}

export const ACCOMPANIMENT_OPTIONS: Record<MealAccompaniment, AccompanimentInfo> = {
  jasmine_rice: {
    id: 'jasmine_rice',
    labelEn: 'Steamed Jasmine Rice',
    labelZh: '香甜白米饭',
    emoji: '🍚',
    caloriesPerPerson: 210,
    carbsPerPerson: 46,
    grocerySearchTerm: 'Jasmine Rice'
  },
  brown_rice: {
    id: 'brown_rice',
    labelEn: 'Healthy Brown Rice',
    labelZh: '健康糙米饭',
    emoji: '🌾',
    caloriesPerPerson: 180,
    carbsPerPerson: 38,
    grocerySearchTerm: 'Brown Rice'
  },
  bread_buns: {
    id: 'bread_buns',
    labelEn: 'Crusty Bread / Buns',
    labelZh: '佐餐欧包 / 馒头',
    emoji: '🥖',
    caloriesPerPerson: 140,
    carbsPerPerson: 26,
    grocerySearchTerm: 'Dinner Rolls Bread'
  },
  plain_noodles: {
    id: 'plain_noodles',
    labelEn: 'Plain Noodles / Vermicelli',
    labelZh: '佐餐清汤面 / 米粉',
    emoji: '🍜',
    caloriesPerPerson: 200,
    carbsPerPerson: 42,
    grocerySearchTerm: 'Hokkien Noodles'
  },
  cauliflower_rice: {
    id: 'cauliflower_rice',
    labelEn: 'Cauliflower Rice (Low Carb)',
    labelZh: '花椰菜米 (减碳轻食)',
    emoji: '🥗',
    caloriesPerPerson: 35,
    carbsPerPerson: 5,
    grocerySearchTerm: 'Cauliflower'
  },
  none_builtin: {
    id: 'none_builtin',
    labelEn: 'Starch Built-In',
    labelZh: '菜品自带主食 (无需另煮)',
    emoji: '✅',
    caloriesPerPerson: 0,
    carbsPerPerson: 0,
    grocerySearchTerm: ''
  },
  none_low_carb: {
    id: 'none_low_carb',
    labelEn: 'No Starch (Strict Low-Carb)',
    labelZh: '不配主食 (纯吃菜肉)',
    emoji: '🥩',
    caloriesPerPerson: 0,
    carbsPerPerson: 0,
    grocerySearchTerm: ''
  }
};

export interface HeadcountRecommendation {
  targetDishesCount: number;
  descriptionEn: string;
  descriptionZh: string;
  rolesSummaryEn: string;
  rolesSummaryZh: string;
}

export function getHeadcountRecommendation(dinersCount: number): HeadcountRecommendation {
  if (dinersCount <= 1) {
    return {
      targetDishesCount: 1,
      descriptionEn: '1 Fast Meal (One-Pot or Quick Main)',
      descriptionZh: '1道便当快手菜 (一锅搞定)',
      rolesSummaryEn: '1 One-Pot / Main',
      rolesSummaryZh: '1道快手主菜/焖饭'
    };
  } else if (dinersCount === 2) {
    return {
      targetDishesCount: 2,
      descriptionEn: '2 Dishes: 1 Main Protein + 1 Vegetable Side',
      descriptionZh: '两菜搭配: 1主荤 + 1时蔬',
      rolesSummaryEn: '1 Main + 1 Veg Side',
      rolesSummaryZh: '1大荤 + 1时蔬'
    };
  } else if (dinersCount <= 4) {
    return {
      targetDishesCount: 3,
      descriptionEn: '3 Dishes: 2 Mains + 1 Veg Side (or Soup)',
      descriptionZh: '三菜搭配: 2大荤/主菜 + 1时蔬',
      rolesSummaryEn: '2 Mains + 1 Veg Side',
      rolesSummaryZh: '2大荤 + 1时蔬'
    };
  } else if (dinersCount <= 6) {
    return {
      targetDishesCount: 4,
      descriptionEn: '4 Dishes: 2 Mains + 1 Veg + 1 Soup',
      descriptionZh: '四菜一汤: 2大荤 + 1时蔬 + 1靓汤',
      rolesSummaryEn: '2 Mains + 1 Veg + 1 Soup',
      rolesSummaryZh: '2大荤 + 1时蔬 + 1靓汤'
    };
  } else {
    return {
      targetDishesCount: 5,
      descriptionEn: '5 Dishes: 3 Mains + 2 Veg + 1 Soup',
      descriptionZh: '五菜大宴: 3大荤 + 2时蔬 + 1靓汤',
      rolesSummaryEn: '3 Mains + 2 Veg',
      rolesSummaryZh: '3大荤 + 2时蔬'
    };
  }
}

/**
 * Check if the meal already contains built-in rice, noodles, or pasta
 */
export function detectStarchBuiltIn(dishes: Dish[]): boolean {
  for (const dish of dishes) {
    if (dish.dishRole === 'one_pot_meal') return true;
    const text = `${dish.name} ${(dish.ingredients || []).map((i) => i.name).join(' ')}`.toLowerCase();
    if (
      text.includes('fried rice') ||
      text.includes('炒饭') ||
      text.includes('chow fun') ||
      text.includes('炒河粉') ||
      text.includes('noodles') ||
      text.includes('面条') ||
      text.includes('pasta') ||
      text.includes('spaghetti') ||
      text.includes('lasagna') ||
      text.includes('pad thai') ||
      text.includes('risotto') ||
      text.includes('claypot rice') ||
      text.includes('煲仔饭') ||
      text.includes('bibimbap') ||
      text.includes('石锅拌饭') ||
      text.includes('pizza') ||
      text.includes('curry rice')
    ) {
      return true;
    }
  }
  return false;
}

export interface AiPlannerOptions {
  mode: AiPlannerMode;
  focus: AiPlannerFocus;
  dinersCount: number; // e.g. 2, 3, 4
  durationDays: number; // e.g. 7, 14, 5, 3
  startDateISO: string; // YYYY-MM-DD
  includedDays?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
  targetSlotId?: string; // default: 'slot_dinner'
  defaultStaple?: MealAccompaniment;
  familyCookbookDishes: Dish[];
  allSystemDishes: Dish[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
  familyMembers?: string[];
  recentMealPlan?: MealPlan;
}

export interface PlannedDayMeal {
  dateISO: string;
  dayOfWeek: number; // 0-6
  dayName: string;
  slotId: string;
  slotName: string;
  dishes: Dish[]; // Full array of companion dishes
  dish: Dish; // Primary dish for backwards compatibility
  dinersCount: number;
  dishesCount: number;
  comboStructure: string;
  accompaniment: MealAccompaniment;
  reasonTag: string;
  perPersonCalories: number;
  perPersonProtein: number;
  scaledNutrition: NutritionInfo;
}

export interface AiMealPlanResult {
  suggestions: PlannedDayMeal[];
  totalDinners: number;
  averageCalories: number;
  averageProtein: number;
  primaryCuisines: string[];
  kidFriendlyCount: number;
  averageDishesPerMeal: number;
}

export type ProteinType = 'chicken' | 'beef' | 'pork' | 'seafood' | 'vegetarian' | 'other';

/**
 * Identify primary protein source to prevent protein fatigue across consecutive days
 */
export function getPrimaryProteinCategory(dish: Dish): ProteinType {
  const text = `${dish.name} ${(dish.ingredients || []).map((i) => i.name).join(' ')}`.toLowerCase();

  if (text.includes('chicken') || text.includes('鸡') || text.includes('poultry')) return 'chicken';
  if (text.includes('beef') || text.includes('steak') || text.includes('牛') || text.includes('sirloin')) return 'beef';
  if (text.includes('pork') || text.includes('bacon') || text.includes('ham') || text.includes('猪') || text.includes('排骨') || text.includes('五花肉')) return 'pork';
  if (text.includes('shrimp') || text.includes('prawn') || text.includes('fish') || text.includes('salmon') || text.includes('crab') || text.includes('虾') || text.includes('鱼') || text.includes('海鲜')) return 'seafood';
  if (text.includes('tofu') || text.includes('egg') || text.includes('mushroom') || text.includes('broccoli') || text.includes('豆腐') || text.includes('蛋') || text.includes('素') || dish.dishRole === 'vegetable_side') return 'vegetarian';

  return 'other';
}

/**
 * Check if a dish violates any household disliked ingredients ("Hard No's")
 */
function containsDislikedIngredients(dish: Dish, dislikedList: string[]): boolean {
  if (!dislikedList || dislikedList.length === 0) return false;
  const combinedText = `${dish.name} ${(dish.ingredients || []).map((i) => i.name).join(' ')}`.toLowerCase();

  return dislikedList.some((disliked) => {
    const term = disliked.toLowerCase().trim();
    if (!term) return false;
    return combinedText.includes(term);
  });
}

/**
 * 100% Offline AI Meal Planning Engine with Diner-Aware Multi-Dish Composition
 */
export function generateOfflineAiMealPlan(options: AiPlannerOptions): AiMealPlanResult {
  const {
    mode,
    focus,
    dinersCount,
    durationDays = 7,
    startDateISO,
    includedDays = [0, 1, 2, 3, 4, 5, 6],
    targetSlotId = 'slot_dinner',
    defaultStaple = 'jasmine_rice',
    familyCookbookDishes,
    allSystemDishes,
    memberProfiles = {},
    familyPersonalisation = { strictAllergyFilter: true },
    familyMembers = [],
    recentMealPlan = {}
  } = options;

  // 1. Household constraints
  const familyAllergens = getFamilyAllergens(familyMembers, memberProfiles, familyPersonalisation);

  const allDislikedIngredients = new Set<string>();
  Object.values(memberProfiles).forEach((p) => {
    (p.dislikedIngredients || []).forEach((item) => allDislikedIngredients.add(item));
  });
  const dislikedList = Array.from(allDislikedIngredients);

  const maxSpice = typeof familyPersonalisation.spiceTolerance === 'number'
    ? familyPersonalisation.spiceTolerance
    : 3;

  const preferKids = Boolean(familyPersonalisation.cookingForKids);

  // 2. Safety filter
  const isDishSafe = (dish: Dish): boolean => {
    if (!dish || !dish.name) return false;
    if (dish.dishRole === 'sauce_condiment') return false;

    if (familyPersonalisation.strictAllergyFilter) {
      const dishAlgs = detectDishAllergens(dish);
      const isUnsafe = dishAlgs.some((alg) => familyAllergens.includes(alg));
      if (isUnsafe) return false;
    }

    if (containsDislikedIngredients(dish, dislikedList)) return false;

    const dishSpice = dish.spiceLevel || 0;
    if (dishSpice > maxSpice) return false;

    return true;
  };

  const safeCookbook = familyCookbookDishes.filter(isDishSafe);
  const safeSystem = allSystemDishes.filter(isDishSafe);

  // Pools by role
  const safeMains = safeSystem.filter((d) => d.dishRole === 'main_protein' || !d.dishRole);
  const safeVegSides = safeSystem.filter((d) => d.dishRole === 'vegetable_side');
  const safeSoups = safeSystem.filter((d) => d.dishRole === 'soup');

  // Cookbook pools by role
  const cbMains = safeCookbook.filter((d) => d.dishRole === 'main_protein' || !d.dishRole);
  const cbVegSides = safeCookbook.filter((d) => d.dishRole === 'vegetable_side');
  const cbSoups = safeCookbook.filter((d) => d.dishRole === 'soup');

  // 3. Recently Planned Dish IDs
  const recentlyPlannedIds = new Set<string>();
  Object.values(recentMealPlan).forEach((daySchedule) => {
    if (!daySchedule) return;
    Object.values(daySchedule).forEach((entry) => {
      if (entry?.dishId) recentlyPlannedIds.add(entry.dishId);
      if (Array.isArray(entry?.dishIds)) {
        entry.dishIds.forEach((id) => recentlyPlannedIds.add(id));
      }
    });
  });

  // 4. Scoring Heuristic Function
  const scoreDish = (dish: Dish, isWeekend: boolean): number => {
    let score = 100;
    const cookTime = dish.totalTimeMinutes || dish.prepTimeMinutes || 30;
    const protein = dish.nutrition?.protein || 24;
    const calories = dish.nutrition?.calories || 500;

    if (focus === 'quick') {
      if (cookTime <= 20) score += 60;
      else if (cookTime <= 30) score += 30;
      else score -= 30;
    } else if (focus === 'high_protein') {
      if (protein >= 35) score += 60;
      else if (protein >= 26) score += 30;
    } else if (focus === 'light') {
      if (calories <= 420) score += 50;
      else if (calories <= 520) score += 20;
      else score -= 40;
    } else {
      if (calories >= 450 && calories <= 680 && protein >= 22) score += 40;
    }

    if (preferKids) {
      if (dish.kidFriendly) score += 50;
      else score -= 20;
    }

    if (dish.favoritedByMembers && dish.favoritedByMembers.length > 0) score += 25;
    if (dish.timesPlanned && dish.timesPlanned > 0) score += Math.min(30, dish.timesPlanned * 5);

    if (!isWeekend && cookTime <= 25) score += 20;
    if (isWeekend && cookTime >= 35) score += 20;

    if (recentlyPlannedIds.has(dish.id)) score -= 80;

    return score;
  };

  // Helper to pick a candidate from a pool
  const pickFromPool = (
    pool: Dish[],
    avoidIds: Set<string>,
    avoidProtein?: ProteinType,
    isWeekend: boolean = false
  ): Dish | null => {
    const available = pool.filter((d) => !avoidIds.has(d.id));
    if (available.length === 0) return null;

    const scored = available.map((d) => {
      let sc = scoreDish(d, isWeekend);
      const prot = getPrimaryProteinCategory(d);
      if (avoidProtein && prot === avoidProtein) sc -= 50;
      return { dish: d, score: sc };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(3, scored.length));
    const chosen = top[Math.floor(Math.random() * top.length)];
    return chosen ? chosen.dish : null;
  };

  // 5. Generate Dates for Planning Horizon
  const startDate = new Date(startDateISO);
  const plannedMeals: PlannedDayMeal[] = [];
  const chosenDishIds = new Set<string>();
  let previousProtein: ProteinType | null = null;

  const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < durationDays; i++) {
    const currDate = new Date(startDate);
    currDate.setDate(currDate.getDate() + i);
    const dayOfWeek = currDate.getDay();
    const dateISO = currDate.toISOString().split('T')[0];

    if (!includedDays.includes(dayOfWeek)) continue;

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // STEP A: Pick Primary Dish
    let primaryCandidatePool: Dish[] = [];

    if (mode === 'easy_meals') {
      primaryCandidatePool = safeCookbook.filter((d) => !chosenDishIds.has(d.id));
      if (primaryCandidatePool.length < 3) {
        primaryCandidatePool = [...primaryCandidatePool, ...safeSystem.filter((d) => !chosenDishIds.has(d.id))];
      }
    } else if (mode === 'give_me_ideas') {
      primaryCandidatePool = safeSystem.filter((d) => !chosenDishIds.has(d.id));
    } else {
      // Best of Both
      if (!isWeekend) {
        primaryCandidatePool = safeCookbook.filter((d) => !chosenDishIds.has(d.id));
        if (primaryCandidatePool.length < 2) {
          primaryCandidatePool = [...primaryCandidatePool, ...safeSystem.filter((d) => !chosenDishIds.has(d.id))];
        }
      } else {
        primaryCandidatePool = safeSystem.filter((d) => !chosenDishIds.has(d.id));
      }
    }

    if (primaryCandidatePool.length === 0) {
      primaryCandidatePool = safeSystem.length > 0 ? safeSystem : familyCookbookDishes;
    }

    const scoredPrimary = primaryCandidatePool.map((dish) => {
      let finalScore = scoreDish(dish, isWeekend);
      const prot = getPrimaryProteinCategory(dish);
      if (previousProtein && prot === previousProtein) finalScore -= 40;
      else if (previousProtein && prot !== previousProtein) finalScore += 25;
      return { dish, score: finalScore, protein: prot };
    });

    scoredPrimary.sort((a, b) => b.score - a.score);
    const topPrimary = scoredPrimary.slice(0, Math.min(3, scoredPrimary.length));
    const selectedPrimary = topPrimary[Math.floor(Math.random() * topPrimary.length)] || scoredPrimary[0];

    if (!selectedPrimary) continue;

    const primaryDish = selectedPrimary.dish;
    chosenDishIds.add(primaryDish.id);
    previousProtein = selectedPrimary.protein;

    // STEP B: Multi-Dish Dinner Composition based on dinersCount
    const dayDishes: Dish[] = [primaryDish];
    const isOnePot = primaryDish.dishRole === 'one_pot_meal';

    if (isOnePot) {
      // One-Pot Meal:
      // If 1-2 diners: 1 dish is plenty.
      // If 3+ diners: Add 1 vegetable side or soup to balance nutrition and appetite.
      if (dinersCount >= 3) {
        const vegPool = mode === 'easy_meals' && cbVegSides.length > 0 ? cbVegSides : safeVegSides;
        const vegSide = pickFromPool(vegPool, chosenDishIds, undefined, isWeekend);
        if (vegSide) {
          dayDishes.push(vegSide);
          chosenDishIds.add(vegSide.id);
        }
      }
    } else {
      // Component Meal (starts with main protein):
      // 1. Add Vegetable Side (Dish 2 for 2+ diners)
      if (dinersCount >= 2) {
        const vegPool = mode === 'easy_meals' && cbVegSides.length > 0 ? cbVegSides : safeVegSides;
        const vegSide = pickFromPool(vegPool, chosenDishIds, undefined, isWeekend);
        if (vegSide) {
          dayDishes.push(vegSide);
          chosenDishIds.add(vegSide.id);
        }
      }

      // 2. Add Second Main or Soup (Dish 3 for 3+ diners)
      if (dinersCount >= 3) {
        // If 4+ diners, bias towards 2nd protein; if 3 diners, pick 2nd protein or soup
        const mainPool = mode === 'easy_meals' && cbMains.length > 2 ? cbMains : safeMains;
        const secondaryMain = pickFromPool(mainPool, chosenDishIds, selectedPrimary.protein, isWeekend);
        if (secondaryMain) {
          dayDishes.push(secondaryMain);
          chosenDishIds.add(secondaryMain.id);
        }
      }

      // 3. Add Soup or 2nd Veg Side (Dish 4 for 5+ diners)
      if (dinersCount >= 5) {
        const soupPool = mode === 'easy_meals' && cbSoups.length > 0 ? cbSoups : safeSoups;
        const soup = pickFromPool(soupPool, chosenDishIds, undefined, isWeekend);
        if (soup) {
          dayDishes.push(soup);
          chosenDishIds.add(soup.id);
        }
      }
    }

    // STEP C: Determine Staple Accompaniment (Rice, Bread, Noodles, or Built-In)
    let accompaniment: MealAccompaniment = defaultStaple;
    const hasStarchBuiltIn = detectStarchBuiltIn(dayDishes);

    if (hasStarchBuiltIn) {
      accompaniment = 'none_builtin';
    } else if (focus === 'light') {
      accompaniment = 'cauliflower_rice';
    } else {
      accompaniment = defaultStaple;
    }

    const stapleInfo = ACCOMPANIMENT_OPTIONS[accompaniment] || ACCOMPANIMENT_OPTIONS.jasmine_rice;

    // STEP D: Total Dinner Nutrition Calculation
    // Total door-to-table per-person calories = sum(dish calories per serving) + staple calories
    const dishesCal = dayDishes.reduce((sum, d) => sum + (d.nutrition?.calories || 480), 0);
    const dishesPro = dayDishes.reduce((sum, d) => sum + (d.nutrition?.protein || 24), 0);
    const dishesCarb = dayDishes.reduce((sum, d) => sum + (d.nutrition?.carbs || 45), 0);
    const dishesFat = dayDishes.reduce((sum, d) => sum + (d.nutrition?.fat || 14), 0);

    const perPersonCal = Math.round(dishesCal + stapleInfo.caloriesPerPerson);
    const perPersonPro = Math.round(dishesPro);

    // Dynamic combo structure description
    let comboStructure = `${dayDishes.length} Dishes`;
    if (dayDishes.length === 1) comboStructure = '1-Dish Feast (One-Pot)';
    else if (dayDishes.length === 2) comboStructure = '2 Dishes: 1 Main + 1 Veg';
    else if (dayDishes.length === 3) comboStructure = '3 Dishes: 2 Mains + 1 Veg';
    else if (dayDishes.length >= 4) comboStructure = '4 Dishes: 2 Mains + 1 Veg + 1 Soup';

    // Reason Tag
    let reasonTag = '✨ Chef Discovery';
    const isFromCookbook = safeCookbook.some((cb) => cb.id === primaryDish.id);

    if (isFromCookbook) reasonTag = '🏠 Family Classic';
    else if (preferKids && primaryDish.kidFriendly) reasonTag = '👶 Kid-Friendly';
    else if (focus === 'quick' && (primaryDish.totalTimeMinutes || primaryDish.prepTimeMinutes || 30) <= 20) reasonTag = '⚡ 20-min Fast';
    else if (focus === 'high_protein') reasonTag = '💪 High Protein';
    else if (selectedPrimary.protein === 'seafood') reasonTag = '🦐 Fresh Seafood';
    else if (selectedPrimary.protein === 'vegetarian') reasonTag = '🌱 Healthy Greens';

    const scaledNutrition: NutritionInfo = {
      calories: Math.round(perPersonCal * dinersCount),
      protein: Math.round(perPersonPro * dinersCount),
      carbs: Math.round((dishesCarb + stapleInfo.carbsPerPerson) * dinersCount),
      fat: Math.round(dishesFat * dinersCount)
    };

    plannedMeals.push({
      dateISO,
      dayOfWeek,
      dayName: dayNamesEn[dayOfWeek],
      slotId: targetSlotId,
      slotName: 'Dinner',
      dishes: dayDishes,
      dish: primaryDish,
      dinersCount,
      dishesCount: dayDishes.length,
      comboStructure,
      accompaniment,
      reasonTag,
      perPersonCalories: perPersonCal,
      perPersonProtein: perPersonPro,
      scaledNutrition
    });
  }

  // 6. Compute Aggregated Metrics
  const totalDinners = plannedMeals.length;
  const avgCal = totalDinners > 0
    ? Math.round(plannedMeals.reduce((sum, m) => sum + m.perPersonCalories, 0) / totalDinners)
    : 0;

  const avgPro = totalDinners > 0
    ? Math.round(plannedMeals.reduce((sum, m) => sum + m.perPersonProtein, 0) / totalDinners)
    : 0;

  const avgDishes = totalDinners > 0
    ? Number((plannedMeals.reduce((sum, m) => sum + m.dishesCount, 0) / totalDinners).toFixed(1))
    : 1;

  const cuisines = Array.from(
    new Set(plannedMeals.flatMap((m) => m.dishes.map((d) => d.cuisine || 'Home Cooking')).filter(Boolean))
  );

  const kidCount = plannedMeals.filter((m) => m.dishes.some((d) => d.kidFriendly)).length;

  return {
    suggestions: plannedMeals,
    totalDinners,
    averageCalories: avgCal,
    averageProtein: avgPro,
    primaryCuisines: cuisines.slice(0, 4),
    kidFriendlyCount: kidCount,
    averageDishesPerMeal: avgDishes
  };
}

/**
 * Swap an individual dish in a multi-dish dinner meal
 */
export function swapSingleMealDish(
  targetDishId: string,
  existingMeal: PlannedDayMeal,
  allSuggestions: PlannedDayMeal[],
  options: AiPlannerOptions
): PlannedDayMeal | null {
  const currentDishToReplace = existingMeal.dishes.find((d) => d.id === targetDishId) || existingMeal.dish;
  const targetRole = currentDishToReplace.dishRole || 'main_protein';

  const otherDishesInThisMeal = existingMeal.dishes.filter((d) => d.id !== targetDishId);
  const existingProteins = new Set(otherDishesInThisMeal.map((d) => getPrimaryProteinCategory(d)));
  const otherDishIds = new Set(allSuggestions.flatMap((s) => s.dishes.map((d) => d.id)));
  otherDishIds.delete(targetDishId);

  const pool = options.mode === 'easy_meals' && options.familyCookbookDishes.length > 5
    ? options.familyCookbookDishes
    : options.allSystemDishes;

  // Filter candidates matching the same role or complementary role
  const candidates = pool.filter((d) => {
    if (!d || d.id === targetDishId) return false;
    if (otherDishIds.has(d.id)) return false;
    if (d.dishRole === 'sauce_condiment') return false;

    // Avoid same protein on table if replacing a main
    if (targetRole === 'main_protein' && existingProteins.has(getPrimaryProteinCategory(d))) return false;

    // Prefer same role
    if (targetRole === 'vegetable_side' && d.dishRole !== 'vegetable_side') return false;
    if (targetRole === 'soup' && d.dishRole !== 'soup') return false;

    // Check allergies
    if (options.familyPersonalisation?.strictAllergyFilter) {
      const familyAllergens = getFamilyAllergens(
        options.familyMembers || [],
        options.memberProfiles,
        options.familyPersonalisation
      );
      const dishAlgs = detectDishAllergens(d);
      if (dishAlgs.some((alg) => familyAllergens.includes(alg))) return false;
    }

    // Check spice
    const maxSpice = typeof options.familyPersonalisation?.spiceTolerance === 'number'
      ? options.familyPersonalisation.spiceTolerance
      : 3;
    if ((d.spiceLevel || 0) > maxSpice) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * Math.min(8, candidates.length));
  const newDish = candidates[randomIndex] || candidates[0];

  const updatedDishes = existingMeal.dishes.map((d) => (d.id === targetDishId ? newDish : d));

  // Recalculate Starch & Nutrition
  let accompaniment = existingMeal.accompaniment;
  if (detectStarchBuiltIn(updatedDishes)) {
    accompaniment = 'none_builtin';
  } else if (accompaniment === 'none_builtin') {
    accompaniment = options.defaultStaple || 'jasmine_rice';
  }

  const stapleInfo = ACCOMPANIMENT_OPTIONS[accompaniment] || ACCOMPANIMENT_OPTIONS.jasmine_rice;
  const dishesCal = updatedDishes.reduce((sum, d) => sum + (d.nutrition?.calories || 480), 0);
  const dishesPro = updatedDishes.reduce((sum, d) => sum + (d.nutrition?.protein || 24), 0);

  return {
    ...existingMeal,
    dishes: updatedDishes,
    dish: updatedDishes[0] || newDish,
    accompaniment,
    perPersonCalories: Math.round(dishesCal + stapleInfo.caloriesPerPerson),
    perPersonProtein: Math.round(dishesPro)
  };
}

export const swapSingleMealSuggestion = swapSingleMealDish;

/**
 * Swap the entire dinner combination for a day (all dishes + staple accompaniment)
 */
export function swapWholeMealForDay(
  existingMeal: PlannedDayMeal,
  allSuggestions: PlannedDayMeal[],
  options: AiPlannerOptions
): PlannedDayMeal | null {
  // Exclude dishes on other days from being re-selected
  const otherDayDishIds = new Set(
    allSuggestions
      .filter((s) => s.dateISO !== existingMeal.dateISO)
      .flatMap((s) => s.dishes.map((d) => d.id))
  );

  // Also temporarily avoid the dishes currently in this meal to ensure a completely fresh combo
  existingMeal.dishes.forEach((d) => otherDayDishIds.add(d.id));

  const singleDayResult = generateOfflineAiMealPlan({
    ...options,
    durationDays: 1,
    startDateISO: existingMeal.dateISO,
    includedDays: [existingMeal.dayOfWeek],
    recentMealPlan: {
      ...options.recentMealPlan,
      _swapAvoidance: {
        slot_dinner: {
          dishIds: Array.from(otherDayDishIds)
        }
      }
    }
  });

  if (singleDayResult.suggestions.length === 0) return null;

  const newMeal = singleDayResult.suggestions[0];
  return {
    ...newMeal,
    dateISO: existingMeal.dateISO,
    dayOfWeek: existingMeal.dayOfWeek,
    dayName: existingMeal.dayName,
    reasonTag: '🔄 Swapped Meal'
  };
}
