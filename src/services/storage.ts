import type { AppData, Dish, GroceryCategory, GroceryItem, MealPlan, UserProfile } from '../types';
import { getInitialAppData, DEFAULT_MEAL_SCHEDULES } from './seedData';
import { DEFAULT_MASTER_INGREDIENTS } from './masterIngredients';

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

export function getFamilyStorageKey(familyName: string): string {
  const safeName = familyName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `${FAMILY_DATA_PREFIX}${safeName}`;
}

export function loadAppData(): AppData {
  try {
    const currentProfile = getActiveProfile();
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

    // Ensure all new schema properties exist
    if (!parsed.masterIngredients || parsed.masterIngredients.length === 0) {
      parsed.masterIngredients = DEFAULT_MASTER_INGREDIENTS;
    }

    // Migration for mealSchedules / legacy mealSlots
    if (!parsed.mealSchedules || parsed.mealSchedules.length === 0) {
      parsed.mealSchedules = (parsed as any).mealSlots || DEFAULT_MEAL_SCHEDULES;
    }

    if (!parsed.familyMembers) {
      parsed.familyMembers = currentProfile ? [currentProfile.memberName] : [];
    }
    parsed.currentProfile = currentProfile;

    return parsed;
  } catch (err) {
    console.error('Error loading data from storage:', err);
    return getInitialAppData(getActiveProfile());
  }
}

export function saveAppData(data: AppData): void {
  try {
    if (data.currentProfile) {
      setActiveProfile(data.currentProfile);
      const familyKey = getFamilyStorageKey(data.currentProfile.familyName);
      localStorage.setItem(familyKey, JSON.stringify(data));
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

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Smart Grocery List Aggregation
 * Case-insensitive name matching.
 * Sums quantities if units match; keeps separate lines if units differ or are unmeasured.
 */
export function generateGroceryList(
  dishes: Dish[],
  mealPlan: MealPlan,
  startDate: string,
  endDate: string,
  existingItems: GroceryItem[] = []
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
      sourceDishes: Set<string>;
    }
  >();

  const dates = Object.keys(mealPlan).filter((d) => d >= startDate && d <= endDate);

  dates.forEach((date) => {
    const dayPlan = mealPlan[date];
    if (!dayPlan) return;

    Object.keys(dayPlan).forEach((scheduleId) => {
      const entry = dayPlan[scheduleId];
      if (!entry || !entry.dishId) return;

      const dish = dishMap.get(entry.dishId);
      if (!dish) return;

      const multiplier = typeof entry.servingsMultiplier === 'number' && entry.servingsMultiplier > 0
        ? entry.servingsMultiplier
        : 1;

      dish.ingredients.forEach((ing) => {
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
          item.sourceDishes.add(dish.name);
        } else {
          aggregatedMap.set(key, {
            name: ing.name.trim(),
            amount: ingAmount !== null ? Math.round(ingAmount * 100) / 100 : null,
            unit: ing.unit ? ing.unit.trim() : '',
            category: ing.category || 'Other',
            sourceDishes: new Set([dish.name])
          });
        }
      });
    });
  });

  const checkedMap = new Map<string, boolean>();
  const manualItems: GroceryItem[] = [];

  existingItems.forEach((item) => {
    if (item.isManual) {
      manualItems.push(item);
    } else {
      const key = `${normalizeName(item.name)}|${(item.unit || '').trim().toLowerCase()}|${item.category}`;
      if (item.checked) {
        checkedMap.set(key, true);
      }
    }
  });

  const aggregatedList: GroceryItem[] = Array.from(aggregatedMap.entries()).map(([key, val], index) => ({
    id: `groc_gen_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    name: val.name,
    amount: val.amount,
    unit: val.unit,
    category: val.category,
    checked: checkedMap.get(key) || false,
    sourceDishes: Array.from(val.sourceDishes),
    isManual: false,
    dateRange: { start: startDate, end: endDate }
  }));

  return [...aggregatedList, ...manualItems];
}
