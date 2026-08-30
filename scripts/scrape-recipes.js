import fs from 'fs';
import path from 'path';

/**
 * Gyummy Planner Batch Recipe Scraper
 * Extracts Schema.org/Recipe JSON-LD from recipe websites and maps them directly to Gyummy Planner format.
 */

// Category mapping helper
function detectCategory(name, keywords = []) {
  const text = (name + ' ' + keywords.join(' ')).toLowerCase();
  if (text.includes('breakfast') || text.includes('pancake') || text.includes('egg') || text.includes('toast') || text.includes('oat')) return 'Breakfast';
  if (text.includes('lunch') || text.includes('sandwich') || text.includes('salad') || text.includes('wrap') || text.includes('noodle')) return 'Lunch';
  if (text.includes('dessert') || text.includes('cake') || text.includes('cookie') || text.includes('sweet') || text.includes('pie')) return 'Dessert';
  if (text.includes('snack') || text.includes('appetizer') || text.includes('dip')) return 'Snack';
  return 'Dinner';
}

function detectCuisine(name, textContent = '') {
  const combined = (name + ' ' + textContent).toLowerCase();
  if (combined.includes('japanese') || combined.includes('teriyaki') || combined.includes('miso') || combined.includes('sushi') || combined.includes('ramen')) return 'Japanese';
  if (combined.includes('korean') || combined.includes('kimchi') || combined.includes('bulgogi') || combined.includes('bibimbap')) return 'Korean';
  if (combined.includes('chinese') || combined.includes('cantonese') || combined.includes('szechuan') || combined.includes('dim sum') || combined.includes('dumpling') || combined.includes('fried rice') || combined.includes('wok')) return 'Cantonese';
  if (combined.includes('thai') || combined.includes('pad thai') || combined.includes('curry') || combined.includes('basil')) return 'Thai';
  if (combined.includes('vietnamese') || combined.includes('pho') || combined.includes('lemongrass') || combined.includes('banh mi')) return 'Vietnamese';
  if (combined.includes('italian') || combined.includes('pasta') || combined.includes('pizza') || combined.includes('risotto')) return 'Italian';
  if (combined.includes('mexican') || combined.includes('taco') || combined.includes('burrito') || combined.includes('salsa')) return 'Mexican';
  if (combined.includes('mediterranean') || combined.includes('greek') || combined.includes('hummus')) return 'Mediterranean';
  return 'Asian';
}

function detectIngredientCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('chicken') || n.includes('beef') || n.includes('pork') || n.includes('fish') || n.includes('salmon') || n.includes('shrimp') || n.includes('prawn') || n.includes('meat') || n.includes('fillet') || n.includes('steak')) return 'Meat & Seafood';
  if (n.includes('egg') || n.includes('milk') || n.includes('cheese') || n.includes('butter') || n.includes('cream') || n.includes('yogurt')) return 'Dairy & Eggs';
  if (n.includes('onion') || n.includes('garlic') || n.includes('tomato') || n.includes('ginger') || n.includes('scallion') || n.includes('pepper') || n.includes('spinach') || n.includes('carrot') || n.includes('potato') || n.includes('mushroom') || n.includes('herb') || n.includes('lemon') || n.includes('basil')) return 'Produce';
  if (n.includes('bread') || n.includes('toast') || n.includes('bun') || n.includes('bagel') || n.includes('pita') || n.includes('tortilla')) return 'Bakery';
  if (n.includes('frozen') || n.includes('peas') || n.includes('ice cream')) return 'Frozen';
  if (n.includes('canned') || n.includes('can of') || n.includes('beans')) return 'Canned Goods';
  return 'Pantry & Spices';
}

function parseDurationMinutes(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 20;
  // ISO 8601 duration: PT30M or PT1H15M
  const hoursMatch = durationStr.match(/(\d+)H/i);
  const minsMatch = durationStr.match(/(\d+)M/i);
  let total = 0;
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);
  return total > 0 ? total : 20;
}

function parseIngredientString(rawStr, idx) {
  const clean = rawStr.replace(/\s+/g, ' ').trim();
  // Regex to extract quantity, unit, name
  const match = clean.match(/^([\d\/\.\s\-¼½¾⅓⅔⅛⅜⅝⅞]+)?\s*(tbsp|tablespoon|tsp|teaspoon|cup|cups|g|kg|ml|l|liter|oz|ounce|lb|pound|clove|cloves|pinch|pinches|slice|slices|stalk|stalks|can|cans|packet|pkg|piece|pieces|pcs)?\s*(.*)$/i);
  
  let amount = null;
  let unit = 'pcs';
  let name = clean;

  if (match) {
    if (match[1]) {
      const numStr = match[1].trim();
      // Handle fractions like 1/2 or 1 1/2
      if (numStr.includes('/')) {
        const parts = numStr.split(' ');
        let sum = 0;
        parts.forEach((p) => {
          if (p.includes('/')) {
            const [num, den] = p.split('/');
            sum += parseFloat(num) / parseFloat(den);
          } else {
            sum += parseFloat(p) || 0;
          }
        });
        amount = Math.round(sum * 100) / 100;
      } else {
        amount = parseFloat(numStr) || null;
      }
    }
    if (match[2]) unit = match[2].toLowerCase().replace(/tablespoon[s]?/i, 'tbsp').replace(/teaspoon[s]?/i, 'tsp').replace(/cups?/i, 'cup').replace(/ounces?/i, 'oz').replace(/pounds?/i, 'lb');
    if (match[3] && match[3].trim()) name = match[3].trim();
  }

  return {
    id: `ing_scraped_${Date.now()}_${idx}`,
    name: name.replace(/^of\s+/i, '').trim(),
    amount: amount || 1,
    unit: unit || 'pcs',
    category: detectIngredientCategory(name)
  };
}

export async function scrapeRecipeUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();

    // Look for JSON-LD scripts
    const jsonLdMatches = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi);
    if (!jsonLdMatches) return null;

    for (const tag of jsonLdMatches) {
      const rawJson = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      try {
        let parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) parsed = parsed.find((p) => p['@type'] === 'Recipe' || p['@type']?.includes?.('Recipe'));
        if (parsed?.['@graph']) parsed = parsed['@graph'].find((p) => p['@type'] === 'Recipe' || p['@type']?.includes?.('Recipe'));

        if (parsed && (parsed['@type'] === 'Recipe' || parsed['@type']?.includes?.('Recipe'))) {
          const name = parsed.name || 'Untitled Dish';
          const instructions = Array.isArray(parsed.recipeInstructions)
            ? parsed.recipeInstructions.map((step, i) => `${i + 1}. ${typeof step === 'string' ? step : step.text || step.name}`).join('\n')
            : (typeof parsed.recipeInstructions === 'string' ? parsed.recipeInstructions : '');

          const rawIngredients = Array.isArray(parsed.recipeIngredient) ? parsed.recipeIngredient : [];
          const ingredients = rawIngredients.map((raw, i) => parseIngredientString(raw, i));

          const imageUrl = Array.isArray(parsed.image) ? parsed.image[0] : (typeof parsed.image === 'object' ? parsed.image.url : parsed.image);

          const prepTime = parseDurationMinutes(parsed.totalTime || parsed.cookTime || parsed.prepTime);

          const dish = {
            id: `dish_scraped_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: name.trim(),
            category: detectCategory(name, parsed.recipeCategory ? (Array.isArray(parsed.recipeCategory) ? parsed.recipeCategory : [parsed.recipeCategory]) : []),
            cuisine: parsed.recipeCuisine ? (Array.isArray(parsed.recipeCuisine) ? parsed.recipeCuisine[0] : parsed.recipeCuisine) : detectCuisine(name, instructions),
            servings: parseInt(parsed.recipeYield, 10) || 4,
            prepTimeMinutes: prepTime,
            instructions: instructions || 'Follow online recipe steps.',
            imageUrl: imageUrl || undefined,
            imageEmoji: '🍲',
            tags: [parsed.recipeCuisine || 'Homemade', 'Web Import'].filter(Boolean),
            favoritedByMembers: [],
            isFamilyRecipe: false, // Goes into System Library so you can pick
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ingredients
          };

          return dish;
        }
      } catch (e) {
        // continue
      }
    }
  } catch (err) {
    console.error(`Error scraping ${url}:`, err.message);
  }
  return null;
}

// CLI runner
async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.log('Usage: node scripts/scrape-recipes.js <URL>');
    console.log('Example: node scripts/scrape-recipes.js "https://www.justonecookbook.com/chicken-teriyaki/"');
    process.exit(0);
  }

  console.log(`🔍 Scraping recipe from: ${targetUrl}...`);
  const dish = await scrapeRecipeUrl(targetUrl);
  if (dish) {
    const payload = {
      app: 'Gyummy Planner',
      version: 2,
      exportedAt: new Date().toISOString(),
      dishes: [dish]
    };

    const outPath = path.resolve(process.cwd(), 'scraped_recipe.json');
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`✅ Success! Scraped "${dish.name}" with ${dish.ingredients.length} ingredients.`);
    console.log(`📁 Saved to: ${outPath}`);
    console.log(`👉 You can now import this file into Gyummy Planner!`);
  } else {
    console.log(`❌ Could not find Recipe metadata at ${targetUrl}`);
  }
}

main();
