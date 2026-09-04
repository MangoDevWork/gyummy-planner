import type { Ingredient, MasterIngredient } from '../types';

export interface CleanedIngredientResult {
  name: string;
  amount: number | null;
  unit: string;
  prep?: string;
}

const CHINESE_UNIT_MAP: Record<string, string> = {
  '大匙': 'tbsp',
  '汤匙': 'tbsp',
  '小匙': 'tsp',
  '茶匙': 'tsp',
  '匙': 'tbsp',
  '克': 'g',
  '公克': 'g',
  'g': 'g',
  '千克': 'kg',
  '公斤': 'kg',
  'kg': 'kg',
  '毫升': 'ml',
  'ml': 'ml',
  '升': 'l',
  'l': 'l',
  '瓣': 'clove',
  '片': 'slice',
  '碗': 'cup',
  '包': 'pack',
  '盒': 'box',
  '根': 'pcs',
  '支': 'pcs',
  '條': 'pcs',
  '条': 'pcs',
  '顆': 'pcs',
  '粒': 'pcs',
  '个': 'pcs',
  '個': 'pcs'
};

/**
 * Strips prefix markers like 'B - ', 'B ', 'B. ', 'Part B - ', extracts embedded quantities/units,
 * handles trailing Chinese measurements, and cleans trailing prep notes.
 */
export function cleanIngredientName(
  rawName: string,
  existingAmount?: number | null,
  existingUnit?: string | null
): CleanedIngredientResult {
  if (!rawName || typeof rawName !== 'string') {
    return { name: '', amount: existingAmount ?? null, unit: existingUnit || 'pcs' };
  }

  let name = rawName.trim();
  let amount = existingAmount !== undefined ? existingAmount : null;
  let unit = existingUnit || 'pcs';
  let prep: string | undefined = undefined;

  // 1. Remove bracketed section tags like '[豬二層肉醃料]', '[醬汁]', '[醃料]'
  name = name.replace(/^\[[^\]]+\]\s*/, '');

  // 2. Remove leading artifacts like 'X ', '1x ', '2x '
  name = name.replace(/^(?:\d+\s*[xX]\b|[xX]\s+)/, '');

  // 3. Remove section prefixes like 'B - ', 'B- ', 'B. ', 'Part B - ', 'Group 1: ', 'A - '
  name = name.replace(/^(?:part|group|section)\s+[a-z0-9]+\s*[-–—.:]\s*/i, '');
  name = name.replace(/^[A-Ea-e]\s*[-–—.:]\s+/i, '');
  name = name.replace(/^[A-Ea-e]\s*[-–—]\s*/i, '');
  // Also single letter followed by space and capitalized word like 'B Beef Roast', 'B Beef Tendon'
  name = name.replace(/^[B-Eb-e]\s+(?=[A-Z])/i, '');

  // 4. Check for dual measure at start: e.g. '10oz - 300g sirloin'
  const dualMatch = name.match(
    /^(\d+(?:\.\d+)?)\s*(?:oz|g|kg|lb|lbs?)\s*[-–—/]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|tbsp|tsp|cups?|pieces?|pcs?|cloves?|slices?|stalks?|cans?|lbs?|pound|oz)\b\s*/i
  );
  if (dualMatch) {
    if (amount === null || amount === 1) {
      amount = parseFloat(dualMatch[2]);
      unit = dualMatch[3].toLowerCase();
      if (unit === 'pound') unit = 'lb';
    }
    name = name.substring(dualMatch[0].length).trim();
  } else {
    // 5. Single measure at start: '1.5kg Chuck Steak', '500 G Ground Chicken', '4 Kg Pound'
    const singleMatch = name.match(
      /^(\d+(?:\.\d+)?(?:\s*[-–—/]\s*\d+(?:\.\d+)?)?)\s*(kg|g|ml|l|tbsp|tsp|cups?|pieces?|pcs?|cloves?|slices?|stalks?|cans?|lbs?|pound|oz)\b(?:\s*\b(?:pound|g|kg|oz)\b)?\s*(?:of\s+)?/i
    );
    if (singleMatch) {
      const rawQty = singleMatch[1];
      let num = parseFloat(rawQty);
      if (rawQty.includes('-') || rawQty.includes('–')) {
        const parts = rawQty.split(/[-–—]/).map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
        if (parts.length > 0) num = parts[0];
      }
      if (!isNaN(num) && (amount === null || amount === 1)) {
        amount = num;
        let matchedUnit = singleMatch[2].toLowerCase();
        if (matchedUnit === 'pound') matchedUnit = 'lb';
        unit = matchedUnit;
      }
      name = name.substring(singleMatch[0].length).trim();
    }
  }

  // 6. Check for trailing Chinese quantity & unit e.g. ' 1.5小匙', ' 290克', ' 20根', ' 1包', ' 1 - 3小匙'
  const trailingZhMatch = name.match(
    /\s+(\d+(?:\.\d+)?(?:\s*[-–—/]\s*\d+(?:\.\d+)?)?)\s*(大匙|小匙|匙|汤匙|茶匙|克|千克|公斤|毫升|升|根|支|條|条|顆|粒|个|個|瓣|包|盒|片|碗|公克|g|kg|ml|l)\s*$/i
  );
  if (trailingZhMatch) {
    const rawQty = trailingZhMatch[1];
    let num = parseFloat(rawQty);
    if (rawQty.includes('-') || rawQty.includes('–')) {
      const parts = rawQty.split(/[-–—]/).map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
      if (parts.length > 0) num = parts[0];
    }
    if (!isNaN(num) && (amount === null || amount === 1)) {
      amount = num;
    }
    const zhUnit = trailingZhMatch[2];
    if (CHINESE_UNIT_MAP[zhUnit] && (!unit || unit === 'pcs')) {
      unit = CHINESE_UNIT_MAP[zhUnit];
    }
    name = name.substring(0, trailingZhMatch.index).trim();
  }

  // 7. Remove parentheticals and prep instructions:
  // e.g. '((Note 1), peeled...)', '(the best you can afford)'
  while (/\([^)]*\)/.test(name)) {
    name = name.replace(/\s*\([^)]*\)/g, '');
  }
  name = name.replace(/[()]/g, '');

  // Extract and strip trailing prep instructions
  const prepMatch = name.match(/,\s*(thinly\s*sliced|peeled|diced|chopped|minced|sliced|cut\s*into\s*[^,]+|skinless\s*and\s*boneless|bone\s*in\s*and\s*skin\s*on)[^,]*$/i);
  if (prepMatch) {
    prep = prepMatch[1].trim();
    name = name.substring(0, prepMatch.index).trim();
  }

  name = name.replace(/,\s*(?:excess\s*liquid[^,]*|drained[^,]*|or\s+other\s+[^,]+|or\s+turkey[^,]*|cut\s+into\s+[^,]+|thinly\s+sliced|diced|peeled|minced)[^,]*$/i, '');
  name = name.replace(/\s+or\s+(?:other|alternative)\s+.*$/i, '');
  name = name.replace(/^,\s*/, '');
  name = name.replace(/\s*,\s*$/, '');
  name = name.replace(/\s{2,}/g, ' ').trim();

  // Normalize casing for English names
  if (name.length > 0 && !/[\u4e00-\u9fa5]/.test(name)) {
    // Capitalize each major word
    name = name
      .split(' ')
      .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
  }

  return {
    name: name || rawName.trim(),
    amount,
    unit: unit || 'pcs',
    prep
  };
}

/**
 * Cleans a recipe Ingredient object
 */
export function sanitizeIngredient(ing: Ingredient): Ingredient {
  if (!ing || !ing.name) return ing;
  const cleaned = cleanIngredientName(ing.name, ing.amount, ing.unit);
  return {
    ...ing,
    name: cleaned.name,
    amount: cleaned.amount,
    unit: cleaned.unit
  };
}

/**
 * Cleans a MasterIngredient object and filters non-ingredients
 */
export function sanitizeMasterIngredient(item: MasterIngredient): MasterIngredient | null {
  if (!item || !item.name) return null;

  // Filter out cookware/equipment misclassified as ingredients
  const lower = item.name.toLowerCase();
  if (
    lower.includes('strainer') ||
    lower.includes('wok with a lid') ||
    lower.includes('heat-proof dish') ||
    lower.includes('pot with a lid') ||
    lower.includes('cheesecloth')
  ) {
    return null;
  }

  const cleaned = cleanIngredientName(item.name);
  return {
    ...item,
    name: cleaned.name
  };
}
