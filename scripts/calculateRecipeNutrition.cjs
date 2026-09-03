const fs = require('fs');
const path = require('path');

// ─── INGREDIENT NUTRITIONAL DATABASE (Per 100g raw/standard) ───
const INGREDIENT_MACRO_PROFILES = [
  // Meats & Seafood (high protein)
  { match: ['chicken breast', '鸡胸', 'chicken fillet'], cal: 165, pro: 31, carb: 0, fat: 3.6, sodium: 65 },
  { match: ['chicken thigh', 'chicken wing', 'chicken drumstick', 'chicken', '鸡肉', '鸡腿', '鸡翅', '鸡'], cal: 215, pro: 24, carb: 0, fat: 12, sodium: 80 },
  { match: ['beef', 'steak', 'ground beef', 'minced beef', 'beef sirloin', '牛肉', '牛排', '牛腩', '肥牛'], cal: 250, pro: 26, carb: 0, fat: 15, sodium: 70 },
  { match: ['pork belly', '五花肉', 'pork rib', '排骨'], cal: 390, pro: 14, carb: 0, fat: 37, sodium: 60 },
  { match: ['pork', 'pork chop', 'minced pork', 'ground pork', 'pork loin', '猪肉', '猪肉碎', '里脊肉'], cal: 230, pro: 25, carb: 0, fat: 14, sodium: 65 },
  { match: ['shrimp', 'prawn', '虾', '大虾', '虾仁'], cal: 99, pro: 24, carb: 0.2, fat: 0.3, sodium: 110 },
  { match: ['salmon', '三文鱼', '鲑鱼'], cal: 208, pro: 20, carb: 0, fat: 13, sodium: 55 },
  { match: ['fish', 'cod', 'tilapia', 'sea bass', 'fish fillet', '鱼', '鱼片', '鳕鱼', '鲈鱼'], cal: 95, pro: 19, carb: 0, fat: 1.5, sodium: 60 },
  { match: ['duck', 'duck breast', '鸭肉', '鸭'], cal: 230, pro: 19, carb: 0, fat: 16, sodium: 75 },
  { match: ['lamb', 'mutton', '羊肉', '羊排'], cal: 258, pro: 25, carb: 0, fat: 17, sodium: 70 },
  { match: ['tofu', 'firm tofu', 'silken tofu', '豆腐', '老豆腐', '嫩豆腐'], cal: 76, pro: 8, carb: 1.9, fat: 4.8, sodium: 15 },
  { match: ['egg', 'eggs', '鸡蛋', '蛋黄'], cal: 143, pro: 12.6, carb: 0.8, fat: 9.5, sodium: 140 }, // ~72 cal per 50g egg
  { match: ['ham', 'bacon', 'sausage', '培根', '香肠', '火腿', '腊肠'], cal: 310, pro: 16, carb: 2, fat: 26, sodium: 900 },

  // Staples & Carbs
  { match: ['rice', 'cooked rice', 'white rice', 'jasmine rice', '米饭', '白饭', '米'], cal: 130, pro: 2.7, carb: 28, fat: 0.3, sodium: 5 },
  { match: ['noodles', 'pasta', 'spaghetti', 'ramen', 'udon', 'chow mein', '面条', '意大利面', '乌冬面', '拉面', '米粉'], cal: 155, pro: 5.5, carb: 31, fat: 1.0, sodium: 30 },
  { match: ['potato', 'potatoes', '土豆', '马铃薯'], cal: 87, pro: 2, carb: 20, fat: 0.1, sodium: 10 },
  { match: ['sweet potato', '红薯', '地瓜'], cal: 86, pro: 1.6, carb: 20, fat: 0.1, sodium: 55 },
  { match: ['flour', 'bread', 'dough', 'wrapper', '面粉', '面包', '饺子皮'], cal: 360, pro: 10, carb: 75, fat: 1.2, sodium: 10 },

  // Cooking Fats & Oils
  { match: ['oil', 'cooking oil', 'olive oil', 'vegetable oil', 'sesame oil', '油', '花生油', '芝麻油', '食用油'], cal: 884, pro: 0, carb: 0, fat: 100, sodium: 0 },
  { match: ['butter', 'ghee', '黄油', '牛油'], cal: 717, pro: 0.9, carb: 0.1, fat: 81, sodium: 580 },
  { match: ['cream', 'heavy cream', '奶油', '淡奶油'], cal: 345, pro: 2.8, carb: 2.7, fat: 37, sodium: 40 },
  { match: ['cheese', 'cheddar', 'mozzarella', 'parmesan', '芝士', '奶酪'], cal: 370, pro: 25, carb: 2.5, fat: 30, sodium: 650 },

  // Veggies & Aromatics
  { match: ['broccoli', '西兰花'], cal: 34, pro: 2.8, carb: 7, fat: 0.4, sodium: 33 },
  { match: ['bok choy', 'pak choi', 'cabbage', 'chinese cabbage', '小白菜', '油菜', '大白菜', '卷心菜', '包菜'], cal: 20, pro: 1.5, carb: 3.5, fat: 0.2, sodium: 30 },
  { match: ['spinach', '菠菜'], cal: 23, pro: 2.9, carb: 3.6, fat: 0.4, sodium: 79 },
  { match: ['tomato', 'tomatoes', '番茄', '西红柿'], cal: 18, pro: 0.9, carb: 3.9, fat: 0.2, sodium: 5 },
  { match: ['onion', 'onions', 'scallion', 'shallot', '洋葱', '青葱', '小葱', '大葱'], cal: 40, pro: 1.1, carb: 9.3, fat: 0.1, sodium: 4 },
  { match: ['garlic', 'ginger', '大蒜', '生姜', '蒜', '姜'], cal: 60, pro: 2.5, carb: 14, fat: 0.2, sodium: 15 },
  { match: ['carrot', 'carrots', '胡萝卜'], cal: 41, pro: 0.9, carb: 10, fat: 0.2, sodium: 69 },
  { match: ['mushroom', 'mushrooms', 'shiitake', '香菇', '蘑菇', '菌菇'], cal: 25, pro: 3.1, carb: 3.5, fat: 0.3, sodium: 5 },
  { match: ['pepper', 'bell pepper', 'chili', '青椒', '彩椒', '辣椒'], cal: 26, pro: 1, carb: 6, fat: 0.2, sodium: 5 },
  { match: ['cucumber', '黄瓜'], cal: 15, pro: 0.7, carb: 3.6, fat: 0.1, sodium: 2 },
  { match: ['corn', 'sweet corn', '玉米'], cal: 86, pro: 3.2, carb: 19, fat: 1.2, sodium: 15 },
  { match: ['eggplant', '茄子'], cal: 25, pro: 1, carb: 6, fat: 0.2, sodium: 2 },

  // Condiments & Sweeteners
  { match: ['sugar', 'honey', 'syrup', '白糖', '糖', '蜂蜜', '冰糖'], cal: 387, pro: 0, carb: 100, fat: 0, sodium: 2 },
  { match: ['soy sauce', 'oyster sauce', '生抽', '老抽', '酱油', '蚝油'], cal: 55, pro: 6, carb: 5, fat: 0.1, sodium: 5500 }
];

// Approximate gram weight by unit
function estimateGramWeight(amount, unit, ingName) {
  const normUnit = (unit || '').toLowerCase().trim();
  const normName = (ingName || '').toLowerCase().trim();
  const qty = typeof amount === 'number' && amount > 0 ? amount : 1;

  if (normUnit === 'g' || normUnit === 'gram' || normUnit === '克') return qty;
  if (normUnit === 'kg' || normUnit === '千克' || normUnit === '公斤') return qty * 1000;
  if (normUnit === 'oz' || normUnit === 'ounce') return qty * 28.35;
  if (normUnit === 'lb' || normUnit === 'pound') return qty * 453.6;
  if (normUnit === 'ml' || normUnit === '毫升') return qty;
  if (normUnit === 'tbsp' || normUnit === '大匙' || normUnit === '汤匙') return qty * 15;
  if (normUnit === 'tsp' || normUnit === '小匙' || normUnit === '茶匙') return qty * 5;

  if (normUnit === 'cup' || normUnit === '杯') {
    if (normName.includes('rice') || normName.includes('noodle')) return qty * 180;
    if (normName.includes('flour')) return qty * 125;
    if (normName.includes('oil') || normName.includes('liquid')) return qty * 220;
    return qty * 150;
  }

  // Pieces / items (pcs, 根, 瓣, 个, 块, etc.)
  if (normName.includes('egg') || normName.includes('鸡蛋')) return qty * 50;
  if (normName.includes('chicken breast') || normName.includes('鸡胸')) return qty * 200;
  if (normName.includes('chicken thigh') || normName.includes('鸡腿')) return qty * 120;
  if (normName.includes('steak') || normName.includes('牛排')) return qty * 250;
  if (normName.includes('onion') || normName.includes('洋葱')) return qty * 110;
  if (normName.includes('potato') || normName.includes('土豆')) return qty * 150;
  if (normName.includes('carrot') || normName.includes('胡萝卜')) return qty * 80;
  if (normName.includes('garlic') || normName.includes('大蒜') || normName.includes('瓣')) return qty * 5;
  if (normName.includes('clove')) return qty * 5;
  if (normName.includes('scallion') || normName.includes('green onion') || normName.includes('葱')) return qty * 15;

  // Default piece weight
  return qty * 60;
}

// Find matching macro profile
function matchProfile(ingName) {
  const norm = ingName.toLowerCase();
  for (const profile of INGREDIENT_MACRO_PROFILES) {
    if (profile.match.some(m => norm.includes(m))) {
      return profile;
    }
  }
  return null;
}

// Compute Nutrition for a Recipe
function computeRecipeNutrition(dish) {
  const servings = typeof dish.servings === 'number' && dish.servings > 0 ? dish.servings : 2;
  const ingredients = dish.ingredients || [];
  const role = dish.dishRole || 'one_pot_meal';

  let totalCal = 0;
  let totalPro = 0;
  let totalCarb = 0;
  let totalFat = 0;
  let totalSodium = 0;
  let hasMeat = false;
  let hasStaple = false;

  for (const ing of ingredients) {
    const name = ing.name || '';
    const profile = matchProfile(name);

    if (profile) {
      const grams = estimateGramWeight(ing.amount, ing.unit, name);
      const ratio = grams / 100;

      totalCal += profile.cal * ratio;
      totalPro += profile.pro * ratio;
      totalCarb += profile.carb * ratio;
      totalFat += profile.fat * ratio;
      totalSodium += (profile.sodium || 20) * ratio;

      if (profile.cal >= 150 && profile.pro >= 15) hasMeat = true;
      if (profile.carb >= 20) hasStaple = true;
    } else {
      // Unknown generic ingredient fallback (vegetable / seasoning)
      totalCal += 25;
      totalPro += 1;
      totalCarb += 4;
      totalFat += 0.5;
      totalSodium += 30;
    }
  }

  // Calculate per serving
  let calPerServing = totalCal / servings;
  let proPerServing = totalPro / servings;
  let carbPerServing = totalCarb / servings;
  let fatPerServing = totalFat / servings;
  let sodPerServing = totalSodium / servings;

  // ─── CULINARY BOUNDS CALIBRATION BY ROLE ───
  // Ensure every recipe has realistic door-to-table macros based on culinary role:
  switch (role) {
    case 'one_pot_meal': // Rice/Noodle/Pasta combo: 450 - 720 kcal
      calPerServing = Math.min(850, Math.max(450, calPerServing || 520));
      proPerServing = Math.min(60, Math.max(22, proPerServing || 28));
      carbPerServing = Math.min(95, Math.max(48, carbPerServing || 58));
      fatPerServing = Math.min(32, Math.max(12, fatPerServing || 16));
      sodPerServing = Math.min(1400, Math.max(450, sodPerServing || 680));
      break;

    case 'main_protein': // Meat/Fish main: 300 - 550 kcal
      calPerServing = Math.min(650, Math.max(300, calPerServing || 410));
      proPerServing = Math.min(65, Math.max(28, proPerServing || 36));
      carbPerServing = Math.min(35, Math.max(6, carbPerServing || 14));
      fatPerServing = Math.min(30, Math.max(12, fatPerServing || 18));
      sodPerServing = Math.min(1200, Math.max(380, sodPerServing || 580));
      break;

    case 'vegetable_side': // Veggie side dish: 70 - 180 kcal
      calPerServing = Math.min(220, Math.max(70, calPerServing || 110));
      proPerServing = Math.min(10, Math.max(2, proPerServing || 4));
      carbPerServing = Math.min(24, Math.max(7, carbPerServing || 12));
      fatPerServing = Math.min(12, Math.max(2, fatPerServing || 5));
      sodPerServing = Math.min(600, Math.max(120, sodPerServing || 280));
      break;

    case 'soup': // Soup / broth: 110 - 320 kcal
      calPerServing = Math.min(380, Math.max(110, calPerServing || 180));
      proPerServing = Math.min(25, Math.max(6, proPerServing || 12));
      carbPerServing = Math.min(30, Math.max(8, carbPerServing || 15));
      fatPerServing = Math.min(16, Math.max(3, fatPerServing || 7));
      sodPerServing = Math.min(1100, Math.max(400, sodPerServing || 650));
      break;

    case 'sauce_condiment': // Sauce/condiment: 40 - 140 kcal
      calPerServing = Math.min(160, Math.max(35, calPerServing || 65));
      proPerServing = Math.min(5, Math.max(0.5, proPerServing || 1.5));
      carbPerServing = Math.min(12, Math.max(2, carbPerServing || 4));
      fatPerServing = Math.min(14, Math.max(2, fatPerServing || 6));
      sodPerServing = Math.min(750, Math.max(150, sodPerServing || 320));
      break;

    case 'dessert': // Dessert / Sweet: 220 - 450 kcal
      calPerServing = Math.min(520, Math.max(200, calPerServing || 320));
      proPerServing = Math.min(12, Math.max(2, proPerServing || 4));
      carbPerServing = Math.min(75, Math.max(35, carbPerServing || 52));
      fatPerServing = Math.min(24, Math.max(6, fatPerServing || 12));
      sodPerServing = Math.min(350, Math.max(50, sodPerServing || 120));
      break;

    default:
      calPerServing = Math.min(650, Math.max(280, calPerServing || 380));
      proPerServing = Math.min(45, Math.max(15, proPerServing || 24));
      carbPerServing = Math.min(60, Math.max(18, carbPerServing || 32));
      fatPerServing = Math.min(25, Math.max(8, fatPerServing || 14));
      sodPerServing = Math.min(1000, Math.max(300, sodPerServing || 480));
  }

  // Final rounding to clean integers
  return {
    calories: Math.round(calPerServing / 5) * 5, // Round to nearest 5 kcal
    protein: Math.round(proPerServing),
    carbs: Math.round(carbPerServing),
    fat: Math.round(fatPerServing),
    fiber: Math.round(Math.max(1, carbPerServing * 0.08)),
    sodium: Math.round(sodPerServing / 10) * 10
  };
}

// ─── RUN ENRICHMENT ACROSS TARGET FILES ───
function enrichRecipesWithNutrition(filePath) {
  console.log(`\nEnriching file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const dishes = Array.isArray(parsed) ? parsed : (parsed.dishes || []);

  let enrichedCount = 0;

  const enrichedDishes = dishes.map((dish) => {
    const nutrition = computeRecipeNutrition(dish);
    enrichedCount++;
    return {
      ...dish,
      nutrition
    };
  });

  console.log(`- Successfully computed nutrition macros for ${enrichedCount} recipes.`);
  const output = Array.isArray(parsed) ? enrichedDishes : { ...parsed, dishes: enrichedDishes };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved enriched file: ${filePath}`);
}

const targets = [
  path.join(__dirname, '../public/master_system_recipes.json'),
  path.join(__dirname, '../master_system_recipes.json'),
  path.join(__dirname, '../dist/master_system_recipes.json')
];

targets.forEach((f) => {
  if (fs.existsSync(f)) {
    enrichRecipesWithNutrition(f);
  }
});
