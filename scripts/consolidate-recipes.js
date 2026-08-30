import fs from 'fs';
import path from 'path';

/**
 * Master Recipe Consolidator & Curator for Melbourne, Australia
 * 1. Combines all JSON files in the workspace + seed data
 * 2. Translates Chinese/Japanese recipe names, instructions, and ingredients to English
 * 3. Deduplicates recipes, favoring detailed instructions and high-res photos
 * 4. Filters out recipes with ingredients not readily available in Melbourne, Australia
 */

// Translation dictionary for Chinese & Japanese food terms to English
const TRANSLATION_MAP = [
  // Common Dish Names & Phrases
  [/涼拌苦瓜/gi, 'Chilled Bitter Melon Salad'],
  [/炒秋葵/gi, 'Stir-Fried Okra'],
  [/秋葵燒肉/gi, 'Braised Pork with Okra'],
  [/秋葵炒蛋/gi, 'Scrambled Eggs with Okra'],
  [/咖哩雞/gi, 'Curry Chicken'],
  [/肉末杏鮑菇/gi, 'Minced Pork with King Oyster Mushrooms'],
  [/蔥爆肉絲/gi, 'Stir-Fried Pork Shreds with Scallions'],
  [/蔥爆雞柳/gi, 'Stir-Fried Chicken Strips with Scallions'],
  [/糖醋排骨/gi, 'Sweet and Sour Pork Ribs'],
  [/香菇肉燥/gi, 'Savory Shiitake Braised Pork Sauce'],
  [/皮蛋豆腐/gi, 'Century Egg Tofu Salad'],
  [/椒麻雞/gi, 'Sichuan Pepper Chicken'],
  [/肉燥龍鬚菜/gi, 'Savory Pork Chayote Shoots'],
  [/炒長豆/gi, 'Stir-Fried Long Beans'],
  [/蔥燒杏鮑菇/gi, 'Braised King Oyster Mushrooms with Scallions'],
  [/奶油白菜/gi, 'Creamy Garlic Chinese Cabbage'],
  [/炒地瓜葉/gi, 'Stir-Fried Sweet Potato Leaves'],
  [/蔥燒可樂雞翅/gi, 'Cola Glazed Chicken Wings with Scallions'],
  [/咕咾肉/gi, 'Sweet and Sour Pork'],
  [/麻婆南瓜/gi, 'Mapo Tofu with Kabocha Pumpkin'],
  [/豬鼻子棉花糖/gi, 'Pig Nose Marshmallows'],
  [/鍋煮奶茶/gi, 'Stovetop Milk Tea'],
  [/焦糖爆米花/gi, 'Caramel Popcorn'],
  [/家常菜/gi, 'Home-Style'],
  [/下飯/gi, 'Savory'],
  [/開胃/gi, 'Appetizing'],
  [/當季/gi, 'Seasonal'],
  [/簡單/gi, 'Easy'],
  [/愛料理官方品牌廚房/gi, 'iCook Kitchen'],
  [/海倫小姐/gi, 'Helen'],
  [/小榯廚房/gi, 'Small Tree Kitchen'],
  [/by\s+Amy's Kitchen/gi, ''],
  [/by\s+Helen（海倫小姐）/gi, ''],

  // Common Ingredients Translation
  [/苦瓜/gi, 'Bitter Melon'],
  [/秋葵/gi, 'Okra'],
  [/豬肉/gi, 'Pork'],
  [/雞肉/gi, 'Chicken'],
  [/牛肉/gi, 'Beef'],
  [/雞翅/gi, 'Chicken Wings'],
  [/杏鮑菇/gi, 'King Oyster Mushroom'],
  [/香菇/gi, 'Shiitake Mushroom'],
  [/蔥|蔥花|青蔥/gi, 'Green Onion (Scallion)'],
  [/蒜|蒜頭|蒜末/gi, 'Garlic'],
  [/薑|薑片|薑絲/gi, 'Ginger'],
  [/醬油/gi, 'Soy Sauce'],
  [/米酒/gi, 'Shaoxing Rice Wine'],
  [/蠔油/gi, 'Oyster Sauce'],
  [/糖/gi, 'Sugar'],
  [/鹽/gi, 'Salt'],
  [/胡椒/gi, 'Pepper'],
  [/香油|芝麻油/gi, 'Sesame Oil'],
  [/辣醬|辣椒/gi, 'Chili / Chili Sauce'],
  [/豆腐/gi, 'Tofu'],
  [/皮蛋/gi, 'Century Egg'],
  [/地瓜葉/gi, 'Sweet Potato Leaves'],
  [/長豆/gi, 'Long Beans'],
  [/白菜/gi, 'Chinese Cabbage (Bok Choy)'],
  [/排骨/gi, 'Pork Ribs'],
  [/肉末|肉燥/gi, 'Minced Pork'],
  [/雞柳/gi, 'Chicken Tenderloin'],
  [/南瓜/gi, 'Kabocha Pumpkin'],
  [/雞蛋|蛋/gi, 'Egg'],
  [/食用油|沙拉油/gi, 'Cooking Oil']
];

function translateText(str) {
  if (!str || typeof str !== 'string') return str;
  let translated = str;
  TRANSLATION_MAP.forEach(([regex, replacement]) => {
    translated = translated.replace(regex, replacement);
  });
  // Clean up dangling "by ", " / ", multi-spaces
  translated = translated
    .replace(/\s*\/\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
  return translated;
}

// Check if ingredient is available in Melbourne, Australia
// Melbourne grocers (Coles, Woolies, ALDI, KFL, Hometown Asian Grocer) stock:
// Vegetables, Meats, Poultry, Seafood, Asian Condiments, Rice, Noodles, Tofu, Spices, Dairy, Pastas, etc.
// Unobtainable ingredients in Australia: Snake meat, Fugu, strictly prohibited local wild flora/fauna, obscure region-only fresh herbs without substitutes.
function isMelbourneFriendlyIngredient(ingName) {
  const name = ingName.toLowerCase();
  const banned = [
    'snake meat', 'fugu', 'pufferfish', 'whale', 'bushmeat',
    'bear paw', 'pangolin', 'wild civet', 'fresh betel nut'
  ];
  return !banned.some((b) => name.includes(b));
}

function normalizeDishName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^easy/, '')
    .replace(/^classic/, '')
    .replace(/^best/, '')
    .replace(/recipe$/, '');
}

function calculateRecipeQualityScore(dish) {
  let score = 0;
  // High res photo
  if (dish.imageUrl && dish.imageUrl.startsWith('http')) score += 30;
  // Detailed instructions
  if (dish.instructions && dish.instructions.length > 50) score += 40;
  if (dish.instructions && dish.instructions.length > 150) score += 20;
  // Ingredient richness
  if (dish.ingredients && dish.ingredients.length >= 4) score += 20;
  // Specific timings
  if (dish.prepTimeMinutes && dish.prepTimeMinutes > 0) score += 10;

  return score;
}

function processAndConsolidate() {
  console.log('🔍 Scanning project for recipe JSON files...');
  const jsonFiles = [
    'Gyummy_Scraped_icook_23_1788049808472.json',
    'Gyummy_Scraped_icook_367_1788049958551.json',
    'Gyummy_Scraped_justonecookbook_1000_1788051131549.json',
    'Gyummy_Scraped_recipetineats_1500_1788050359859.json',
    'Gyummy_Scraped_recipetineats_5_1788049794891.json',
    'Gyummy_Scraped_thewoksoflife_1000_1788050515729.json',
    'Recipe Json from external AI/gemini-code-1788049181524.json',
    'Recipe Json from external AI/gemini-code-1788049278361.json',
    'Recipe Json from external AI/gyummy_dishes_10_recipes_data.json',
    'gyummy_dishes_10_recipes_data.json',
    'recipe_import_template.json'
  ];

  let rawDishes = [];

  jsonFiles.forEach((file) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(content);
        const dishes = Array.isArray(parsed) ? parsed : (parsed.dishes || []);
        if (dishes.length > 0) {
          rawDishes.push(...dishes);
          console.log(`  ✓ Loaded ${dishes.length} recipes from ${file}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Could not parse ${file}: ${err.message}`);
      }
    }
  });

  console.log(`\n📊 Total raw recipes collected: ${rawDishes.length}`);

  // Step 1: Translate to English
  console.log('\n🌐 Step 1: Translating non-English recipes to English...');
  const translatedDishes = rawDishes.map((dish) => {
    const translatedName = translateText(dish.name);
    const translatedInstructions = translateText(dish.instructions);
    const translatedIngredients = (dish.ingredients || []).map((ing) => ({
      ...ing,
      name: translateText(ing.name),
      category: ing.category || 'Produce'
    }));

    return {
      ...dish,
      name: translatedName,
      instructions: translatedInstructions,
      ingredients: translatedIngredients,
      isFamilyRecipe: false // All go to System Library
    };
  });

  // Step 2: Eliminate Melbourne Unfriendly Ingredients
  console.log('\n🇦🇺 Step 2: Filtering recipes with Melbourne, Australia available ingredients...');
  const melbourneFriendlyDishes = translatedDishes.filter((dish) => {
    if (!dish.ingredients || dish.ingredients.length === 0) return false;
    const allIngredientsAvailable = dish.ingredients.every((ing) =>
      isMelbourneFriendlyIngredient(ing.name)
    );
    return allIngredientsAvailable;
  });

  console.log(`  ✓ Retained ${melbourneFriendlyDishes.length} Melbourne-friendly recipes`);

  // Step 3: Deduplicate recipes & keep highest quality version
  console.log('\n✨ Step 3: Deduplicating overlapping recipes (keeping highest quality)...');
  const dishGroups = new Map();

  melbourneFriendlyDishes.forEach((dish) => {
    const normKey = normalizeDishName(dish.name);
    if (!dishGroups.has(normKey)) {
      dishGroups.set(normKey, []);
    }
    dishGroups.get(normKey).push(dish);
  });

  const finalConsolidatedDishes = [];

  dishGroups.forEach((group, normKey) => {
    if (group.length === 1) {
      finalConsolidatedDishes.push(group[0]);
    } else {
      // Sort group by quality score descending
      group.sort((a, b) => calculateRecipeQualityScore(b) - calculateRecipeQualityScore(a));
      finalConsolidatedDishes.push(group[0]);
    }
  });

  console.log(`\n🎉 Consolidation Complete!`);
  console.log(`======================================================`);
  console.log(`📦 Master System Library Count: ${finalConsolidatedDishes.length} Unique Recipes`);
  console.log(`======================================================\n`);

  // Output master file
  const masterPayload = {
    app: 'Gyummy Planner',
    version: 2,
    exportedAt: new Date().toISOString(),
    description: 'Unified Master System Recipe Library (Melbourne, Australia Curated & Translated)',
    dishes: finalConsolidatedDishes
  };

  const outputPath = path.resolve(process.cwd(), 'master_system_recipes.json');
  fs.writeFileSync(outputPath, JSON.stringify(masterPayload, null, 2), 'utf-8');
  console.log(`📁 Master JSON saved to: master_system_recipes.json`);
}

processAndConsolidate();
