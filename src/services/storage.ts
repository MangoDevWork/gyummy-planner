import type { AppData, Dish, GroceryCategory, GroceryItem, MasterIngredient, MealPlan, UserProfile } from '../types';
import { getInitialAppData, INITIAL_DISHES, DEFAULT_MEAL_SCHEDULES, DEFAULT_PANTRY_INGREDIENTS } from './seedData';
import { DEFAULT_MASTER_INGREDIENTS } from './masterIngredients';
import { matchPantryIngredient } from './pantryMatching';
import { STARTER_RECIPE_TRANSLATIONS, getLocalizedDish } from './dataLocalizationService';
import { sanitizeIngredient, sanitizeMasterIngredient, cleanIngredientName } from './ingredientSanitizer';
import { pushAppDataToCloud } from './firebase';

const ACTIVE_PROFILE_KEY = 'gyummy_active_profile_v2';
const FAMILY_DATA_PREFIX = 'gyummy_family_data_v2_';
const LEGACY_STORAGE_KEY = 'gyummy_planner_data_v1';

export function getActiveProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setActiveProfile(profile: UserProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
  } catch (err) {
    console.error('Error saving active profile:', err);
  }
}

export function resetActiveSession(): void {
  setActiveProfile(null);
}

export function getFamilyStorageKey(familyName: string): string {
  const safeName = familyName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `${FAMILY_DATA_PREFIX}${safeName}`;
}

export function loadAppData(profileOverride?: UserProfile | null): AppData {
  try {
    const currentProfile = profileOverride !== undefined ? profileOverride : getActiveProfile();
    const familyKey = currentProfile ? getFamilyStorageKey(currentProfile.familyName) : null;
    
    let raw = familyKey ? localStorage.getItem(familyKey) : null;

    // Check legacy storage migration if no family data exists yet
    if (!raw && !currentProfile) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacyData = JSON.parse(legacyRaw);
          const initial = getInitialAppData(null);
          const migrated: AppData = {
            ...initial,
            ...legacyData,
            version: 2,
            masterIngredients: legacyData.masterIngredients || DEFAULT_MASTER_INGREDIENTS,
            pantryIngredients: legacyData.pantryIngredients || DEFAULT_PANTRY_INGREDIENTS,
            mealSchedules: legacyData.mealSchedules || legacyData.mealSlots || DEFAULT_MEAL_SCHEDULES,
            currentProfile: null,
            familyMembers: []
          };
          return migrated;
        } catch {
          // fallback
        }
      }
    }

    if (!raw) {
      const initial = getInitialAppData(currentProfile);
      if (familyKey) {
        localStorage.setItem(familyKey, JSON.stringify(initial));
      }
      return initial;
    }

    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.dishes) || typeof parsed.mealPlan !== 'object') {
      console.warn('Corrupted family data detected, restoring initial data');
      const initial = getInitialAppData(currentProfile);
      if (familyKey) saveAppData(initial);
      return initial;
    }

    // Upgrade and sync master ingredients to clean consolidated database
    const customUserIngredients = (parsed.masterIngredients || []).filter((i) => i.id.startsWith('custom_ing_'));
    const cleanMasterMap = new Map<string, MasterIngredient>();
    
    // Seed default master database
    DEFAULT_MASTER_INGREDIENTS.forEach((ing) => {
      cleanMasterMap.set(ing.name.toLowerCase().trim(), ing);
    });
    
    // Add user custom ingredients
    customUserIngredients.forEach((customIng) => {
      const key = customIng.name.toLowerCase().trim();
      if (!cleanMasterMap.has(key)) {
        cleanMasterMap.set(key, customIng);
      }
    });

    parsed.masterIngredients = Array.from(cleanMasterMap.values());

    if (!parsed.pantryIngredients || parsed.pantryIngredients.length === 0) {
      parsed.pantryIngredients = DEFAULT_PANTRY_INGREDIENTS;
    }

    // Migration for mealSchedules / legacy mealSlots
    if (!parsed.mealSchedules || parsed.mealSchedules.length === 0) {
      parsed.mealSchedules = (parsed as any).mealSlots || DEFAULT_MEAL_SCHEDULES;
    }

    // Ensure all starter cookbook dishes (from INITIAL_DISHES) exist and are active in Family Cookbook
    const dishMap = new Map<string, Dish>();
    if (parsed.dishes && Array.isArray(parsed.dishes)) {
      parsed.dishes.forEach((d) => dishMap.set(d.id, d));
    }
    const starterIds = new Set(INITIAL_DISHES.map((d) => d.id));
    INITIAL_DISHES.forEach((initDish) => {
      const existing = dishMap.get(initDish.id);
      if (!existing) {
        dishMap.set(initDish.id, { ...initDish, isFamilyRecipe: true });
      } else if (starterIds.has(existing.id) && existing.isFamilyRecipe === false) {
        // Restore initial starter dish if it was stripped or downgraded to isFamilyRecipe: false
        existing.isFamilyRecipe = true;
      }
    });
    parsed.dishes = Array.from(dishMap.values());

    // Hydrate translations on known starter dishes if missing
    parsed.dishes = parsed.dishes.map((dish) => {
      if (!dish.translations && STARTER_RECIPE_TRANSLATIONS[dish.id]) {
        return {
          ...dish,
          language: dish.language || 'en',
          translations: {
            'zh-CN': STARTER_RECIPE_TRANSLATIONS[dish.id]
          }
        };
      }
      return dish;
    });

    // Sanitize user dishes (strip prefixes, extract embedded amounts and units)
    if (parsed.dishes && Array.isArray(parsed.dishes)) {
      parsed.dishes = parsed.dishes.map((dish) => {
        if (!dish.ingredients || !Array.isArray(dish.ingredients)) return dish;
        return {
          ...dish,
          ingredients: dish.ingredients.map(sanitizeIngredient)
        };
      });
    }

    // Sanitize master ingredients if present in user state
    if (parsed.masterIngredients && Array.isArray(parsed.masterIngredients)) {
      const seen = new Set<string>();
      const sanitizedList: MasterIngredient[] = [];
      parsed.masterIngredients.forEach((item) => {
        const cleaned = sanitizeMasterIngredient(item);
        if (cleaned && cleaned.name) {
          const key = cleaned.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            sanitizedList.push(cleaned);
          }
        }
      });
      parsed.masterIngredients = sanitizedList;
    }

    // Sanitize user's home pantry ingredients
    if (parsed.pantryIngredients && Array.isArray(parsed.pantryIngredients)) {
      const cleanedPantry = new Set<string>();
      parsed.pantryIngredients.forEach((p) => {
        const cleaned = cleanIngredientName(p).name;
        if (cleaned) cleanedPantry.add(cleaned);
      });
      parsed.pantryIngredients = Array.from(cleanedPantry);
    }

    if (!parsed.familyMembers) {
      parsed.familyMembers = currentProfile ? [currentProfile.memberName] : [];
    }

    if (!parsed.memberProfiles) {
      parsed.memberProfiles = currentProfile ? {
        [currentProfile.memberName]: {
          allergies: [],
          favoriteCuisines: ['Chinese', 'Japanese', 'Italian'],
          favoriteCategories: ['Dinner', 'Lunch']
        }
      } : {};
    }

    if (!parsed.familyPersonalisation) {
      parsed.familyPersonalisation = {
        strictAllergyFilter: true,
        householdAllergies: [],
        householdCuisines: [],
        householdCategories: [],
        spiceTolerance: 'mild',
        cookingForKids: false,
        weeknightSpeed: 'quick',
        defaultStaple: 'jasmine_rice',
        defaultCookingDays: [1, 2, 3, 4, 5, 6, 0],
        defaultDietaryFocus: 'balanced',
        defaultPlanningStrategy: 'best_of_both'
      };
    } else {
      parsed.familyPersonalisation = {
        strictAllergyFilter: parsed.familyPersonalisation.strictAllergyFilter ?? true,
        householdAllergies: parsed.familyPersonalisation.householdAllergies || [],
        householdCuisines: parsed.familyPersonalisation.householdCuisines || [],
        householdCategories: parsed.familyPersonalisation.householdCategories || [],
        spiceTolerance: parsed.familyPersonalisation.spiceTolerance || 'mild',
        cookingForKids: Boolean(parsed.familyPersonalisation.cookingForKids),
        weeknightSpeed: parsed.familyPersonalisation.weeknightSpeed || 'quick',
        defaultStaple: parsed.familyPersonalisation.defaultStaple || 'jasmine_rice',
        defaultCookingDays: parsed.familyPersonalisation.defaultCookingDays && parsed.familyPersonalisation.defaultCookingDays.length > 0
          ? parsed.familyPersonalisation.defaultCookingDays
          : [1, 2, 3, 4, 5, 6, 0],
        defaultDietaryFocus: parsed.familyPersonalisation.defaultDietaryFocus || 'balanced',
        defaultPlanningStrategy: parsed.familyPersonalisation.defaultPlanningStrategy || 'best_of_both'
      };
    }

    parsed.currentProfile = currentProfile;

    return parsed;
  } catch (err) {
    console.error('Error loading data from storage:', err);
    return getInitialAppData(getActiveProfile());
  }
}

export function saveAppData(data: AppData, skipCloudPush = false): void {
  try {
    if (data.currentProfile) {
      setActiveProfile(data.currentProfile);
      const familyKey = getFamilyStorageKey(data.currentProfile.familyName);

      const persistedDishes = data.dishes.filter((d) => {
        // Always persist user custom / edited recipes
        const isCustom = d.id.startsWith('dish_') || d.id.startsWith('custom_');
        if (isCustom) return true;
        // For system recipes, persist if in family cookbook or favorited
        return Boolean(d.isFamilyRecipe || (d.favoritedByMembers && d.favoritedByMembers.length > 0));
      });

      const payloadToSave = {
        ...data,
        masterIngredients: undefined, // Never serialize 42,000 lines of system masterIngredients
        dishes: persistedDishes
      };

      localStorage.setItem(familyKey, JSON.stringify(payloadToSave));

      // Push to Firebase Cloud (debounced) if not skipped
      if (!skipCloudPush) {
        pushAppDataToCloud(data.currentProfile.familyName, payloadToSave);
      }
    } else {
      setActiveProfile(null);
    }
  } catch (err) {
    console.error('Error saving data to storage:', err);
  }
}

export function clearAllAppData(): void {
  try {
    const profile = getActiveProfile();
    if (profile) {
      const familyKey = getFamilyStorageKey(profile.familyName);
      localStorage.removeItem(familyKey);
    }
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing data:', err);
  }
}

/**
 * Irrevocably purge all local family storage, profile caches, and credentials
 */
export function purgeFamilyLocalStorage(familyName?: string): void {
  try {
    const profile = getActiveProfile();
    const targetName = familyName || profile?.familyName;
    if (targetName) {
      const familyKey = getFamilyStorageKey(targetName);
      localStorage.removeItem(familyKey);
    }
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    
    // Purge any lingering family or member cache keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('GYUMMY_FAMILY_') || key.startsWith('gyummy_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error('Error purging local data:', err);
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Smart Grocery List Aggregation
 * Case-insensitive name matching with Smart Pantry Substitution Engine.
 * Auto marks inPantry and attaches substitution notes if equivalent staple is found.
 */
export function generateGroceryList(
  dishes: Dish[],
  mealPlan: MealPlan,
  startDate: string,
  endDate: string,
  existingItems: GroceryItem[] = [],
  pantryIngredients: string[] = [],
  preferredLang: 'en' | 'zh-CN' = 'en'
): GroceryItem[] {
  const dishMap = new Map<string, Dish>();
  dishes.forEach((d) => dishMap.set(d.id, d));

  const aggregatedMap = new Map<
    string,
    {
      name: string;
      amount: number | null;
      unit: string;
      category: GroceryCategory;
      inPantry: boolean;
      pantrySubstituteNote?: string;
      sourceDishes: Set<string>;
    }
  >();

  const dates = Object.keys(mealPlan).filter((d) => d >= startDate && d <= endDate);

  dates.forEach((date) => {
    const dayPlan = mealPlan[date];
    if (!dayPlan) return;

    Object.keys(dayPlan).forEach((scheduleId) => {
      const entry = dayPlan[scheduleId];
      if (!entry) return;

      const targetDishIds = entry.dishIds && entry.dishIds.length > 0
        ? entry.dishIds
        : (entry.dishId ? [entry.dishId] : []);

      if (targetDishIds.length === 0) return;

      const multiplier = typeof entry.servingsMultiplier === 'number' && entry.servingsMultiplier > 0
        ? entry.servingsMultiplier
        : 1;

      targetDishIds.forEach((dId) => {
        const dish = dishMap.get(dId);
        if (!dish) return;

        const localizedDish = getLocalizedDish(dish, preferredLang);

        localizedDish.ingredients.forEach((ing) => {
          const normName = normalizeName(ing.name);
          const normUnit = (ing.unit || '').trim().toLowerCase();
          
          const key = `${normName}|${normUnit}|${ing.category}`;

          const ingAmount = typeof ing.amount === 'number' ? ing.amount * multiplier : null;

          if (aggregatedMap.has(key)) {
            const item = aggregatedMap.get(key)!;
            if (typeof item.amount === 'number' && typeof ingAmount === 'number') {
              item.amount = Math.round((item.amount + ingAmount) * 100) / 100;
            } else if (item.amount === null && typeof ingAmount === 'number') {
              item.amount = Math.round(ingAmount * 100) / 100;
            }
            item.sourceDishes.add(localizedDish.name);
          } else {
            const pantryMatch = matchPantryIngredient(ing.name, pantryIngredients);

            aggregatedMap.set(key, {
              name: ing.name.trim(),
              amount: ingAmount !== null ? Math.round(ingAmount * 100) / 100 : null,
              unit: ing.unit ? ing.unit.trim() : '',
              category: ing.category || 'Other',
              inPantry: pantryMatch.inPantry,
              pantrySubstituteNote: pantryMatch.substituteNote,
              sourceDishes: new Set([localizedDish.name])
            });
          }
        });
      });
    });
  });

  // Preserve checked states and manual additions from previous list
  const existingCheckedMap = new Map<string, boolean>();
  const manualItems: GroceryItem[] = [];

  existingItems.forEach((item) => {
    if (item.isManual) {
      manualItems.push(item);
    } else {
      const key = `${normalizeName(item.name)}|${(item.unit || '').trim().toLowerCase()}|${item.category}`;
      existingCheckedMap.set(key, item.checked);
    }
  });

  const generatedItems: GroceryItem[] = Array.from(aggregatedMap.entries()).map(([key, value], index) => ({
    id: `groc_auto_${Date.now()}_${index}`,
    name: value.name,
    amount: value.amount,
    unit: value.unit,
    category: value.category,
    checked: existingCheckedMap.get(key) || false,
    inPantry: value.inPantry,
    pantrySubstituteNote: value.pantrySubstituteNote,
    sourceDishes: Array.from(value.sourceDishes),
    isManual: false,
    dateRange: { start: startDate, end: endDate }
  }));

  return [...generatedItems, ...manualItems];
}
