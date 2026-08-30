/**
 * Smart Pantry Grouping & Substitution Engine for Gyummy Planner
 * Groups equivalent cooking staples (e.g. Cooking Oil <-> Olive Oil, Sea Salt <-> Salt, Jasmine Rice <-> White Rice)
 * and provides clear user notification when an equivalent pantry staple is used for auto mark-off.
 */

export interface PantryMatchResult {
  inPantry: boolean;
  isExactMatch: boolean;
  matchedPantryItem?: string;
  substituteNote?: string;
}

// Equivalence groups for common household staples
const PANTRY_EQUIVALENCE_GROUPS: Array<{
  groupName: string;
  aliases: string[];
}> = [
  {
    groupName: 'Cooking Oil',
    aliases: [
      'cooking oil',
      'oil',
      'vegetable oil',
      'canola oil',
      'olive oil',
      'extra virgin olive oil',
      'peanut oil',
      'sunflower oil',
      'corn oil',
      'avocado oil',
      'salad oil',
      'grapeseed oil',
      'sesame oil',
      'toasted sesame oil'
    ]
  },
  {
    groupName: 'Salt',
    aliases: [
      'sea salt',
      'salt',
      'fine salt',
      'table salt',
      'kosher salt',
      'coarse salt',
      'iodized salt',
      'flaky salt',
      'himalayan salt',
      'cooking salt'
    ]
  },
  {
    groupName: 'Black Pepper',
    aliases: [
      'black pepper',
      'ground black pepper',
      'black peppercorn',
      'cracked black pepper',
      'coarse black pepper',
      'freshly ground black pepper',
      'pepper'
    ]
  },
  {
    groupName: 'Soy Sauce',
    aliases: [
      'soy sauce',
      'light soy sauce',
      'dark soy sauce',
      'low sodium soy sauce',
      'all purpose soy sauce',
      'tamari',
      'regular soy sauce',
      'shoyu',
      'japanese soy sauce'
    ]
  },
  {
    groupName: 'Rice',
    aliases: [
      'jasmine rice',
      'rice',
      'white rice',
      'white rice (cooked)',
      'cooked rice',
      'steamed rice',
      'long grain rice',
      'short grain rice',
      'medium grain rice',
      'calrose rice',
      'sushi rice',
      'basmati rice'
    ]
  },
  {
    groupName: 'Sugar',
    aliases: [
      'sugar',
      'white sugar',
      'granulated sugar',
      'caster sugar',
      'raw sugar',
      'cane sugar',
      'brown sugar',
      'powdered sugar'
    ]
  },
  {
    groupName: 'Starch / Flour',
    aliases: [
      'cornstarch',
      'corn starch',
      'corn flour',
      'tapioca starch',
      'potato starch',
      'all purpose flour',
      'all-purpose flour',
      'plain flour',
      'flour'
    ]
  },
  {
    groupName: 'Vinegar',
    aliases: [
      'rice vinegar',
      'white vinegar',
      'apple cider vinegar',
      'black vinegar',
      'chinkiang vinegar',
      'distilled vinegar'
    ]
  },
  {
    groupName: 'Garlic',
    aliases: [
      'garlic clove',
      'garlic cloves',
      'garlic',
      'minced garlic',
      'crushed garlic',
      'garlic powder'
    ]
  },
  {
    groupName: 'Ginger',
    aliases: [
      'ginger root',
      'ginger',
      'fresh ginger',
      'minced ginger',
      'grated ginger',
      'ginger powder'
    ]
  },
  {
    groupName: 'Onion',
    aliases: [
      'yellow onion',
      'brown onion',
      'white onion',
      'onion',
      'onions',
      'shallot',
      'shallots'
    ]
  },
  {
    groupName: 'Butter',
    aliases: [
      'butter',
      'unsalted butter',
      'salted butter',
      'ghee'
    ]
  }
];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a recipe ingredient is in the user's pantry,
 * either by exact match or by smart substitute/group match.
 */
export function matchPantryIngredient(
  ingredientName: string,
  pantryIngredients: string[]
): PantryMatchResult {
  if (!ingredientName || !pantryIngredients || pantryIngredients.length === 0) {
    return { inPantry: false, isExactMatch: false };
  }

  const normIng = normalize(ingredientName);

  // 1. Direct exact or substring match check
  for (const pantryItem of pantryIngredients) {
    const normPantry = normalize(pantryItem);
    if (normIng === normPantry || normIng.includes(normPantry) || normPantry.includes(normIng)) {
      return {
        inPantry: true,
        isExactMatch: true,
        matchedPantryItem: pantryItem
      };
    }
  }

  // 2. Smart Group & Substitute Match Check
  for (const group of PANTRY_EQUIVALENCE_GROUPS) {
    const isIngInGroup = group.aliases.some((alias) => {
      const normAlias = normalize(alias);
      return normIng === normAlias || normIng.includes(normAlias) || normAlias.includes(normIng);
    });

    if (isIngInGroup) {
      // Find if user has any ingredient in this group in their pantry
      const matchedPantry = pantryIngredients.find((pantryItem) => {
        const normPantry = normalize(pantryItem);
        return group.aliases.some((alias) => {
          const normAlias = normalize(alias);
          return normPantry === normAlias || normPantry.includes(normAlias) || normAlias.includes(normIng);
        });
      });

      if (matchedPantry) {
        return {
          inPantry: true,
          isExactMatch: false,
          matchedPantryItem: matchedPantry,
          substituteNote: `Covered by ${matchedPantry} at home`
        };
      }
    }
  }

  return { inPantry: false, isExactMatch: false };
}
