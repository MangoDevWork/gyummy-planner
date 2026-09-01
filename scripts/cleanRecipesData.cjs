const fs = require('fs');
const path = require('path');

// Clean corrupted mixed string artifacts
function cleanIngredientName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';

  let str = rawName;

  // 1. Fix common corrupted hybrid patterns created by naive search/replace
  str = str.replace(/洋Green Onion \(Scallion\)/gi, '洋葱 (Onion)');
  str = str.replace(/洋Green Onion/gi, '洋葱');
  str = str.replace(/青Bitter Melon/gi, '苦瓜 (Bitter Melon)');
  str = str.replace(/Bitter Melon/gi, '苦瓜 (Bitter Melon)');
  str = str.replace(/苦瓜 \(苦瓜\)/g, '苦瓜 (Bitter Melon)');
  str = str.replace(/苦瓜 \(Bitter Melon\) \(Bitter Melon\)/g, '苦瓜 (Bitter Melon)');
  str = str.replace(/白Pepper粉/gi, '白胡椒粉');
  str = str.replace(/黑Pepper粉/gi, '黑胡椒粉');
  str = str.replace(/Pepper粉/gi, '胡椒粉');
  str = str.replace(/Garlic瓣 \(Garlic\)/gi, '蒜瓣 (Garlic)');
  str = str.replace(/Garlic瓣/gi, '蒜瓣 (Garlic)');
  str = str.replace(/Garlic末/gi, '蒜末');
  str = str.replace(/Garlic泥/gi, '蒜泥');
  str = str.replace(/Ginger末/gi, '姜末');
  str = str.replace(/Ginger片/gi, '姜片');
  str = str.replace(/Ginger/gi, '生姜');
  str = str.replace(/Garlic/gi, '大蒜');
  str = str.replace(/Green Onion \(Scallion\)/gi, '小葱');
  str = str.replace(/Green Onion/gi, '香葱');
  str = str.replace(/Sesame Oil/gi, '芝麻香油');
  str = str.replace(/Soy Sauce/gi, '生抽酱油');
  str = str.replace(/Oyster Sauce/gi, '蚝油');
  str = str.replace(/Salt/gi, '食盐');
  str = str.replace(/Sugar/gi, '白糖');
  str = str.replace(/Chili - Chili Sauce/gi, '辣椒 / 辣椒酱');
  str = str.replace(/Chili Sauce/gi, '辣椒酱');
  str = str.replace(/Chili/gi, '辣椒');
  str = str.replace(/Chicken Powder/gi, '鸡精');
  str = str.replace(/Cornstarch/gi, '生粉 (玉米淀粉)');
  str = str.replace(/Potato Starch/gi, '太白粉 (土豆淀粉)');
  str = str.replace(/Rice Wine/gi, '料酒 / 米酒');
  str = str.replace(/Cooking Wine/gi, '料酒');
  str = str.replace(/Egg/gi, '鸡蛋');
  str = str.replace(/Okra/gi, '秋葵');

  // Clean double spaces
  return str.replace(/\s+/g, ' ').trim();
}

function cleanDishName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Delicious Recipe';
  let str = rawName;
  str = str.replace(/（[^）]*）/g, ''); // remove author parens in Chinese
  str = str.replace(/\([^)]*\)/g, ''); // remove author parens
  str = str.replace(/- Home-Style/gi, '');
  str = str.replace(/by [a-zA-Z0-9_\s]+/gi, '');
  return str.replace(/\s+/g, ' ').trim();
}

function normalizeCuisine(rawCuisine, dishName, ingredients) {
  if (!rawCuisine) rawCuisine = '';
  const c = rawCuisine.toLowerCase().trim();
  const nameLower = (dishName || '').toLowerCase();
  const ingText = (ingredients || []).map(i => (i.name || '').toLowerCase()).join(' ');
  const combined = `${c} ${nameLower} ${ingText}`;

  if (c.includes('cantonese') || c.includes('粤菜') || c.includes('广府') || c.includes('港式')) return 'Cantonese';
  if (c.includes('japanese') || c.includes('japan') || c.includes('日料') || c.includes('日式') || combined.includes('teriyaki') || combined.includes('ramen') || combined.includes('udon') || combined.includes('miso')) return 'Japanese';
  if (c.includes('korean') || c.includes('korea') || c.includes('韩料') || c.includes('韩式') || combined.includes('bulgogi') || combined.includes('kimchi') || combined.includes('gochujang')) return 'Korean';
  if (c.includes('thai') || c.includes('泰式') || c.includes('泰国') || combined.includes('pad thai') || combined.includes('tom yum')) return 'Thai';
  if (c.includes('vietnamese') || c.includes('越式') || c.includes('越南') || combined.includes('pho') || combined.includes('lemongrass')) return 'Vietnamese';
  if (c.includes('italian') || c.includes('italia') || c.includes('意式') || c.includes('意餐') || combined.includes('pasta') || combined.includes('spaghetti') || combined.includes('risotto') || combined.includes('lasagna') || combined.includes('pizza')) return 'Italian';
  if (c.includes('french') || c.includes('法餐') || c.includes('法式')) return 'French';
  if (c.includes('mexican') || c.includes('tex-mex') || c.includes('墨西哥') || combined.includes('taco') || combined.includes('burrito') || combined.includes('quesadilla') || combined.includes('salsa')) return 'Mexican';
  if (c.includes('indian') || c.includes('印度') || combined.includes('curry powder') || combined.includes('garam masala') || combined.includes('tikka')) return 'Indian';
  if (c.includes('mediterranean') || c.includes('greek') || c.includes('地中海')) return 'Mediterranean';
  if (c.includes('american') || c.includes('usa') || c.includes('美式') || combined.includes('burger') || combined.includes('bbq')) return 'American';
  if (c.includes('western') || c.includes('西餐') || c.includes('european')) return 'Western';
  if (c.includes('chinese') || c.includes('中餐') || c.includes('川菜') || c.includes('鲁菜') || c.includes('台湾') || c.includes('中国')) return 'Chinese';
  if (c.includes('asian') || c.includes('亚洲') || c.includes('东南亚')) return 'Asian';

  return 'Other';
}

function normalizeCategory(rawCat, dishName) {
  if (!rawCat) rawCat = 'Dinner';
  const c = rawCat.toLowerCase().trim();
  const n = (dishName || '').toLowerCase();

  if (c.includes('breakfast') || n.includes('breakfast') || n.includes('pancake') || n.includes('toast') || n.includes('waffle') || n.includes('oatmeal') || n.includes('早餐')) return 'Breakfast';
  if (c.includes('dessert') || c.includes('sweet') || n.includes('cake') || n.includes('cookie') || n.includes('pudding') || n.includes('dessert') || n.includes('甜品') || n.includes('蛋糕')) return 'Dessert';
  if (c.includes('snack') || n.includes('snack') || n.includes('dip') || n.includes('bite') || n.includes('小吃') || n.includes('零食')) return 'Snack';
  if (c.includes('lunch') || n.includes('sandwich') || n.includes('salad') || n.includes('wrap') || n.includes('lunch') || n.includes('午餐')) return 'Lunch';
  return 'Dinner';
}

const ALLERGEN_KEYWORDS = {
  cow_milk: ['milk', 'dairy', 'butter', 'cheese', 'parmesan', 'cheddar', 'mozzarella', 'cream', 'yogurt', 'whey', 'ghee', '牛奶', '乳制品', '黄油', '奶酪', '芝士', '奶油', '酸奶', '酥油'],
  eggs: ['egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise', 'meringue', '鸡蛋', '蛋黄', '蛋白', '蛋清', '美乃滋', '蛋黄酱', '全蛋'],
  peanuts: ['peanut', 'peanuts', 'peanut butter', 'peanut oil', '花生', '花生酱', '花生油', '花生碎', '沙爹'],
  tree_nuts: ['almond', 'cashew', 'hazelnut', 'walnut', 'pecan', 'pistachio', 'pine nut', 'macadamia', 'chestnut', '坚果', '杏仁', '腰果', '核桃', '榛子', '开心果', '碧根果', '松子', '板栗'],
  shellfish_crustacean: ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'shrimp paste', '虾', '鲜虾', '虾仁', '大虾', '蟹', '螃蟹', '龙虾', '虾皮', '虾米', '虾酱'],
  finned_fish: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'seabass', 'dashi', 'fish sauce', 'anchovy', '鱼', '鱼肉', '鱼片', '三文鱼', '金枪鱼', '鳕鱼', '鲈鱼', '鱼露', '柴鱼', '木鱼花'],
  wheat_gluten: ['wheat', 'gluten', 'flour', 'bread', 'pasta', 'spaghetti', 'noodle', 'noodles', 'ramen', 'udon', 'breadcrumbs', 'panko', '小麦', '面粉', '面包', '吐司', '意大利面', '意面', '面条', '拉面', '乌冬面', '面包糠', '麸质'],
  soybeans: ['soy', 'soybean', 'tofu', 'edamame', 'soy sauce', 'miso', 'doubanjiang', '大豆', '黄豆', '豆腐', '老豆腐', '嫩豆腐', '豆皮', '腐竹', '毛豆', '生抽', '老抽', '酱油', '味噌', '豆瓣酱'],
  sesame: ['sesame', 'sesame seed', 'sesame oil', 'tahini', '芝麻', '白芝麻', '黑芝麻', '熟芝麻', '芝麻油', '香油', '麻油', '芝麻酱'],
  molluscan_shellfish: ['oyster', 'oysters', 'oyster sauce', 'clam', 'clams', 'mussel', 'mussels', 'scallop', 'scallops', 'squid', 'calamari', 'octopus', '蚝', '生蚝', '蚝油', '蛤蜊', '花蛤', '青口', '扇贝', '带子', '鱿鱼', '章鱼'],
  pork: ['pork', 'bacon', 'ham', 'pancetta', 'lard', '猪肉', '五花肉', '排骨', '猪排', '里脊肉', '培根', '火腿', '猪油', '腊肉'],
  beef: ['beef', 'steak', 'sirloin', 'ribeye', 'beef brisket', '牛肉', '牛排', '牛腩', '牛腱', '牛里脊', '牛小排', '牛肉馅'],
  chicken_poultry: ['chicken', 'duck', 'turkey', 'poultry', '鸡肉', '鸡腿', '鸡胸', '鸡翅', '整鸡', '鸡汤', '鸡精', '鸭肉'],
  lamb_mutton: ['lamb', 'mutton', '羊肉', '羊排', '羊腿'],
  alliums: ['garlic', 'onion', 'scallion', 'shallot', 'leek', 'chives', '大蒜', '蒜', '蒜泥', '蒜瓣', '蒜末', '洋葱', '葱', '小葱', '香葱', '大葱', '红葱头', '韭菜'],
  nightshades: ['tomato', 'eggplant', 'bell pepper', 'chili', 'potato', 'potatoes', '番茄', '西红柿', '茄子', '彩椒', '甜椒', '辣椒', '土豆', '马铃薯']
};

function detectAllergens(dishName, tags, ingredients) {
  const corpus = `${dishName} ${(tags || []).join(' ')} ${(ingredients || []).map(i => i.name).join(' ')}`.toLowerCase();
  const matched = [];

  for (const [allergenId, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    // Avoid false positive for eggplant triggering egg
    if (allergenId === 'eggs' && corpus.includes('eggplant')) {
      const filtered = corpus.replaceAll('eggplant', '').replaceAll('egg plant', '').replaceAll('茄子', '');
      if (keywords.some(k => filtered.includes(k))) {
        matched.push(allergenId);
      }
      continue;
    }
    // Avoid false positive for coconut milk triggering milk
    if (allergenId === 'cow_milk' && (corpus.includes('coconut milk') || corpus.includes('soy milk') || corpus.includes('almond milk') || corpus.includes('oat milk'))) {
      const filtered = corpus
        .replaceAll('coconut milk', '')
        .replaceAll('soy milk', '')
        .replaceAll('almond milk', '')
        .replaceAll('oat milk', '')
        .replaceAll('椰浆', '')
        .replaceAll('豆浆', '')
        .replaceAll('燕麦奶', '');
      if (keywords.some(k => filtered.includes(k))) {
        matched.push(allergenId);
      }
      continue;
    }

    if (keywords.some(k => corpus.includes(k))) {
      matched.push(allergenId);
    }
  }

  return matched;
}

function generateCleanTags(dishName, category, cuisine, ingredients, prepTime) {
  const tags = new Set();
  const corpus = `${dishName} ${category} ${cuisine} ${(ingredients || []).map(i => i.name).join(' ')}`.toLowerCase();

  // Proteins
  if (corpus.includes('chicken') || corpus.includes('鸡') || corpus.includes('duck') || corpus.includes('鸭')) tags.add('Chicken');
  if (corpus.includes('beef') || corpus.includes('牛') || corpus.includes('steak')) tags.add('Beef');
  if (corpus.includes('pork') || corpus.includes('猪') || corpus.includes('bacon') || corpus.includes('培根') || corpus.includes('排骨') || corpus.includes('五花肉')) tags.add('Pork');
  if (corpus.includes('fish') || corpus.includes('salmon') || corpus.includes('tuna') || corpus.includes('cod') || corpus.includes('鱼') || corpus.includes('三文鱼') || corpus.includes('鳕鱼')) tags.add('Fish');
  if (corpus.includes('shrimp') || corpus.includes('prawn') || corpus.includes('crab') || corpus.includes('lobster') || corpus.includes('clam') || corpus.includes('squid') || corpus.includes('虾') || corpus.includes('蟹') || corpus.includes('海鲜') || corpus.includes('蛤蜊') || corpus.includes('鱿鱼')) tags.add('Seafood');
  if (corpus.includes('tofu') || corpus.includes('豆腐') || corpus.includes('vegetarian') || corpus.includes('素食') || corpus.includes('mushroom') || corpus.includes('蘑菇') || corpus.includes('香菇')) tags.add('Veggie / Tofu');
  if (corpus.includes('egg') || corpus.includes('鸡蛋') || corpus.includes('蛋炒饭')) tags.add('Egg');

  // Styles & Types
  if (prepTime <= 20) tags.add('Quick (<20m)');
  if (corpus.includes('noodle') || corpus.includes('pasta') || corpus.includes('spaghetti') || corpus.includes('rice') || corpus.includes('面') || corpus.includes('饭') || corpus.includes('拉面') || corpus.includes('乌冬')) tags.add('Noodles & Rice');
  if (corpus.includes('soup') || corpus.includes('汤') || corpus.includes('stew') || corpus.includes('煲')) tags.add('Soup');
  if (corpus.includes('stir-fry') || corpus.includes('stir fry') || corpus.includes('炒') || corpus.includes('爆炒')) tags.add('Stir Fry');
  if (corpus.includes('curry') || corpus.includes('咖喱') || corpus.includes('咖哩')) tags.add('Curry');
  if (corpus.includes('bake') || corpus.includes('baked') || corpus.includes('roast') || corpus.includes('烤') || corpus.includes('烘焙')) tags.add('Baking / Roast');

  // Cuisine Tag
  if (cuisine && cuisine !== 'Other') {
    tags.add(cuisine);
  }

  return Array.from(tags);
}

function processMasterFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  console.log(`Processing: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const dishes = Array.isArray(data) ? data : (data.dishes || []);

  let cleanedDishes = dishes.map((dish) => {
    const cleanName = cleanDishName(dish.name);
    const cleanIngredients = (dish.ingredients || []).map((ing, idx) => ({
      id: ing.id || `ing_${dish.id}_${idx}`,
      name: cleanIngredientName(ing.name),
      amount: typeof ing.amount === 'number' ? ing.amount : null,
      unit: ing.unit || 'pcs',
      category: ing.category || 'Produce'
    }));

    const cleanCuisine = normalizeCuisine(dish.cuisine, cleanName, cleanIngredients);
    const cleanCategory = normalizeCategory(dish.category, cleanName);
    const prepTime = typeof dish.prepTimeMinutes === 'number' ? dish.prepTimeMinutes : 20;
    const cleanTags = generateCleanTags(cleanName, cleanCategory, cleanCuisine, cleanIngredients, prepTime);
    const detectedAllergens = detectAllergens(cleanName, cleanTags, cleanIngredients);

    return {
      ...dish,
      name: cleanName,
      cuisine: cleanCuisine,
      category: cleanCategory,
      prepTimeMinutes: prepTime,
      tags: cleanTags,
      allergens: detectedAllergens,
      timesPlanned: typeof dish.timesPlanned === 'number' ? dish.timesPlanned : 0,
      lastPlannedAt: dish.lastPlannedAt || null,
      ingredients: cleanIngredients
    };
  });

  const outputData = Array.isArray(data) ? cleanedDishes : { ...data, dishes: cleanedDishes };
  fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`✅ Successfully cleaned ${cleanedDishes.length} dishes in ${filePath}`);
}

// Run cleanup across public and root files
const targets = [
  path.join(__dirname, '../public/master_system_recipes.json'),
  path.join(__dirname, '../master_system_recipes.json'),
  path.join(__dirname, '../dist/master_system_recipes.json')
];

targets.forEach((t) => processMasterFile(t));
console.log('🎉 Data cleanup script completed!');
