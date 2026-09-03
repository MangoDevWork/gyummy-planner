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

export interface AiPlannerOptions {
  mode: AiPlannerMode;
  focus: AiPlannerFocus;
  dinersCount: number; // e.g. 2, 3, 4
  durationDays: number; // e.g. 7, 14, 5, 3
  startDateISO: string; // YYYY-MM-DD
  includedDays?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
  targetSlotId?: string; // default: 'slot_dinner'
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
  dish: Dish;
  dinersCount: number;
  reasonTag: string;
  scaledNutrition: NutritionInfo;
}

export interface AiMealPlanResult {
  suggestions: PlannedDayMeal[];
  totalDinners: number;
  averageCalories: number;
  averageProtein: number;
  primaryCuisines: string[];
  kidFriendlyCount: number;
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
 * 100% Offline AI Meal Planning Engine
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
    familyCookbookDishes,
    allSystemDishes,
    memberProfiles = {},
    familyPersonalisation = { strictAllergyFilter: true },
    familyMembers = [],
    recentMealPlan = {}
  } = options;

  // 1. Gather all household constraints
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

  // 2. Filter Candidate Pools Against Safety & Household Rules
  const isDishSafe = (dish: Dish): boolean => {
    if (!dish || !dish.name) return false;

    // Filter non-entrees if planning dinner (exclude pure condiments/dips unless specifically paired)
    if (dish.dishRole === 'sauce_condiment') return false;

    // Allergy check
    if (familyPersonalisation.strictAllergyFilter) {
      const dishAlgs = detectDishAllergens(dish);
      const isUnsafe = dishAlgs.some((alg) => familyAllergens.includes(alg));
      if (isUnsafe) return false;
    }

    // Disliked ingredients check
    if (containsDislikedIngredients(dish, dislikedList)) return false;

    // Spice ceiling check
    const dishSpice = dish.spiceLevel || 0;
    if (dishSpice > maxSpice) return false;

    return true;
  };

  const safeCookbook = familyCookbookDishes.filter(isDishSafe);
  const safeSystem = allSystemDishes.filter(isDishSafe);

  // 3. Extract Recently Planned Dish IDs to Prevent Dinner Fatigue
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

    // Focus Bonus
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
      // Balanced
      if (calories >= 450 && calories <= 680 && protein >= 22) score += 40;
    }

    // Kid-Friendly Bonus
    if (preferKids) {
      if (dish.kidFriendly) score += 50;
      else score -= 20;
    }

    // User Engagement Bonus
    if (dish.favoritedByMembers && dish.favoritedByMembers.length > 0) {
      score += 25;
    }

    if (dish.timesPlanned && dish.timesPlanned > 0) {
      score += Math.min(30, dish.timesPlanned * 5);
    }

    // Weekend vs Weeknight matching
    if (!isWeekend && cookTime <= 25) {
      score += 20; // Fast dinner on weeknights
    }
    if (isWeekend && cookTime >= 35) {
      score += 20; // More elaborate dish on weekends
    }

    // Anti-Fatigue Penalty (penalize dishes cooked in the last 14 days)
    if (recentlyPlannedIds.has(dish.id)) {
      score -= 80;
    }

    return score;
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

    // Skip if day is excluded (e.g. eating out)
    if (!includedDays.includes(dayOfWeek)) {
      continue;
    }

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Determine Candidate Pool for this specific day based on mode
    let candidatePool: Dish[] = [];

    if (mode === 'easy_meals') {
      // 90% Cookbook, fallback to safe system library if cookbook exhausted
      candidatePool = safeCookbook.filter((d) => !chosenDishIds.has(d.id));
      if (candidatePool.length < 3) {
        candidatePool = [...candidatePool, ...safeSystem.filter((d) => !chosenDishIds.has(d.id))];
      }
    } else if (mode === 'give_me_ideas') {
      // 100% Library discovery
      candidatePool = safeSystem.filter((d) => !chosenDishIds.has(d.id));
    } else {
      // Best of both (Hybrid): Weekdays lean cookbook, weekends lean discovery
      if (!isWeekend) {
        candidatePool = safeCookbook.filter((d) => !chosenDishIds.has(d.id));
        if (candidatePool.length < 2) {
          candidatePool = [...candidatePool, ...safeSystem.filter((d) => !chosenDishIds.has(d.id))];
        }
      } else {
        candidatePool = safeSystem.filter((d) => !chosenDishIds.has(d.id));
      }
    }

    if (candidatePool.length === 0) {
      candidatePool = safeSystem.length > 0 ? safeSystem : familyCookbookDishes;
    }

    // Score candidates
    const scoredCandidates = candidatePool.map((dish) => {
      let finalScore = scoreDish(dish, isWeekend);
      const prot = getPrimaryProteinCategory(dish);

      // Protein rotation bonus / penalty
      if (previousProtein && prot === previousProtein) {
        finalScore -= 40; // Discourage same protein back-to-back
      } else if (previousProtein && prot !== previousProtein) {
        finalScore += 25; // Encourage protein variety
      }

      return { dish, score: finalScore, protein: prot };
    });

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick top candidate (with slight randomized tie-breaking among top 3)
    const topN = scoredCandidates.slice(0, Math.min(3, scoredCandidates.length));
    const selected = topN[Math.floor(Math.random() * topN.length)] || scoredCandidates[0];

    if (!selected) continue;

    const chosenDish = selected.dish;
    chosenDishIds.add(chosenDish.id);
    previousProtein = selected.protein;

    // Generate Reason Tag
    let reasonTag = '✨ Chef Discovery';
    const isFromCookbook = safeCookbook.some((cb) => cb.id === chosenDish.id);

    if (isFromCookbook) {
      reasonTag = '🏠 Family Classic';
    } else if (preferKids && chosenDish.kidFriendly) {
      reasonTag = '👶 Kid-Friendly';
    } else if (focus === 'quick' && (chosenDish.totalTimeMinutes || chosenDish.prepTimeMinutes || 30) <= 20) {
      reasonTag = '⚡ 20-min Fast';
    } else if (focus === 'high_protein' && (chosenDish.nutrition?.protein || 0) >= 32) {
      reasonTag = '💪 High Protein';
    } else if (selected.protein === 'seafood') {
      reasonTag = '🦐 Fresh Seafood';
    } else if (selected.protein === 'vegetarian') {
      reasonTag = '🌱 Healthy Greens';
    }

    // Scale nutrition based on dinersCount
    const baseServing = chosenDish.servings || 2;
    const multiplier = dinersCount / baseServing;

    const baseNut = chosenDish.nutrition || {
      calories: 520,
      protein: 28,
      carbs: 58,
      fat: 16
    };

    const scaledNutrition: NutritionInfo = {
      calories: Math.round(baseNut.calories * multiplier),
      protein: Math.round(baseNut.protein * multiplier),
      carbs: Math.round(baseNut.carbs * multiplier),
      fat: Math.round(baseNut.fat * multiplier),
      fiber: baseNut.fiber ? Math.round(baseNut.fiber * multiplier) : undefined,
      sodium: baseNut.sodium ? Math.round(baseNut.sodium * multiplier) : undefined
    };

    plannedMeals.push({
      dateISO,
      dayOfWeek,
      dayName: dayNamesEn[dayOfWeek],
      slotId: targetSlotId,
      slotName: 'Dinner',
      dish: chosenDish,
      dinersCount,
      reasonTag,
      scaledNutrition
    });
  }

  // 6. Compute Aggregated Metrics
  const totalDinners = plannedMeals.length;
  const avgCal = totalDinners > 0
    ? Math.round(plannedMeals.reduce((sum, m) => sum + (m.dish.nutrition?.calories || 520), 0) / totalDinners)
    : 0;

  const avgPro = totalDinners > 0
    ? Math.round(plannedMeals.reduce((sum, m) => sum + (m.dish.nutrition?.protein || 28), 0) / totalDinners)
    : 0;

  const cuisines = Array.from(
    new Set(plannedMeals.map((m) => m.dish.cuisine || 'Home Cooking').filter(Boolean))
  );

  const kidCount = plannedMeals.filter((m) => m.dish.kidFriendly).length;

  return {
    suggestions: plannedMeals,
    totalDinners,
    averageCalories: avgCal,
    averageProtein: avgPro,
    primaryCuisines: cuisines.slice(0, 4),
    kidFriendlyCount: kidCount
  };
}

/**
 * Swap a single meal suggestion without regenerating the whole week
 */
export function swapSingleMealSuggestion(
  currentDishId: string,
  existingMeal: PlannedDayMeal,
  allSuggestions: PlannedDayMeal[],
  options: AiPlannerOptions
): PlannedDayMeal | null {
  const currentPlannedIds = new Set(allSuggestions.map((s) => s.dish.id));
  currentPlannedIds.delete(currentDishId); // Allow swapping out this one

  const pool = options.mode === 'easy_meals' && options.familyCookbookDishes.length > 5
    ? options.familyCookbookDishes
    : options.allSystemDishes;

  // Filter candidates
  const candidates = pool.filter((d) => {
    if (!d || d.id === currentDishId) return false;
    if (currentPlannedIds.has(d.id)) return false;
    if (d.dishRole === 'sauce_condiment') return false;

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

  // Pick candidate
  const randomIndex = Math.floor(Math.random() * Math.min(8, candidates.length));
  const newDish = candidates[randomIndex] || candidates[0];

  const baseNut = newDish.nutrition || { calories: 520, protein: 28, carbs: 58, fat: 16 };
  const multiplier = existingMeal.dinersCount / (newDish.servings || 2);

  return {
    ...existingMeal,
    dish: newDish,
    reasonTag: '🔄 Swapped Alternative',
    scaledNutrition: {
      calories: Math.round(baseNut.calories * multiplier),
      protein: Math.round(baseNut.protein * multiplier),
      carbs: Math.round(baseNut.carbs * multiplier),
      fat: Math.round(baseNut.fat * multiplier)
    }
  };
}
