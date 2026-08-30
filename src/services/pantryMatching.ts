/**
 * High-Precision Smart Pantry Grouping & Substitution Matching Engine
 * Accurately groups culinary staples (Oils, Salts, Soy Sauces, Rices, Peppers, Sugars, Starches, Vinegars, etc.)
 * with word-boundary and negative keyword protection to eliminate false positives.
 */

export interface PantryMatchResult {
  inPantry: boolean;
  isExactMatch: boolean;
  matchedPantryItem?: string;
  substituteNote?: string;
}

interface EquivalenceGroup {
  groupName: string;
  keywords: string[];
  negatives: string[];
}

const PANTRY_EQUIVALENCE_GROUPS: EquivalenceGroup[] = [
  {
    groupName: 'Cooking Oil',
    keywords: [
      'oil',
      'cooking oil',
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
    ],
    negatives: [
      'oyster sauce',
      'chili oil',
      'truffle oil',
      'oil paper',
      'foil',
      'fish oil',
      'essential oil'
    ]
  },
  {
    groupName: 'Salt',
    keywords: [
      'salt',
      'sea salt',
      'fine salt',
      'table salt',
      'kosher salt',
      'coarse salt',
      'iodized salt',
      'flaky salt',
      'himalayan salt',
      'cooking salt',
      'rock salt'
    ],
    negatives: [
      'salted',
      'saltwater',
      'salted butter',
      'salted egg',
      'salted fish'
    ]
  },
  {
    groupName: 'Black Pepper',
    keywords: [
      'black pepper',
      'ground black pepper',
      'black peppercorn',
      'black peppercorns',
      'cracked black pepper',
      'coarse black pepper',
      'freshly ground black pepper',
      'pepper powder',
      'black pepper powder',
      'white pepper',
      'white pepper powder'
    ],
    negatives: [
      'bell pepper',
      'chili pepper',
      'cayenne pepper',
      'red pepper',
      'green pepper',
      'yellow pepper',
      'capsicum',
      'pepperoni',
      'jalapeno',
      'habanero',
      'poblano',
      'shishito'
    ]
  },
  {
    groupName: 'Soy Sauce',
    keywords: [
      'soy sauce',
      'light soy sauce',
      'dark soy sauce',
      'low sodium soy sauce',
      'all purpose soy sauce',
      'tamari',
      'regular soy sauce',
      'shoyu',
      'japanese soy sauce',
      'seasoning soy sauce'
    ],
    negatives: [
      'soy milk',
      'soybean',
      'soybeans',
      'soy paper'
    ]
  },
  {
    groupName: 'Rice',
    keywords: [
      'rice',
      'jasmine rice',
      'white rice',
      'cooked rice',
      'steamed rice',
      'long grain rice',
      'short grain rice',
      'medium grain rice',
      'calrose rice',
      'sushi rice',
      'basmati rice',
      'brown rice',
      'glutinous rice'
    ],
    negatives: [
      'rice vinegar',
      'rice wine',
      'rice paper',
      'rice noodle',
      'rice noodles',
      'rice flour',
      'rice cake',
      'rice cakes',
      'mirin',
      'licorice'
    ]
  },
  {
    groupName: 'Sugar',
    keywords: [
      'sugar',
      'white sugar',
      'granulated sugar',
      'caster sugar',
      'raw sugar',
      'cane sugar',
      'brown sugar',
      'powdered sugar',
      'icing sugar'
    ],
    negatives: [
      'sugar snap pea',
      'sugar snap peas',
      'snap peas',
      'brown sugar boba'
    ]
  },
  {
    groupName: 'Garlic',
    keywords: [
      'garlic',
      'garlic clove',
      'garlic cloves',
      'minced garlic',
      'crushed garlic',
      'garlic powder'
    ],
    negatives: [
      'garlic bread',
      'garlic chive',
      'garlic chives',
      'garlic shoot',
      'garlic shoots'
    ]
  },
  {
    groupName: 'Ginger',
    keywords: [
      'ginger',
      'ginger root',
      'fresh ginger',
      'minced ginger',
      'grated ginger',
      'ginger powder'
    ],
    negatives: [
      'ginger ale',
      'ginger beer',
      'gingerbread',
      'pickled ginger'
    ]
  },
  {
    groupName: 'Starch & Flour',
    keywords: [
      'cornstarch',
      'corn starch',
      'corn flour',
      'tapioca starch',
      'potato starch',
      'all purpose flour',
      'all-purpose flour',
      'plain flour',
      'wheat flour'
    ],
    negatives: [
      'flour tortilla',
      'rice flour',
      'almond flour',
      'coconut flour'
    ]
  },
  {
    groupName: 'Vinegar',
    keywords: [
      'vinegar',
      'rice vinegar',
      'white vinegar',
      'apple cider vinegar',
      'black vinegar',
      'chinkiang vinegar',
      'distilled vinegar',
      'red wine vinegar',
      'white wine vinegar'
    ],
    negatives: [
      'balsamic vinegar glaze'
    ]
  },
  {
    groupName: 'Butter',
    keywords: [
      'butter',
      'unsalted butter',
      'salted butter',
      'ghee',
      'clarified butter'
    ],
    negatives: [
      'peanut butter',
      'almond butter',
      'butter lettuce',
      'butternut',
      'butternut squash'
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

function containsWordOrPhrase(text: string, phrase: string): boolean {
  const normText = normalize(text);
  const normPhrase = normalize(phrase);
  if (normText === normPhrase) return true;

  const wordsText = normText.split(' ');
  const wordsPhrase = normPhrase.split(' ');

  if (wordsPhrase.length === 1) {
    return wordsText.includes(wordsPhrase[0]);
  }
  return normText.includes(normPhrase);
}

/**
 * Match a recipe ingredient against user's pantry ingredients
 */
export function matchPantryIngredient(
  ingredientName: string,
  pantryIngredients: string[]
): PantryMatchResult {
  if (!ingredientName || !pantryIngredients || pantryIngredients.length === 0) {
    return { inPantry: false, isExactMatch: false };
  }

  const normIng = normalize(ingredientName);

  // 1. Direct exact match check
  for (const pantryItem of pantryIngredients) {
    const normPantry = normalize(pantryItem);
    if (normIng === normPantry) {
      return {
        inPantry: true,
        isExactMatch: true,
        matchedPantryItem: pantryItem
      };
    }
  }

  // 2. Smart Group & Substitution Match
  for (const group of PANTRY_EQUIVALENCE_GROUPS) {
    // Check if ingredient has a negative keyword for this group
    const isIngNegative = group.negatives.some((neg) => containsWordOrPhrase(normIng, neg));
    if (isIngNegative) continue;

    // Check if ingredient matches any positive keyword of this group
    const ingMatchesGroup = group.keywords.some((kw) => containsWordOrPhrase(normIng, kw));
    if (!ingMatchesGroup) continue;

    // Check if user has an ingredient in this group
    const matchedPantry = pantryIngredients.find((pantryItem) => {
      const normPantry = normalize(pantryItem);
      const isPantryNegative = group.negatives.some((neg) => containsWordOrPhrase(normPantry, neg));
      if (isPantryNegative) return false;
      return group.keywords.some((kw) => containsWordOrPhrase(normPantry, kw));
    });

    if (matchedPantry) {
      const isExact = normIng === normalize(matchedPantry);
      return {
        inPantry: true,
        isExactMatch: isExact,
        matchedPantryItem: matchedPantry,
        substituteNote: isExact ? undefined : `Covered by ${matchedPantry} at home`
      };
    }
  }

  return { inPantry: false, isExactMatch: false };
}
