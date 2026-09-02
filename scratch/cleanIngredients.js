const fs = require('fs');
const path = require('path');

// Load raw data
const masterSeedPath = path.resolve('src/services/masterIngredientsSeed.json');
const systemRecipesPath = path.resolve('master_system_recipes.json');
const distSystemRecipesPath = path.resolve('dist/master_system_recipes.json');

const masterSeed = JSON.parse(fs.readFileSync(masterSeedPath, 'utf8'));
const systemData = JSON.parse(fs.readFileSync(systemRecipesPath, 'utf8'));
const recipes = Array.isArray(systemData) ? systemData : systemData.dishes;

console.log(`Initial Master Ingredients: ${masterSeed.length}`);
console.log(`Initial Master Recipes: ${recipes.length}`);

// Prefix fix dictionary for scraped words missing the first character
const FIRST_CHAR_FIXES = {
  'arge ': 'Large ',
  'arlic ': 'Garlic ',
  'utter ': 'Butter ',
  'lour ': 'Flour ',
  'nion ': 'Onion ',
  'inger ': 'Ginger ',
  'hicken ': 'Chicken ',
  'omato ': 'Tomato ',
  'otato ': 'Potato ',
  'epper ': 'Pepper ',
  'arrot ': 'Carrot ',
  'ugar ': 'Sugar ',
  'alt ': 'Salt ',
  'eef ': 'Beef ',
  'ork ': 'Pork ',
  'ream ': 'Cream ',
  'ilk ': 'Milk ',
  'heese ': 'Cheese ',
  'read ': 'Bread ',
  'pple ': 'Apple ',
  'emon ': 'Lemon ',
  'ime ': 'Lime ',
  'gg ': 'Egg ',
  'ggs ': 'Eggs ',
  'il ': 'Oil ',
  'ice ': 'Rice '
};

// Canonical replacements / standardizations
const CANONICAL_MAP = [
  // Alliums & aromatics
  { test: /^(garlic|garlic clove|garlic cloves|fresh garlic|minced garlic|crushed garlic|clove garlic|cloves garlic|大蒜|蒜瓣|蒜头|蒜末)$/i, canonical: 'Garlic (大蒜)', category: 'Produce' },
  { test: /^(ginger|ginger root|fresh ginger|minced ginger|grated ginger|ginger slices|生姜|老姜|姜片|姜末)$/i, canonical: 'Ginger (生姜)', category: 'Produce' },
  { test: /^(green onion|green onions|scallion|scallions|spring onion|spring onions|葱|小葱|香葱|青葱|大葱)$/i, canonical: 'Green Onion / Scallion (小葱)', category: 'Produce' },
  { test: /^(yellow onion|brown onion|onion|onions|diced onion|chopped onion|洋葱|黄洋葱)$/i, canonical: 'Yellow Onion (洋葱)', category: 'Produce' },
  { test: /^(red onion|red onions|purple onion|红洋葱|紫洋葱)$/i, canonical: 'Red Onion (红洋葱)', category: 'Produce' },
  { test: /^(shallot|shallots|french shallot|asian shallot|红葱头|小红葱)$/i, canonical: 'Shallot (红葱头)', category: 'Produce' },

  // Pantry & Condiments
  { test: /^(soy sauce|light soy sauce|regular soy sauce|all-purpose soy sauce|生抽|生抽酱油|酱油)$/i, canonical: 'Soy Sauce (生抽)', category: 'Pantry & Spices' },
  { test: /^(dark soy sauce|老抽|老抽酱油)$/i, canonical: 'Dark Soy Sauce (老抽)', category: 'Pantry & Spices' },
  { test: /^(oyster sauce|蚝油|蠔油)$/i, canonical: 'Oyster Sauce (蚝油)', category: 'Pantry & Spices' },
  { test: /^(sesame oil|toasted sesame oil|pure sesame oil|芝麻油|香油|麻油|芝麻香油)$/i, canonical: 'Sesame Oil (芝麻香油)', category: 'Pantry & Spices' },
  { test: /^(cooking oil|vegetable oil|canola oil|neutral oil|食用油|植物油|色拉油)$/i, canonical: 'Cooking Oil (食用油)', category: 'Pantry & Spices' },
  { test: /^(olive oil|extra virgin olive oil|evoo|橄榄油|特级初榨橄榄油)$/i, canonical: 'Olive Oil (橄榄油)', category: 'Pantry & Spices' },
  { test: /^(chinese cooking wine|shaoxing wine|shaohsing wine|shaoxing rice wine|料酒|绍兴料酒|花雕酒)$/i, canonical: 'Shaoxing Cooking Wine (绍兴料酒)', category: 'Pantry & Spices' },
  { test: /^(mirin|japanese mirin|味醂|味淋)$/i, canonical: 'Mirin (味醂)', category: 'Pantry & Spices' },
  { test: /^(sake|japanese sake|cooking sake|日本料酒|清酒)$/i, canonical: 'Japanese Sake / Cooking Wine (清酒)', category: 'Pantry & Spices' },
  { test: /^(fish sauce|vietnamese fish sauce|thai fish sauce|鱼露|魚露)$/i, canonical: 'Fish Sauce (鱼露)', category: 'Pantry & Spices' },
  { test: /^(salt|sea salt|kosher salt|table salt|fine salt|食盐|盐|精盐)$/i, canonical: 'Salt (食盐)', category: 'Pantry & Spices' },
  { test: /^(sugar|granulated sugar|white sugar|white granulated sugar|caster sugar|白糖|细砂糖|白砂糖)$/i, canonical: 'White Sugar (白糖)', category: 'Pantry & Spices' },
  { test: /^(brown sugar|light brown sugar|dark brown sugar|红糖|黄糖|黑糖)$/i, canonical: 'Brown Sugar (红糖)', category: 'Pantry & Spices' },
  { test: /^(black pepper|ground black pepper|black peppercorn|cracked black pepper|黑胡椒|黑胡椒粉|黑胡椒碎)$/i, canonical: 'Black Pepper (黑胡椒)', category: 'Pantry & Spices' },
  { test: /^(white pepper|ground white pepper|white pepper powder|白胡椒|白胡椒粉)$/i, canonical: 'White Pepper (白胡椒)', category: 'Pantry & Spices' },
  { test: /^(cornstarch|corn flour|corn starch|potato starch|生粉|玉米淀粉|淀粉|太白粉)$/i, canonical: 'Cornstarch (玉米淀粉/生粉)', category: 'Pantry & Spices' },
  { test: /^(honey|pure honey|raw honey|蜂蜜)$/i, canonical: 'Honey (蜂蜜)', category: 'Pantry & Spices' },
  { test: /^(chicken bouillon|chicken powder|chicken broth powder|chicken stock powder|鸡精|鸡粉|鸡汤块)$/i, canonical: 'Chicken Bouillon / Powder (鸡精)', category: 'Pantry & Spices' },
  { test: /^(chicken broth|chicken stock|chicken broth stock|鸡汤|清鸡汤|高汤)$/i, canonical: 'Chicken Broth / Stock (鸡汤)', category: 'Pantry & Spices' },
  { test: /^(beef broth|beef stock|牛肉汤|牛高汤)$/i, canonical: 'Beef Broth / Stock (牛肉高汤)', category: 'Pantry & Spices' },
  { test: /^(rice vinegar|white rice vinegar|chinkiang vinegar|chinese black vinegar|米醋|白醋|陈醋|镇江香醋)$/i, canonical: 'Rice Vinegar / Black Vinegar (香醋/米醋)', category: 'Pantry & Spices' },
  { test: /^(butter|unsalted butter|salted butter|无盐黄油|黄油|牛油)$/i, canonical: 'Butter (黄油)', category: 'Dairy & Eggs' },
  { test: /^(egg|eggs|large egg|large eggs|whole egg|鸡蛋|蛋)$/i, canonical: 'Egg (鸡蛋)', category: 'Dairy & Eggs' },
  { test: /^(whole milk|milk|fresh milk|full cream milk|牛奶|全脂牛奶)$/i, canonical: 'Whole Milk (牛奶)', category: 'Dairy & Eggs' },
  { test: /^(heavy cream|whipping cream|thickened cream|double cream|淡奶油|重奶油|鲜奶油)$/i, canonical: 'Heavy Cream (淡奶油)', category: 'Dairy & Eggs' },

  // Proteins: Poultry, Meat, Seafood
  { test: /^(chicken breast|chicken breasts|boneless skinless chicken breast|boneless chicken breast|鸡胸肉|鸡胸)$/i, canonical: 'Chicken Breast (鸡胸肉)', category: 'Meat & Seafood' },
  { test: /^(chicken thigh|chicken thighs|boneless skinless chicken thigh|chicken thigh fillets|鸡腿肉|去骨鸡腿肉|鸡扒)$/i, canonical: 'Chicken Thigh (鸡腿肉)', category: 'Meat & Seafood' },
  { test: /^(chicken drumsticks|chicken wings|chicken drumstick|chicken wing|鸡翅|鸡中翅|鸡腿)$/i, canonical: 'Chicken Wings / Drumsticks (鸡翅/鸡腿)', category: 'Meat & Seafood' },
  { test: /^(ground beef|minced beef|lean ground beef|beef mince|牛肉末|牛绞肉|碎牛肉)$/i, canonical: 'Ground Beef (牛肉末)', category: 'Meat & Seafood' },
  { test: /^(ground pork|minced pork|pork mince|猪肉末|猪绞肉|肉末)$/i, canonical: 'Ground Pork (猪肉末)', category: 'Meat & Seafood' },
  { test: /^(beef steak|beef sirloin|beef ribeye|beef tenderloin|beef slices|flank steak|牛排|牛肉片|牛里脊)$/i, canonical: 'Beef Steak / Slices (牛肉/牛排)', category: 'Meat & Seafood' },
  { test: /^(pork belly|pork belly slices|pork belly strips|五花肉|五花肉片|五花腩)$/i, canonical: 'Pork Belly (五花肉)', category: 'Meat & Seafood' },
  { test: /^(pork chops|pork loin|pork shoulder|pork tenderloin|猪排|猪里脊|梅花肉)$/i, canonical: 'Pork Chops / Loin (猪里脊/猪排)', category: 'Meat & Seafood' },
  { test: /^(shrimp|prawns|shrimps|raw shrimp|peeled shrimp|prawn|鲜虾|大虾|虾仁|大明虾)$/i, canonical: 'Shrimp / Prawns (鲜虾/虾仁)', category: 'Meat & Seafood' },
  { test: /^(salmon|salmon fillet|salmon fillets|fresh salmon|三文鱼|鲑鱼)$/i, canonical: 'Salmon Fillet (三文鱼柳)', category: 'Meat & Seafood' },
  { test: /^(white fish|white fish fillet|cod fillet|basa fillet|tilapia fillet|鱼片|龙利鱼片|鳕鱼柳)$/i, canonical: 'White Fish Fillet (鱼片/鳕鱼柳)', category: 'Meat & Seafood' },
  { test: /^(firm tofu|soft tofu|silken tofu|tofu|tofu block|豆腐|嫩豆腐|老豆腐|板豆腐)$/i, canonical: 'Tofu (豆腐)', category: 'Produce' },

  // Veggies & Produce
  { test: /^(roma tomato|tomato|tomatoes|cherry tomatoes|fresh tomatoes|番茄|西红柿|小番茄)$/i, canonical: 'Tomato (番茄/西红柿)', category: 'Produce' },
  { test: /^(broccoli|broccoli florets|fresh broccoli|西兰花|青花菜)$/i, canonical: 'Broccoli (西兰花)', category: 'Produce' },
  { test: /^(bok choy|baby bok choy|pak choi|buk choi|上海青|小白菜|青江菜)$/i, canonical: 'Bok Choy (青江菜/小白菜)', category: 'Produce' },
  { test: /^(carrot|carrots|diced carrot|grated carrot|胡萝卜|红萝卜)$/i, canonical: 'Carrot (胡萝卜)', category: 'Produce' },
  { test: /^(potato|potatoes|russet potato|yukon gold potato|土豆|马铃薯)$/i, canonical: 'Potato (土豆)', category: 'Produce' },
  { test: /^(cucumber|english cucumber|persian cucumber|黄瓜|青瓜)$/i, canonical: 'Cucumber (黄瓜)', category: 'Produce' },
  { test: /^(cabbage|green cabbage|savoy cabbage|napa cabbage|wombok|包菜|圆白菜|卷心菜|大白菜)$/i, canonical: 'Cabbage / Napa Cabbage (大白菜/包菜)', category: 'Produce' },
  { test: /^(spinach|baby spinach|fresh spinach|菠菜|嫩菠菜)$/i, canonical: 'Spinach (菠菜)', category: 'Produce' },
  { test: /^(shiitake mushroom|shiitake mushrooms|dried shiitake mushrooms|香菇|鲜香菇|冬菇|干香菇)$/i, canonical: 'Shiitake Mushrooms (香菇)', category: 'Produce' },
  { test: /^(button mushrooms|white mushrooms|cremini mushrooms|口蘑|洋菇|草菇)$/i, canonical: 'Mushroom (口蘑/蘑菇)', category: 'Produce' },
  { test: /^(enoki mushroom|enoki mushrooms|金针菇)$/i, canonical: 'Enoki Mushrooms (金针菇)', category: 'Produce' },
  { test: /^(avocado|fresh avocado|ripe avocado|牛油果|酪梨)$/i, canonical: 'Avocado (牛油果)', category: 'Produce' },
  { test: /^(lemon|fresh lemon|lemon juice|柠檬|柠檬汁)$/i, canonical: 'Lemon (柠檬)', category: 'Produce' },
  { test: /^(lime|fresh lime|lime juice|青柠|青柠檬)$/i, canonical: 'Lime (青柠)', category: 'Produce' },
  { test: /^(cilantro|fresh cilantro|coriander|fresh coriander|香菜|芫荽)$/i, canonical: 'Cilantro / Coriander (香菜)', category: 'Produce' },

  // Grains & Bakery
  { test: /^(jasmine rice|white rice|long grain rice|short grain rice|sushi rice|大米|白米|茉莉香米)$/i, canonical: 'Jasmine Rice / White Rice (大米)', category: 'Pantry & Spices' },
  { test: /^(all-purpose flour|plain flour|wheat flour|flour|中筋面粉|面粉|小麦粉)$/i, canonical: 'All-Purpose Flour (中筋面粉)', category: 'Bakery' },
  { test: /^(pasta|spaghetti|fettuccine|penne|linguine|意大利面|意面)$/i, canonical: 'Pasta / Spaghetti (意大利面)', category: 'Pantry & Spices' },
  { test: /^(noodles|ramen noodles|udon noodles|egg noodles|面条|拉面|乌冬面|鸡蛋面)$/i, canonical: 'Noodles (面条/拉面/乌冬面)', category: 'Pantry & Spices' }
];

function cleanSingleIngredientName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let s = rawName.trim();

  // Strip leading prefixes like [調味料], [Sauce], (Marinade), [Garnish]
  s = s.replace(/^\[[^\]]+\]\s*/g, '');
  s = s.replace(/^\([^\)]+\)\s*/g, '');

  // Fix missing first letter from scraping typos (e.g. 'arge ' -> 'Large ')
  for (const [bad, good] of Object.entries(FIRST_CHAR_FIXES)) {
    if (s.toLowerCase().startsWith(bad)) {
      s = good + s.slice(bad.length);
      break;
    }
  }

  // Remove measurement quantities at end like ' 1個', ' 2大匙', ' 1.5小匙', ' 5根', ' 4片', ' 150cc', ' 100g', ' 2 tbsp', ' 300g'
  s = s.replace(/\s*[\d\.\/一两三四五六七八九十半]+\s*(个|個|根|瓣|片|大匙|小匙|茶匙|汤匙|湯匙|克|g|kg|ml|cc|l|tbsp|tsp|cup|cups|pcs|slices|stalks|cloves|can|packet|pinch|oz|lb|cm|mm|inch)\s*$/i, '');
  s = s.replace(/\s*[\d\.\/]+\s*(g|kg|ml|l|tbsp|tsp|cup|cups|pcs|oz|lb|cm|mm)\s*$/i, '');

  // Remove prep instructions e.g. ', minced', ', chopped', ', diced', ', sliced', ', finely chopped', ', grated', ', drained'
  s = s.replace(/,\s*(minced|chopped|diced|sliced|finely chopped|grated|peeled|drained|rinsed|shredded|crushed|to taste|optional|divided|at room temperature|melted|softened|beaten|for serving|to garnish).*$/i, '');
  s = s.replace(/\s*\(\s*(minced|chopped|diced|sliced|finely chopped|grated|peeled|drained|rinsed|shredded|crushed|to taste|optional|divided|at room temperature|melted|softened|beaten|for serving|to garnish)\s*\)/i, '');

  // Remove parenthetical measurement notes e.g. '(about 5oz - 150g each)', '(, skinless and boneless (about 5oz - 150g each))'
  s = s.replace(/\(\s*,\s*/g, '(');
  s = s.replace(/\(\s*about\s+[\w\d\.\s\-\/]+\)/gi, '');
  s = s.replace(/\(\s*[\d\.\/]+\s*(g|kg|ml|oz|lb|cup|tbsp|tsp|cm|inch)\s*[\-\/]?\s*[\d\.\/]*\s*(g|kg|ml|oz|lb|cup|tbsp|tsp|cm|inch)?\s*\)/gi, '');

  // Remove empty or double parens
  s = s.replace(/\(\s*\)/g, '').trim();
  s = s.replace(/\[\s*\]/g, '').trim();
  s = s.replace(/\(\(/g, '(').replace(/\)\)/g, ')');

  // Strip leading/trailing punctuation
  s = s.replace(/^[\s,\-\.\/:]+|[\s,\-\.\/:]+$/g, '').trim();

  // Match canonical dictionary
  const trimmedLower = s.toLowerCase();
  for (const item of CANONICAL_MAP) {
    if (item.test.test(trimmedLower) || item.test.test(s)) {
      return { name: item.canonical, category: item.category };
    }
  }

  // Proper Title Case formatting
  s = s.replace(/\w\S*/g, (txt) => {
    // Preserve parentheses and chinese characters
    if (/[\u4e00-\u9fa5]/.test(txt)) return txt;
    if (txt.startsWith('(')) return '(' + txt.charAt(1).toUpperCase() + txt.substr(2).toLowerCase();
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });

  return { name: s, category: null };
}

// 1. Process and clean all 3,066 recipes
console.log('Cleaning all system recipe ingredient names...');
let recipeIngCleanCount = 0;
const ingredientFrequency = new Map();

recipes.forEach((dish) => {
  if (Array.isArray(dish.ingredients)) {
    dish.ingredients.forEach((ing) => {
      const origName = ing.name;
      const res = cleanSingleIngredientName(origName);
      if (res.name && res.name.length >= 2) {
        ing.name = res.name;
        if (res.category) ing.category = res.category;
        recipeIngCleanCount++;

        // Track frequency
        const key = ing.name.trim();
        const current = ingredientFrequency.get(key) || { count: 0, category: ing.category || 'Produce' };
        current.count++;
        ingredientFrequency.set(key, current);
      }
    });
  }
});

console.log(`Cleaned ${recipeIngCleanCount} ingredient references across recipes.`);

// 2. Build clean, consolidated Master Ingredients Seed Database
console.log('Building clean consolidated master ingredient list...');
const cleanMasterMap = new Map();

// First add all canonical dictionary entries
CANONICAL_MAP.forEach((c, idx) => {
  cleanMasterMap.set(c.canonical.toLowerCase(), {
    id: `master_canonical_${idx}`,
    name: c.canonical,
    defaultValue: 100,
    defaultUnit: 'g',
    category: c.category
  });
});

// Add all ingredients found in recipes
recipes.forEach((dish) => {
  dish.ingredients.forEach((ing) => {
    const key = ing.name.trim().toLowerCase();
    if (!cleanMasterMap.has(key) && ing.name.length >= 2) {
      cleanMasterMap.set(key, {
        id: `master_ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name: ing.name.trim(),
        defaultValue: typeof ing.amount === 'number' ? ing.amount : 100,
        defaultUnit: ing.unit || 'g',
        category: ing.category || 'Produce'
      });
    }
  });
});

// Also clean existing masterSeed ingredients and add unique valid ones
masterSeed.forEach((rawItem) => {
  const res = cleanSingleIngredientName(rawItem.name);
  const cleanName = res.name;
  const key = cleanName.toLowerCase();
  if (cleanName && cleanName.length >= 2 && !cleanMasterMap.has(key)) {
    // Avoid non-sensical single word fragments
    if (!/^(approx|approx\.|cm|long|each|slices|stalks|pieces|for|and|or|with|of)$/i.test(cleanName)) {
      cleanMasterMap.set(key, {
        id: rawItem.id || `master_ing_${Math.random().toString(36).slice(2, 8)}`,
        name: cleanName,
        defaultValue: rawItem.defaultValue || 100,
        defaultUnit: rawItem.defaultUnit || 'g',
        category: res.category || rawItem.category || 'Produce'
      });
    }
  }
});

const consolidatedMasterIngredients = Array.from(cleanMasterMap.values())
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(`Consolidated Master Ingredients: ${consolidatedMasterIngredients.length} clean items.`);

// Write back to files
fs.writeFileSync(masterSeedPath, JSON.stringify(consolidatedMasterIngredients, null, 2), 'utf8');
console.log(`Saved clean masterIngredientsSeed.json -> ${masterSeedPath}`);

const finalSystemPayload = {
  app: 'Gyummy Planner',
  version: '2.0.0',
  exportedAt: new Date().toISOString(),
  description: 'Master Curated & Cleaned Recipe Library (3,000+ Recipes)',
  dishes: recipes
};

fs.writeFileSync(systemRecipesPath, JSON.stringify(finalSystemPayload, null, 2), 'utf8');
console.log(`Saved cleaned master_system_recipes.json -> ${systemRecipesPath}`);

if (fs.existsSync(path.dirname(distSystemRecipesPath))) {
  fs.writeFileSync(distSystemRecipesPath, JSON.stringify(finalSystemPayload), 'utf8');
  console.log(`Saved cleaned dist/master_system_recipes.json -> ${distSystemRecipesPath}`);
}

console.log('Ingredient consolidation and cleanup completed successfully! ✅');
