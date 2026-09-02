const fs = require('fs');
const path = require('path');

const masterSeedPath = path.resolve('src/services/masterIngredientsSeed.json');
const systemRecipesPath = path.resolve('master_system_recipes.json');
const distSystemRecipesPath = path.resolve('dist/master_system_recipes.json');

const systemData = JSON.parse(fs.readFileSync(systemRecipesPath, 'utf8'));
const recipes = Array.isArray(systemData) ? systemData : systemData.dishes;

// Curated Master Canonical Taxonomy
const CANONICAL_TAXONOMY = [
  // Produce: Aromatics & Alliums
  { canonical: 'Garlic (大蒜)', regex: /\b(garlic|garlics|garlic cloves?|cloves? garlic|minced garlic|crushed garlic|大蒜|蒜头|蒜末|蒜瓣|蒜|大蒜瓣)\b/i, category: 'Produce', amount: 3, unit: 'cloves' },
  { canonical: 'Ginger (生姜)', regex: /\b(ginger|ginger root|fresh ginger|minced ginger|grated ginger|生姜|老姜|姜片|姜末|姜|嫩姜)\b/i, category: 'Produce', amount: 10, unit: 'g' },
  { canonical: 'Green Onion / Scallion (小葱)', regex: /\b(green onions?|scallions?|spring onions?|葱|小葱|香葱|青葱|大葱|细香葱)\b/i, category: 'Produce', amount: 2, unit: 'stalks' },
  { canonical: 'Yellow Onion (洋葱)', regex: /\b(yellow onions?|brown onions?|onions?|diced onion|chopped onion|洋葱|黄洋葱|洋葱碎)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Red Onion (红洋葱)', regex: /\b(red onions?|purple onions?|红洋葱|紫洋葱)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Shallot (红葱头)', regex: /\b(shallots?|french shallots?|asian shallots?|红葱头|小红葱|干葱头)\b/i, category: 'Produce', amount: 3, unit: 'pcs' },
  { canonical: 'Leek (大葱/韭葱)', regex: /\b(leeks?|韭葱|京葱)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },

  // Produce: Vegetables & Herbs
  { canonical: 'Tomato (番茄/西红柿)', regex: /\b(roma tomatoes?|tomatoes?|cherry tomatoes?|fresh tomatoes?|番茄|西红柿|圣女果|小番茄|牛番茄)\b/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Broccoli (西兰花)', regex: /\b(broccoli|broccoli florets?|fresh broccoli|西兰花|青花菜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Bok Choy (青江菜/小白菜)', regex: /\b(bok choys?|baby bok choys?|pak choys?|buk choys?|上海青|小白菜|青江菜|油菜|青菜)\b/i, category: 'Produce', amount: 3, unit: 'pcs' },
  { canonical: 'Carrot (胡萝卜)', regex: /\b(carrots?|diced carrots?|grated carrots?|胡萝卜|红萝卜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Potato (土豆)', regex: /\b(potatoes?|russet potatoes?|yukon gold potatoes?|土豆|马铃薯|洋芋)\b/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Cucumber (黄瓜)', regex: /\b(cucumbers?|english cucumbers?|persian cucumbers?|黄瓜|青瓜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Cabbage (包菜/卷心菜)', regex: /\b(cabbages?|green cabbages?|savoy cabbages?|包菜|圆白菜|卷心菜|高丽菜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Napa Cabbage (大白菜)', regex: /\b(napa cabbages?|chinese cabbages?|womboks?|大白菜|娃娃菜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Spinach (菠菜)', regex: /\b(spinach|baby spinach|fresh spinach|菠菜|嫩菠菜)\b/i, category: 'Produce', amount: 200, unit: 'g' },
  { canonical: 'Bell Pepper (甜椒/彩椒)', regex: /\b(bell peppers?|green bell peppers?|red bell peppers?|yellow bell peppers?|capsicums?|彩椒|甜椒|青椒)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Chili Pepper (辣椒)', regex: /\b(chili|chilies|chilli|chillies|red chilies?|thai chilies?|jalapenos?|辣椒|朝天椒|小辣椒|红辣椒|小米辣|干辣椒|红椒|辣椒酱|辣椒油)\b/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Shiitake Mushroom (香菇)', regex: /\b(shiitake mushrooms?|dried shiitake mushrooms?|香菇|鲜香菇|冬菇|干香菇|花菇)\b/i, category: 'Produce', amount: 6, unit: 'pcs' },
  { canonical: 'Mushroom (口蘑/蘑菇)', regex: /\b(button mushrooms?|white mushrooms?|cremini mushrooms?|portobello mushrooms?|口蘑|洋菇|白玉菇|草菇|蘑菇)\b/i, category: 'Produce', amount: 200, unit: 'g' },
  { canonical: 'Enoki Mushroom (金针菇)', regex: /\b(enoki mushrooms?|金针菇)\b/i, category: 'Produce', amount: 1, unit: 'packet' },
  { canonical: 'King Oyster Mushroom (杏鲍菇)', regex: /\b(king oyster mushrooms?|eryngii|杏鲍菇)\b/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Asparagus (芦笋)', regex: /\b(asparagus|green asparagus|芦笋)\b/i, category: 'Produce', amount: 1, unit: 'bunch' },
  { canonical: 'Zucchini / Courgette (西葫芦/节瓜)', regex: /\b(zucchinis?|courgettes?|西葫芦|翠玉瓜|节瓜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Eggplant / Aubergine (茄子)', regex: /\b(eggplants?|aubergines?|chinese eggplants?|茄子)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Bitter Melon (苦瓜)', regex: /\b(bitter melons?|bitter gourds?|苦瓜)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Bean Sprouts (豆芽/绿豆芽)', regex: /\b(bean sprouts?|soybean sprouts?|mung bean sprouts?|豆芽|绿豆芽|黄豆芽)\b/i, category: 'Produce', amount: 150, unit: 'g' },
  { canonical: 'Celery (芹菜/西芹)', regex: /\b(celery|celery stalks?|芹菜|西芹)\b/i, category: 'Produce', amount: 2, unit: 'stalks' },
  { canonical: 'Avocado (牛油果)', regex: /\b(avocados?|牛油果|酪梨)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Lemon (柠檬)', regex: /\b(lemons?|lemon juice|fresh lemon|柠檬|柠檬汁|檸檬汁)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Lime (青柠)', regex: /\b(limes?|lime juice|fresh lime|青柠|青柠檬|莱姆)\b/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Cilantro / Coriander (香菜)', regex: /\b(cilantro|coriander|fresh cilantro|香菜|芫荽)\b/i, category: 'Produce', amount: 1, unit: 'bunch' },
  { canonical: 'Basil (罗勒/九层塔)', regex: /\b(basil|thai basil|fresh basil|sweet basil|罗勒|九层塔|金不换)\b/i, category: 'Produce', amount: 1, unit: 'bunch' },
  { canonical: 'Tofu (豆腐)', regex: /\b(tofu|firm tofu|soft tofu|silken tofu|tofu block|fried tofu|豆腐|嫩豆腐|老豆腐|板豆腐|豆干|生豆皮|豆皮)\b/i, category: 'Produce', amount: 1, unit: 'block' },

  // Proteins: Poultry & Meat
  { canonical: 'Chicken Breast (鸡胸肉)', regex: /\b(chicken breasts?|boneless skinless chicken breasts?|chicken tenderloins?|鸡胸肉|鸡胸|鸡柳|鸡肉片|雞胸肉)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Chicken Thigh (鸡腿肉)', regex: /\b(chicken thighs?|chicken thigh fillets?|boneless chicken thighs?|鸡腿肉|去骨鸡腿肉|鸡扒|雞腿肉)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Chicken Wings (鸡翅)', regex: /\b(chicken wings?|chicken party wings?|chicken wingettes?|鸡翅|鸡中翅|鸡全翅|雞翅)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Chicken Drumsticks (鸡腿/鸡小腿)', regex: /\b(chicken drumsticks?|chicken drumettes?|鸡腿|小鸡腿|鸡琵琶腿)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Whole Chicken (整鸡)', regex: /\b(whole chickens?|roasting chicken|整鸡|全鸡|三黄鸡|母鸡)\b/i, category: 'Meat & Seafood', amount: 1, unit: 'pcs' },
  { canonical: 'Ground Beef (牛肉末)', regex: /\b(ground beef|minced beef|beef mince|lean ground beef|牛肉末|牛绞肉|碎牛肉)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Ground Pork (猪肉末)', regex: /\b(ground pork|minced pork|pork mince|猪肉末|猪绞肉|肉末|猪肉碎|豬肉末)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Beef Steak / Slices (牛肉/牛排)', regex: /\b(beef steaks?|sirloin|ribeye|tenderloin|flank steak|beef slices?|beef strips?|beef brisket|牛排|牛肉片|牛里脊|牛腩|肥牛|牛肉)\b/i, category: 'Meat & Seafood', amount: 400, unit: 'g' },
  { canonical: 'Pork Belly (五花肉)', regex: /\b(pork belly|pork belly slices?|pork belly strips?|五花肉|五花肉片|五花腩|三层肉)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Pork Chops / Loin (猪排/猪里脊)', regex: /\b(pork chops?|pork loins?|pork tenderloins?|pork shoulder|猪排|猪里脊|梅花肉|大排|猪肉)\b/i, category: 'Meat & Seafood', amount: 400, unit: 'g' },
  { canonical: 'Pork Ribs (猪肋排/排骨)', regex: /\b(pork ribs?|spare ribs?|baby back ribs?|排骨|小排|猪肋排)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Bacon (培根/烟熏肉)', regex: /\b(bacon|streaky bacon|smoked bacon|bacon rashers?|培根|烟熏肉)\b/i, category: 'Meat & Seafood', amount: 150, unit: 'g' },
  { canonical: 'Sausage / Hot Dog (香肠/热狗)', regex: /\b(sausages?|italian sausages?|chinese sausages?|hot dogs?|lap cheong|香肠|腊肠|热狗肠)\b/i, category: 'Meat & Seafood', amount: 200, unit: 'g' },

  // Proteins: Seafood
  { canonical: 'Shrimp / Prawns (鲜虾/虾仁)', regex: /\b(shrimps?|prawns?|raw shrimp|peeled shrimp|king prawns?|鲜虾|大虾|虾仁|大明虾|基围虾|海虾|生虾仁)\b/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },
  { canonical: 'Salmon Fillet (三文鱼柳)', regex: /\b(salmons?|salmon fillets?|fresh salmon|三文鱼|鲑鱼|三文鱼排)\b/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },
  { canonical: 'White Fish Fillet (鱼片/鳕鱼柳)', regex: /\b(white fish|fish fillets?|cod fillets?|basa fillets?|tilapia fillets?|snapper fillets?|鱼片|龙利鱼片|鳕鱼柳|鲈鱼|黑鱼片|生鱼片)\b/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },
  { canonical: 'Clams / Mussels (蛤蜊/青口贝)', regex: /\b(clams?|mussels?|scallops?|oysters?|蛤蜊|花甲|青口贝|扇贝|生蚝|文蛤)\b/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Squid / Calamari (鱿鱼/墨鱼)', regex: /\b(squids?|calamaris?|cuttlefish|octopus|鱿鱼|墨鱼|鱿鱼圈|章鱼)\b/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },

  // Dairy & Eggs
  { canonical: 'Egg (鸡蛋)', regex: /\b(eggs?|large eggs?|whole eggs?|egg yolks?|egg whites?|鸡蛋|蛋|新鲜鸡蛋|雞蛋)\b/i, category: 'Dairy & Eggs', amount: 4, unit: 'pcs' },
  { canonical: 'Butter (黄油)', regex: /\b(butter|unsalted butter|salted butter|无盐黄油|黄油|牛油)\b/i, category: 'Dairy & Eggs', amount: 50, unit: 'g' },
  { canonical: 'Whole Milk (牛奶)', regex: /\b(whole milk|milk|fresh milk|full cream milk|牛奶|鲜牛奶|全脂牛奶)\b/i, category: 'Dairy & Eggs', amount: 250, unit: 'ml' },
  { canonical: 'Heavy Cream (淡奶油)', regex: /\b(heavy cream|whipping cream|thickened cream|double cream|淡奶油|重奶油|鲜奶油)\b/i, category: 'Dairy & Eggs', amount: 100, unit: 'ml' },
  { canonical: 'Parmesan Cheese (帕玛森芝士)', regex: /\b(parmesan|parmigiano-reggiano|parmesan cheese|帕玛森芝士|帕马森奶酪)\b/i, category: 'Dairy & Eggs', amount: 50, unit: 'g' },
  { canonical: 'Mozzarella Cheese (马苏里拉芝士)', regex: /\b(mozzarella|mozzarella cheese|shredded mozzarella|马苏里拉芝士|马苏里拉奶酪)\b/i, category: 'Dairy & Eggs', amount: 150, unit: 'g' },

  // Pantry: Sauces, Condiments & Seasonings
  { canonical: 'Soy Sauce (生抽)', regex: /\b(soy sauce|light soy sauce|regular soy sauce|生抽|生抽酱油|酱油|薄盐生抽)\b/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Dark Soy Sauce (老抽)', regex: /\b(dark soy sauce|老抽|老抽酱油)\b/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Oyster Sauce (蚝油)', regex: /\b(oyster sauce|蚝油|蠔油)\b/i, category: 'Pantry & Spices', amount: 20, unit: 'ml' },
  { canonical: 'Sesame Oil (芝麻香油)', regex: /\b(sesame oil|toasted sesame oil|pure sesame oil|芝麻油|香油|麻油|芝麻香油)\b/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Cooking Oil (食用油)', regex: /\b(cooking oil|vegetable oil|canola oil|neutral oil|peanut oil|sunflower oil|食用油|植物油|色拉油|花生油|油)\b/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Olive Oil (橄榄油)', regex: /\b(olive oil|extra virgin olive oil|evoo|橄榄油|特级初榨橄榄油)\b/i, category: 'Pantry & Spices', amount: 20, unit: 'ml' },
  { canonical: 'Shaoxing Cooking Wine (绍兴料酒)', regex: /\b(shaoxing wine|shaohsing wine|chinese cooking wine|料酒|绍兴料酒|花雕酒|米酒)\b/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Mirin (味醂)', regex: /\b(mirin|japanese mirin|味醂|味淋)\b/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Japanese Sake / Cooking Wine (清酒)', regex: /\b(sake|cooking sake|japanese sake|日本料酒|清酒)\b/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Fish Sauce (鱼露)', regex: /\b(fish sauce|vietnamese fish sauce|thai fish sauce|鱼露|魚露)\b/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Salt (食盐)', regex: /\b(salt|sea salt|kosher salt|table salt|fine salt|食盐|盐|精盐|海盐|食盐巴)\b/i, category: 'Pantry & Spices', amount: 5, unit: 'g' },
  { canonical: 'White Sugar (白糖)', regex: /\b(white sugar|granulated sugar|sugar|caster sugar|白糖|细砂糖|白砂糖|绵白糖|白糖浆|砂糖|白糖漿)\b/i, category: 'Pantry & Spices', amount: 15, unit: 'g' },
  { canonical: 'Brown Sugar (红糖)', regex: /\b(brown sugar|light brown sugar|dark brown sugar|红糖|黄糖|黑糖)\b/i, category: 'Pantry & Spices', amount: 20, unit: 'g' },
  { canonical: 'Black Pepper (黑胡椒)', regex: /\b(black pepper|ground black pepper|black peppercorns?|cracked black pepper|黑胡椒|黑胡椒粉|黑胡椒碎)\b/i, category: 'Pantry & Spices', amount: 3, unit: 'g' },
  { canonical: 'White Pepper (白胡椒)', regex: /\b(white pepper|ground white pepper|white pepper powder|白胡椒|白胡椒粉)\b/i, category: 'Pantry & Spices', amount: 2, unit: 'g' },
  { canonical: 'Cornstarch (玉米淀粉/生粉)', regex: /\b(cornstarch|corn starch|corn flour|potato starch|tapioca starch|生粉|玉米淀粉|淀粉|太白粉|木薯粉)\b/i, category: 'Pantry & Spices', amount: 15, unit: 'g' },
  { canonical: 'Honey (蜂蜜)', regex: /\b(honey|pure honey|raw honey|蜂蜜)\b/i, category: 'Pantry & Spices', amount: 20, unit: 'ml' },
  { canonical: 'Chicken Bouillon / Powder (鸡精)', regex: /\b(chicken bouillon|chicken powder|chicken stock powder|chicken granule|鸡精|鸡粉|鸡汤块)\b/i, category: 'Pantry & Spices', amount: 5, unit: 'g' },
  { canonical: 'Chicken Broth / Stock (鸡汤)', regex: /\b(chicken broth|chicken stock|chicken broth stock|鸡汤|清鸡汤|高汤|高湯)\b/i, category: 'Pantry & Spices', amount: 250, unit: 'ml' },
  { canonical: 'Curry Powder / Paste (咖喱粉/咖喱块)', regex: /\b(curry powder|curry paste|japanese curry|curry roux|thai green curry|thai red curry|咖喱粉|咖喱块|咖喱酱|咖哩粉)\b/i, category: 'Pantry & Spices', amount: 30, unit: 'g' },
  { canonical: 'Jasmine Rice / White Rice (大米)', regex: /\b(jasmine rice|white rice|long grain rice|short grain rice|sushi rice|brown rice|大米|白米|茉莉香米|米饭|剩米饭)\b/i, category: 'Pantry & Spices', amount: 200, unit: 'g' },
  { canonical: 'All-Purpose Flour (中筋面粉)', regex: /\b(all-purpose flour|plain flour|wheat flour|flour|bread flour|cake flour|中筋面粉|面粉|小麦粉|低筋面粉|高筋面粉)\b/i, category: 'Bakery', amount: 200, unit: 'g' },
  { canonical: 'Pasta / Spaghetti (意大利面)', regex: /\b(pasta|spaghetti|fettuccine|penne|linguine|macaroni|fusilli|意大利面|意面|通心粉)\b/i, category: 'Pantry & Spices', amount: 200, unit: 'g' },
  { canonical: 'Noodles (面条/拉面/乌冬面)', regex: /\b(noodles?|ramen noodles?|udon noodles?|egg noodles?|somen|soba|面条|拉面|乌冬面|鸡蛋面|荞麦面|挂面)\b/i, category: 'Pantry & Spices', amount: 200, unit: 'g' }
];

function cleanAndNormalizeIngredient(rawName) {
  if (!rawName || typeof rawName !== 'string') return { name: '', category: 'Produce', amount: 1, unit: 'pcs' };

  let s = rawName.trim();

  // Strip emojis
  s = s.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

  // Strip leading bullets, dashes, markdown prefixes, HTML entities, fractions, numbers
  s = s.replace(/^(&quot;|&amp;|&lt;|&gt;|[\s\-\*\•\d\.\/\–—½⅓¼¾⅔⅛⅙⁄+「」])+/, '');

  // Strip leading prefixes like [調味料], [Sauce], (Marinade), [Garnish]
  s = s.replace(/^\[[^\]]+\]\s*/g, '');
  s = s.replace(/^\([^\)]+\)\s*/g, '');

  // Strip phrases like "A 2-inch piece of ", "A 3" piece of ", "A 4 to 5 pound "
  s = s.replace(/^A\s+[\d\.\-"']+\s*(inch|cm|piece of|pound|lb)\s*/i, '');

  // Strip measurements at beginning
  s = s.replace(/^[\d\.\/½⅓¼¾⅔⅛⅙⁄\-]+\s*(g|kg|ml|l|tbsp|tsp|cup|cups|oz|lb|pcs|slices|stalks|cloves|can|packet|pinch|cm|inch|个|個|根|瓣|片|大匙|小匙|茶匙|克|两|斤|汤匙|顆|條|份)\s+/i, '');

  // Strip measurements & qualifiers at end
  s = s.replace(/\s*[\d\.\/一两三四五六七八九十半½⅓¼¾⅔⅛⅙⁄]+\s*(个|個|根|瓣|片|大匙|小匙|茶匙|汤匙|湯匙|克|g|kg|ml|cc|l|tbsp|tsp|cup|cups|pcs|slices|stalks|cloves|can|packet|pinch|oz|lb|cm|mm|inch|顆|條|份)\s*$/i, '');
  s = s.replace(/\s*[\d\.\/]+\s*(g|kg|ml|l|tbsp|tsp|cup|cups|pcs|oz|lb|cm|mm)\s*$/i, '');
  s = s.replace(/\s*(適量|适量|少許|少许|若干|少许|适量)\s*$/g, '');

  // Strip prep instructions
  s = s.replace(/,\s*(minced|chopped|diced|sliced|finely chopped|grated|peeled|drained|rinsed|shredded|crushed|to taste|optional|divided|at room temperature|melted|softened|beaten|for serving|to garnish|cut into.*|skinless.*).*$/i, '');
  s = s.replace(/\s*\(\s*(minced|chopped|diced|sliced|finely chopped|grated|peeled|drained|rinsed|shredded|crushed|to taste|optional|divided|at room temperature|melted|softened|beaten|for serving|to garnish|skinless.*|boneless.*|defrosted.*|note \d+.*)\s*\)/gi, '');

  // Strip parenthetical notes
  s = s.replace(/\(\s*about\s+[\w\d\.\s\-\/]+\)/gi, '');
  s = s.replace(/\(\s*[\d\.\/]+\s*(g|kg|ml|oz|lb|cup|tbsp|tsp|cm|inch)\s*[\-\/]?\s*[\d\.\/]*\s*(g|kg|ml|oz|lb|cup|tbsp|tsp|cm|inch)?\s*\)/gi, '');
  s = s.replace(/\(\s*note\s+\d+.*?\)/gi, '');
  s = s.replace(/\(\s*optional.*?\)/gi, '');
  s = s.replace(/\(\s*enough to.*?\)/gi, '');
  s = s.replace(/\s*\([^)]*\)$/g, ''); // strip trailing parentheticals
  s = s.replace(/\s*[\(\)]+$/g, ''); // strip unclosed parens

  // Strip leading/trailing punctuation & quotes
  s = s.replace(/^[\s,\-\.\/:\'"“”]+|[\s,\-\.\/:\'"“”]+$/g, '').trim();

  // Check matching against canonical taxonomy
  for (const item of CANONICAL_TAXONOMY) {
    if (item.regex.test(s)) {
      return {
        name: item.canonical,
        category: item.category,
        amount: item.amount || 1,
        unit: item.unit || 'pcs'
      };
    }
  }

  // Proper Title Case formatting
  s = s.replace(/\w\S*/g, (txt) => {
    if (/[\u4e00-\u9fa5]/.test(txt)) return txt;
    if (txt.startsWith('(')) return '(' + txt.charAt(1).toUpperCase() + txt.substr(2).toLowerCase();
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });

  return {
    name: s,
    category: 'Produce',
    amount: 1,
    unit: 'pcs'
  };
}

// 1. Process and Clean All System Recipes
console.log('Validating and normalizing all system recipes...');
let cleanedIngCount = 0;
const masterDictionary = new Map();

// Seed taxonomy first
CANONICAL_TAXONOMY.forEach((item, idx) => {
  masterDictionary.set(item.canonical.toLowerCase(), {
    id: `master_canon_${idx}`,
    name: item.canonical,
    defaultValue: item.amount || 100,
    defaultUnit: item.unit || 'g',
    category: item.category
  });
});

recipes.forEach((dish) => {
  if (Array.isArray(dish.ingredients)) {
    dish.ingredients.forEach((ing) => {
      const clean = cleanAndNormalizeIngredient(ing.name);
      if (clean.name && clean.name.length >= 2) {
        ing.name = clean.name;
        ing.category = clean.category;
        cleanedIngCount++;

        const key = clean.name.toLowerCase();
        if (!masterDictionary.has(key)) {
          masterDictionary.set(key, {
            id: `master_ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            name: clean.name,
            defaultValue: clean.amount || 100,
            defaultUnit: clean.unit || 'g',
            category: clean.category
          });
        }
      }
    });
  }
});

console.log(`Successfully normalized ${cleanedIngCount} recipe ingredient references.`);

const finalMasterList = Array.from(masterDictionary.values())
  .filter((item) => item.name.length >= 2 && !/^(and|or|for|with|approx|cm|long|note \d+|optional|\)\)|\(\()$/i.test(item.name))
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(`Final Consolidated Master Ingredient Database: ${finalMasterList.length} items.`);

// Write clean master ingredients seed
fs.writeFileSync(masterSeedPath, JSON.stringify(finalMasterList, null, 2), 'utf8');
console.log(`Updated ${masterSeedPath}`);

// Write clean system recipes
const systemPayload = {
  app: 'Gyummy Planner',
  version: '2.1.0',
  exportedAt: new Date().toISOString(),
  description: 'Cleaned, Curated Master Recipe Database (3,000+ Recipes)',
  dishes: recipes
};

fs.writeFileSync(systemRecipesPath, JSON.stringify(systemPayload, null, 2), 'utf8');
console.log(`Updated ${systemRecipesPath}`);

if (fs.existsSync(path.dirname(distSystemRecipesPath))) {
  fs.writeFileSync(distSystemRecipesPath, JSON.stringify(systemPayload), 'utf8');
  console.log(`Updated ${distSystemRecipesPath}`);
}

console.log('All ingredient databases cleaned, validated & consolidated! ✅');
