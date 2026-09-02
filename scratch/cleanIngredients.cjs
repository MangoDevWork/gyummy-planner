const fs = require('fs');
const path = require('path');

const masterSeedPath = path.resolve('src/services/masterIngredientsSeed.json');
const systemRecipesPath = path.resolve('master_system_recipes.json');
const distSystemRecipesPath = path.resolve('dist/master_system_recipes.json');

const systemData = JSON.parse(fs.readFileSync(systemRecipesPath, 'utf8'));
const recipes = Array.isArray(systemData) ? systemData : systemData.dishes;

// 1. Missing first-character prefix restoration table
const FIRST_CHAR_FIXES = [
  { match: /^emongrass/i, replace: 'Lemongrass' },
  { match: /^arlic/i, replace: 'Garlic' },
  { match: /^amb shank/i, replace: 'Lamb Shank' },
  { match: /^amb /i, replace: 'Lamb ' },
  { match: /^emon /i, replace: 'Lemon ' },
  { match: /^emon juice/i, replace: 'Lemon Juice' },
  { match: /^ime /i, replace: 'Lime ' },
  { match: /^ime juice/i, replace: 'Lime Juice' },
  { match: /^eed /i, replace: 'Seed ' },
  { match: /^arge /i, replace: 'Large ' },
  { match: /^utter /i, replace: 'Butter ' },
  { match: /^lour /i, replace: 'Flour ' },
  { match: /^nion /i, replace: 'Onion ' },
  { match: /^inger /i, replace: 'Ginger ' },
  { match: /^hicken /i, replace: 'Chicken ' },
  { match: /^omato /i, replace: 'Tomato ' },
  { match: /^otato /i, replace: 'Potato ' },
  { match: /^epper /i, replace: 'Pepper ' },
  { match: /^arrot /i, replace: 'Carrot ' },
  { match: /^ugar /i, replace: 'Sugar ' },
  { match: /^alt /i, replace: 'Salt ' },
  { match: /^eef /i, replace: 'Beef ' },
  { match: /^ork /i, replace: 'Pork ' },
  { match: /^ream /i, replace: 'Cream ' },
  { match: /^ilk /i, replace: 'Milk ' },
  { match: /^heese /i, replace: 'Cheese ' },
  { match: /^read /i, replace: 'Bread ' },
  { match: /^pple /i, replace: 'Apple ' },
  { match: /^gg /i, replace: 'Egg ' },
  { match: /^ggs /i, replace: 'Eggs ' },
  { match: /^il /i, replace: 'Oil ' },
  { match: /^ice /i, replace: 'Rice ' },
  { match: /^anilla /i, replace: 'Vanilla ' },
  { match: /^ustard /i, replace: 'Mustard ' },
  { match: /^innamon /i, replace: 'Cinnamon ' },
  { match: /^lmond/i, replace: 'Almond' }
];

// 2. Curated Master Canonical Taxonomy & Categorizer (Safe regex without broken ASCII \b on CJK)
const CANONICAL_TAXONOMY = [
  // Produce: Aromatics & Alliums
  { canonical: 'Garlic (大蒜)', regex: /(garlic|garlics|garlic cloves?|cloves? garlic|minced garlic|crushed garlic|大蒜|蒜头|蒜末|蒜瓣|蒜|大蒜瓣)/i, category: 'Produce', amount: 3, unit: 'cloves' },
  { canonical: 'Ginger (生姜)', regex: /(ginger|ginger root|fresh ginger|minced ginger|grated ginger|生姜|老姜|姜片|姜末|姜|嫩姜|galangal)/i, category: 'Produce', amount: 10, unit: 'g' },
  { canonical: 'Green Onion / Scallion (小葱)', regex: /(green onions?|scallions?|spring onions?|葱|小葱|香葱|青葱|大葱|细香葱)/i, category: 'Produce', amount: 2, unit: 'stalks' },
  { canonical: 'Yellow Onion (洋葱)', regex: /(yellow onions?|brown onions?|onions?|diced onion|chopped onion|洋葱|黄洋葱|洋葱碎)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Red Onion (红洋葱)', regex: /(red onions?|purple onions?|红洋葱|紫洋葱)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Shallot (红葱头)', regex: /(shallots?|french shallots?|asian shallots?|红葱头|小红葱|干葱头)/i, category: 'Produce', amount: 3, unit: 'pcs' },
  { canonical: 'Leek (大葱/韭葱)', regex: /(leeks?|韭葱|京葱)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Lemongrass (香茅)', regex: /(lemongrass|lemongrass stalks?|香茅|香茅草)/i, category: 'Produce', amount: 2, unit: 'stalks' },

  // Produce: Vegetables & Herbs
  { canonical: 'Tomato (番茄/西红柿)', regex: /(roma tomatoes?|tomatoes?|cherry tomatoes?|fresh tomatoes?|番茄|西红柿|圣女果|小番茄|牛番茄)/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Broccoli (西兰花)', regex: /(broccoli|broccoli florets?|fresh broccoli|西兰花|青花菜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Bok Choy (青江菜/小白菜)', regex: /(bok choys?|baby bok choys?|pak choys?|buk choys?|上海青|小白菜|青江菜|油菜|青菜)/i, category: 'Produce', amount: 3, unit: 'pcs' },
  { canonical: 'Carrot (胡萝卜)', regex: /(carrots?|diced carrots?|grated carrots?|胡萝卜|红萝卜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Potato (土豆)', regex: /(potatoes?|russet potatoes?|yukon gold potatoes?|土豆|马铃薯|洋芋)/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Cucumber (黄瓜)', regex: /(cucumbers?|english cucumbers?|persian cucumbers?|黄瓜|青瓜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Cabbage (包菜/卷心菜)', regex: /(cabbages?|green cabbages?|savoy cabbages?|包菜|圆白菜|卷心菜|高丽菜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Napa Cabbage (大白菜)', regex: /(napa cabbages?|chinese cabbages?|womboks?|大白菜|娃娃菜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Spinach (菠菜)', regex: /(spinach|baby spinach|fresh spinach|菠菜|嫩菠菜)/i, category: 'Produce', amount: 200, unit: 'g' },
  { canonical: 'Bell Pepper (甜椒/彩椒)', regex: /(bell peppers?|green bell peppers?|red bell peppers?|yellow bell peppers?|capsicums?|彩椒|甜椒|青椒)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Chili Pepper (辣椒)', regex: /(chili|chilies|chilli|chillies|red chilies?|thai chilies?|jalapenos?|辣椒|朝天椒|小辣椒|红辣椒|小米辣|干辣椒|红椒)/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Shiitake Mushroom (香菇)', regex: /(shiitake mushrooms?|dried shiitake mushrooms?|香菇|鲜香菇|冬菇|干香菇|花菇)/i, category: 'Produce', amount: 6, unit: 'pcs' },
  { canonical: 'Mushroom (口蘑/蘑菇)', regex: /(button mushrooms?|white mushrooms?|cremini mushrooms?|portobello mushrooms?|口蘑|洋菇|白玉菇|草菇|蘑菇)/i, category: 'Produce', amount: 200, unit: 'g' },
  { canonical: 'Enoki Mushroom (金针菇)', regex: /(enoki mushrooms?|金针菇)/i, category: 'Produce', amount: 1, unit: 'packet' },
  { canonical: 'King Oyster Mushroom (杏鲍菇)', regex: /(king oyster mushrooms?|eryngii|杏鲍菇)/i, category: 'Produce', amount: 2, unit: 'pcs' },
  { canonical: 'Asparagus (芦笋)', regex: /(asparagus|green asparagus|芦笋)/i, category: 'Produce', amount: 1, unit: 'bunch' },
  { canonical: 'Zucchini / Courgette (西葫芦/节瓜)', regex: /(zucchinis?|courgettes?|西葫芦|翠玉瓜|节瓜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Eggplant / Aubergine (茄子)', regex: /(eggplants?|aubergines?|chinese eggplants?|茄子)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Bitter Melon (苦瓜)', regex: /(bitter melons?|bitter gourds?|苦瓜)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Bean Sprouts (豆芽/绿豆芽)', regex: /(bean sprouts?|soybean sprouts?|mung bean sprouts?|豆芽|绿豆芽|黄豆芽)/i, category: 'Produce', amount: 150, unit: 'g' },
  { canonical: 'Celery (芹菜/西芹)', regex: /(celery|celery stalks?|芹菜|西芹)/i, category: 'Produce', amount: 2, unit: 'stalks' },
  { canonical: 'Avocado (牛油果)', regex: /(avocados?|牛油果|酪梨)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Lemon (柠檬)', regex: /(lemons?|lemon juice|fresh lemon|柠檬|柠檬汁|檸檬汁)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Lime (青柠)', regex: /(limes?|lime juice|fresh lime|青柠|青柠檬|莱姆)/i, category: 'Produce', amount: 1, unit: 'pcs' },
  { canonical: 'Cilantro / Coriander (香菜)', regex: /(cilantro|coriander|fresh cilantro|香菜|芫荽)/i, category: 'Produce', amount: 1, unit: 'bunch' },
  { canonical: 'Basil (罗勒/九层塔)', regex: /(basil|thai basil|fresh basil|sweet basil|罗勒|九层塔|金不换)/i, category: 'Produce', amount: 1, unit: 'bunch' },
  { canonical: 'Tofu (豆腐)', regex: /(tofu|firm tofu|soft tofu|silken tofu|tofu block|fried tofu|豆腐|嫩豆腐|老豆腐|板豆腐|豆干|生豆皮|豆皮)/i, category: 'Produce', amount: 1, unit: 'block' },
  { canonical: 'Leafy Green Vegetables (绿叶蔬菜)', regex: /(leafy green vegetables?|leafy greens?|any leafy green vegetable|青菜|绿叶菜|蔬菜|lettuce|生菜)/i, category: 'Produce', amount: 200, unit: 'g' },

  // Proteins: Poultry & Meat
  { canonical: 'Chicken Breast (鸡胸肉)', regex: /(chicken breasts?|boneless skinless chicken breasts?|chicken tenderloins?|鸡胸肉|鸡胸|鸡柳|鸡肉片|雞胸肉)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Chicken Thigh (鸡腿肉)', regex: /(chicken thighs?|chicken thigh fillets?|boneless chicken thighs?|鸡腿肉|去骨鸡腿肉|鸡扒|雞腿肉)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Chicken Wings (鸡翅)', regex: /(chicken wings?|chicken party wings?|chicken wingettes?|鸡翅|鸡中翅|鸡全翅|雞翅)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Chicken Drumsticks (鸡腿/鸡小腿)', regex: /(chicken drumsticks?|chicken drumettes?|鸡腿|小鸡腿|鸡琵琶腿)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Whole Chicken (整鸡)', regex: /(whole chickens?|roasting chicken|整鸡|全鸡|三黄鸡|母鸡)/i, category: 'Meat & Seafood', amount: 1, unit: 'pcs' },
  { canonical: 'Duck (鸭肉/整鸭)', regex: /(duck|whole duck|duck breasts?|duck legs?|鸭肉|整鸭|鸭胸|鸭腿)/i, category: 'Meat & Seafood', amount: 1, unit: 'pcs' },
  { canonical: 'Ground Beef (牛肉末)', regex: /(ground beef|minced beef|beef mince|lean ground beef|牛肉末|牛绞肉|碎牛肉)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Ground Pork (猪肉末)', regex: /(ground pork|minced pork|pork mince|猪肉末|猪绞肉|肉末|猪肉碎|豬肉末)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Pork Shoulder (猪梅花肉/猪肩肉)', regex: /(pork shoulders?|pork butt|pork collar|猪肩肉|梅花肉|梅肉)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Beef Steak / Slices (牛肉/牛排)', regex: /(beef steaks?|sirloin|ribeye|tenderloin|flank steak|skirt of flank|beef slices?|beef strips?|beef brisket|牛排|牛肉片|牛里脊|牛腩|肥牛|牛肉)/i, category: 'Meat & Seafood', amount: 400, unit: 'g' },
  { canonical: 'Pork Belly (五花肉)', regex: /(pork belly|pork belly slices?|pork belly strips?|五花肉|五花肉片|五花腩|三层肉)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Pork Chops / Loin (猪排/猪里脊)', regex: /(pork chops?|pork loins?|pork tenderloins?|猪排|猪里脊|大排|猪肉)/i, category: 'Meat & Seafood', amount: 400, unit: 'g' },
  { canonical: 'Pork Ribs (猪肋排/排骨)', regex: /(pork ribs?|spare ribs?|baby back ribs?|排骨|小排|猪肋排)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Lamb Shanks (羊小腿/羊腱)', regex: /(lamb shanks?|amb shanks?|羊小腿|羊腱|羊棒骨)/i, category: 'Meat & Seafood', amount: 2, unit: 'pcs' },
  { canonical: 'Lamb Chops / Meat (羊肉/羊排)', regex: /(lamb chops?|lamb cutlets?|ground lamb|lamb meat|羊肉|羊排|羊肉片)/i, category: 'Meat & Seafood', amount: 400, unit: 'g' },
  { canonical: 'Bacon (培根/烟熏肉)', regex: /(bacon|streaky bacon|smoked bacon|bacon rashers?|培根|烟熏肉)/i, category: 'Meat & Seafood', amount: 150, unit: 'g' },
  { canonical: 'Sausage / Hot Dog (香肠/热狗)', regex: /(sausages?|italian sausages?|chinese sausages?|hot dogs?|lap cheong|香肠|腊肠|热狗肠)/i, category: 'Meat & Seafood', amount: 200, unit: 'g' },

  // Proteins: Seafood
  { canonical: 'Shrimp / Prawns (鲜虾/虾仁)', regex: /(shrimps?|prawns?|raw shrimp|peeled shrimp|king prawns?|鲜虾|大虾|虾仁|大明虾|基围虾|海虾|生虾仁)/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },
  { canonical: 'Salmon Fillet (三文鱼柳)', regex: /(salmons?|salmon fillets?|fresh salmon|三文鱼|鲑鱼|三文鱼排)/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },
  { canonical: 'White Fish Fillet (鱼片/鳕鱼柳)', regex: /(white fish|fish fillets?|cod fillets?|basa fillets?|tilapia fillets?|snapper fillets?|鱼片|龙利鱼片|鳕鱼柳|鲈鱼|黑鱼片|生鱼片)/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },
  { canonical: 'Clams / Mussels (蛤蜊/青口贝)', regex: /(clams?|mussels?|scallops?|oysters?|蛤蜊|花甲|青口贝|扇贝|生蚝|文蛤)/i, category: 'Meat & Seafood', amount: 500, unit: 'g' },
  { canonical: 'Squid / Calamari (鱿鱼/墨鱼)', regex: /(squids?|calamaris?|cuttlefish|octopus|鱿鱼|墨鱼|鱿鱼圈|章鱼)/i, category: 'Meat & Seafood', amount: 300, unit: 'g' },

  // Dairy & Eggs
  { canonical: 'Egg (鸡蛋)', regex: /(eggs?|large eggs?|whole eggs?|egg yolks?|egg whites?|鸡蛋|蛋|新鲜鸡蛋|雞蛋)/i, category: 'Dairy & Eggs', amount: 4, unit: 'pcs' },
  { canonical: 'Butter (黄油)', regex: /(butter|unsalted butter|salted butter|无盐黄油|黄油|牛油)/i, category: 'Dairy & Eggs', amount: 50, unit: 'g' },
  { canonical: 'Whole Milk (牛奶)', regex: /(whole milk|milk|fresh milk|full cream milk|牛奶|鲜牛奶|全脂牛奶)/i, category: 'Dairy & Eggs', amount: 250, unit: 'ml' },
  { canonical: 'Heavy Cream (淡奶油)', regex: /(heavy cream|whipping cream|thickened cream|double cream|淡奶油|重奶油|鲜奶油)/i, category: 'Dairy & Eggs', amount: 100, unit: 'ml' },
  { canonical: 'Parmesan Cheese (帕玛森芝士)', regex: /(parmesan|parmigiano-reggiano|parmesan cheese|帕玛森芝士|帕马森奶酪)/i, category: 'Dairy & Eggs', amount: 50, unit: 'g' },
  { canonical: 'Mozzarella Cheese (马苏里拉芝士)', regex: /(mozzarella|mozzarella cheese|shredded mozzarella|马苏里拉芝士|马苏里拉奶酪)/i, category: 'Dairy & Eggs', amount: 150, unit: 'g' },
  { canonical: 'Cheddar Cheese (车达芝士)', regex: /(cheddar|cheddar cheese|monterey jack|车达芝士|车达奶酪)/i, category: 'Dairy & Eggs', amount: 100, unit: 'g' },

  // Pantry: Sauces, Condiments & Seasonings
  { canonical: 'Soy Sauce (生抽)', regex: /(soy sauce|light soy sauce|regular soy sauce|生抽|生抽酱油|酱油|薄盐生抽)/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Dark Soy Sauce (老抽)', regex: /(dark soy sauce|老抽|老抽酱油)/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Oyster Sauce (蚝油)', regex: /(oyster sauce|蚝油|蠔油)/i, category: 'Pantry & Spices', amount: 20, unit: 'ml' },
  { canonical: 'Sesame Oil (芝麻香油)', regex: /(sesame oil|toasted sesame oil|pure sesame oil|芝麻油|香油|麻油|芝麻香油)/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Cooking Oil (食用油)', regex: /(cooking oil|vegetable oil|canola oil|neutral oil|peanut oil|sunflower oil|oil|食用油|植物油|色拉油|花生油|油)/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Olive Oil (橄榄油)', regex: /(olive oil|extra virgin olive oil|evoo|橄榄油|特级初榨橄榄油)/i, category: 'Pantry & Spices', amount: 20, unit: 'ml' },
  { canonical: 'Shaoxing Cooking Wine (绍兴料酒)', regex: /(shaoxing wine|shaohsing wine|chinese cooking wine|料酒|绍兴料酒|花雕酒|米酒)/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Mirin (味醂)', regex: /(mirin|japanese mirin|味醂|味淋)/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Japanese Sake / Cooking Wine (清酒)', regex: /(sake|cooking sake|japanese sake|日本料酒|清酒)/i, category: 'Pantry & Spices', amount: 30, unit: 'ml' },
  { canonical: 'Fish Sauce (鱼露)', regex: /(fish sauce|vietnamese fish sauce|thai fish sauce|鱼露|魚露)/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Salt (食盐)', regex: /(salt|sea salt|kosher salt|table salt|fine salt|食盐|盐|精盐|海盐|食盐巴)/i, category: 'Pantry & Spices', amount: 5, unit: 'g' },
  { canonical: 'Brown Sugar (红糖)', regex: /(brown sugar|light brown sugar|dark brown sugar|brown 白糖|红糖|黄糖|黑糖)/i, category: 'Pantry & Spices', amount: 20, unit: 'g' },
  { canonical: 'White Sugar (白糖)', regex: /(white sugar|granulated sugar|sugar|caster sugar|白糖|细砂糖|白砂糖|绵白糖|白糖浆|砂糖|白糖漿)/i, category: 'Pantry & Spices', amount: 15, unit: 'g' },
  { canonical: 'Black Pepper (黑胡椒)', regex: /(black pepper|ground black pepper|black peppercorns?|cracked black pepper|黑胡椒|黑胡椒粉|黑胡椒碎)/i, category: 'Pantry & Spices', amount: 3, unit: 'g' },
  { canonical: 'White Pepper (白胡椒)', regex: /(white pepper|ground white pepper|white pepper powder|白胡椒|白胡椒粉)/i, category: 'Pantry & Spices', amount: 2, unit: 'g' },
  { canonical: 'Cornstarch (玉米淀粉/生粉)', regex: /(cornstarch|corn starch|corn flour|potato starch|tapioca starch|生粉|玉米淀粉|淀粉|太白粉|木薯粉)/i, category: 'Pantry & Spices', amount: 15, unit: 'g' },
  { canonical: 'Honey (蜂蜜)', regex: /(honey|pure honey|raw honey|蜂蜜)/i, category: 'Pantry & Spices', amount: 20, unit: 'ml' },
  { canonical: 'Chicken Bouillon / Powder (鸡精)', regex: /(chicken bouillon|chicken powder|chicken stock powder|chicken granule|鸡精|鸡粉|鸡汤块)/i, category: 'Pantry & Spices', amount: 5, unit: 'g' },
  { canonical: 'Chicken Broth / Stock (鸡汤)', regex: /(chicken broth|chicken stock|chicken broth stock|鸡汤|清鸡汤|高汤|高湯)/i, category: 'Pantry & Spices', amount: 250, unit: 'ml' },
  { canonical: 'Chili Oil (辣椒油)', regex: /(chili oil|chilli oil|chiu chow oil|辣椒油|红油|油泼辣子)/i, category: 'Pantry & Spices', amount: 15, unit: 'ml' },
  { canonical: 'Chili Flakes / Powder (辣椒碎/粉)', regex: /(chili flakes?|crushed chili flakes?|chili powder|辣椒碎|辣椒粉|干辣椒碎|crushed 辣椒)/i, category: 'Pantry & Spices', amount: 5, unit: 'g' },
  { canonical: 'Mustard / Dijon (芥末酱/第戎芥末)', regex: /(american mustard|dijon mustard|yellow mustard|wholegrain mustard|mustard|芥末酱|第戎芥末|黄芥末)/i, category: 'Pantry & Spices', amount: 15, unit: 'g' },
  { canonical: 'Almonds (杏仁/巴旦木)', regex: /(almonds?|flaked almonds?|slivered almonds?|杏仁|巴旦木|杏仁片)/i, category: 'Pantry & Spices', amount: 50, unit: 'g' },
  { canonical: 'Dark Chocolate (黑巧克力/可可)', regex: /(dark chocolate|cocoa chocolate|baking chocolate|cocoa powder|% cocoa chocolate|70% chocolate|黑巧克力|可可粉|巧克力)/i, category: 'Pantry & Spices', amount: 100, unit: 'g' },
  { canonical: 'Water (水/清水)', regex: /(^water$|^iced water$|^cold water$|^清水$|^水$)/i, category: 'Pantry & Spices', amount: 250, unit: 'ml' },

  // Grains, Pasta & Bakery
  { canonical: 'Jasmine Rice / White Rice (大米)', regex: /(jasmine rice|white rice|long grain rice|short grain rice|sushi rice|brown rice|大米|白米|茉莉香米|米饭|剩米饭)/i, category: 'Pantry & Spices', amount: 200, unit: 'g' },
  { canonical: 'All-Purpose Flour (中筋面粉)', regex: /(all-purpose flour|plain flour|wheat flour|flour|bread flour|cake flour|中筋面粉|面粉|小麦粉|低筋面粉|高筋面粉)/i, category: 'Bakery', amount: 200, unit: 'g' },
  { canonical: 'Baking Soda (小苏打)', regex: /(baking soda|bi-carb|sodium bicarbonate|小苏打|食用小苏打)/i, category: 'Bakery', amount: 5, unit: 'g' },
  { canonical: 'Baking Powder (泡打粉)', regex: /(baking powder|泡打粉)/i, category: 'Bakery', amount: 5, unit: 'g' },
  { canonical: 'Pasta / Spaghetti (意大利面)', regex: /(pasta|spaghetti|fettuccine|penne|linguine|macaroni|fusilli|意大利面|意面|通心粉)/i, category: 'Pantry & Spices', amount: 200, unit: 'g' },
  { canonical: 'Noodles (面条/拉面/乌冬面)', regex: /(noodles?|ramen noodles?|udon noodles?|egg noodles?|somen|soba|面条|拉面|乌冬面|鸡蛋面|荞麦面|挂面)/i, category: 'Pantry & Spices', amount: 200, unit: 'g' },
  { canonical: 'Pie Crust / Pastry Sheet (派皮/酥皮)', regex: /(store bought crust|pie crust|shortcrust pastry|puff pastry|pastry sheet|派皮|酥皮|蛋挞皮)/i, category: 'Bakery', amount: 1, unit: 'sheet' },
  { canonical: 'Bamboo Skewers (竹签)', regex: /(bamboo skewers?|skewers?|竹签|竹籤)/i, category: 'Other', amount: 10, unit: 'pcs' },
  { canonical: 'Bamboo Steamer (竹蒸笼)', regex: /(bamboo steamer|steamer|竹蒸笼|蒸笼)/i, category: 'Other', amount: 1, unit: 'pcs' }
];

// Non-food cooking tools or scrap note fragments to ignore
const NON_INGREDIENT_FILTER = /^(a heat-proof dish|a fine-meshed strainer|a pot or wok|a large piece of wax paper|wax paper|parchment paper|abels for food|plastic wrap|aluminum foil|toothpicks?|cheesecloth|cooking string|bamboo skewer – or 2 shorter skewers)$/i;

function cleanAndNormalizeIngredient(rawName) {
  if (!rawName || typeof rawName !== 'string') return { name: '', category: 'Produce', amount: 1, unit: 'pcs' };

  let s = rawName.trim();

  // Strip emojis & html entities
  s = s.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  s = s.replace(/^(&quot;|&amp;|&lt;|&gt;|[\s\-\*\•\d\.\/\–—½⅓¼¾⅔⅛⅙⁄+「」*#])+/g, '');
  s = s.replace(/(&quot;|&amp;|&lt;|&gt;|[*#])+/g, '');

  // Strip leading brackets like [調味料], [Sauce], (Marinade)
  s = s.replace(/^\[[^\]]+\]\s*/g, '');
  s = s.replace(/^\([^\)]+\)\s*/g, '');

  // Strip descriptive quantity prefixes like:
  // "A Big Chunk Of ", "A Few Drops Of ", "A Cm Piece Of ", "1 Cm Piece Of ", "A Handful Of ", "A Pinch Of ", "A Dash Of ", "A Dollop Of ", "A Drizzle Of ", "A 4 To 5 Pound "
  s = s.replace(/^(a\s+)?(big\s+|few\s+|small\s+)?(chunk|piece|handful|pinch|dash|dollop|drizzle|splash|touch|handfuls|drops?|stalks?|slices?|cloves?|tbsp|tsp|cups?|cm|inch|pound|lb|oz|g|kg|ml)\s+(or\s+two\s+)?(of\s+)?/i, '');
  s = s.replace(/^[\d\.\-\/]+\s*(cm|inch|pound|lbs?|oz|g|kg|ml|cups?|tbsp|tsp)\s+(piece\s+of\s+|chunk\s+of\s+|of\s+)?/i, '');
  s = s.replace(/^(a\s+few\s+drops\s+of|a\s+few\s+big\s+handfuls\s+of|a\s+big\s+handful\s+or\s+two\s+of|a\s+dash\s+of|a\s+dollop\s+of|a\s+drizzle\s+of|a\s+pinch\s+of|a\s+chunk\s+of|a\s+piece\s+of|about\s+[\d\.\-\/]+\s*(cups?|tbsp|tsp|g|kg|oz|lb)?\s*(of)?)\s+/i, '');

  // Strip measurements at the beginning
  s = s.replace(/^[\d\.\/½⅓¼¾⅔⅛⅙⁄\-]+\s*(g|kg|ml|l|tbsp|tsp|cup|cups|oz|lb|lbs|pcs|slices|stalks|cloves|can|packet|pinch|cm|inch|个|個|根|瓣|片|大匙|小匙|茶匙|克|两|斤|汤匙|顆|條|份)\s+/i, '');

  // Strip first character missing scraped typos
  for (const fix of FIRST_CHAR_FIXES) {
    if (fix.match.test(s)) {
      s = s.replace(fix.match, fix.replace);
      break;
    }
  }

  // Strip measurements & qualifiers at end
  s = s.replace(/\s*[\d\.\/一两三四五六七八九十半½⅓¼¾⅔⅛⅙⁄]+\s*(个|個|根|瓣|片|大匙|小匙|茶匙|汤匙|湯匙|克|g|kg|ml|cc|l|tbsp|tsp|cup|cups|pcs|slices|stalks|cloves|can|packet|pinch|oz|lb|cm|mm|inch|顆|條|份)\s*$/i, '');
  s = s.replace(/\s*[\d\.\/]+\s*(g|kg|ml|l|tbsp|tsp|cup|cups|pcs|oz|lb|cm|mm)\s*$/i, '');
  s = s.replace(/\s*(適量|适量|少許|少许|若干|少许|适量)\s*$/g, '');

  // Strip prep instructions
  s = s.replace(/,\s*(minced|chopped|diced|sliced|finely chopped|grated|peeled|drained|rinsed|shredded|crushed|to taste|optional|divided|at room temperature|melted|softened|beaten|for serving|to garnish|cut into.*|skinless.*|boneless.*|tenderised.*|for tenderising.*).*$/i, '');
  s = s.replace(/\s*\(\s*(minced|chopped|diced|sliced|finely chopped|grated|peeled|drained|rinsed|shredded|crushed|to taste|optional|divided|at room temperature|melted|softened|beaten|for serving|to garnish|skinless.*|boneless.*|defrosted.*|note \d+.*|tightly packed.*|white part only.*|for tenderising.*)\s*\)/gi, '');

  // Strip all double or single parentheses / brackets with notes or instructions
  s = s.replace(/\(\([^)]*\)\)/g, '');
  s = s.replace(/\([^)]*\)/g, '');
  s = s.replace(/\[[^\]]*\]/g, '');
  s = s.replace(/\s*\([^)]*$/g, ''); // unclosed paren
  s = s.replace(/\s*\[[^\]]*$/g, '');

  // Strip trailing contextual phrases
  s = s.replace(/\s+(in\s+each\s+bowl|for\s+serving|to\s+garnish|for\s+dunking|for\s+mopping|as\s+needed|or\s+to\s+taste)$/i, '');

  // Strip leading/trailing punctuation & asterisks & quotes
  s = s.replace(/^[\s,\-\.\/:\'"“”*#–—]+|[\s,\-\.\/:\'"“”*#–—]+$/g, '').trim();

  // Test against canonical taxonomy first
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

  // Determine smart category
  let category = 'Produce';
  const lower = s.toLowerCase();
  if (/\b(beef|pork|chicken|duck|lamb|turkey|meat|steak|bacon|sausage|fish|salmon|shrimp|prawn|crab|lobster|squid|clam|mussel|oyster|tuna)\b/i.test(lower)) {
    category = 'Meat & Seafood';
  } else if (/\b(milk|butter|cheese|cream|yogurt|egg|eggs)\b/i.test(lower)) {
    category = 'Dairy & Eggs';
  } else if (/\b(flour|bread|bun|tortilla|crust|pastry|dough|baking powder|baking soda|yeast)\b/i.test(lower)) {
    category = 'Bakery';
  } else if (/\b(oil|sauce|vinegar|salt|sugar|pepper|spice|spices|curry|syrup|honey|rice|pasta|noodle|noodles|seed|seeds|stock|broth|mustard|vanilla|chocolate|almond|almonds|walnut|walnuts)\b/i.test(lower)) {
    category = 'Pantry & Spices';
  } else if (/\b(can|canned|tin|tinned)\b/i.test(lower)) {
    category = 'Canned Goods';
  }

  return {
    name: s,
    category,
    amount: 1,
    unit: 'pcs'
  };
}

// 1. Clean and normalize all system recipes
console.log('Cleaning and normalizing all system recipes...');
let normalizedCount = 0;
const masterDictionary = new Map();

// Seed canonical items first
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
      if (clean.name && clean.name.length >= 2 && !/^(and|or|for|with|approx|cm|long|note \d+|optional)$/i.test(clean.name) && !NON_INGREDIENT_FILTER.test(clean.name)) {
        ing.name = clean.name;
        ing.category = clean.category;
        normalizedCount++;

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

console.log(`Cleaned ${normalizedCount} recipe ingredient references.`);

const finalMasterList = Array.from(masterDictionary.values())
  .filter((item) => item.name.length >= 2 && !/^(and|or|for|with|approx|cm|long|note \d+|optional|\)\)|\(\()$/i.test(item.name) && !NON_INGREDIENT_FILTER.test(item.name))
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(`Final Consolidated Master Ingredient Database: ${finalMasterList.length} items.`);

// Summary by category
const catCounts = {};
finalMasterList.forEach(i => {
  catCounts[i.category] = (catCounts[i.category] || 0) + 1;
});
console.log('Ingredients by Category:', catCounts);

// Save cleaned master ingredients seed
fs.writeFileSync(masterSeedPath, JSON.stringify(finalMasterList, null, 2), 'utf8');
console.log(`Saved masterIngredientsSeed.json -> ${masterSeedPath}`);

// Save cleaned master system recipes
const systemPayload = {
  app: 'Gyummy Planner',
  version: '2.2.0',
  exportedAt: new Date().toISOString(),
  description: 'Master Recipe Library (Consolidated & Polished Ingredients)',
  dishes: recipes
};

fs.writeFileSync(systemRecipesPath, JSON.stringify(systemPayload, null, 2), 'utf8');
console.log(`Saved master_system_recipes.json -> ${systemRecipesPath}`);

if (fs.existsSync(path.dirname(distSystemRecipesPath))) {
  fs.writeFileSync(distSystemRecipesPath, JSON.stringify(systemPayload), 'utf8');
  console.log(`Saved dist/master_system_recipes.json -> ${distSystemRecipesPath}`);
}

console.log('NLP Normalization & Consolidation finished successfully! 🌟');
