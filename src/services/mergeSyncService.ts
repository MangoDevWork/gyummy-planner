import type { AppData, Dish, GroceryItem, MealPlan, MealScheduleConfig, FamilyPersonalisation } from '../types';
import { matchPantryIngredient } from './pantryMatching';

/**
 * Smart merging of two AppData objects (local state + remote cloud state).
 * General rule: MERGE, DO NOT OVERWRITE.
 */
export function mergeAppData(local: AppData, remote: Partial<AppData>): AppData {
  // 1. Merge Family Members (Union of sets)
  const membersSet = new Set<string>();
  (local.familyMembers || []).forEach((m) => m && membersSet.add(m.trim()));
  (remote.familyMembers || []).forEach((m) => m && membersSet.add(m.trim()));
  if (local.currentProfile?.memberName) membersSet.add(local.currentProfile.memberName.trim());
  const mergedFamilyMembers = Array.from(membersSet);

  // 2. Merge Dishes & Family Cookbook Records
  // Start with local dishes as base, then merge remote cloud dishes
  const dishMap = new Map<string, Dish>();
  (local.dishes || []).forEach((d) => dishMap.set(d.id, d));
  (remote.dishes || []).forEach((remoteDish) => {
    const existing = dishMap.get(remoteDish.id);
    if (!existing) {
      dishMap.set(remoteDish.id, remoteDish);
    } else {
      // Merge favorites from both sides
      const favSet = new Set<string>();
      (existing.favoritedByMembers || []).forEach((m) => favSet.add(m));
      (remoteDish.favoritedByMembers || []).forEach((m) => favSet.add(m));

      // Respect recent removal or addition based on updatedAt timestamp
      let isFamilyRecipe: boolean;
      if (existing.updatedAt && remoteDish.updatedAt) {
        const localTime = new Date(existing.updatedAt).getTime();
        const remoteTime = new Date(remoteDish.updatedAt).getTime();
        isFamilyRecipe = remoteTime > localTime
          ? Boolean(remoteDish.isFamilyRecipe)
          : Boolean(existing.isFamilyRecipe);
      } else if (remoteDish.isFamilyRecipe !== undefined) {
        isFamilyRecipe = Boolean(remoteDish.isFamilyRecipe);
      } else {
        isFamilyRecipe = Boolean(existing.isFamilyRecipe);
      }

      dishMap.set(remoteDish.id, {
        ...existing,
        ...remoteDish,
        isFamilyRecipe,
        favoritedByMembers: Array.from(favSet)
      });
    }
  });
  const mergedDishes = Array.from(dishMap.values());

  // 3. Merge Meal Plan (Date by Date, Slot by Slot)
  // Start with remote cloud meal plan as the shared family source of truth
  const mergedMealPlan: MealPlan = { ...(remote.mealPlan || {}) };
  if (local.mealPlan) {
    Object.entries(local.mealPlan).forEach(([date, dayPlan]) => {
      if (!mergedMealPlan[date]) {
        mergedMealPlan[date] = { ...dayPlan };
      } else {
        // Merge slot by slot for that specific date
        const currentMergedDay = { ...(mergedMealPlan[date] || {}) };
        Object.entries(dayPlan || {}).forEach(([scheduleId, slotEntry]) => {
          if (slotEntry && !currentMergedDay[scheduleId]) {
            currentMergedDay[scheduleId] = slotEntry;
          }
        });
        mergedMealPlan[date] = currentMergedDay;
      }
    });
  }

  // 4. Merge Meal Schedules
  // If remote has configured schedules, use remote schedules; otherwise union with local
  let mergedMealSchedules: MealScheduleConfig[] = [];
  if (remote.mealSchedules && remote.mealSchedules.length > 0) {
    mergedMealSchedules = remote.mealSchedules;
  } else if (local.mealSchedules && local.mealSchedules.length > 0) {
    mergedMealSchedules = local.mealSchedules;
  }

  // 5. Merge In My Pantry (Ingredient Names declared in stock)
  // Union of pantry ingredient names (case-insensitive)
  const pantrySet = new Set<string>();
  (remote.pantryIngredients || []).forEach((p) => {
    if (typeof p === 'string' && p.trim()) pantrySet.add(p.trim());
  });
  (local.pantryIngredients || []).forEach((p) => {
    if (typeof p === 'string' && p.trim()) pantrySet.add(p.trim());
  });
  const mergedPantryIngredients = Array.from(pantrySet);

  // Auto-populate any missing pantry ingredient items into local masterIngredients list
  const existingMasterNames = new Set(
    (local.masterIngredients || []).map((i) => i.name.toLowerCase().trim())
  );
  const updatedMasterIngredients = [...(local.masterIngredients || [])];
  mergedPantryIngredients.forEach((pantryItemName) => {
    const norm = pantryItemName.toLowerCase().trim();
    if (!existingMasterNames.has(norm)) {
      updatedMasterIngredients.push({
        id: `master_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: pantryItemName.trim(),
        defaultValue: 1,
        defaultUnit: 'pcs',
        category: 'Produce'
      });
      existingMasterNames.add(norm);
    }
  });

  // 6. Merge Latest Grocery List Data
  // Combine items by ingredient name / item id and re-evaluate inPantry against merged pantry list
  const remoteGrocery = remote.groceryList;
  const localGrocery = local.groceryList;

  const itemMap = new Map<string, GroceryItem>();
  (remoteGrocery?.items || []).forEach((item) => {
    const key = (item.id || item.name).toLowerCase().trim();
    itemMap.set(key, item);
  });

  (localGrocery?.items || []).forEach((localItem) => {
    const key = (localItem.id || localItem.name).toLowerCase().trim();
    const existing = itemMap.get(key);
    if (!existing) {
      itemMap.set(key, localItem);
    } else {
      // Merge checked state (if checked on either, prefer checked; or keep custom items)
      itemMap.set(key, {
        ...existing,
        ...localItem,
        checked: existing.checked || localItem.checked,
        amount: (localItem.amount !== null && localItem.amount !== undefined) ? localItem.amount : existing.amount,
        unit: localItem.unit || existing.unit
      });
    }
  });

  // Re-synchronize inPantry and substitution notes for all grocery items based on the latest merged pantry ingredients
  const synchronizedItems = Array.from(itemMap.values()).map((item) => {
    const match = matchPantryIngredient(item.name, mergedPantryIngredients);
    return {
      ...item,
      inPantry: match.inPantry,
      pantrySubstituteNote: match.substituteNote
    };
  });

  const mergedGroceryList = {
    startDate: localGrocery?.startDate || remoteGrocery?.startDate || '',
    endDate: localGrocery?.endDate || remoteGrocery?.endDate || '',
    items: synchronizedItems,
    undoStack: localGrocery?.undoStack || []
  };

  // 7. Settings
  const mergedSettings = {
    ...(remote.settings || {}),
    ...(local.settings || {})
  };

  // 8. Member Profiles & Personalisation
  const mergedMemberProfiles: Record<string, any> = {
    ...(remote.memberProfiles || {}),
    ...(local.memberProfiles || {})
  };

  Object.keys(remote.memberProfiles || {}).forEach((memberKey) => {
    if (local.memberProfiles && local.memberProfiles[memberKey]) {
      const localPrefs = local.memberProfiles[memberKey];
      const remotePrefs = remote.memberProfiles![memberKey];
      const allAllergies = Array.from(new Set([...(localPrefs.allergies || []), ...(remotePrefs.allergies || [])]));
      mergedMemberProfiles[memberKey] = {
        ...remotePrefs,
        ...localPrefs,
        allergies: allAllergies
      };
    }
  });

  const localFP = local.familyPersonalisation;
  const remoteFP = remote.familyPersonalisation;

  const mergedFamilyPersonalisation: FamilyPersonalisation = {
    strictAllergyFilter: localFP?.strictAllergyFilter ?? remoteFP?.strictAllergyFilter ?? true,
    householdAllergies: Array.from(new Set([
      ...(localFP?.householdAllergies || []),
      ...(remoteFP?.householdAllergies || [])
    ])),
    householdCuisines: Array.from(new Set([
      ...(localFP?.householdCuisines || []),
      ...(remoteFP?.householdCuisines || [])
    ])),
    householdCategories: Array.from(new Set([
      ...(localFP?.householdCategories || []),
      ...(remoteFP?.householdCategories || [])
    ])),
    spiceTolerance: (localFP?.spiceTolerance || remoteFP?.spiceTolerance || 'mild') as any,
    cookingForKids: Boolean(localFP?.cookingForKids ?? remoteFP?.cookingForKids ?? false),
    weeknightSpeed: (localFP?.weeknightSpeed || remoteFP?.weeknightSpeed || 'quick') as any,
    defaultStaple: (localFP?.defaultStaple || remoteFP?.defaultStaple || 'jasmine_rice') as any,
    defaultCookingDays: (localFP?.defaultCookingDays && localFP.defaultCookingDays.length > 0)
      ? localFP.defaultCookingDays
      : (remoteFP?.defaultCookingDays && remoteFP.defaultCookingDays.length > 0)
      ? remoteFP.defaultCookingDays
      : [1, 2, 3, 4, 5, 6, 0],
    defaultDietaryFocus: (localFP?.defaultDietaryFocus || remoteFP?.defaultDietaryFocus || 'balanced') as any,
    defaultPlanningStrategy: (localFP?.defaultPlanningStrategy || remoteFP?.defaultPlanningStrategy || 'best_of_both') as any,
  };

  return {
    ...local,
    familyMembers: mergedFamilyMembers,
    memberProfiles: mergedMemberProfiles,
    familyPersonalisation: mergedFamilyPersonalisation,
    dishes: mergedDishes,
    masterIngredients: updatedMasterIngredients,
    mealPlan: mergedMealPlan,
    mealSchedules: mergedMealSchedules.length > 0 ? mergedMealSchedules : local.mealSchedules,
    pantryIngredients: mergedPantryIngredients.length > 0 ? mergedPantryIngredients : local.pantryIngredients,
    groceryList: mergedGroceryList,
    settings: mergedSettings,
    lastSyncedAt: new Date().toISOString()
  };
}
