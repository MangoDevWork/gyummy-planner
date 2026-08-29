import JSZip from 'jszip';
import type { AppData, Dish, GroceryItem, MasterIngredient, MealPlan } from '../types';

function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}`;
}

function sanitizeName(name: string): string {
  return (name || 'Family').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Generate a .zip file containing the JSON payload and trigger download
 */
export async function exportToZip(
  familyName: string,
  contentType: 'Ingredients' | 'Dishes' | 'SingleDish' | 'MealPlan' | 'GroceryList' | 'FullBackup',
  dataPayload: Record<string, any>,
  extraFileNameLabel?: string
): Promise<string> {
  const zip = new JSZip();
  const timestamp = formatTimestamp();
  const safeFamily = sanitizeName(familyName);
  const typeLabel = extraFileNameLabel ? `${contentType}_${sanitizeName(extraFileNameLabel)}` : contentType;
  
  const jsonFileName = `gyummy_${typeLabel.toLowerCase()}_data.json`;
  const zipFileName = `Gyummy_${safeFamily}_${typeLabel}_${timestamp}.zip`;

  const jsonContent = JSON.stringify(
    {
      ...dataPayload,
      exportedAt: new Date().toISOString(),
      family: familyName,
      app: 'Gyummy Planner',
      version: 2
    },
    null,
    2
  );

  zip.file(jsonFileName, jsonContent);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', zipFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return zipFileName;
}

/**
 * Parse an uploaded file (.zip or fallback .json)
 */
export async function parseUploadedDataFile(file: File): Promise<{
  success: boolean;
  type?: 'dishes' | 'ingredients' | 'mealPlan' | 'groceryList' | 'full';
  data?: any;
  message: string;
}> {
  try {
    let jsonString = '';

    if (file.name.endsWith('.zip') || file.type.includes('zip')) {
      const zip = await JSZip.loadAsync(file);
      // Find the first .json file in the zip
      const jsonFileKey = Object.keys(zip.files).find((k) => k.endsWith('.json') && !k.startsWith('__MACOSX'));
      if (!jsonFileKey) {
        return { success: false, message: 'Invalid Zip archive: No JSON data file found inside.' };
      }
      jsonString = await zip.file(jsonFileKey)!.async('string');
    } else if (file.name.endsWith('.json') || file.type.includes('json')) {
      jsonString = await file.text();
    } else {
      return { success: false, message: 'Unsupported file format. Please upload a .zip or .json file.' };
    }

    const payload = JSON.parse(jsonString);
    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'File does not contain valid Gyummy Planner data.' };
    }

    // Detect content type
    if (Array.isArray(payload.dishes) && !payload.mealPlan && !payload.masterIngredients) {
      return {
        success: true,
        type: 'dishes',
        data: payload.dishes,
        message: `Found ${payload.dishes.length} recipe(s) to import.`
      };
    }

    if (Array.isArray(payload.masterIngredients) && !payload.dishes) {
      return {
        success: true,
        type: 'ingredients',
        data: payload.masterIngredients,
        message: `Found ${payload.masterIngredients.length} ingredient(s) to import.`
      };
    }

    if (payload.mealPlan && !payload.dishes) {
      const dayCount = Object.keys(payload.mealPlan).length;
      return {
        success: true,
        type: 'mealPlan',
        data: payload.mealPlan,
        message: `Found meal plan with ${dayCount} scheduled day(s).`
      };
    }

    if (payload.groceryList && Array.isArray(payload.groceryList.items)) {
      return {
        success: true,
        type: 'groceryList',
        data: payload.groceryList,
        message: `Found grocery list with ${payload.groceryList.items.length} item(s).`
      };
    }

    if (payload.dishes && (payload.mealPlan || payload.masterIngredients || payload.settings)) {
      return {
        success: true,
        type: 'full',
        data: payload,
        message: `Full backup found: ${payload.dishes?.length || 0} recipes and settings.`
      };
    }

    return { success: false, message: 'Unrecognized Gyummy data structure.' };
  } catch (err: any) {
    return { success: false, message: `Failed to read file: ${err.message || 'Corrupted file'}` };
  }
}

/**
 * Non-destructive merge logic
 * Merges imported items without overwriting existing data and skips duplicates
 */
export function mergeImportedData(
  currentData: AppData,
  importType: 'dishes' | 'ingredients' | 'mealPlan' | 'groceryList' | 'full',
  importedPayload: any
): {
  updatedData: AppData;
  summary: string;
} {
  const nextData: AppData = { ...currentData };
  let summary = '';

  if (importType === 'dishes' || (importType === 'full' && Array.isArray(importedPayload.dishes))) {
    const dishesToMerge: Dish[] = importType === 'dishes' ? importedPayload : importedPayload.dishes;
    let addedCount = 0;
    const existingNames = new Set(nextData.dishes.map((d) => d.name.trim().toLowerCase()));
    const existingIds = new Set(nextData.dishes.map((d) => d.id));

    dishesToMerge.forEach((dish) => {
      const normName = dish.name.trim().toLowerCase();
      if (!existingNames.has(normName) && !existingIds.has(dish.id)) {
        nextData.dishes = [...nextData.dishes, dish];
        existingNames.add(normName);
        existingIds.add(dish.id);
        addedCount++;
      }
    });
    summary += `Added ${addedCount} new dish(es). `;
  }

  if (importType === 'ingredients' || (importType === 'full' && Array.isArray(importedPayload.masterIngredients))) {
    const ingsToMerge: MasterIngredient[] = importType === 'ingredients' ? importedPayload : importedPayload.masterIngredients;
    let addedCount = 0;
    const existingNames = new Set(nextData.masterIngredients.map((i) => i.name.trim().toLowerCase()));

    ingsToMerge.forEach((ing) => {
      const normName = ing.name.trim().toLowerCase();
      if (!existingNames.has(normName)) {
        nextData.masterIngredients = [...nextData.masterIngredients, ing];
        existingNames.add(normName);
        addedCount++;
      }
    });
    summary += `Added ${addedCount} new master ingredient(s). `;
  }

  if (importType === 'mealPlan' || (importType === 'full' && importedPayload.mealPlan)) {
    const planToMerge: MealPlan = importType === 'mealPlan' ? importedPayload : importedPayload.mealPlan;
    let mergedDays = 0;
    const updatedPlan: MealPlan = { ...nextData.mealPlan };

    Object.keys(planToMerge).forEach((date) => {
      const existingDay = updatedPlan[date] ? { ...updatedPlan[date] } : {};
      const incomingDay = planToMerge[date] || {};

      let hasChanges = false;
      Object.keys(incomingDay).forEach((slotId) => {
        // Non-destructive: only fill slot if not already scheduled
        if (!existingDay[slotId] || !existingDay[slotId]?.dishId) {
          existingDay[slotId] = incomingDay[slotId];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        updatedPlan[date] = existingDay;
        mergedDays++;
      }
    });
    nextData.mealPlan = updatedPlan;
    summary += `Merged meals across ${mergedDays} day(s). `;
  }

  if (importType === 'groceryList' || (importType === 'full' && importedPayload.groceryList)) {
    const listToMerge = importType === 'groceryList' ? importedPayload : importedPayload.groceryList;
    const incomingItems: GroceryItem[] = listToMerge.items || [];
    let addedCount = 0;

    const existingKeys = new Set(
      nextData.groceryList.items.map((i) => `${i.name.trim().toLowerCase()}|${(i.unit || '').trim().toLowerCase()}`)
    );

    const mergedItems = [...nextData.groceryList.items];

    incomingItems.forEach((item) => {
      const key = `${item.name.trim().toLowerCase()}|${(item.unit || '').trim().toLowerCase()}`;
      if (!existingKeys.has(key)) {
        mergedItems.push(item);
        existingKeys.add(key);
        addedCount++;
      }
    });

    nextData.groceryList = {
      ...nextData.groceryList,
      items: mergedItems
    };
    summary += `Added ${addedCount} new grocery item(s). `;
  }

  return {
    updatedData: nextData,
    summary: summary || 'Data imported successfully (no new items needed to merge).'
  };
}

/**
 * Format the grocery list as a clean, emoji-formatted message and copy to clipboard
 */
export async function copyGroceryListAsMessage(
  groceryItems: GroceryItem[],
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; text: string }> {
  const pendingItems = groceryItems.filter((i) => !i.checked);
  if (pendingItems.length === 0) {
    return { success: false, text: 'No pending items on the grocery list to share.' };
  }

  // Group by category
  const categorized = new Map<string, GroceryItem[]>();
  pendingItems.forEach((item) => {
    const cat = item.category || 'Other';
    if (!categorized.has(cat)) {
      categorized.set(cat, []);
    }
    categorized.get(cat)!.push(item);
  });

  const categoryEmojis: Record<string, string> = {
    'Produce': '🥦',
    'Meat & Seafood': '🥩',
    'Dairy & Eggs': '🧀',
    'Pantry & Spices': '🥫',
    'Bakery': '🍞',
    'Frozen': '❄️',
    'Canned Goods': '🥫',
    'Other': '🛒'
  };

  let dateHeader = '';
  if (startDate && endDate) {
    dateHeader = `\n🗓️ Planned for ${startDate} to ${endDate}`;
  }

  let message = `🛒 *Gyummy Grocery Checklist*${dateHeader}\n`;

  Array.from(categorized.entries()).forEach(([cat, items]) => {
    const emoji = categoryEmojis[cat] || '🛒';
    message += `\n${emoji} *${cat}*\n`;
    items.forEach((item) => {
      const amountStr = item.amount !== null && item.amount !== undefined ? ` (${item.amount} ${item.unit || ''})`.trim() : (item.unit ? ` (${item.unit})` : '');
      message += `  [ ] ${item.name}${amountStr}\n`;
    });
  });

  message += `\n✨ Sent via Gyummy Planner`;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(message);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = message;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    return { success: true, text: message };
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return { success: false, text: 'Could not access clipboard' };
  }
}
