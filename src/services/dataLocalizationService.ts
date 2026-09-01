import type { Dish, Ingredient, MasterIngredient, LocalizedDishContent } from '../types';
import type { Language } from './languageService';

/**
 * Extensive bidirectional ingredient translation dictionary
 */
export const INGREDIENT_TRANSLATION_MAP: Record<string, string> = {
  // Meats & Poultry
  'ground beef': '牛肉馅 / 绞牛肉',
  'beef': '牛肉',
  'beef tenderloin': '牛里脊肉',
  'beef shank': '牛腱子肉',
  'beef brisket': '牛腩',
  'beef short ribs': '牛小排 / 牛仔骨',
  'beef mince': '牛绞肉',
  'ground pork': '猪肉馅 / 绞猪肉',
  'pork': '猪肉',
  'pork belly': '五花肉',
  'pork ribs': '排骨',
  'pork chops': '猪排',
  'pork tenderloin': '里脊肉',
  'chicken': '鸡肉',
  'chicken thigh': '鸡腿肉',
  'chicken breast': '鸡胸肉',
  'chicken wings': '鸡翅',
  'chicken drumsticks': '小鸡腿 / 鸡琵琶腿',
  'whole chicken': '整鸡',
  'lamb': '羊肉',
  'lamb chops': '羊排',
  'ground lamb': '羊肉馅',
  'duck breast': '鸭胸肉',
  'bacon': '培根',
  'pancetta': '意式培根',
  'ham': '火腿',
  'sausage': '香肠',
  'chorizo': '西班牙香肠',

  // Seafood
  'salmon': '三文鱼 / 鲑鱼',
  'salmon fillet': '三文鱼排',
  'cod': '鳕鱼',
  'cod fillet': '鳕鱼排',
  'seabass': '海鲈鱼',
  'white fish': '白身鱼',
  'fish fillet': '鱼片',
  'shrimp': '鲜虾 / 虾仁',
  'prawns': '大虾',
  'squid': '鱿鱼',
  'calamari': '鲜鱿',
  'scallops': '带子 / 鲜贝',
  'mussels': '青口贝 / 贻贝',
  'clams': '蛤蜊 / 花蛤',
  'crab meat': '蟹肉',
  'tuna': '金枪鱼',
  'canned tuna': '金枪鱼罐头',

  // Produce & Vegetables
  'roma tomato': '罗马番茄',
  'tomato': '番茄 / 西红柿',
  'cherry tomatoes': '圣女果 / 小番茄',
  'yellow onion': '黄洋葱',
  'red onion': '紫洋葱',
  'onion': '洋葱',
  'green onion / scallion': '小葱 / 香葱',
  'green onion': '小葱 / 香葱',
  'scallion': '小葱 / 香葱',
  'spring onion': '大葱 / 细葱',
  'garlic': '大蒜',
  'garlic clove': '蒜瓣',
  'minced garlic': '蒜泥 / 蒜末',
  'ginger': '生姜',
  'ginger root': '鲜姜',
  'potato': '土豆 / 马铃薯',
  'potatoes': '土豆 / 马铃薯',
  'carrot': '胡萝卜',
  'carrots': '胡萝卜',
  'cucumber': '黄瓜',
  'cabbage': '卷心菜 / 包菜',
  'napa cabbage': '大白菜',
  'chinese cabbage': '大白菜',
  'bok choy': '油菜 / 上海青',
  'choy sum': '菜心',
  'spinach': '菠菜',
  'broccoli': '西兰花',
  'cauliflower': '花菜 / 菜花',
  'lettuce': '生菜',
  'romaine lettuce': '罗马生菜',
  'celery': '芹菜',
  'eggplant': '茄子',
  'zucchini': '西葫芦',
  'bell pepper': '彩椒 / 甜椒',
  'red bell pepper': '红甜椒',
  'green bell pepper': '青椒',
  'chili': '辣椒',
  'red chili': '红辣椒',
  'bird\'s eye chili': '朝天椒 / 指天椒',
  'jalapeno': '墨西哥辣椒',
  'bitter melon': '苦瓜',
  'mushrooms': '蘑菇',
  'shiitake mushroom': '香菇',
  'shiitake mushrooms': '香菇',
  'button mushrooms': '白蘑菇 / 口蘑',
  'king oyster mushroom': '杏鲍菇',
  'enoki mushroom': '金针菇',
  'bean sprouts': '绿豆芽 / 豆芽',
  'corn': '玉米',
  'sweet corn': '甜玉米',
  'green beans': '四季豆 / 豆角',
  'peas': '青豆 / 豌豆',
  'avocado': '牛油果 / 酪梨',
  'lemon': '柠檬',
  'lemon juice': '柠檬汁',
  'lime': '青柠',
  'lime juice': '青柠汁',
  'coriander / cilantro': '香菜',
  'cilantro': '香菜',
  'coriander': '香菜',
  'thai basil': '泰式罗勒 / 九层塔',
  'holy basil': '圣罗勒',
  'basil': '罗勒叶',
  'fresh herbs': '新鲜香草',
  'rosemary': '迷迭香',
  'thyme': '百里香',
  'oregano': '牛至',
  'parsley': '欧芹 / 荷兰芹',
  'mint': '薄荷叶',

  // Dairy & Eggs
  'chicken egg': '鸡蛋',
  'egg': '鸡蛋',
  'eggs': '鸡蛋',
  'egg yolk': '蛋黄',
  'egg white': '蛋白',
  'butter': '黄油',
  'unsalted butter': '无盐黄油',
  'milk': '牛奶',
  'whole milk': '全脂牛奶',
  'heavy cream': '重奶油 / 鲜奶油',
  'whipping cream': '打发鲜奶油',
  'sour cream': '酸奶油',
  'parmesan cheese': '帕玛森芝士 / 奶酪',
  'parmesan': '帕玛森芝士',
  'mozzarella cheese': '马苏里拉芝士',
  'cheddar cheese': '切达芝士',
  'cream cheese': '奶油奶酪',
  'yogurt': '酸奶',
  'greek yogurt': '希腊酸奶',

  // Pantry, Rice, Noodles & Grains
  'white rice (cooked)': '米饭 (熟)',
  'white rice': '大米 / 白米',
  'jasmine rice': '茉莉香米',
  'brown rice': '糙米',
  'glutinous rice': '糯米',
  'wonton noodles': '云吞面 / 细面',
  'egg noodles': '全蛋面',
  'ramen noodles': '拉面',
  'udon noodles': '乌冬面',
  'soba noodles': '荞麦面',
  'spaghetti': '意大利直面',
  'fettuccine': '意大利宽面',
  'pasta': '意大利面',
  'flat rice noodles': '河粉 / 粿条',
  'rice vermicelli': '米粉 / 细米粉',
  'glass noodles': '粉丝 / 冬粉',
  'bread': '面包',
  'toast': '吐司',
  'sourdough': '酸种面包',
  'baguette': '法棍面包',
  'panko breadcrumbs': '日式面包糠',
  'breadcrumbs': '面包糠',
  'flour': '面粉',
  'all-purpose flour': '中筋面粉',
  'plain flour': '中筋面粉',
  'bread flour': '高筋面粉',
  'cake flour': '低筋面粉',
  'cornstarch': '玉米淀粉 / 生粉',
  'potato starch': '土豆淀粉 / 太白粉',
  'tapioca starch': '木薯淀粉',

  // Condiments, Sauces & Oils
  'cooking oil': '食用油',
  'vegetable oil': '植物油',
  'olive oil': '橄榄油',
  'extra virgin olive oil': '特级初榨橄榄油',
  'sesame oil': '芝麻香油',
  'toasted sesame oil': '熟芝麻香油',
  'chili oil': '红油辣椒 / 辣椒油',
  'soy sauce': '生抽酱油',
  'light soy sauce': '生抽',
  'dark soy sauce': '老抽',
  'oyster sauce': '蚝油',
  'fish sauce': '鱼露',
  'shaoxing wine': '绍兴花雕酒 / 料酒',
  'cooking wine': '料酒',
  'mirin': '味醂 (日式甜料酒)',
  'sake': '日本清酒',
  'rice vinegar': '米醋',
  'black vinegar': '镇江香醋 / 陈醋',
  'white vinegar': '白醋',
  'balsamic vinegar': '黑醋 / 葡萄香醋',
  'sesame seed': '熟白芝麻',
  'sesame seeds': '白芝麻',
  'honey': '蜂蜜',
  'brown sugar': '红糖 / 黄糖',
  'white sugar': '白砂糖',
  'sugar': '白糖',
  'salt': '食盐',
  'sea salt': '海盐',
  'black pepper': '黑胡椒粉 / 黑胡椒碎',
  'ground black pepper': '黑胡椒粉',
  'white pepper': '白胡椒粉',
  'sichuan peppercorn': '四川花椒',
  'sichuan pepper': '花椒',
  'five spice powder': '五香粉',
  'doubanjiang': '郫县豆瓣酱',
  'chili bean paste': '豆瓣酱',
  'gochujang': '韩式辣酱',
  'doenjang': '韩式大豆酱',
  'miso paste': '日式味噌',
  'curry powder': '咖喱粉',
  'curry paste': '咖喱酱',
  'cumin': '孜然粉',
  'paprika': '红椒粉',
  'smoked paprika': '烟熏红椒粉',
  'turmeric': '姜黄粉',
  'cinnamon': '肉桂粉',
  'star anise': '八角 / 大料',
  'bay leaf': '香叶',
  'bay leaves': '香叶',
  'chicken bouillon': '鸡精 / 浓汤宝',
  'chicken stock': '鸡汤 / 高汤',
  'beef stock': '牛高汤',
  'vegetable stock': '蔬菜高汤',
  'dashi': '日式出汁 / 柴鱼高汤',
  'tomato paste': '番茄膏',
  'tomato sauce': '番茄酱',
  'ketchup': '番茄沙司',
  'mayonnaise': '蛋黄酱 / 美乃滋',
  'dijon mustard': '大葱芥末酱',
  'peanut butter': '花生酱',
  'coconut milk': '椰浆 / 椰奶',
  'coconut cream': '浓椰浆',

  // Soy & Tofu
  'firm tofu': '老豆腐 / 卤水豆腐',
  'silken tofu': '嫩豆腐 / 绢豆腐',
  'soft tofu': '嫩豆腐',
  'tofu': '豆腐',
  'fried tofu puff': '油豆腐 / 豆泡',
  'dried bean curd': '腐竹 / 豆皮'
};

// Reverse lookup for Chinese -> English
const REVERSE_INGREDIENT_MAP = new Map<string, string>();
Object.entries(INGREDIENT_TRANSLATION_MAP).forEach(([en, zh]) => {
  const cleanEn = en.toLowerCase().trim();
  // split aliases like "番茄 / 西红柿"
  const aliases = zh.split('/').map((s) => s.trim().toLowerCase());
  aliases.forEach((alias) => {
    if (alias && !REVERSE_INGREDIENT_MAP.has(alias)) {
      REVERSE_INGREDIENT_MAP.set(alias, cleanEn);
    }
  });
});

/**
 * Built-in translation registry for standard starter dishes
 */
export const STARTER_RECIPE_TRANSLATIONS: Record<string, LocalizedDishContent> = {
  'dish_tomato_meatball': {
    name: '茄汁牛肉丸',
    tags: ['家庭常备', '治愈美味', '西餐经典'],
    instructions: '1. 牛肉馅中加入盐、黑胡椒及少许橄榄油搅拌上劲，捏成12-14个圆肉丸。\n2. 平底锅中火热油，放入牛肉丸煎至表面微焦上色（约5-7分钟）。\n3. 锅中加入切碎的黄洋葱、大蒜末和切丁的番茄，翻炒出浓郁红汁。\n4. 转小火慢炖20分钟，直至茄汁浓稠、肉丸熟透入味。\n5. 撒上新鲜香草碎，热腾腾出锅，配米饭或意面均绝配！',
    ingredients: [
      { id: 'ing_mb_1', name: '牛肉馅' },
      { id: 'ing_mb_2', name: '罗马番茄' },
      { id: 'ing_mb_3', name: '大蒜瓣' },
      { id: 'ing_mb_4', name: '黄洋葱' },
      { id: 'ing_mb_5', name: '橄榄油' }
    ]
  },
  'dish_chicken_teriyaki': {
    name: '日式经典照烧鸡腿肉',
    tags: ['日料', '快手少油', '全家喜爱'],
    instructions: '1. 去骨鸡腿肉用厨房纸吸干表面水分，用叉子在鸡皮上扎小孔方便入味与煎脆。\n2. 小碗中混合生抽、蜂蜜（或味醂）、白糖和姜末调成照烧汁。\n3. 平底锅免油，鸡皮朝下小火慢煎6分钟至金黄酥脆，翻面再煎4分钟。\n4. 倒入调制好的照烧汁，大火煮沸收汁至浓稠起泡，均匀裹在鸡肉上。\n5. 切块装盘，浇上锅底剩余浓汁，撒熟白芝麻，搭配热米饭与水煮西兰花。',
    ingredients: [
      { id: 'ing_ty_1', name: '去骨鸡腿肉' },
      { id: 'ing_ty_2', name: '生抽酱油' },
      { id: 'ing_ty_3', name: '蜂蜜' },
      { id: 'ing_ty_4', name: '鲜生姜' },
      { id: 'ing_ty_5', name: '蒜瓣' },
      { id: 'ing_ty_6', name: '熟白芝麻' }
    ]
  },
  'dish_korean_beef_bulgogi': {
    name: '韩式烤牛肉盖饭',
    tags: ['韩料', '高蛋白', '快手晚餐'],
    instructions: '1. 小碗中混合生抽、芝麻香油、红糖、蒜泥和黑胡椒粉调成韩式烤肉腌料。\n2. 将牛里脊薄片放入腌料中抓匀，静置腌制5-10分钟。\n3. 热锅热油，大火快速翻炒牛肉片和洋葱丝4-5分钟至焦香嫩滑。\n4. 撒入葱花与白芝麻翻炒均匀出锅。\n5. 铺在热米饭上，可搭配泡菜与溏心蛋享用。',
    ingredients: [
      { id: 'ing_bg_1', name: '牛里脊薄片' },
      { id: 'ing_bg_2', name: '生抽酱油' },
      { id: 'ing_bg_3', name: '芝麻香油' },
      { id: 'ing_bg_4', name: '红糖' },
      { id: 'ing_bg_5', name: '小葱' },
      { id: 'ing_bg_6', name: '大蒜瓣' }
    ]
  },
  'dish_egg_fried_rice': {
    name: '经典黄金蛋炒饭',
    tags: ['粤菜', '极简快手', '粒粒分明'],
    instructions: '1. 3个鸡蛋打散，加入少许盐搅拌均匀。\n2. 热锅热油，倒入蛋液快速滑炒至8分熟盛出备用。\n3. 锅底余油下入隔夜冷米饭，用锅铲压散翻炒至米粒跳动。\n4. 沿锅边淋入少许生抽，撒白胡椒粉与芝麻油提香。\n5. 倒入炒好的鸡蛋和葱花，大火快速翻炒2分钟即可出锅！',
    ingredients: [
      { id: 'ing_fr_1', name: '冷米饭' },
      { id: 'ing_fr_2', name: '鸡蛋' },
      { id: 'ing_fr_3', name: '小葱' },
      { id: 'ing_fr_4', name: '生抽' },
      { id: 'ing_fr_5', name: '食用油' }
    ]
  },
  'dish_thai_basil_chicken': {
    name: '泰式打抛罗勒鸡肉',
    tags: ['东南亚菜', '香辣开胃', '下饭神器'],
    instructions: '1. 蒜瓣和新鲜朝天椒用研钵粗捣成蒜辣蓉。\n2. 锅中热油，下入蒜辣蓉大火爆香30秒至香气四溢。\n3. 加入鸡肉碎大火快速翻炒散开至变色熟透。\n4. 淋入生抽、蚝油、鱼露及少许白糖大火翻炒入味。\n5. 关火前迅速加入一大把新鲜九层塔/罗勒叶，利用余温翻匀至微蔫，盖在米饭上，配一颗焦边太阳蛋！',
    ingredients: [
      { id: 'ing_tb_1', name: '鸡肉碎 / 鸡胸肉丁' },
      { id: 'ing_tb_2', name: '九层塔 / 泰式罗勒叶' },
      { id: 'ing_tb_3', name: '蒜瓣' },
      { id: 'ing_tb_4', name: '朝天椒 / 红辣椒' },
      { id: 'ing_tb_5', name: '生抽' },
      { id: 'ing_tb_6', name: '蚝油' },
      { id: 'ing_tb_7', name: '鱼露' }
    ]
  },
  'dish_lemongrass_pork': {
    name: '越式香茅烤猪排',
    tags: ['东南亚菜', '香气浓郁', '煎烤两相宜'],
    instructions: '1. 香茅、大蒜和小葱头细细切碎成末。\n2. 碗中加入鱼露、红糖、生抽和黑胡椒粉搅拌均匀成腌肉汁。\n3. 将猪排均匀抹上腌料，冷藏腌制至少15分钟。\n4. 平底锅中火热油，将猪排每面煎4-5分钟至焦香金黄上色。\n5. 静置3分钟后切条装盘，配黄瓜片、腌萝卜和热米饭享用。',
    ingredients: [
      { id: 'ing_lp_1', name: '猪大排 / 猪里脊' },
      { id: 'ing_lp_2', name: '新鲜香茅' },
      { id: 'ing_lp_3', name: '大蒜瓣' },
      { id: 'ing_lp_4', name: '鱼露' },
      { id: 'ing_lp_5', name: '红糖' }
    ]
  },
  'dish_sweet_sour_chicken': {
    name: '港式菠萝咕咾鸡 (糖醋鸡丁)',
    tags: ['粤菜', '酸甜开胃', '经典名菜'],
    instructions: '1. 鸡胸肉切小块，裹上玉米淀粉和少许盐拌匀抓匀。\n2. 热油大火将鸡块煎至外皮金黄酥脆（约6分钟），捞出沥油备用。\n3. 锅底余油加入彩椒块、洋葱片和菠萝块翻炒2分钟断生。\n4. 番茄酱、米醋、白糖和少许生抽调匀成糖醋汁，倒入锅中煮至起浓泡。\n5. 倒入炸好的鸡块快速翻炒，让鸡块均匀裹上晶莹红亮糖醋汁，即可出锅。',
    ingredients: [
      { id: 'ing_ss_1', name: '鸡胸肉' },
      { id: 'ing_ss_2', name: '彩椒 / 甜椒' },
      { id: 'ing_ss_3', name: '菠萝块 (鲜或罐头)' },
      { id: 'ing_ss_4', name: '黄洋葱' },
      { id: 'ing_ss_5', name: '番茄酱 / 番茄膏' }
    ]
  }
};

// Cache for getLocalizedDish to avoid recomputing during tight filter loops over 3,000+ recipes
const LOCALIZED_DISH_CACHE = new WeakMap<Dish, Map<Language, {
  name: string;
  instructions?: string;
  tags?: string[];
  ingredients: Ingredient[];
  isUntranslated: boolean;
  sourceLanguage: Language;
  fallbackTag?: string;
  _searchIndex?: string; // Precomputed lowercase search index string
}>>();

/**
 * Translate an ingredient name between English and Chinese
 */
export function getLocalizedIngredientName(name?: string, preferredLang?: Language): string {
  if (!name || typeof name !== 'string' || !name.trim()) return '';
  const clean = name.trim();
  const cleanLower = clean.toLowerCase();
  const lang = preferredLang || 'en';

  if (lang === 'zh-CN') {
    // 1. Exact match (O(1))
    if (INGREDIENT_TRANSLATION_MAP[cleanLower]) {
      return INGREDIENT_TRANSLATION_MAP[cleanLower];
    }
    // 2. Fast direct check if already Chinese characters
    if (/[\u4e00-\u9fa5]/.test(clean)) {
      return clean;
    }
    return clean; // Fast fallback to prevent O(N) regex overhead in huge lists
  } else {
    // English mode
    if (REVERSE_INGREDIENT_MAP.has(cleanLower)) {
      const en = REVERSE_INGREDIENT_MAP.get(cleanLower)!;
      return en.charAt(0).toUpperCase() + en.slice(1);
    }
    return clean;
  }
}

/**
 * Resolves a fully localized representation of a Dish with null-safety and caching
 */
export function getLocalizedDish(
  dish: Dish,
  preferredLang: Language
): {
  name: string;
  instructions?: string;
  tags?: string[];
  ingredients: Ingredient[];
  isUntranslated: boolean;
  sourceLanguage: Language;
  fallbackTag?: string;
} {
  if (!dish || typeof dish !== 'object') {
    return {
      name: 'Untitled Recipe',
      instructions: '',
      tags: [],
      ingredients: [],
      isUntranslated: true,
      sourceLanguage: 'en'
    };
  }

  let dishCache = LOCALIZED_DISH_CACHE.get(dish);
  if (!dishCache) {
    dishCache = new Map();
    LOCALIZED_DISH_CACHE.set(dish, dishCache);
  }

  const cached = dishCache.get(preferredLang);
  if (cached) {
    return cached;
  }

  const safeDishName = typeof dish.name === 'string' ? dish.name : '';
  const safeInstructions = typeof dish.instructions === 'string' ? dish.instructions : '';
  const safeTags = Array.isArray(dish.tags) ? dish.tags.filter((t) => typeof t === 'string') : [];
  const safeIngredients: Ingredient[] = Array.isArray(dish.ingredients)
    ? dish.ingredients.filter((i) => i && typeof i === 'object').map((i) => ({
        id: typeof i.id === 'string' ? i.id : `ing_${Math.random()}`,
        name: typeof i.name === 'string' ? i.name : '',
        amount: typeof i.amount === 'number' ? i.amount : null,
        unit: typeof i.unit === 'string' ? i.unit : '',
        category: i.category || 'Other',
        translations: i.translations
      }))
    : [];

  const baseLang: Language = dish.language || 'en';
  let result: {
    name: string;
    instructions?: string;
    tags?: string[];
    ingredients: Ingredient[];
    isUntranslated: boolean;
    sourceLanguage: Language;
    fallbackTag?: string;
  };

  // 1. Direct match on dish's base authoring language
  if (baseLang === preferredLang) {
    result = {
      name: safeDishName,
      instructions: safeInstructions,
      tags: safeTags,
      ingredients: safeIngredients,
      isUntranslated: false,
      sourceLanguage: baseLang
    };
  }
  // 2. Check embedded translations on the dish object
  else if (dish.translations && dish.translations[preferredLang]) {
    const tContent = dish.translations[preferredLang]!;
    const localizedIngredients = safeIngredients.map((ing) => {
      const transName =
        tContent.ingredients?.find((ti) => ti && ti.id === ing.id)?.name ||
        ing.translations?.[preferredLang] ||
        getLocalizedIngredientName(ing.name, preferredLang);

      return {
        ...ing,
        name: transName || ing.name
      };
    });

    result = {
      name: tContent.name || safeDishName,
      instructions: tContent.instructions || safeInstructions,
      tags: Array.isArray(tContent.tags) ? tContent.tags : safeTags,
      ingredients: localizedIngredients,
      isUntranslated: false,
      sourceLanguage: baseLang
    };
  }
  // 3. Check system starter recipe dictionary lookup
  else {
    const starterTrans = (dish.id && STARTER_RECIPE_TRANSLATIONS[dish.id]) || (dish.canonicalId && STARTER_RECIPE_TRANSLATIONS[dish.canonicalId]);
    if (preferredLang === 'zh-CN' && starterTrans) {
      const localizedIngredients = safeIngredients.map((ing) => {
        const match = starterTrans.ingredients?.find((ti) => ti && ti.id === ing.id);
        return {
          ...ing,
          name: match?.name || getLocalizedIngredientName(ing.name, 'zh-CN') || ing.name
        };
      });

      result = {
        name: starterTrans.name || safeDishName,
        instructions: starterTrans.instructions || safeInstructions,
        tags: starterTrans.tags || safeTags,
        ingredients: localizedIngredients,
        isUntranslated: false,
        sourceLanguage: baseLang
      };
    }
    // 4. Untranslated fallback
    else {
      const localizedIngredients = safeIngredients.map((ing) => ({
        ...ing,
        name: ing.translations?.[preferredLang] || getLocalizedIngredientName(ing.name, preferredLang) || ing.name
      }));

      const fallbackTag = baseLang === 'en' ? (preferredLang === 'zh-CN' ? '🇺🇸 仅英文' : '') : (preferredLang === 'en' ? '🇨🇳 Chinese only' : '');

      result = {
        name: safeDishName,
        instructions: safeInstructions,
        tags: safeTags,
        ingredients: localizedIngredients,
        isUntranslated: true,
        sourceLanguage: baseLang,
        fallbackTag: fallbackTag || undefined
      };
    }
  }

  dishCache.set(preferredLang, result);
  return result;
}

/**
 * Resolves a localized MasterIngredient
 */
export function getLocalizedMasterIngredient(
  masterIng: MasterIngredient,
  preferredLang: Language
): { name: string; isUntranslated: boolean } {
  if (!masterIng || typeof masterIng !== 'object') {
    return { name: '', isUntranslated: true };
  }
  const safeName = typeof masterIng.name === 'string' ? masterIng.name : '';
  if (masterIng.translations && masterIng.translations[preferredLang]) {
    return { name: masterIng.translations[preferredLang]!, isUntranslated: false };
  }
  const translated = getLocalizedIngredientName(safeName, preferredLang);
  const isUntranslated = translated.toLowerCase() === safeName.toLowerCase() && preferredLang === 'zh-CN' && !/[\u4e00-\u9fa5]/.test(safeName);
  return { name: translated || safeName, isUntranslated };
}

/**
 * Cross-lingual search filter helper (Null-safe, multi-token aware, pre-indexed)
 */
export function searchMatchesLocalizedDish(
  dish: Dish,
  searchQuery: string,
  preferredLang: Language
): boolean {
  if (!dish || typeof dish !== 'object') return false;
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawTokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  const localized = getLocalizedDish(dish, preferredLang);

  // Build unified searchable string for this dish
  const safeName = (dish.name || '').toLowerCase();
  const safeLocName = (localized.name || '').toLowerCase();
  const safeCat = (dish.category || '').toLowerCase();
  const safeCuisine = (dish.cuisine || '').toLowerCase();
  const safeTags = Array.isArray(dish.tags) ? dish.tags.filter((t) => typeof t === 'string').join(' ').toLowerCase() : '';
  const safeLocTags = Array.isArray(localized.tags) ? localized.tags.filter((t) => typeof t === 'string').join(' ').toLowerCase() : '';
  const safeIngs = Array.isArray(dish.ingredients) ? dish.ingredients.filter((i) => i && typeof i.name === 'string').map((i) => i.name.toLowerCase()).join(' ') : '';
  const safeLocIngs = Array.isArray(localized.ingredients) ? localized.ingredients.filter((i) => i && typeof i.name === 'string').map((i) => i.name.toLowerCase()).join(' ') : '';

  const fullSearchString = `${safeName} ${safeLocName} ${safeCat} ${safeCuisine} ${safeTags} ${safeLocTags} ${safeIngs} ${safeLocIngs}`;

  // Every token must match somewhere in the dish
  return rawTokens.every((token) => fullSearchString.includes(token));
}
