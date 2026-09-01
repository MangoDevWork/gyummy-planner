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
      const jsonFileKey = Object.keys(zip.files).find((k) => k.endsWith('.json') && !k.startsWith('__MACOSX'));
      if (!jsonFileKey) {
        return { success: false, message: 'Invalid Zip archive: No JSON data file found inside.' };
      }
      jsonString = await zip.file(jsonFileKey)!.async('string');
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const text = await file.text();
      const parsedDishes = parseCsvOrMarkdownRecipes(text);
      if (parsedDishes.length > 0) {
        return {
          success: true,
          type: 'dishes',
          data: parsedDishes,
          message: `Parsed ${parsedDishes.length} recipe(s) from CSV/Text table!`
        };
      }
      return { success: false, message: 'Could not detect recipe columns in CSV/Text file.' };
    } else if (file.name.endsWith('.json') || file.type.includes('json')) {
      jsonString = await file.text();
    } else {
      return { success: false, message: 'Unsupported format. Upload .zip, .json, or .csv file.' };
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
    const currentMaster = nextData.masterIngredients || [];
    const existingNames = new Set(currentMaster.map((i) => i.name.trim().toLowerCase()));

    ingsToMerge.forEach((ing) => {
      const normName = ing.name.trim().toLowerCase();
      if (!existingNames.has(normName)) {
        nextData.masterIngredients = [...(nextData.masterIngredients || []), ing];
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
/**
 * Format the grocery list as a clean, emoji-formatted message and copy to clipboard
 */
export async function copyGroceryListAsMessage(
  groceryItems: GroceryItem[],
  startDate?: string,
  endDate?: string,
  lang: 'en' | 'zh-CN' = 'en'
): Promise<{ success: boolean; text: string }> {
  const pendingItems = groceryItems.filter((i) => !i.checked);
  if (pendingItems.length === 0) {
    return {
      success: false,
      text: lang === 'zh-CN' ? '购物清单中暂无待买食材。' : 'No pending items on the grocery list to share.'
    };
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

  const categoryNamesZh: Record<string, string> = {
    'Produce': '蔬菜生鲜',
    'Meat & Seafood': '肉类水产',
    'Dairy & Eggs': '蛋奶乳品',
    'Pantry & Spices': '粮油调味',
    'Bakery': '烘焙面点',
    'Frozen': '冷冻食品',
    'Canned Goods': '罐头干货',
    'Other': '其他食材'
  };

  let dateHeader = '';
  if (startDate && endDate) {
    dateHeader = lang === 'zh-CN'
      ? `\n🗓️ 排餐周期：${startDate} 至 ${endDate}`
      : `\n🗓️ Planned for ${startDate} to ${endDate}`;
  }

  let message = lang === 'zh-CN'
    ? `🛒 *Gyummy 家庭采购清单*${dateHeader}\n`
    : `🛒 *Gyummy Grocery Checklist*${dateHeader}\n`;

  Array.from(categorized.entries()).forEach(([cat, items]) => {
    const emoji = categoryEmojis[cat] || '🛒';
    const catLabel = lang === 'zh-CN' ? (categoryNamesZh[cat] || cat) : cat;
    message += `\n${emoji} *${catLabel}*\n`;
    items.forEach((item) => {
      const amountStr = item.amount !== null && item.amount !== undefined ? ` (${item.amount} ${item.unit || ''})`.trim() : (item.unit ? ` (${item.unit})` : '');
      const isCheckedOrPantry = item.checked || item.inPantry;
      const box = isCheckedOrPantry ? '[x]' : '[ ]';
      const pantryTag = item.inPantry ? (lang === 'zh-CN' ? ' (🏠 家中已有)' : ' (🏠 In Pantry)') : '';
      const subNote = item.pantrySubstituteNote ? ` [${item.pantrySubstituteNote}]` : '';
      message += `  ${box} ${item.name}${amountStr}${pantryTag}${subNote}\n`;
    });
  });

  message += lang === 'zh-CN' ? `\n✨ 由 Gyummy 智能家庭食谱计划 生成` : `\n✨ Sent via Gyummy Planner`;

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
    return { success: false, text: lang === 'zh-CN' ? '无法访问系统剪贴板' : 'Could not access clipboard' };
  }
}

/**
 * Format the weekly meal plan as an emoji-formatted message and copy to clipboard
 */
export async function copyMealPlanAsMessage(
  mealPlan: MealPlan,
  dishes: Dish[],
  days: Array<{ dateStr: string; dayName: string; isToday: boolean }>,
  weekRangeLabel: string,
  lang: 'en' | 'zh-CN' = 'en'
): Promise<{ success: boolean; text: string }> {
  const dishMap = new Map<string, Dish>();
  dishes.forEach((d) => dishMap.set(d.id, d));

  let hasAnyMeals = false;
  let message = lang === 'zh-CN'
    ? `📅 *Gyummy 本周餐饮计划* (${weekRangeLabel})\n`
    : `📅 *Gyummy Meal Plan* (${weekRangeLabel})\n`;

  days.forEach((day) => {
    const dayPlan = mealPlan[day.dateStr] || {};
    const slots = Object.entries(dayPlan).filter(([, entry]) =>
      Boolean(entry && ((entry.dishIds && entry.dishIds.length > 0) || entry.dishId || entry.customText))
    );
    
    if (slots.length > 0) {
      hasAnyMeals = true;
      const todayBadge = day.isToday ? (lang === 'zh-CN' ? ' (今天)' : ' (Today)') : '';
      message += `\n🗓️ *${day.dayName}, ${day.dateStr}*${todayBadge}\n`;
      slots.forEach(([slotId, entry]) => {
        if (!entry) return;
        const entryDishIds = entry.dishIds && entry.dishIds.length > 0
          ? entry.dishIds
          : (entry.dishId ? [entry.dishId] : []);
        const entryDishes = entryDishIds.map((id) => dishMap.get(id)).filter(Boolean) as Dish[];
        
        let dishTitles = entryDishes.map((d) => `${d.imageEmoji || '🍲'} ${d.name}`).join(' + ');
        if (entry.customText) {
          dishTitles = dishTitles ? `${dishTitles} (📝 ${entry.customText})` : `📝 ${entry.customText}`;
        }
        if (!dishTitles) dishTitles = lang === 'zh-CN' ? '已排餐' : 'Planned Meal';

        const slotLabel = slotId.charAt(0).toUpperCase() + slotId.slice(1);
        message += `  • ${slotLabel}: ${dishTitles}\n`;
      });
    }
  });

  if (!hasAnyMeals) {
    return {
      success: false,
      text: lang === 'zh-CN' ? '本周暂无已安排的餐食。' : 'No meals scheduled for this week to share.'
    };
  }

  message += lang === 'zh-CN' ? `\n✨ 由 Gyummy 智能家庭食谱计划 生成` : `\n✨ Sent via Gyummy Planner`;

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
    return { success: false, text: lang === 'zh-CN' ? '无法访问系统剪贴板' : 'Could not access clipboard' };
  }
}


/**
 * Compact CSV & Markdown Table Parser for fast multi-recipe ingestion
 * Format: Name | Cuisine | Category | PrepTime | Ingredients (comma-separated) | Instructions
 */
export function parseCsvOrMarkdownRecipes(text: string): Dish[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const dishes: Dish[] = [];

  for (const line of lines) {
    // Ignore header rows or markdown separator rows like |---|---|
    if (line.startsWith('#') || line.includes('---') || line.toLowerCase().includes('recipe name')) continue;

    // Support comma or pipe separated
    const delimiter = line.includes('|') ? '|' : ',';
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 3) continue;

    const name = cols[0];
    if (!name || name.length < 2) continue;

    const cuisine = cols[1] || 'Asian';
    const category = cols[2] || 'Dinner';
    const prepTime = parseInt(cols[3], 10) || 20;
    const rawIngredients = cols[4] || '';
    const instructions = cols[5] || 'Follow standard home cooking steps.';

    // Parse ingredients separated by semicolon or comma (if pipe delimited)
    const ingParts = rawIngredients.split(/[;,]/).map((i) => i.trim()).filter(Boolean);
    const parsedIngs = ingParts.map((raw, idx) => {
      const match = raw.match(/^([\d\.\/]+)?\s*([a-zA-Z]+)?\s*(.*)$/);
      return {
        id: `ing_csv_${Date.now()}_${idx}`,
        name: match && match[3] ? match[3].trim() : raw,
        amount: match && match[1] ? parseFloat(match[1]) || 1 : 1,
        unit: match && match[2] ? match[2].toLowerCase() : 'pcs',
        category: 'Produce' as any
      };
    });

    dishes.push({
      id: `dish_csv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      cuisine,
      category,
      servings: 4,
      prepTimeMinutes: prepTime,
      instructions,
      imageEmoji: '🍲',
      tags: [cuisine, category].filter(Boolean),
      favoritedByMembers: [],
      isFamilyRecipe: false, // Goes into System Library so user can select
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ingredients: parsedIngs.length > 0 ? parsedIngs : [
        { id: `ing_${Date.now()}_1`, name: 'Main Ingredient', amount: 400, unit: 'g', category: 'Meat & Seafood' }
      ]
    });
  }

  return dishes;
}

