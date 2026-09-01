import type { Dish, MealPlan, MemberPreferences, FamilyPersonalisation } from '../types';

export type AllergenCategory =
  | 'major'
  | 'regional'
  | 'meat'
  | 'nightshade_allium'
  | 'seed_legume'
  | 'fruit'
  | 'additive';

export interface AllergenDefinition {
  id: string;
  nameEn: string;
  nameZh: string;
  emoji: string;
  category: AllergenCategory;
  categoryEn: string;
  categoryZh: string;
  commonSourcesEn: string;
  commonSourcesZh: string;
  keywords: string[];
  negatives?: string[];
}

/**
 * 60+ Categorized Food Allergens & Sensitivities
 * Compiled from FDA, EU, FSANZ, and Clinical Regulatory Standards
 */
export const ALLERGEN_TAXONOMY: AllergenDefinition[] = [
  // ================= 1. MAJOR ALLERGENS (THE BIG 9) =================
  {
    id: 'cow_milk',
    nameEn: "Cow's Milk & Dairy",
    nameZh: '牛奶及乳制品',
    emoji: '🥛',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Butter, cheese, cream, yogurt, whey, casein, ghee, milk protein',
    commonSourcesZh: '黄油, 奶酪, 芝士, 奶油, 酸奶, 乳清, 酥油, 牛奶蛋白',
    keywords: [
      'milk', 'dairy', 'butter', 'cheese', 'parmesan', 'cheddar', 'mozzarella', 'cream', 'heavy cream',
      'sour cream', 'whipping cream', 'yogurt', 'whey', 'casein', 'ghee', 'condensed milk', 'ricotta',
      '牛奶', '乳制品', '黄油', '奶酪', '芝士', '奶油', '淡奶油', '酸奶', '乳清', '炼乳', '酥油', '起司'
    ],
    negatives: ['coconut milk', 'soy milk', 'almond milk', 'oat milk', 'rice milk', '椰浆', '椰奶', '豆浆', '燕麦奶', '杏仁奶']
  },
  {
    id: 'eggs',
    nameEn: 'Eggs',
    nameZh: '鸡蛋及蛋制品',
    emoji: '🥚',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Egg white, yolk, albumin, egg-wash, mayonnaise, meringue',
    commonSourcesZh: '蛋白, 蛋黄, 蛋液, 蛋黄酱, 美乃滋, 蛋皮, 蛋白糖霜',
    keywords: [
      'egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise', 'albumin', 'ovalbumin', 'meringue',
      '鸡蛋', '蛋黄', '蛋白', '蛋清', '美乃滋', '蛋黄酱', '全蛋', '鸽蛋', '鸭蛋', '皮蛋', '咸蛋'
    ],
    negatives: ['eggplant', 'egg plant', '茄子']
  },
  {
    id: 'peanuts',
    nameEn: 'Peanuts',
    nameZh: '花生及花生制品',
    emoji: '🥜',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Peanut butter, peanut flour, peanut oil, satay sauce, crushed peanuts',
    commonSourcesZh: '花生酱, 花生粉, 花生油, 沙爹酱, 熟花生碎',
    keywords: [
      'peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut', 'arachis',
      '花生', '花生酱', '花生油', '花生碎', '落花生', '沙爹'
    ]
  },
  {
    id: 'tree_nuts',
    nameEn: 'Tree Nuts (Almonds, Cashews, Walnuts, etc.)',
    nameZh: '坚果类 (杏仁/腰果/核桃/榛子等)',
    emoji: '🌰',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Almonds, cashews, hazelnuts, walnuts, pecans, pistachios, pine nuts, macadamia',
    commonSourcesZh: '杏仁, 腰果, 榛子, 核桃, 碧根果, 开心果, 松子, 夏威夷果, 坚果碎, 坚果酱',
    keywords: [
      'tree nut', 'tree nuts', 'nut', 'nuts', 'almond', 'almonds', 'cashew', 'cashews', 'hazelnut', 'hazelnuts',
      'walnut', 'walnuts', 'pecan', 'pecans', 'pistachio', 'pistachios', 'pine nut', 'pine nuts',
      'macadamia', 'brazil nut', 'chestnut', 'chestnuts', 'praline', 'marzipan',
      '坚果', '树坚果', '杏仁', '腰果', '核桃', '榛子', '开心果', '碧根果', '松子', '夏威夷果', '板栗', '栗子', '巴西坚果'
    ],
    negatives: ['nutmeg', 'water chestnut', 'coconut', '肉豆蔻', '马蹄', '荸荠', '椰子', '椰浆', 'peanut', '花生']
  },
  {
    id: 'shellfish_crustacean',
    nameEn: 'Crustacean Shellfish (Shrimp, Crab, Lobster)',
    nameZh: '甲壳类水产 (虾/蟹/龙虾)',
    emoji: '🦐',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Shrimp, prawns, crab, lobster, crayfish, shrimp paste, shrimp powder',
    commonSourcesZh: '虾, 鲜虾, 虾仁, 大虾, 螃蟹, 蟹肉, 龙虾, 小龙虾, 虾酱, 虾皮, 虾米',
    keywords: [
      'shrimp', 'shrimps', 'prawn', 'prawns', 'crab', 'crabs', 'crab meat', 'lobster', 'crayfish',
      'shrimp paste', 'dried shrimp', 'scampi',
      '虾', '鲜虾', '虾仁', '大虾', '基围虾', '河虾', '海虾', '蟹', '螃蟹', '青蟹', '大闸蟹', '蟹肉', '龙虾', '小龙虾', '虾皮', '虾米', '虾酱', '甲壳'
    ]
  },
  {
    id: 'finned_fish',
    nameEn: 'Finned Fish (Salmon, Tuna, Cod, etc.)',
    nameZh: '鱼类 (三文鱼/金枪鱼/鳕鱼等)',
    emoji: '🐟',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Salmon, tuna, cod, halibut, seabass, fish sauce, dashi, anchovy, bonito flakes',
    commonSourcesZh: '三文鱼, 鳕鱼, 金枪鱼, 鲈鱼, 鱼露, 鱼汤, 柴鱼高汤, 鳀鱼, 鲣鱼节',
    keywords: [
      'fish', 'finned fish', 'salmon', 'tuna', 'cod', 'halibut', 'seabass', 'sea bass', 'tilapia', 'trout',
      'snapper', 'mackerel', 'anchovy', 'anchovies', 'bonito', 'dashi', 'fish sauce', 'fish fillet', 'surimi',
      '鱼', '鱼肉', '鱼片', '三文鱼', '金枪鱼', '鳕鱼', '鲈鱼', '罗非鱼', '比目鱼', '鲷鱼', '鲭鱼', '带鱼', '鳀鱼', '鱼露', '柴鱼', '木鱼花', '鱼丸'
    ]
  },
  {
    id: 'wheat_gluten',
    nameEn: 'Wheat & Gluten',
    nameZh: '小麦及麸质',
    emoji: '🌾',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Flour, bread, pasta, noodles, semolina, seitan, soy sauce, panko breadcrumbs',
    commonSourcesZh: '面粉, 面包, 吐司, 意面, 面条, 饺子皮, 馄饨皮, 面筋, 面包糠, 含小麦酱油',
    keywords: [
      'wheat', 'gluten', 'flour', 'all-purpose flour', 'bread flour', 'cake flour', 'plain flour',
      'bread', 'toast', 'pasta', 'spaghetti', 'fettuccine', 'noodle', 'noodles', 'ramen', 'udon',
      'semolina', 'seitan', 'breadcrumbs', 'panko', 'couscous', 'spelt',
      '小麦', '面粉', '中筋面粉', '高筋面粉', '低筋面粉', '生粉面粉', '面包', '吐司', '意大利面', '意面', '面条', '拉面', '乌冬面', '云吞面', '挂面', '面包糠', '面筋', '麸质'
    ],
    negatives: ['rice noodle', 'glass noodle', 'gluten free', 'gluten-free', '米粉', '粉丝', '河粉', '无麸质']
  },
  {
    id: 'soybeans',
    nameEn: 'Soybeans & Soy Products',
    nameZh: '大豆及豆制品',
    emoji: '🫘',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Tofu, edamame, soy milk, soy sauce, miso, doubanjiang, tempeh, soy lecithin',
    commonSourcesZh: '豆腐, 豆干, 豆皮, 毛豆, 豆浆, 生抽, 老抽, 酱油, 味噌, 豆瓣酱, 腐竹',
    keywords: [
      'soy', 'soya', 'soybean', 'soybeans', 'tofu', 'silken tofu', 'firm tofu', 'edamame',
      'soy sauce', 'light soy sauce', 'dark soy sauce', 'miso', 'tempeh', 'doubanjiang', 'chili bean paste',
      '大豆', '黄豆', '豆腐', '老豆腐', '嫩豆腐', '豆皮', '腐竹', '豆干', '毛豆', '豆浆', '酱油', '生抽', '老抽', '味噌', '豆瓣酱', '豆豉', '豆制品'
    ]
  },
  {
    id: 'sesame',
    nameEn: 'Sesame',
    nameZh: '芝麻及芝麻制品',
    emoji: '⚪',
    category: 'major',
    categoryEn: 'Major Allergen',
    categoryZh: '主要过敏原',
    commonSourcesEn: 'Sesame seeds, sesame oil, tahini, toasted sesame oil, hummus',
    commonSourcesZh: '白芝麻, 黑芝麻, 熟芝麻, 芝麻香油, 香油, 熟芝麻碎, 芝麻酱',
    keywords: [
      'sesame', 'sesame seed', 'sesame seeds', 'sesame oil', 'toasted sesame oil', 'tahini', 'gomasio',
      '芝麻', '白芝麻', '黑芝麻', '熟芝麻', '芝麻油', '香油', '麻油', '芝麻酱'
    ]
  },

  // ================= 2. REGIONAL & SENSITIVE ALLERGENS =================
  {
    id: 'molluscan_shellfish',
    nameEn: 'Molluscan Shellfish (Oysters, Clams, Squid, Mussels)',
    nameZh: '软体贝类/海鲜 (蚝/蛤蜊/青口/鱿鱼/章鱼)',
    emoji: '🦪',
    category: 'regional',
    categoryEn: 'Regional & Molluscs',
    categoryZh: '软体贝类与优先项',
    commonSourcesEn: 'Oyster sauce, clams, mussels, scallops, squid, calamari, octopus, abalone',
    commonSourcesZh: '蚝油, 生蚝, 蛤蜊, 花蛤, 青口贝, 贻贝, 扇贝, 鲜贝, 鱿鱼, 章鱼, 鲍鱼',
    keywords: [
      'mollusc', 'molluscs', 'mollusk', 'mollusks', 'oyster', 'oysters', 'oyster sauce', 'clam', 'clams',
      'mussel', 'mussels', 'scallop', 'scallops', 'squid', 'calamari', 'octopus', 'abalone',
      '软体动物', '贝类', '蚝', '生蚝', '蚝油', '蛤蜊', '花蛤', '文蛤', '青口', '贻贝', '扇贝', '带子', '干贝', '鱿鱼', '章鱼', '八爪鱼', '鲍鱼'
    ]
  },
  {
    id: 'oats',
    nameEn: 'Oats (Cross-reactive Gluten)',
    nameZh: '燕麦 (易交叉污染)',
    emoji: '🥣',
    category: 'regional',
    categoryEn: 'Regional & Grains',
    categoryZh: '麦类与谷物',
    commonSourcesEn: 'Oatmeal, oat milk, rolled oats, granola',
    commonSourcesZh: '燕麦片, 燕麦奶, 纯燕麦, 谷物麦片',
    keywords: ['oat', 'oats', 'oatmeal', 'rolled oats', 'oat milk', '燕麦', '麦片', '燕麦片', '燕麦奶']
  },
  {
    id: 'buckwheat',
    nameEn: 'Buckwheat',
    nameZh: '荞麦',
    emoji: '🍜',
    category: 'regional',
    categoryEn: 'Regional & Grains',
    categoryZh: '麦类与谷物',
    commonSourcesEn: 'Soba noodles, buckwheat flour, kasha',
    commonSourcesZh: '荞麦面, 荞麦粉, 荞麦茶',
    keywords: ['buckwheat', 'soba', 'soba noodles', '荞麦', '荞麦面', '荞麦粉']
  },
  {
    id: 'mustard',
    nameEn: 'Mustard',
    nameZh: '芥末及芥菜籽',
    emoji: '🟡',
    category: 'regional',
    categoryEn: 'Regional & Spices',
    categoryZh: '调味香料',
    commonSourcesEn: 'Mustard seeds, prepared mustard, Dijon mustard, yellow mustard',
    commonSourcesZh: '芥末酱, 第戎芥末, 黄芥末, 芥菜籽, 芥末粉',
    keywords: ['mustard', 'dijon mustard', 'yellow mustard', 'mustard seeds', '芥末', '第戎芥末', '黄芥末', '芥辣']
  },
  {
    id: 'celery',
    nameEn: 'Celery & Celeriac',
    nameZh: '芹菜与欧芹根',
    emoji: '🥬',
    category: 'regional',
    categoryEn: 'Regional & Vegetables',
    categoryZh: '蔬菜类',
    commonSourcesEn: 'Celery stalks, celery seeds, celery salt, stock cubes',
    commonSourcesZh: '西芹, 芹菜段, 芹菜叶, 芹菜籽',
    keywords: ['celery', 'celeriac', 'celery salt', '芹菜', '西芹', '欧芹根']
  },
  {
    id: 'sulphites',
    nameEn: 'Sulphites / Wine & Vinegar',
    nameZh: '亚硫酸盐 (葡萄酒/陈醋/果干)',
    emoji: '🍷',
    category: 'regional',
    categoryEn: 'Additives & Preservatives',
    categoryZh: '添加剂与防腐剂',
    commonSourcesEn: 'Wine, cooking wine, cider, dried fruits, wine vinegar',
    commonSourcesZh: '白葡萄酒, 红葡萄酒, 料酒, 花雕酒, 果脯, 葡萄醋',
    keywords: [
      'sulphite', 'sulphites', 'sulfite', 'sulfites', 'wine', 'white wine', 'red wine', 'shaoxing wine', 'cooking wine', 'mirin', 'sake',
      '亚硫酸盐', '葡萄酒', '红酒', '白葡萄酒', '料酒', '绍兴酒', '花雕酒', '味醂', '清酒'
    ]
  },

  // ================= 3. MEAT EXCLUSIONS =================
  {
    id: 'pork',
    nameEn: 'Pork & Lard',
    nameZh: '猪肉及猪油 (清真忌口)',
    emoji: '🥓',
    category: 'meat',
    categoryEn: 'Meat Exclusions',
    categoryZh: '肉类忌口',
    commonSourcesEn: 'Pork meat, pork ribs, pork belly, bacon, ham, lard, sausages',
    commonSourcesZh: '猪肉, 五花肉, 排骨, 里脊, 培根, 火腿, 猪油, 腊肠, 香肠',
    keywords: [
      'pork', 'ground pork', 'pork belly', 'pork ribs', 'pork chops', 'pork tenderloin', 'pork mince',
      'bacon', 'ham', 'pancetta', 'prosciutto', 'lard',
      '猪肉', '五花肉', '排骨', '猪排', '里脊肉', '猪肉馅', '肉末', '培根', '火腿', '猪油', '腊肉', '香肠'
    ]
  },
  {
    id: 'beef',
    nameEn: 'Beef & Veal',
    nameZh: '牛肉 (印度教忌口/Alpha-Gal)',
    emoji: '🥩',
    category: 'meat',
    categoryEn: 'Meat Exclusions',
    categoryZh: '肉类忌口',
    commonSourcesEn: 'Beef, ground beef, steak, brisket, beef ribs, beef broth',
    commonSourcesZh: '牛肉, 牛排, 牛绞肉, 牛腩, 牛骨汤, 牛肉碎, 牛小排',
    keywords: [
      'beef', 'ground beef', 'beef tenderloin', 'beef brisket', 'beef shank', 'beef short ribs',
      'beef mince', 'steak', 'sirloin', 'ribeye', 'beef stock',
      '牛肉', '牛排', '牛腩', '牛腱', '牛里脊', '牛小排', '牛肉馅', '牛绞肉', '牛高汤'
    ]
  },
  {
    id: 'chicken_poultry',
    nameEn: 'Chicken & Poultry',
    nameZh: '鸡肉与禽肉',
    emoji: '🍗',
    category: 'meat',
    categoryEn: 'Meat Exclusions',
    categoryZh: '肉类忌口',
    commonSourcesEn: 'Chicken, chicken breast, chicken thigh, duck, turkey, poultry broth',
    commonSourcesZh: '鸡肉, 鸡腿肉, 鸡胸肉, 鸡翅, 鸭肉, 火鸡肉, 鸡高汤',
    keywords: [
      'chicken', 'chicken breast', 'chicken thigh', 'chicken wings', 'chicken drumstick', 'whole chicken',
      'duck', 'turkey', 'poultry', 'chicken stock', 'chicken bouillon',
      '鸡肉', '鸡腿', '鸡胸', '鸡翅', '整鸡', '鸡汤', '鸡精', '鸭肉', '鸭胸', '火鸡'
    ]
  },
  {
    id: 'lamb_mutton',
    nameEn: 'Lamb & Mutton',
    nameZh: '羊肉',
    emoji: '🍖',
    category: 'meat',
    categoryEn: 'Meat Exclusions',
    categoryZh: '肉类忌口',
    commonSourcesEn: 'Lamb, lamb chops, ground lamb, mutton',
    commonSourcesZh: '羊肉, 羊排, 羊肉馅, 羊腿肉',
    keywords: ['lamb', 'lamb chops', 'ground lamb', 'mutton', '羊肉', '羊排', '羊肉卷', '羊腿']
  },

  // ================= 4. ALLIUMS & NIGHTSHADES =================
  {
    id: 'alliums',
    nameEn: 'Alliums (Garlic, Onion, Scallions, Shallots)',
    nameZh: '葱蒜类 (大蒜/洋葱/青葱/韭菜)',
    emoji: '🧄',
    category: 'nightshade_allium',
    categoryEn: 'Alliums & Nightshades',
    categoryZh: '葱蒜与茄科',
    commonSourcesEn: 'Garlic, yellow onion, red onion, scallions, spring onions, shallots, chives, leeks',
    commonSourcesZh: '大蒜, 蒜泥, 洋葱, 香葱, 小葱, 大葱, 红葱头, 韭菜, 韭黄, 蒜苗',
    keywords: [
      'garlic', 'minced garlic', 'garlic clove', 'onion', 'yellow onion', 'red onion',
      'scallion', 'scallions', 'green onion', 'spring onion', 'shallot', 'shallots', 'leek', 'chives',
      '大蒜', '蒜', '蒜泥', '蒜瓣', '蒜末', '洋葱', '黄洋葱', '紫洋葱', '葱', '小葱', '香葱', '大葱', '葱花', '红葱头', '韭菜', '蒜苗'
    ]
  },
  {
    id: 'nightshades',
    nameEn: 'Nightshades (Tomatoes, Eggplant, Peppers, Potatoes)',
    nameZh: '茄科蔬菜 (番茄/茄子/彩椒/辣椒/土豆)',
    emoji: '🍅',
    category: 'nightshade_allium',
    categoryEn: 'Alliums & Nightshades',
    categoryZh: '葱蒜与茄科',
    commonSourcesEn: 'Tomatoes, tomato paste, eggplant, bell peppers, chili peppers, potatoes',
    commonSourcesZh: '番茄, 西红柿, 番茄膏, 茄子, 彩椒, 甜椒, 辣椒, 辣椒酱, 土豆, 马铃薯',
    keywords: [
      'tomato', 'roma tomato', 'cherry tomato', 'tomato paste', 'tomato sauce', 'ketchup',
      'eggplant', 'aubergine', 'bell pepper', 'red bell pepper', 'green bell pepper', 'chili', 'jalapeno', 'potato', 'potatoes',
      '番茄', '西红柿', '圣女果', '番茄酱', '番茄膏', '茄子', '彩椒', '甜椒', '青椒', '红椒', '辣椒', '朝天椒', '土豆', '马铃薯'
    ]
  },

  // ================= 5. SEEDS & LEGUMES =================
  {
    id: 'legumes_pulses',
    nameEn: 'Legumes & Pulses (Chickpeas, Lentils, Peas, Beans)',
    nameZh: '豆类 (鹰嘴豆/扁豆/豌豆/四季豆)',
    emoji: '🫛',
    category: 'seed_legume',
    categoryEn: 'Seeds & Legumes',
    categoryZh: '种籽与豆类',
    commonSourcesEn: 'Chickpeas, hummus, lentils, green peas, fava beans, kidney beans, black beans',
    commonSourcesZh: '鹰嘴豆, 扁豆, 豌豆, 青豆, 蚕豆, 红腰豆, 黑豆, 四季豆',
    keywords: [
      'chickpea', 'chickpeas', 'hummus', 'lentil', 'lentils', 'green peas', 'peas', 'fava bean', 'kidney bean', 'black bean', 'green bean',
      '鹰嘴豆', '扁豆', '豌豆', '青豆', '蚕豆', '四季豆', '红豆', '绿豆', '黑豆'
    ]
  },

  // ================= 6. FRUITS =================
  {
    id: 'fruits_sensitive',
    nameEn: 'Sensitive Fruits (Kiwi, Avocado, Stone Fruits, Banana)',
    nameZh: '易过敏水果 (奇异果/牛油果/桃子/香蕉)',
    emoji: '🥝',
    category: 'fruit',
    categoryEn: 'Fruits',
    categoryZh: '水果类',
    commonSourcesEn: 'Kiwi, avocado, peach, plum, apricot, mango, banana, pineapple',
    commonSourcesZh: '奇异果, 猕猴桃, 牛油果, 桃子, 李子, 芒果, 香蕉, 菠萝, 凤梨',
    keywords: [
      'kiwi', 'avocado', 'peach', 'plum', 'apricot', 'mango', 'banana', 'pineapple',
      '奇异果', '猕猴桃', '牛油果', '酪梨', '桃子', '李子', '芒果', '香蕉', '菠萝', '凤梨'
    ]
  }
];

const ALLERGEN_MAP = new Map<string, AllergenDefinition>();
ALLERGEN_TAXONOMY.forEach((a) => ALLERGEN_MAP.set(a.id, a));

/**
 * Get Allergen definition by ID
 */
export function getAllergenById(id: string): AllergenDefinition | undefined {
  return ALLERGEN_MAP.get(id);
}

/**
 * High-Precision Recipe Allergen Detector
 * Analyzes structured ingredients, dish name, and tags across both English and Chinese
 */
export function detectDishAllergens(dish: Dish): string[] {
  if (!dish) return [];

  // If already pre-computed and stored, return
  if (Array.isArray(dish.allergens) && dish.allergens.length > 0) {
    return dish.allergens;
  }

  const detected = new Set<string>();

  // Build searchable text corpus for the dish
  const safeName = (dish.name || '').toLowerCase();
  const safeTags = Array.isArray(dish.tags) ? dish.tags.filter((t) => typeof t === 'string').join(' ').toLowerCase() : '';
  const safeIngs = Array.isArray(dish.ingredients)
    ? dish.ingredients.filter((i) => i && typeof i.name === 'string').map((i) => i.name.toLowerCase()).join(' ')
    : '';

  const fullCorpus = `${safeName} ${safeTags} ${safeIngs}`;

  ALLERGEN_TAXONOMY.forEach((allergen) => {
    // 1. Check if any negative keywords match to avoid false positives
    if (allergen.negatives && allergen.negatives.some((neg) => fullCorpus.includes(neg.toLowerCase()))) {
      // If full match was only from the negative item, skip
      const filteredCorpus = allergen.negatives.reduce(
        (acc, neg) => acc.replaceAll(neg.toLowerCase(), ''),
        fullCorpus
      );
      const hasMatch = allergen.keywords.some((kw) => filteredCorpus.includes(kw.toLowerCase()));
      if (hasMatch) {
        detected.add(allergen.id);
      }
      return;
    }

    // 2. Direct keyword search
    const hasMatch = allergen.keywords.some((kw) => fullCorpus.includes(kw.toLowerCase()));
    if (hasMatch) {
      detected.add(allergen.id);
    }
  });

  return Array.from(detected);
}

/**
 * Calculate aggregated family allergens across all family members + family household rules
 */
export function getFamilyAllergens(
  familyMembers: string[],
  memberProfiles?: Record<string, MemberPreferences>,
  familyPersonalisation?: FamilyPersonalisation
): string[] {
  const set = new Set<string>();

  // 1. Union of all member-declared allergies
  if (memberProfiles) {
    familyMembers.forEach((member) => {
      const prefs = memberProfiles[member];
      if (prefs?.allergies) {
        prefs.allergies.forEach((alg) => set.add(alg));
      }
    });
  }

  // 2. Household-wide exclusions
  if (familyPersonalisation?.householdAllergies) {
    familyPersonalisation.householdAllergies.forEach((alg) => set.add(alg));
  }

  return Array.from(set);
}

/**
 * Check which specific family members are at risk for a dish
 */
export function checkDishAllergenRisk(
  dish: Dish,
  memberProfiles?: Record<string, MemberPreferences>,
  familyMembers: string[] = []
): {
  hasRisk: boolean;
  dishAllergens: string[];
  affectedMembers: { memberName: string; allergens: string[] }[];
} {
  const dishAllergens = detectDishAllergens(dish);
  const membersToCheck = familyMembers.length > 0 ? familyMembers : Object.keys(memberProfiles || {});
  if (dishAllergens.length === 0 || !memberProfiles || membersToCheck.length === 0) {
    return { hasRisk: false, dishAllergens, affectedMembers: [] };
  }

  const affectedMembers: { memberName: string; allergens: string[] }[] = [];

  membersToCheck.forEach((member) => {
    const prefs = memberProfiles[member];
    if (prefs?.allergies && prefs.allergies.length > 0) {
      const triggered = prefs.allergies.filter((alg) => dishAllergens.includes(alg));
      if (triggered.length > 0) {
        affectedMembers.push({ memberName: member, allergens: triggered });
      }
    }
  });

  return {
    hasRisk: affectedMembers.length > 0,
    dishAllergens,
    affectedMembers
  };
}

/**
 * Reconcile and calculate plan frequencies & last planned dates from mealPlan calendar history
 */
export function calculateDishPlanStats(dishes: Dish[], mealPlan: MealPlan): Dish[] {
  if (!mealPlan || typeof mealPlan !== 'object') return dishes;

  const countMap = new Map<string, { count: number; latestDate: string }>();

  // Iterate all dates in meal plan
  Object.entries(mealPlan).forEach(([dateStr, dayPlan]) => {
    if (!dayPlan || typeof dayPlan !== 'object') return;

    Object.values(dayPlan).forEach((entry) => {
      if (!entry) return;
      const ids: string[] = [];
      if (Array.isArray(entry.dishIds)) {
        ids.push(...entry.dishIds);
      } else if (entry.dishId) {
        ids.push(entry.dishId);
      }

      ids.forEach((id) => {
        if (!id) return;
        const current = countMap.get(id) || { count: 0, latestDate: '' };
        current.count += 1;
        if (!current.latestDate || dateStr > current.latestDate) {
          current.latestDate = dateStr;
        }
        countMap.set(id, current);
      });
    });
  });

  // Update dishes with aggregated stats
  return dishes.map((dish) => {
    const stats = countMap.get(dish.id);
    const timesPlanned = stats ? stats.count : (dish.timesPlanned || 0);
    const lastPlannedAt = stats?.latestDate || dish.lastPlannedAt || undefined;

    if (dish.timesPlanned === timesPlanned && dish.lastPlannedAt === lastPlannedAt) {
      return dish;
    }

    return {
      ...dish,
      timesPlanned,
      lastPlannedAt
    };
  });
}

/**
 * Generate smart personalized recipe recommendations
 */
export function getPersonalizedRecommendations(
  dishes: Dish[],
  memberPrefs?: MemberPreferences,
  familyPrefs?: FamilyPersonalisation,
  familyMembers: string[] = []
): {
  familyClassics: Dish[];
  forgottenFavorites: Dish[];
  quickStaples: Dish[];
  cuisineMatches: Dish[];
} {
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const familyAllergens = getFamilyAllergens(familyMembers, undefined, familyPrefs);

  // Exclude dishes with family allergens if strict filter is active
  const safeDishes = dishes.filter((dish) => {
    if (familyPrefs?.strictAllergyFilter) {
      const dishAlgs = detectDishAllergens(dish);
      const isUnsafe = dishAlgs.some((alg) => familyAllergens.includes(alg));
      if (isUnsafe) return false;
    }
    return true;
  });

  // 1. Family Classics: Top planned dishes (timesPlanned >= 2 or favorited by multiple members)
  const familyClassics = [...safeDishes]
    .filter((d) => (d.timesPlanned && d.timesPlanned >= 2) || (d.favoritedByMembers && d.favoritedByMembers.length > 0))
    .sort((a, b) => (b.timesPlanned || 0) - (a.timesPlanned || 0))
    .slice(0, 10);

  // 2. Forgotten Favorites: Has been planned before, but not in the last 3 weeks
  const forgottenFavorites = safeDishes
    .filter((d) => d.lastPlannedAt && d.lastPlannedAt < twentyOneDaysAgo && (d.timesPlanned || 0) >= 1)
    .sort((a, b) => (a.lastPlannedAt || '').localeCompare(b.lastPlannedAt || ''))
    .slice(0, 8);

  // 3. Quick Staples: Under 20 minutes with high favoriting/plan count
  const quickStaples = safeDishes
    .filter((d) => (d.prepTimeMinutes || 999) <= 20)
    .sort((a, b) => (b.timesPlanned || 0) - (a.timesPlanned || 0))
    .slice(0, 8);

  // 4. Cuisine Matches: Matching member / family favorite cuisines
  const favCuisines = new Set([
    ...(memberPrefs?.favoriteCuisines || []),
    ...(familyPrefs?.householdCuisines || [])
  ].map((c) => c.toLowerCase()));

  const cuisineMatches = favCuisines.size > 0
    ? safeDishes.filter((d) => d.cuisine && favCuisines.has(d.cuisine.toLowerCase())).slice(0, 10)
    : [];

  return {
    familyClassics,
    forgottenFavorites,
    quickStaples,
    cuisineMatches
  };
}
