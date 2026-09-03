const fs = require('fs');
const path = require('path');

// 1. Articles to DELETE (Pure kitchen techniques, not recipes)
const TUTORIAL_TITLES_TO_DELETE = [
  'How to Wash a Wok',
  'How to Season a Wok',
  'How to Measure Flour',
  'How to Cut an Avocado',
  'How to cut butternut pumpkin',
  'How to cut cauliflower florets - efficiently, with least mess!',
  'How to tenderise beef',
  'How to Tenderise Chicken for Stir Fries',
  'How to Steam Food: 3 Ways to Set Up a Steamer',
  'How to Grind Meat without a Grinder in Minutes',
  'How to Wrap Spring Rolls',
  'How to Fold a Chinese Dumpling: 4 Techniques',
  'How to Freeze Herbs & Aromatics',
  'How to Freeze Herbs &amp; Aromatics',
  'How to Dry Mushrooms',
  'How to Use Cornstarch in Chinese Cooking',
  'How to Cut Whole Pork Shoulder',
  'How to Break Down a Chicken',
  'How to Debone Chicken Thighs',
  'How to boil eggs',
  'How To Enjoy Japanese Mochi',
  'How to clean and cut a whole crab',
  'How to Velvet Pork for Stir-fry',
  'How to Prepare Shrimp for Chinese Cooking'
];

// 2. Tutorials that ARE recipes -> Rename to clean dish names
const TUTORIAL_RENAMES = {
  'How to Make XO Sauce': { name: 'Homemade XO Sauce', role: 'sauce_condiment' },
  'How to Make Lard': { name: 'Homemade Lard', role: 'sauce_condiment' },
  'How to Make Five Spice Powder': { name: 'Homemade Five Spice Powder', role: 'sauce_condiment' },
  'How to Make Sesame Sauce': { name: 'Homemade Sesame Sauce', role: 'sauce_condiment' },
  'How to Make Sesame Paste': { name: 'Homemade Sesame Paste', role: 'sauce_condiment' },
  'How to Make Tamarind Paste from Fresh Tamarind': { name: 'Homemade Tamarind Paste', role: 'sauce_condiment' },
  'How to Make Duck Sauce': { name: 'Homemade Duck Sauce', role: 'sauce_condiment' },
  'How To Make Shio Koji': { name: 'Homemade Shio Koji', role: 'sauce_condiment' },
  'How to Make Liangpi': { name: 'Liangpi (Cold Skin Noodles)', role: 'one_pot_meal' },
  'How to cook Jasmine Rice': { name: 'Steamed Jasmine Rice', role: 'vegetable_side' },
  'How to cook rice - perfectly and easily': { name: 'Steamed White Rice', role: 'vegetable_side' },
  'How to Cook Tapioca Pearls': { name: 'Cooked Tapioca Pearls (Boba)', role: 'dessert' },
  'How to Make Vietnamese Coffee': { name: 'Vietnamese Iced Coffee', role: 'breakfast' },
  'How to Cook Dumplings': { name: 'Boiled Dumplings', role: 'one_pot_meal' },
  'How to cook steak - like a chef!': { name: 'Pan-Seared Steak', role: 'main_protein' },
  'How to cook crispy skin duck breast': { name: 'Crispy Skin Duck Breast', role: 'main_protein' },
  'How to make Mimosas': { name: 'Classic Mimosa Cocktail', role: 'snack' },
  'How to make Glazed Ham': { name: 'Holiday Glazed Ham', role: 'main_protein' },
  'How to make glazed ham the day before': { name: 'Holiday Glazed Ham (Make Ahead)', role: 'main_protein' },
  'How to Make Shiraga Negi': { name: 'Shiraga Negi (Julienned Scallions)', role: 'sauce_condiment' },
  'How to Cook Brown Rice in an Instant Pot': { name: 'Instant Pot Brown Rice', role: 'vegetable_side' },
  'How to cook brown rice': { name: 'Cooked Brown Rice', role: 'vegetable_side' },
  'How to Make Garlic Chips': { name: 'Crispy Garlic Chips', role: 'sauce_condiment' },
  'How to Cold Brew Green Tea': { name: 'Cold Brew Japanese Green Tea', role: 'snack' },
  'How To Make Kanten Jelly': { name: 'Japanese Kanten Jelly', role: 'dessert' },
  'How to Make “Octopus“ Sausage': { name: 'Japanese Octopus Sausages', role: 'snack' },
  'How to make Grilled Corn': { name: 'Grilled Sweet Corn', role: 'vegetable_side' },
  'How to make Ghee and Clarified Butter': { name: 'Homemade Ghee & Clarified Butter', role: 'sauce_condiment' },
  'How to make clarified butter': { name: 'Homemade Clarified Butter', role: 'sauce_condiment' },
  'How to Make a Clear Broth': { name: 'Chinese Clear Broth', role: 'soup' },
  'How to Make Dried Tangerine Peel': { name: 'Cured Tangerine Peel (Chenpi)', role: 'sauce_condiment' },
  'How to Make Golden Syrup': { name: 'Mooncake Golden Syrup', role: 'dessert' },
  'How to Make Lotus Seed Paste': { name: 'Sweet Lotus Seed Paste', role: 'dessert' },
  'How to Cook Water Spinach': { name: 'Stir-Fried Water Spinach', role: 'vegetable_side' },
  'How to Make Frozen Tofu': { name: 'Homemade Frozen Tofu (Dong Doufu)', role: 'vegetable_side' },
  'How to Cook Zongzi in an Instant Pot': { name: 'Instant Pot Sticky Rice Dumplings (Zongzi)', role: 'one_pot_meal' }
};

// 3. Clean Dish Title (Strip bylines, garbage numbers, awkward scraping)
function cleanDishTitle(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Tasty Home Dish';
  let name = rawName.trim();

  // Check manual renames first
  if (TUTORIAL_RENAMES[name]) {
    name = TUTORIAL_RENAMES[name].name;
  }

  // Remove HTML entities
  name = name.replace(/&amp;/g, '&');

  // Strip bylines like "by [Author Name]"
  name = name.replace(/\s+by\s+[a-zA-Z0-9_\u4e00-\u9fa5\s\.\-]+$/i, '');
  name = name.replace(/by\s+[a-zA-Z0-9_\u4e00-\u9fa5\s\.\-]+$/i, '');

  // Strip prefix garbage numbers like "93Sesame Oil" -> "Sesame Oil"
  name = name.replace(/^(\d{2,3})([A-Z\u4e00-\u9fa5])/, '$2');

  // Strip prefixes like "DIY自製滴", "免開火！", "快速消暑"
  name = name.replace(/^(DIY自製滴|免開火！|快速消暑|私房推薦：|家常推薦：)/i, '');

  // Strip suffix "- Home-Style", "- EasyHome-Style", "- AppetizingHome-Style"
  name = name.replace(/-\s*(Easy)?Home-Style(ninihealthy)?/gi, '');
  name = name.replace(/-\s*AppetizingHome-Style/gi, '');
  name = name.replace(/-\s*Appetizing菜/gi, '');

  // Strip double spaces
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

// 4. Clean Scraped Ingredients (Fix 's cooked rice', 'arge 鸡蛋s', double parens)
function cleanIngredientName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let str = rawName.trim();

  // Fix corrupted 'arge 鸡蛋s' or 'arge eggs'
  str = str.replace(/^arge\s+鸡蛋s?/i, 'Eggs (鸡蛋)');
  str = str.replace(/^arge\s+eggs?/i, 'Large Eggs');
  str = str.replace(/^arge\s+/i, 'Large ');

  // Fix leading 's ' or "s' " left by regex stripping quantities (e.g. "s cooked rice" -> "Cooked Rice")
  str = str.replace(/^s\s+cooked\s+rice/i, 'Cooked Rice');
  str = str.replace(/^s\s+oil/i, 'Cooking Oil');
  str = str.replace(/^s\s+fresh\s+shrimp/i, 'Fresh Shrimp');
  str = str.replace(/^s\s+食盐/i, '食盐 (Salt)');
  str = str.replace(/^s\s+romaine/i, 'Romaine');
  str = str.replace(/^s\s+/i, '');

  // Strip double parentheses with notes ((notes)) -> keep clean ingredient
  str = str.replace(/\(\([^)]*\)\)/g, '');
  // Clean empty parens
  str = str.replace(/\(\s*\)/g, '');

  // Clean trailing punctuation & commas
  str = str.replace(/[,;:]\s*$/, '');
  str = str.replace(/\s+/g, ' ').trim();

  // Capitalize first letter if English
  if (/^[a-z]/.test(str)) {
    str = str.charAt(0).toUpperCase() + str.slice(1);
  }

  return str;
}

// 5. Instruction Step Parser: Break run-on text into structured stepList & clean \n\n text
function parseInstructions(rawInstructions) {
  if (!rawInstructions || typeof rawInstructions !== 'string') {
    return {
      formattedText: '1. Prepare ingredients as listed.\n\n2. Cook according to standard technique and serve hot.',
      stepList: ['Prepare ingredients as listed.', 'Cook according to standard technique and serve hot.']
    };
  }

  let text = rawInstructions.trim();

  // Check if instructions already have numbers or "Step X"
  // Patterns like: "1. Gather... 2. Heat wok... 3. Add rice..."
  const stepSplitRegex = /(?:^|\s+)(?:(\d+)\.|\bStep\s+(\d+)[:.]?)\s+/i;
  
  // Split using regex
  const parts = text.split(/(?:^|\s+)(?:\d+\.|\bStep\s+\d+[:.]?)\s+/i).filter(p => p && p.trim().length > 0);

  if (parts.length > 1) {
    // Successfully extracted distinct steps!
    const stepList = parts.map((step, idx) => {
      let cleanStep = step.replace(/\s+/g, ' ').trim();
      // Remove trailing junk
      return cleanStep;
    });

    const formattedText = stepList.map((step, idx) => `${idx + 1}. ${step}`).join('\n\n');
    return { formattedText, stepList };
  }

  // If no numbered steps found, try splitting by double newline or sentences
  if (text.includes('\n')) {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 5);
    if (lines.length > 1) {
      const stepList = lines.map((l, i) => l.replace(/^\d+[\.\)]\s*/, ''));
      const formattedText = stepList.map((step, idx) => `${idx + 1}. ${step}`).join('\n\n');
      return { formattedText, stepList };
    }
  }

  // Single step fallback
  return {
    formattedText: `1. ${text}`,
    stepList: [text]
  };
}

// 6. Time Realism Audit (Fix 1m - 5m anomalies)
function auditTimes(dishName, rawPrepTime, ingredients, instructions) {
  let prep = typeof rawPrepTime === 'number' && !isNaN(rawPrepTime) && rawPrepTime > 0 ? rawPrepTime : 20;
  
  const text = `${dishName} ${(instructions || '')}`.toLowerCase();
  const ingText = (ingredients || []).map(i => i.name.toLowerCase()).join(' ');

  // Has raw meats/poultry/seafood
  const hasRawMeat = ingText.includes('pork') || ingText.includes('chicken') || ingText.includes('beef') || 
                     ingText.includes('lamb') || ingText.includes('duck') || ingText.includes('shrimp') || 
                     ingText.includes('fish') || ingText.includes('steak') || ingText.includes('猪肉') || 
                     ingText.includes('牛肉') || ingText.includes('鸡肉') || ingText.includes('排骨');

  // Has simmering / braising / baking
  const isSlowCook = text.includes('simmer') || text.includes('braise') || text.includes('roast') || 
                     text.includes('bake') || text.includes('stew') || text.includes('炖') || 
                     text.includes('煲') || text.includes('烤') || text.includes('卤');

  // Correct unrealistic <= 5 mins
  if (prep <= 5) {
    if (isSlowCook) {
      prep = 45;
    } else if (hasRawMeat) {
      prep = 20; // 10 min prep + 10 min cook
    } else if (text.includes('fried rice') || text.includes('炒饭') || text.includes('noodle') || text.includes('面')) {
      prep = 15;
    } else if (dishName.includes('Salad') || dishName.includes('涼拌') || dishName.includes('Cold') || dishName.includes('Tofu')) {
      prep = 10; // Realistic cold dish prep
    } else {
      prep = 15;
    }
  }

  // Estimate Hands-on Prep vs Active Cook Time
  let cookTime = Math.max(5, Math.round(prep * 0.6));
  let prepTime = Math.max(5, Math.round(prep * 0.4));
  let totalTime = prep;

  return { prepTimeMinutes: prepTime, cookTimeMinutes: cookTime, totalTimeMinutes: totalTime };
}

// 7. Smart Role Classifier
function classifyDishRole(dishName, category, ingredients) {
  const name = dishName.toLowerCase();
  const cat = (category || '').toLowerCase();
  const ingText = (ingredients || []).map(i => i.name.toLowerCase()).join(' ');

  if (cat.includes('dessert') || name.includes('cake') || name.includes('cookie') || name.includes('pudding') || name.includes('甜品')) {
    return 'dessert';
  }
  if (name.includes('sauce') || name.includes('dressing') || name.includes('paste') || name.includes('dip') || name.includes('chili oil') || name.includes('酱') || name.includes('辣油')) {
    return 'sauce_condiment';
  }
  if (cat.includes('soup') || name.includes('soup') || name.includes('broth') || name.includes('chowder') || name.includes('汤') || name.includes('羹')) {
    return 'soup';
  }
  if (name.includes('fried rice') || name.includes('炒饭') || name.includes('noodles') || name.includes('pasta') || 
      name.includes('spaghetti') || name.includes('lasagna') || name.includes('risotto') || name.includes('ramen') || 
      name.includes('pho') || name.includes('casserole') || name.includes('biryani') || name.includes('pad thai') ||
      name.includes('dumpling') || name.includes('饺子') || name.includes('bao') || name.includes('pizza') || name.includes('sandwich') || name.includes('burger')) {
    return 'one_pot_meal';
  }
  
  const hasMeat = ingText.includes('chicken') || ingText.includes('pork') || ingText.includes('beef') || 
                  ingText.includes('fish') || ingText.includes('shrimp') || ingText.includes('salmon') || 
                  ingText.includes('steak') || ingText.includes('lamb') || ingText.includes('duck') ||
                  ingText.includes('鸡') || ingText.includes('猪') || ingText.includes('牛') || ingText.includes('鱼') || ingText.includes('虾');

  if (hasMeat) {
    return 'main_protein';
  }

  return 'vegetable_side';
}

// 8. Spice Level Classifier (0 to 3)
function detectSpiceLevel(dishName, ingredients) {
  const text = `${dishName} ${(ingredients || []).map(i => i.name).join(' ')}`.toLowerCase();

  const hotKeywords = ['szechuan', 'habanero', 'bird\'s eye', 'ghost pepper', 'extra hot', 'spicy hot', '麻辣', '特辣', '变态辣', '朝天椒'];
  if (hotKeywords.some(k => text.includes(k))) return 3;

  const mediumKeywords = ['chili', 'jalapeno', 'curry', 'gochujang', 'kimchi', 'sambal', 'sriracha', 'chilli', 'cayenne', '辣', '咖喱', '韩式辣酱', '泡菜'];
  if (mediumKeywords.some(k => text.includes(k))) return 2;

  const mildKeywords = ['black pepper', 'white pepper', 'paprika', 'ginger', '微辣', '胡椒'];
  if (mildKeywords.some(k => text.includes(k))) return 1;

  return 0;
}

// 9. Kid-Friendly Classifier
function isDishKidFriendly(dishName, spiceLevel, dishRole, ingredients) {
  if (spiceLevel >= 2) return false; // Spicy is not kid-friendly

  const name = dishName.toLowerCase();
  const kidLoved = ['sweet and sour', 'sweet & sour', 'teriyaki', 'meatball', 'fried rice', 
                    'noodle', 'macaroni', 'cheese', 'pasta', 'bolognese', 'chicken nugget', 
                    'pancake', 'honey', 'dumpling', 'potato', 'corn', 'sugar', '糖醋', '番茄', '肉丸', '蛋炒饭'];

  if (kidLoved.some(k => name.includes(k))) return true;

  // Gentle mild dishes
  if (spiceLevel === 0 && (dishRole === 'one_pot_meal' || dishRole === 'main_protein')) return true;

  return false;
}

// ─── MAIN SANITIZATION PIPELINE ───
function sanitizeDatabase(filePath) {
  console.log(`\n========================================`);
  console.log(`Reading: ${filePath}`);
  const rawData = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(rawData);
  const dishes = Array.isArray(parsed) ? parsed : (parsed.dishes || []);

  console.log(`Total input recipes: ${dishes.length}`);

  let deletedCount = 0;
  let renamedCount = 0;
  let parsedStepsCount = 0;
  let timeAdjustedCount = 0;

  const cleanedDishes = [];

  for (const dish of dishes) {
    const rawTitle = dish.name || '';

    // Check if should delete pure tutorial articles
    if (TUTORIAL_TITLES_TO_DELETE.includes(rawTitle.trim())) {
      deletedCount++;
      continue;
    }

    // Check manual rename
    if (TUTORIAL_RENAMES[rawTitle.trim()]) {
      renamedCount++;
    }

    // Clean dish title
    const cleanTitle = cleanDishTitle(rawTitle);

    // Clean ingredients
    const cleanIngredients = (dish.ingredients || []).map((ing, idx) => ({
      ...ing,
      id: ing.id || `ing_${dish.id}_${idx}`,
      name: cleanIngredientName(ing.name),
      amount: ing.amount !== undefined ? ing.amount : null,
      unit: ing.unit || 'pcs',
      category: ing.category || 'Produce'
    })).filter(ing => ing.name.length > 0);

    // Parse instructions into stepList and formatted \n\n text
    const { formattedText, stepList } = parseInstructions(dish.instructions);
    if (stepList.length > 1) {
      parsedStepsCount++;
    }

    // Time realism audit
    const timeAudit = auditTimes(cleanTitle, dish.prepTimeMinutes, cleanIngredients, formattedText);
    if (dish.prepTimeMinutes !== undefined && dish.prepTimeMinutes <= 5) {
      timeAdjustedCount++;
    }

    // Smart role & spice & kid-friendly classifiers
    const dishRole = (TUTORIAL_RENAMES[rawTitle.trim()] && TUTORIAL_RENAMES[rawTitle.trim()].role) 
      ? TUTORIAL_RENAMES[rawTitle.trim()].role 
      : classifyDishRole(cleanTitle, dish.category, cleanIngredients);

    const spiceLevel = detectSpiceLevel(cleanTitle, cleanIngredients);
    const kidFriendly = isDishKidFriendly(cleanTitle, spiceLevel, dishRole, cleanIngredients);

    cleanedDishes.push({
      ...dish,
      name: cleanTitle,
      dishRole,
      spiceLevel,
      kidFriendly,
      cleanupEffort: dishRole === 'one_pot_meal' ? 'one_pot' : 'standard',
      prepTimeMinutes: timeAudit.prepTimeMinutes,
      cookTimeMinutes: timeAudit.cookTimeMinutes,
      totalTimeMinutes: timeAudit.totalTimeMinutes,
      instructions: formattedText,
      stepList: stepList,
      ingredients: cleanIngredients
    });
  }

  console.log(`- Deleted non-recipe tutorials: ${deletedCount}`);
  console.log(`- Renamed tutorials to real recipes: ${renamedCount}`);
  console.log(`- Parsed multi-step instructions: ${parsedStepsCount}`);
  console.log(`- Realism-adjusted <= 5min dishes: ${timeAdjustedCount}`);
  console.log(`Total output recipes: ${cleanedDishes.length}`);

  const output = Array.isArray(parsed) ? cleanedDishes : { ...parsed, dishes: cleanedDishes };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved clean file to: ${filePath}`);
}

// Run across targets
const targetFiles = [
  path.join(__dirname, '../public/master_system_recipes.json'),
  path.join(__dirname, '../master_system_recipes.json'),
  path.join(__dirname, '../dist/master_system_recipes.json')
];

targetFiles.forEach(f => {
  if (fs.existsSync(f)) {
    sanitizeDatabase(f);
  }
});
