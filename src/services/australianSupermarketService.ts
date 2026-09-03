import type { GroceryCategory } from '../types';

export type AustralianSupermarket = 'woolworths' | 'coles';

export type SupermarketAisle =
  | 'Fruit & Veg'
  | 'Meat, Seafood & Deli'
  | 'Dairy, Eggs & Fridge'
  | 'Bakery'
  | 'Pantry & International'
  | 'Freezer'
  | 'Household & Other';

export const SUPERMARKET_AISLES: SupermarketAisle[] = [
  'Fruit & Veg',
  'Meat, Seafood & Deli',
  'Dairy, Eggs & Fridge',
  'Bakery',
  'Pantry & International',
  'Freezer',
  'Household & Other'
];

/**
 * Australian Terminology Mapping
 * Normalizes scraped / US / international ingredient names to official Woolworths & Coles nomenclature
 */
const AUS_TERMINOLOGY_MAP: Array<{ match: RegExp; term: string; aisle: SupermarketAisle }> = [
  // Produce
  { match: /bell\s*pepper|capsicum|彩椒|青椒/i, term: 'Capsicum', aisle: 'Fruit & Veg' },
  { match: /cilantro|coriander|香菜/i, term: 'Fresh Coriander', aisle: 'Fruit & Veg' },
  { match: /scallion|green\s*onion|spring\s*onion|青葱|小葱|大葱/i, term: 'Spring Onions (Shallots)', aisle: 'Fruit & Veg' },
  { match: /shallot(?!s)|french\s*shallot|红葱头/i, term: 'Shallots', aisle: 'Fruit & Veg' },
  { match: /bok\s*choy|pak\s*choi|小白菜|上海青/i, term: 'Baby Bok Choy', aisle: 'Fruit & Veg' },
  { match: /chinese\s*cabbage|wong\s*bok|napa\s*cabbage|大白菜/i, term: 'Wombok (Chinese Cabbage)', aisle: 'Fruit & Veg' },
  { match: /cabbage|卷心菜|包菜/i, term: 'Green Cabbage', aisle: 'Fruit & Veg' },
  { match: /snow\s*pea|mangetout|荷兰豆/i, term: 'Snow Peas', aisle: 'Fruit & Veg' },
  { match: /zucchini|courgette|西葫芦/i, term: 'Zucchini', aisle: 'Fruit & Veg' },
  { match: /eggplant|aubergine|茄子/i, term: 'Eggplant', aisle: 'Fruit & Veg' },
  { match: /broccoli|西兰花/i, term: 'Broccoli', aisle: 'Fruit & Veg' },
  { match: /spinach|菠菜/i, term: 'Baby Spinach', aisle: 'Fruit & Veg' },
  { match: /carrot|胡萝卜/i, term: 'Carrots', aisle: 'Fruit & Veg' },
  { match: /ginger|生姜|老姜/i, term: 'Fresh Ginger', aisle: 'Fruit & Veg' },
  { match: /garlic|大蒜|蒜瓣/i, term: 'Garlic Bulbs', aisle: 'Fruit & Veg' },
  { match: /lemongrass|香茅/i, term: 'Lemongrass Stalks', aisle: 'Fruit & Veg' },
  { match: /chili|chilli|辣椒/i, term: 'Red Chillies', aisle: 'Fruit & Veg' },
  { match: /bean\s*sprouts|豆芽/i, term: 'Bean Sprouts', aisle: 'Fruit & Veg' },
  { match: /cucumber|黄瓜/i, term: 'Lebanese Cucumbers', aisle: 'Fruit & Veg' },
  { match: /potato|potatoes|土豆|马铃薯/i, term: 'Potatoes (Washed)', aisle: 'Fruit & Veg' },
  { match: /onion|洋葱/i, term: 'Brown Onions', aisle: 'Fruit & Veg' },
  { match: /mushroom|香菇|蘑菇/i, term: 'Button Mushrooms', aisle: 'Fruit & Veg' },
  { match: /tomato|tomatoes|番茄|西红柿/i, term: 'Truss Tomatoes', aisle: 'Fruit & Veg' },

  // Meat, Seafood & Deli
  { match: /ground\s*beef|minced\s*beef|beef\s*mince|牛肉碎|牛肉馅/i, term: 'Beef Mince Regular', aisle: 'Meat, Seafood & Deli' },
  { match: /ground\s*pork|minced\s*pork|pork\s*mince|猪肉碎|猪肉馅/i, term: 'Pork Mince', aisle: 'Meat, Seafood & Deli' },
  { match: /chicken\s*breast|鸡胸/i, term: 'Chicken Breast Fillets', aisle: 'Meat, Seafood & Deli' },
  { match: /chicken\s*thigh|鸡腿肉/i, term: 'Chicken Thigh Fillets', aisle: 'Meat, Seafood & Deli' },
  { match: /pork\s*belly|五花肉/i, term: 'Pork Belly Slices', aisle: 'Meat, Seafood & Deli' },
  { match: /pork\s*chop|猪排/i, term: 'Pork Loin Chops', aisle: 'Meat, Seafood & Deli' },
  { match: /steak|beef\s*sirloin|rump|牛排|西冷/i, term: 'Beef Rump Steak', aisle: 'Meat, Seafood & Deli' },
  { match: /shrimp|prawn|虾|大虾|虾仁/i, term: 'Raw Prawn Meat', aisle: 'Meat, Seafood & Deli' },
  { match: /salmon|三文鱼/i, term: 'Atlantic Salmon Fillets', aisle: 'Meat, Seafood & Deli' },
  { match: /fish\s*fillet|cod|barramundi|鱼片|鳕鱼/i, term: 'Barramundi Fillets', aisle: 'Meat, Seafood & Deli' },
  { match: /bacon|培根/i, term: 'Short Cut Bacon', aisle: 'Meat, Seafood & Deli' },
  { match: /ham|火腿/i, term: 'Leg Ham Slices', aisle: 'Meat, Seafood & Deli' },
  { match: /tofu|豆腐/i, term: 'Firm Tofu', aisle: 'Meat, Seafood & Deli' },

  // Dairy, Eggs & Fridge
  { match: /egg|eggs|鸡蛋/i, term: 'Free Range Large Eggs 12pk', aisle: 'Dairy, Eggs & Fridge' },
  { match: /milk|牛奶/i, term: 'Full Cream Milk 2L', aisle: 'Dairy, Eggs & Fridge' },
  { match: /butter|黄油/i, term: 'Salted Butter 250g', aisle: 'Dairy, Eggs & Fridge' },
  { match: /cream|heavy\s*cream|淡奶油/i, term: 'Thickened Cream 300ml', aisle: 'Dairy, Eggs & Fridge' },
  { match: /cheese|mozzarella|cheddar|芝士|奶酪/i, term: 'Shredded Tasty Cheese 500g', aisle: 'Dairy, Eggs & Fridge' },
  { match: /yogurt|yoghurt|酸奶/i, term: 'Greek Style Natural Yogurt 1kg', aisle: 'Dairy, Eggs & Fridge' },

  // Pantry & Asian Essentials
  { match: /jasmine\s*rice|香米|茉莉香米/i, term: 'Jasmine Rice 1kg', aisle: 'Pantry & International' },
  { match: /rice|white\s*rice|白米|米饭/i, term: 'SunRice Medium Grain Rice 1kg', aisle: 'Pantry & International' },
  { match: /soy\s*sauce|生抽|酱油/i, term: 'Lee Kum Kee Premium Soy Sauce 500ml', aisle: 'Pantry & International' },
  { match: /dark\s*soy\s*sauce|老抽/i, term: 'Dark Soy Sauce 500ml', aisle: 'Pantry & International' },
  { match: /oyster\s*sauce|蚝油/i, term: 'Lee Kum Kee Oyster Sauce 510g', aisle: 'Pantry & International' },
  { match: /sesame\s*oil|芝麻油|麻油/i, term: 'Pure Sesame Oil 207ml', aisle: 'Pantry & International' },
  { match: /cooking\s*wine|shaoxing|花雕|料酒/i, term: 'Chinese Cooking Wine (Shaoxing) 640ml', aisle: 'Pantry & International' },
  { match: /fish\s*sauce|鱼露/i, term: 'Squid Brand Fish Sauce 725ml', aisle: 'Pantry & International' },
  { match: /cooking\s*oil|vegetable\s*oil|canola|植物油|色拉油/i, term: 'Canola Oil 2L', aisle: 'Pantry & International' },
  { match: /olive\s*oil|橄榄油/i, term: 'Extra Virgin Olive Oil 1L', aisle: 'Pantry & International' },
  { match: /mirin|味醂/i, term: 'Japanese Mirin 250ml', aisle: 'Pantry & International' },
  { match: /cornstarch|corn\s*flour|玉米淀粉|生粉/i, term: 'Cornflour 500g', aisle: 'Pantry & International' },
  { match: /flour|all\s*purpose\s*flour|plain\s*flour|面粉/i, term: 'Plain Flour 1kg', aisle: 'Pantry & International' },
  { match: /noodles|wheat\s*noodles|chow\s*mein|面条/i, term: 'Fresh Hokkien Noodles 450g', aisle: 'Pantry & International' },
  { match: /pasta|spaghetti|意大利面/i, term: 'San Remo Spaghetti 500g', aisle: 'Pantry & International' },
  { match: /sugar|white\s*sugar|白糖|细砂糖/i, term: 'White Sugar 1kg', aisle: 'Pantry & International' },
  { match: /salt|sea\s*salt|食盐|海盐/i, term: 'Table Salt 750g', aisle: 'Pantry & International' },
  { match: /black\s*pepper|黑胡椒/i, term: 'Black Pepper Grinder 50g', aisle: 'Pantry & International' }
];

export interface StandardizedSupermarketItem {
  id: string;
  originalName: string;
  australianSearchTerm: string;
  quantityText: string;
  amount: number | null;
  unit: string;
  aisle: SupermarketAisle;
  category: GroceryCategory;
  inPantry: boolean;
  selected: boolean;
  sourceDishes?: string[];
}

/**
 * Maps a raw grocery item into an Australian supermarket standardized item
 */
export function standardizeToAustralianSupermarket(item: {
  id?: string;
  name: string;
  amount: number | null;
  unit: string;
  category?: GroceryCategory;
  inPantry?: boolean;
  sourceDishes?: string[];
}): StandardizedSupermarketItem {
  const normName = item.name.trim();

  let matchedTerm = normName;
  let matchedAisle: SupermarketAisle = 'Pantry & International';

  for (const entry of AUS_TERMINOLOGY_MAP) {
    if (entry.match.test(normName)) {
      matchedTerm = entry.term;
      matchedAisle = entry.aisle;
      break;
    }
  }

  // Fallback to Category
  if (matchedAisle === 'Pantry & International' && item.category) {
    if (item.category === 'Produce') matchedAisle = 'Fruit & Veg';
    else if (item.category === 'Meat & Seafood') matchedAisle = 'Meat, Seafood & Deli';
    else if (item.category === 'Dairy & Eggs') matchedAisle = 'Dairy, Eggs & Fridge';
    else if (item.category === 'Bakery') matchedAisle = 'Bakery';
    else if (item.category === 'Frozen') matchedAisle = 'Freezer';
  }

  const qty = item.amount !== null && item.amount !== undefined
    ? `${item.amount} ${item.unit || ''}`.trim()
    : (item.unit || '1 pcs');

  return {
    id: item.id || `sup_${Math.random().toString(36).slice(2, 9)}`,
    originalName: normName,
    australianSearchTerm: matchedTerm,
    quantityText: qty,
    amount: item.amount,
    unit: item.unit || '',
    aisle: matchedAisle,
    category: item.category || 'Other',
    inPantry: Boolean(item.inPantry),
    selected: !item.inPantry, // Auto-select only non-pantry items
    sourceDishes: item.sourceDishes
  };
}

/**
 * Generate 1-Click Search URL for Woolworths Online
 */
export function buildWoolworthsSearchUrl(searchTerm: string): string {
  const cleanTerm = searchTerm.replace(/\s*\([^)]*\)/g, '').trim(); // Strip bracketed notes
  return `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(cleanTerm)}`;
}

/**
 * Generate 1-Click Search URL for Coles Online
 */
export function buildColesSearchUrl(searchTerm: string): string {
  const cleanTerm = searchTerm.replace(/\s*\([^)]*\)/g, '').trim();
  return `https://www.coles.com.au/search?q=${encodeURIComponent(cleanTerm)}`;
}

/**
 * Build a clean, formatted shopping list for clipboard copy
 */
export function formatSupermarketShoppingList(
  supermarket: AustralianSupermarket,
  items: StandardizedSupermarketItem[],
  familyOrWeekName: string = 'Weekly Meals'
): string {
  const retailerName = supermarket === 'woolworths' ? 'Woolworths Online' : 'Coles Online';
  const selectedItems = items.filter((i) => i.selected);

  const grouped: Record<SupermarketAisle, StandardizedSupermarketItem[]> = {
    'Fruit & Veg': [],
    'Meat, Seafood & Deli': [],
    'Dairy, Eggs & Fridge': [],
    'Bakery': [],
    'Pantry & International': [],
    'Freezer': [],
    'Household & Other': []
  };

  selectedItems.forEach((item) => {
    if (grouped[item.aisle]) {
      grouped[item.aisle].push(item);
    } else {
      grouped['Household & Other'].push(item);
    }
  });

  const lines: string[] = [
    `🛒 GYUMMY SHOPPING LIST FOR ${retailerName.toUpperCase()}`,
    `📅 ${familyOrWeekName} · ${selectedItems.length} items to purchase`,
    `ℹ️ Pantry staples already in kitchen have been excluded`,
    ''
  ];

  SUPERMARKET_AISLES.forEach((aisle) => {
    const aisleItems = grouped[aisle];
    if (aisleItems && aisleItems.length > 0) {
      lines.push(`[${aisle}]`);
      aisleItems.forEach((it) => {
        lines.push(`• ${it.australianSearchTerm} (${it.quantityText})`);
      });
      lines.push('');
    }
  });

  lines.push('Generated with Gyummy Meal Planner (https://gyummy.web.app)');
  return lines.join('\n');
}

/**
 * Export B2B / EDI JSON structure for Supermarket API or EDI integration
 */
export function buildSupermarketEdiPayload(
  supermarket: AustralianSupermarket,
  items: StandardizedSupermarketItem[],
  metadata: { familyName: string; weekRange: string }
) {
  const selected = items.filter((i) => i.selected);

  return {
    $schema: 'https://gyummy.web.app/schemas/supermarket-edi-v1.json',
    edi_version: '1.0.0',
    retailer: supermarket === 'woolworths' ? 'WOOLWORTHS_AU' : 'COLES_AU',
    currency: 'AUD',
    country: 'AU',
    created_at: new Date().toISOString(),
    household: {
      family_id: metadata.familyName,
      week_range: metadata.weekRange
    },
    order_summary: {
      total_line_items: selected.length,
      pantry_excluded_count: items.filter((i) => !i.selected && i.inPantry).length
    },
    line_items: selected.map((item, idx) => ({
      line_number: idx + 1,
      sku_search_query: item.australianSearchTerm,
      raw_ingredient_name: item.originalName,
      aisle: item.aisle,
      requested_quantity: item.amount,
      unit: item.unit,
      display_quantity: item.quantityText,
      target_retailer_url:
        supermarket === 'woolworths'
          ? buildWoolworthsSearchUrl(item.australianSearchTerm)
          : buildColesSearchUrl(item.australianSearchTerm),
      source_recipes: item.sourceDishes || []
    }))
  };
}
