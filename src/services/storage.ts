import type { AppData, Dish, GroceryCategory, GroceryItem, MasterIngredient, MealPlan, UserProfile } from '../types';
import { getInitialAppData, INITIAL_DISHES, DEFAULT_MEAL_SCHEDULES, DEFAULT_PANTRY_INGREDIENTS } from './seedData';
import { DEFAULT_MASTER_INGREDIENTS } from './masterIngredients';
import { matchPantryIngredient } from './pantryMatching';
import { STARTER_RECIPE_TRANSLATIONS, getLocalizedDish, formatDisplayIngredientName } from './dataLocalizationService';
import { sanitizeIngredient, sanitizeMasterIngredient, cleanIngredientName } from './ingredientSanitizer';
import { pushAppDataToCloud } from './firebase';
import {
  getIdbFamilyData,
  setIdbFamilyData,
  deleteIdbFamilyData,
  extractAndStoreIdbImages,
  hydrateDishesWithIdbImages
} from './indexedDbStorage';

const ACTIVE_PROFILE_KEY = 'gyummy_active_profile_v2';
const FAMILY_DATA_PREFIX = 'gyummy_family_data_v2_';
const LEGACY_STORAGE_KEY = 'gyummy_planner_data_v1';

let memoryAppDataCache: AppData | null = null;

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

    if (
      memoryAppDataCache &&
      memoryAppDataCache.currentProfile?.familyName === currentProfile?.familyName
    ) {
      return memoryAppDataCache;
    }

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

    // Load user custom ingredients archive and recover any custom ingredients from dishes or previous state
    const customUserMap = new Map<string, MasterIngredient>();
    (parsed.customIngredients || []).forEach((ci) => {
      if (ci && ci.name) customUserMap.set(ci.name.toLowerCase().trim(), ci);
    });
    (parsed.masterIngredients || []).forEach((mi) => {
      if (mi && mi.id && (mi.id.startsWith('custom_') || mi.id.startsWith('ing_lib_'))) {
        customUserMap.set(mi.name.toLowerCase().trim(), mi);
      }
    });

    // Auto-archive any custom ingredients used in dishes so they are never lost on updates
    const defaultIngNames = new Set(DEFAULT_MASTER_INGREDIENTS.map((m) => m.name.toLowerCase().trim()));
    (parsed.dishes || []).forEach((dish) => {
      (dish.ingredients || []).forEach((ing) => {
        if (!ing || !ing.name) return;
        ing.name = formatDisplayIngredientName(ing.name);
        const norm = ing.name.toLowerCase().trim();
        if (!defaultIngNames.has(norm) && !customUserMap.has(norm)) {
          const autoArchived: MasterIngredient = {
            id: `custom_ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: ing.name.trim(),
            category: (ing.category as GroceryCategory) || 'Produce',
            defaultUnit: ing.unit || 'g',
            defaultValue: ing.amount || null
          };
          customUserMap.set(norm, autoArchived);
        }
      });
    });

    const userCustomIngredients = Array.from(customUserMap.values());
    parsed.customIngredients = userCustomIngredients;

    // Seed master database: custom ingredients first, followed by default master database
    const cleanMasterMap = new Map<string, MasterIngredient>();
    userCustomIngredients.forEach((customIng) => {
      cleanMasterMap.set(customIng.name.toLowerCase().trim(), customIng);
    });
    DEFAULT_MASTER_INGREDIENTS.forEach((ing) => {
      const key = ing.name.toLowerCase().trim();
      if (!cleanMasterMap.has(key)) {
        cleanMasterMap.set(key, ing);
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

    // Ensure all starter cookbook dishes (from INITIAL_DISHES) exist in user dishes
    const dishMap = new Map<string, Dish>();
    if (parsed.dishes && Array.isArray(parsed.dishes)) {
      parsed.dishes.forEach((d) => dishMap.set(d.id, d));
    }

    // One-time migration for default cookbook version 2 (introducing the 6 newly designated default recipes)
    const currentCookbookVersion = parsed.settings?.defaultCookbookVersion || 0;
    const isNewCookbookVersion = currentCookbookVersion < 2;

    const TARGET_NEW_STARTER_IDS = new Set([
      'dish_stir_fry_garlic_beef',
      'dish_1788042492598',
      'dish_1788039952172',
      'dish_1788041332181',
      'dish_1788041140044',
      'dish_1788042224332'
    ]);

    INITIAL_DISHES.forEach((initDish) => {
      const existing = dishMap.get(initDish.id);
      if (!existing) {
        dishMap.set(initDish.id, { ...initDish, isFamilyRecipe: true });
      } else if (isNewCookbookVersion && TARGET_NEW_STARTER_IDS.has(initDish.id)) {
        // One-time activation of the 6 newly designated default recipes for existing users
        existing.isFamilyRecipe = true;
      }
      // Note: If user explicitly removed a starter dish (isFamilyRecipe === false),
      // do NOT force it back to true once cookbook version is 2 or higher!
    });

    if (parsed.settings) {
      parsed.settings.defaultCookbookVersion = 2;
    }
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
    memoryAppDataCache = parsed;

    // Asynchronously extract any existing base64 images into IndexedDB image store
    if (Array.isArray(parsed.dishes)) {
      extractAndStoreIdbImages(parsed.dishes).catch(() => {});
    }

    return parsed;
  } catch (err) {
    console.error('Error loading data from storage:', err);
    return getInitialAppData(getActiveProfile());
  }
}

/**
 * Hydrates full AppData from IndexedDB on startup and migrates localStorage if needed.
 */
export async function initStorageWithIndexedDb(profileOverride?: UserProfile | null): Promise<AppData | null> {
  try {
    const profile = profileOverride !== undefined ? profileOverride : getActiveProfile();
    if (!profile?.familyName) return null;

    const familyId = profile.familyName;

    // 1. Check if IndexedDB has family data
    let idbData = await getIdbFamilyData(familyId);

    // 2. If IndexedDB is empty, migrate from localStorage
    if (!idbData) {
      const familyKey = getFamilyStorageKey(familyId);
      const raw = localStorage.getItem(familyKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as AppData;
          if (parsed && Array.isArray(parsed.dishes)) {
            idbData = parsed;
            await setIdbFamilyData(familyId, parsed);
            await extractAndStoreIdbImages(parsed.dishes);
          }
        } catch {
          // fallback
        }
      }
    }

    // 3. Hydrate any dishes that need images from IndexedDB image store
    if (idbData && Array.isArray(idbData.dishes)) {
      idbData.dishes = await hydrateDishesWithIdbImages(idbData.dishes);
      memoryAppDataCache = idbData;
      return idbData;
    }

    // 4. Fallback: check if memory cache exists and hydrate it
    if (memoryAppDataCache && Array.isArray(memoryAppDataCache.dishes)) {
      memoryAppDataCache.dishes = await hydrateDishesWithIdbImages(memoryAppDataCache.dishes);
      return memoryAppDataCache;
    }

    return null;
  } catch (err) {
    console.warn('initStorageWithIndexedDb error:', err);
    return null;
  }
}

export function saveAppData(data: AppData, skipCloudPush = false): void {
  try {
    memoryAppDataCache = data;

    if (data.currentProfile) {
      setActiveProfile(data.currentProfile);
      const familyName = data.currentProfile.familyName;
      const familyKey = getFamilyStorageKey(familyName);

      const starterIds = new Set(INITIAL_DISHES.map((d) => d.id));
      const persistedDishes = data.dishes.filter((d) => {
        if (!d || !d.id) return false;

        // 1. Scraped system library recipes:
        // ONLY persist if the user explicitly added to Family Cookbook, favorited, or customized!
        if (d.id.startsWith('dish_scraped_')) {
          return Boolean(
            d.isFamilyRecipe ||
            (d.favoritedByMembers && d.favoritedByMembers.length > 0) ||
            d.isUserEdited
          );
        }

        // 2. Starter recipes from INITIAL_DISHES:
        // Always persist so cookbook state / favorites are saved
        if (starterIds.has(d.id)) return true;

        // 3. User custom recipes created in app (e.g. dish_1725..., custom_..., dish_ai_...):
        // Always persist
        return true;
      });

      // 1. Asynchronously offload custom base64 images into IndexedDB image store
      extractAndStoreIdbImages(persistedDishes).catch((err) => {
        console.warn('Error saving images to IndexedDB:', err);
      });

      // 2. Asynchronously save full AppData to IndexedDB
      const fullIdbPayload: AppData = {
        ...data,
        customIngredients: data.customIngredients || [],
        masterIngredients: undefined, // Never serialize 42,000 lines of system masterIngredients
        dishes: persistedDishes
      };
      setIdbFamilyData(familyName, fullIdbPayload).catch((err) => {
        console.warn('Error saving to IndexedDB:', err);
      });

      // 3. Prepare lean fallback payload for localStorage:
      // STRIP giant base64 images so localStorage only stores lightweight text metadata (< 40KB)!
      const leanDishes = persistedDishes.map((dish) => {
        if (dish.imageUrl && dish.imageUrl.startsWith('data:image/')) {
          return {
            ...dish,
            imageUrl: undefined,
            hasCustomImage: true
          };
        }
        return dish;
      });

      const leanPayload = {
        ...data,
        customIngredients: data.customIngredients || [],
        masterIngredients: undefined,
        dishes: leanDishes
      };

      try {
        localStorage.setItem(familyKey, JSON.stringify(leanPayload));
      } catch (quotaErr) {
        console.warn('LocalStorage quota warning (full data safely preserved in IndexedDB):', quotaErr);
      }

      // 4. Push to Firebase Cloud (debounced) if not skipped
      if (!skipCloudPush) {
        pushAppDataToCloud(familyName, data);
      }
    } else {
      setActiveProfile(null);
    }
  } catch (err) {
    console.error('Error in saveAppData:', err);
  }
}

export function clearAllAppData(): void {
  try {
    const profile = getActiveProfile();
    if (profile) {
      const familyKey = getFamilyStorageKey(profile.familyName);
      localStorage.removeItem(familyKey);
      deleteIdbFamilyData(profile.familyName).catch(() => {});
    }
    memoryAppDataCache = null;
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

function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  const u = unit.trim().toLowerCase();
  if (['pcs', 'pc', 'piece', 'pieces', 'ea', 'each'].includes(u)) return 'pcs';
  if (['tbsp', 'tbs', 'tablespoon', 'tablespoons'].includes(u)) return 'tbsp';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'tsp';
  if (['g', 'gram', 'grams'].includes(u)) return 'g';
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'milliliters'].includes(u)) return 'ml';
  if (['l', 'liter', 'liters', 'litre', 'litres'].includes(u)) return 'L';
  if (['cup', 'cups'].includes(u)) return 'cup';
  if (['slice', 'slices'].includes(u)) return 'slice';
  if (['clove', 'cloves'].includes(u)) return 'clove';
  if (['stalk', 'stalks'].includes(u)) return 'stalk';
  if (['can', 'cans'].includes(u)) return 'can';
  if (['pack', 'packs', 'package', 'packages', 'pkg'].includes(u)) return 'pack';
  if (['pinch', 'pinches'].includes(u)) return 'pinch';
  return u;
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

  interface UnitAccumulator {
    normalizedUnit: string;
    displayUnit: string;
    totalAmount: number | null;
    hasNumericAmount: boolean;
  }

  interface AggregatedIngredientEntry {
    displayName: string;
    category: GroceryCategory;
    inPantry: boolean;
    pantrySubstituteNote?: string;
    sourceDishes: Set<string>;
    unitMeasurements: Map<string, UnitAccumulator>;
  }

  const aggregatedMap = new Map<string, AggregatedIngredientEntry>();

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
          const cleanName = formatDisplayIngredientName(ing.name).trim();
          const normName = normalizeName(cleanName);
          if (!normName) return;

          const normUnit = normalizeUnit(ing.unit);
          const displayUnit = ing.unit ? ing.unit.trim() : (normUnit || '');
          const ingAmount = typeof ing.amount === 'number' ? ing.amount * multiplier : null;

          const pantryMatch = matchPantryIngredient(cleanName, pantryIngredients);

          let agg = aggregatedMap.get(normName);
          if (!agg) {
            agg = {
              displayName: cleanName,
              category: ing.category || 'Other',
              inPantry: pantryMatch.inPantry,
              pantrySubstituteNote: pantryMatch.substituteNote,
              sourceDishes: new Set([localizedDish.name]),
              unitMeasurements: new Map()
            };
            aggregatedMap.set(normName, agg);
          } else {
            // Upgrade category if previously 'Other'
            if (agg.category === 'Other' && ing.category && ing.category !== 'Other') {
              agg.category = ing.category;
            }
            if (pantryMatch.inPantry) {
              agg.inPantry = true;
              if (pantryMatch.substituteNote && !agg.pantrySubstituteNote) {
                agg.pantrySubstituteNote = pantryMatch.substituteNote;
              }
            }
            agg.sourceDishes.add(localizedDish.name);
          }

          // Accumulate unit measurement
          const existingUnit = agg.unitMeasurements.get(normUnit);
          if (existingUnit) {
            if (typeof ingAmount === 'number') {
              existingUnit.totalAmount = Math.round(((existingUnit.totalAmount ?? 0) + ingAmount) * 100) / 100;
              existingUnit.hasNumericAmount = true;
            }
            if (!existingUnit.displayUnit && displayUnit) {
              existingUnit.displayUnit = displayUnit;
            }
          } else {
            agg.unitMeasurements.set(normUnit, {
              normalizedUnit: normUnit,
              displayUnit,
              totalAmount: ingAmount !== null ? Math.round(ingAmount * 100) / 100 : null,
              hasNumericAmount: typeof ingAmount === 'number'
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
      const clean = formatDisplayIngredientName(item.name);
      const norm = normalizeName(clean);
      if (item.checked) {
        existingCheckedMap.set(norm, true);
      } else if (!existingCheckedMap.has(norm)) {
        existingCheckedMap.set(norm, false);
      }
    }
  });

  const UNIT_DISPLAY_PRIORITY: Record<string, number> = {
    tbsp: 10,
    tsp: 20,
    cup: 30,
    g: 40,
    kg: 50,
    ml: 60,
    l: 70,
    pcs: 80,
    slice: 90,
    clove: 100,
    stalk: 110,
    can: 120,
    pack: 130,
    pinch: 140
  };

  const generatedItems: GroceryItem[] = Array.from(aggregatedMap.entries()).map(([normName, entry], index) => {
    // Sort unit measurements logically: numeric quantities first, then common culinary units (tbsp -> tsp -> ml), then alphabetical
    const sortedUnits = Array.from(entry.unitMeasurements.values()).sort((a, b) => {
      if (a.hasNumericAmount !== b.hasNumericAmount) {
        return a.hasNumericAmount ? -1 : 1;
      }
      const pA = UNIT_DISPLAY_PRIORITY[a.normalizedUnit.toLowerCase()] ?? 999;
      const pB = UNIT_DISPLAY_PRIORITY[b.normalizedUnit.toLowerCase()] ?? 999;
      if (pA !== pB) return pA - pB;
      return a.normalizedUnit.localeCompare(b.normalizedUnit);
    });

    const measurements: string[] = [];

    sortedUnits.forEach((m) => {
      let str = '';
      if (m.hasNumericAmount && m.totalAmount !== null) {
        str = m.displayUnit ? `${m.totalAmount} ${m.displayUnit}` : `${m.totalAmount}`;
      } else if (m.displayUnit) {
        str = m.displayUnit;
      }
      str = str.trim();
      if (str) {
        measurements.push(str);
      }
    });

    const isSingleUnit = entry.unitMeasurements.size === 1 && measurements.length === 1;
    let finalAmount: number | null = null;
    let finalUnit: string = '';
    let displayMeasurement: string = '';

    if (isSingleUnit) {
      const first = Array.from(entry.unitMeasurements.values())[0];
      finalAmount = first.totalAmount;
      finalUnit = first.displayUnit;
      displayMeasurement = measurements[0] || (finalAmount !== null ? `${finalAmount} ${finalUnit}`.trim() : finalUnit);
    } else if (measurements.length > 1) {
      finalAmount = null;
      finalUnit = measurements.join(', ');
      displayMeasurement = measurements.join(', ');
    } else if (measurements.length === 1) {
      displayMeasurement = measurements[0];
      finalUnit = measurements[0];
      finalAmount = null;
    }

    return {
      id: `groc_auto_${Date.now()}_${index}`,
      name: entry.displayName,
      amount: finalAmount,
      unit: finalUnit,
      displayMeasurement: displayMeasurement || undefined,
      category: entry.category,
      checked: existingCheckedMap.get(normName) || false,
      inPantry: entry.inPantry,
      pantrySubstituteNote: entry.pantrySubstituteNote,
      sourceDishes: Array.from(entry.sourceDishes),
      isManual: false,
      dateRange: { start: startDate, end: endDate }
    };
  });

  // Sort generated items alphabetically by name
  generatedItems.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return [...generatedItems, ...manualItems];
}
