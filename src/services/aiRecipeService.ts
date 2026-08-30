import type { AiDiscoveredRecipe, AiPromptUsageTracker, Dish } from '../types';

const MAX_PROMPTS_PER_DAY = 5;

/**
 * Check if the user has remaining AI prompt quota for today
 */
export function checkAiPromptQuota(currentUsage?: AiPromptUsageTracker): {
  allowed: boolean;
  remaining: number;
  message?: string;
} {
  const today = new Date().toISOString().split('T')[0];
  const usageCount = currentUsage && currentUsage.date === today ? currentUsage.promptsUsed : 0;
  const remaining = Math.max(0, MAX_PROMPTS_PER_DAY - usageCount);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `Daily AI limit reached (5/5 used for today). Your quota refreshes tomorrow!`
    };
  }

  return {
    allowed: true,
    remaining
  };
}

/**
 * Increment the AI prompt usage counter for today
 */
export function incrementAiPromptUsage(currentUsage?: AiPromptUsageTracker): AiPromptUsageTracker {
  const today = new Date().toISOString().split('T')[0];
  const currentCount = currentUsage && currentUsage.date === today ? currentUsage.promptsUsed : 0;
  return {
    date: today,
    promptsUsed: currentCount + 1
  };
}

/**
 * Convert an approved AI Discovered Recipe into a permanent Dish
 */
export function convertAiRecipeToDish(aiRecipe: AiDiscoveredRecipe, addedToFamily = true): Dish {
  return {
    id: `dish_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: aiRecipe.name,
    category: aiRecipe.category || 'Dinner',
    cuisine: aiRecipe.cuisine || 'Fusion',
    servings: aiRecipe.servings || 4,
    prepTimeMinutes: aiRecipe.prepTimeMinutes || 20,
    instructions: aiRecipe.instructions,
    tags: [...aiRecipe.tags, 'AI Discovered'],
    favoritedByMembers: [],
    isFamilyRecipe: addedToFamily,
    ingredients: aiRecipe.ingredients,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Expected JSON Schema structure when calling Gemini API for Recipe Generation
 */
export const GEMINI_RECIPE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the home-cooked dish' },
          cuisine: { type: 'string', description: 'Cuisine (e.g. Japanese, Cantonese, Italian)' },
          category: { type: 'string', enum: ['Dinner', 'Lunch', 'Breakfast', 'Snack', 'Dessert'] },
          servings: { type: 'number', default: 4 },
          prepTimeMinutes: { type: 'number', description: 'Total cooking time in minutes (10-35 mins)' },
          instructions: { type: 'string', description: 'Numbered step-by-step cooking instructions' },
          tags: { type: 'array', items: { type: 'string' } },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                amount: { type: 'number' },
                unit: { type: 'string', enum: ['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'pcs', 'slices', 'can', 'packet', 'stalks', 'cloves', 'cup', 'pinch'] },
                category: { type: 'string', enum: ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Spices', 'Bakery', 'Frozen', 'Canned Goods', 'Other'] }
              },
              required: ['name', 'amount', 'unit', 'category']
            }
          }
        },
        required: ['name', 'cuisine', 'category', 'servings', 'prepTimeMinutes', 'instructions', 'ingredients']
      }
    }
  }
};
