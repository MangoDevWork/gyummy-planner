import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Gyummy Planner - High-Volume Multi-Site Batch Scraper Engine
 * Supports 1-command bulk scraping for:
 * 1. recipetineats   (RecipeTin Eats - 1,500+ recipes)
 * 2. thewoksoflife   (The Woks of Life - 1,200+ Asian recipes)
 * 3. taste           (Taste.com.au - Quick Dinners & Family Meals)
 * 4. food            (Food.com - 30-Minute Dinners & Top Rated)
 * 5. icook           (iCook Taiwan - 家常菜 Home Cooking)
 * 6. justonecookbook (Just One Cookbook - All 22 pages / 1,000+ Japanese recipes)
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectCategory(name, keywords = []) {
  const text = (name + ' ' + keywords.join(' ')).toLowerCase();
  if (text.includes('breakfast') || text.includes('pancake') || text.includes('egg') || text.includes('toast') || text.includes('oat') || text.includes('brunch') || text.includes('早午餐') || text.includes('早餐')) return 'Breakfast';
  if (text.includes('lunch') || text.includes('sandwich') || text.includes('salad') || text.includes('wrap') || text.includes('noodle') || text.includes('炒麵') || text.includes('炒飯') || text.includes('便當')) return 'Lunch';
  if (text.includes('dessert') || text.includes('cake') || text.includes('cookie') || text.includes('sweet') || text.includes('pie') || text.includes('pudding') || text.includes('甜點') || text.includes('蛋糕')) return 'Dessert';
  if (text.includes('snack') || text.includes('appetizer') || text.includes('dip') || text.includes('finger food') || text.includes('點心') || text.includes('小吃')) return 'Snack';
  return 'Dinner';
}

function detectCuisine(name, textContent = '') {
  const combined = (name + ' ' + textContent).toLowerCase();
  if (combined.includes('japanese') || combined.includes('teriyaki') || combined.includes('miso') || combined.includes('sushi') || combined.includes('ramen') || combined.includes('udon') || combined.includes('日式') || combined.includes('照燒') || combined.includes('katsu') || combined.includes('tempura') || combined.includes('yakisoba') || combined.includes('donburi')) return 'Japanese';
  if (combined.includes('korean') || combined.includes('kimchi') || combined.includes('bulgogi') || combined.includes('bibimbap') || combined.includes('韓式') || combined.includes('泡菜')) return 'Korean';
  if (combined.includes('chinese') || combined.includes('cantonese') || combined.includes('szechuan') || combined.includes('sichuan') || combined.includes('dim sum') || combined.includes('dumpling') || combined.includes('fried rice') || combined.includes('wok') || combined.includes('中式') || combined.includes('台式') || combined.includes('港式') || combined.includes('家常菜') || combined.includes('chow mein')) return 'Cantonese';
  if (combined.includes('thai') || combined.includes('pad thai') || combined.includes('tom yum') || combined.includes('泰式') || combined.includes('綠咖哩') || combined.includes('curry')) return 'Thai';
  if (combined.includes('vietnamese') || combined.includes('pho') || combined.includes('lemongrass') || combined.includes('banh mi') || combined.includes('越式')) return 'Vietnamese';
  if (combined.includes('italian') || combined.includes('pasta') || combined.includes('pizza') || combined.includes('risotto') || combined.includes('bolognese') || combined.includes('carbonara') || combined.includes('義式')) return 'Italian';
  if (combined.includes('mexican') || combined.includes('taco') || combined.includes('burrito') || combined.includes('salsa') || combined.includes('fajita') || combined.includes('enchilada') || combined.includes('墨西哥')) return 'Mexican';
  if (combined.includes('mediterranean') || combined.includes('greek') || combined.includes('hummus') || combined.includes('tzatziki') || combined.includes('地中海')) return 'Mediterranean';
  if (combined.includes('roast') || combined.includes('burger') || combined.includes('steak') || combined.includes('pie') || combined.includes('stew') || combined.includes('schnitzel') || combined.includes('西式')) return 'Western';
  return 'Asian';
}

function detectIngredientCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('chicken') || n.includes('beef') || n.includes('pork') || n.includes('fish') || n.includes('salmon') || n.includes('shrimp') || n.includes('prawn') || n.includes('meat') || n.includes('fillet') || n.includes('steak') || n.includes('bacon') || n.includes('sausage') || n.includes('lamb') || n.includes('mince') || n.includes('dashi') || n.includes('bonito') || n.includes('雞') || n.includes('牛') || n.includes('豬') || n.includes('魚') || n.includes('蝦') || n.includes('肉') || n.includes('海鮮')) return 'Meat & Seafood';
  if (n.includes('egg') || n.includes('milk') || n.includes('cheese') || n.includes('butter') || n.includes('cream') || n.includes('yogurt') || n.includes('parmesan') || n.includes('mozzarella') || n.includes('蛋') || n.includes('奶') || n.includes('起司') || n.includes('乳酪') || n.includes('奶油')) return 'Dairy & Eggs';
  if (n.includes('onion') || n.includes('garlic') || n.includes('tomato') || n.includes('ginger') || n.includes('scallion') || n.includes('pepper') || n.includes('capsicum') || n.includes('spinach') || n.includes('carrot') || n.includes('potato') || n.includes('mushroom') || n.includes('herb') || n.includes('lemon') || n.includes('lime') || n.includes('basil') || n.includes('coriander') || n.includes('cilantro') || n.includes('zucchini') || n.includes('broccoli') || n.includes('cabbage') || n.includes('daikon') || n.includes('nori') || n.includes('seaweed') || n.includes('negi') || n.includes('葱') || n.includes('蒜') || n.includes('薑') || n.includes('菜') || n.includes('菇') || n.includes('番茄') || n.includes('洋蔥') || n.includes('蘿蔔')) return 'Produce';
  if (n.includes('bread') || n.includes('toast') || n.includes('bun') || n.includes('bagel') || n.includes('pita') || n.includes('tortilla') || n.includes('wrap') || n.includes('panko') || n.includes('麵包') || n.includes('吐司')) return 'Bakery';
  if (n.includes('frozen') || n.includes('peas') || n.includes('ice cream') || n.includes('edamame') || n.includes('冷凍')) return 'Frozen';
  if (n.includes('canned') || n.includes('can of') || n.includes('tinned') || n.includes('beans') || n.includes('chickpeas') || n.includes('lentils') || n.includes('罐頭')) return 'Canned Goods';
  return 'Pantry & Spices';
}

function parseDurationMinutes(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 20;
  const hoursMatch = durationStr.match(/(\d+)H/i);
  const minsMatch = durationStr.match(/(\d+)M/i);
  let total = 0;
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);
  return total > 0 ? total : 20;
}

function parseIngredientString(rawStr, idx) {
  if (typeof rawStr !== 'string') {
    return {
      id: `ing_scraped_${Date.now()}_${idx}`,
      name: 'Ingredient',
      amount: 1,
      unit: 'pcs',
      category: 'Produce'
    };
  }

  const clean = rawStr.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^([\d\/\.\s\-¼½¾⅓⅔⅛⅜⅝⅞]+)?\s*(tbsp|tablespoon|tsp|teaspoon|cup|cups|g|kg|ml|l|liter|oz|ounce|lb|pound|clove|cloves|pinch|pinches|slice|slices|stalk|stalks|can|cans|packet|pkg|piece|pieces|pcs|公克|克|湯匙|茶匙|大匙|小匙|碗|片|根|條|瓣|隻|顆|個)?\s*(.*)$/i);
  
  let amount = null;
  let unit = 'pcs';
  let name = clean;

  if (match) {
    if (match[1]) {
      const numStr = match[1].trim();
      if (numStr.includes('/')) {
        const parts = numStr.split(' ');
        let sum = 0;
        parts.forEach((p) => {
          if (p.includes('/')) {
            const [num, den] = p.split('/');
            sum += parseFloat(num) / parseFloat(den);
          } else {
            sum += parseFloat(p) || 0;
          }
        });
        amount = Math.round(sum * 100) / 100;
      } else {
        amount = parseFloat(numStr) || null;
      }
    }
    if (match[2]) unit = match[2].toLowerCase().replace(/tablespoon[s]?/i, 'tbsp').replace(/teaspoon[s]?/i, 'tsp').replace(/cups?/i, 'cup').replace(/ounces?/i, 'oz').replace(/pounds?/i, 'lb').replace(/大匙/i, 'tbsp').replace(/小匙|茶匙/i, 'tsp').replace(/公克/i, 'g');
    if (match[3] && match[3].trim()) name = match[3].trim();
  }

  return {
    id: `ing_scraped_${Date.now()}_${idx}`,
    name: name.replace(/^of\s+/i, '').replace(/^[，,\s\-]+/, '').trim() || 'Ingredient',
    amount: amount || 1,
    unit: unit || 'pcs',
    category: detectIngredientCategory(name)
  };
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    // fallback to curl
  }

  // Fallback to curl.exe for Cloudflare-protected sites like Just One Cookbook
  try {
    const cmd = `curl.exe -s -L "${url}" -A "${USER_AGENT}"`;
    return execSync(cmd, { encoding: 'utf-8', maxBuffer: 15 * 1024 * 1024 });
  } catch (err) {
    throw new Error(`Failed to fetch ${url} via fetch and curl: ${err.message}`);
  }
}

function extractRecipeFromJsonLd(html, sourceUrl) {
  const jsonLdMatches = html.match(/<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!jsonLdMatches) return null;

  for (const tag of jsonLdMatches) {
    const rawJson = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    try {
      let parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) parsed = parsed.find((p) => p['@type'] === 'Recipe' || p['@type']?.includes?.('Recipe'));
      if (parsed?.['@graph']) {
        parsed = parsed['@graph'].find((p) => p['@type'] === 'Recipe' || p['@type']?.includes?.('Recipe'));
      }

      if (parsed && (parsed['@type'] === 'Recipe' || parsed['@type']?.includes?.('Recipe'))) {
        const name = (parsed.name || 'Untitled Dish').replace(/&amp;/g, '&').replace(/&#8217;/g, "'");
        
        let instructions = '';
        if (Array.isArray(parsed.recipeInstructions)) {
          instructions = parsed.recipeInstructions
            .map((step, i) => {
              const text = typeof step === 'string' ? step : (step.text || step.name || '');
              return text ? `${i + 1}. ${text.replace(/&amp;/g, '&')}` : '';
            })
            .filter(Boolean)
            .join('\n');
        } else if (typeof parsed.recipeInstructions === 'string') {
          instructions = parsed.recipeInstructions.replace(/&amp;/g, '&');
        }

        const rawIngredients = Array.isArray(parsed.recipeIngredient) ? parsed.recipeIngredient : [];
        const ingredients = rawIngredients.map((raw, i) => parseIngredientString(raw, i));

        let imageUrl = undefined;
        if (Array.isArray(parsed.image)) {
          imageUrl = typeof parsed.image[0] === 'string' ? parsed.image[0] : parsed.image[0]?.url;
        } else if (typeof parsed.image === 'object' && parsed.image?.url) {
          imageUrl = parsed.image.url;
        } else if (typeof parsed.image === 'string') {
          imageUrl = parsed.image;
        }

        const prepTime = parseDurationMinutes(parsed.totalTime || parsed.cookTime || parsed.prepTime);

        return {
          id: `dish_scraped_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: name.trim(),
          category: detectCategory(name, parsed.recipeCategory ? (Array.isArray(parsed.recipeCategory) ? parsed.recipeCategory : [parsed.recipeCategory]) : []),
          cuisine: parsed.recipeCuisine ? (Array.isArray(parsed.recipeCuisine) ? parsed.recipeCuisine[0] : parsed.recipeCuisine) : detectCuisine(name, instructions),
          servings: parseInt(parsed.recipeYield, 10) || 4,
          prepTimeMinutes: prepTime,
          instructions: instructions || 'Follow recipe instructions on original website.',
          imageUrl,
          imageEmoji: '🍲',
          tags: [parsed.recipeCuisine || 'Japanese', 'Web Import'].filter(Boolean),
          favoritedByMembers: [],
          isFamilyRecipe: false, // In System Library so user can select
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ingredients
        };
      }
    } catch (e) {
      // Continue parsing other script tags
    }
  }
  return null;
}

// -------------------------------------------------------------
// Site URL Crawlers
// -------------------------------------------------------------

async function getJustOneCookbookUrls(limit = 1100) {
  console.log('📡 Fetching Just One Cookbook sitemaps (all 22 pages / 1,000+ recipes)...');
  const sitemaps = [
    'https://www.justonecookbook.com/post-sitemap.xml',
    'https://www.justonecookbook.com/post-sitemap2.xml'
  ];

  const recipeUrls = new Set();
  for (const smUrl of sitemaps) {
    if (recipeUrls.size >= limit) break;
    try {
      const xml = await fetchHtml(smUrl);
      const locs = xml.match(/<loc>(https:\/\/www\.justonecookbook\.com\/[^<]+)<\/loc>/g) || [];
      for (const loc of locs) {
        const url = loc.replace(/<loc>|<\/loc>/g, '').trim();
        // Filter out travel, roundups, and info guides
        if (!url.includes('/travel/') && !url.includes('/pantry/') && !url.includes('/how-to/') && !url.includes('/japan-travel-') && !url.includes('/restaurants/')) {
          recipeUrls.add(url);
          if (recipeUrls.size >= limit) break;
        }
      }
    } catch (e) {
      console.warn(`Warning: Sitemap ${smUrl}:`, e.message);
    }
  }
  return Array.from(recipeUrls).slice(0, limit);
}

async function getRecipeTinEatsUrls(limit = 1500) {
  console.log('📡 Fetching RecipeTin Eats sitemaps...');
  const sitemaps = [
    'https://www.recipetineats.com/post-sitemap.xml',
    'https://www.recipetineats.com/post-sitemap2.xml',
    'https://www.recipetineats.com/post-sitemap3.xml',
    'https://www.recipetineats.com/post-sitemap4.xml'
  ];

  const recipeUrls = new Set();
  for (const smUrl of sitemaps) {
    if (recipeUrls.size >= limit) break;
    try {
      const xml = await fetchHtml(smUrl);
      const locs = xml.match(/<loc>(https:\/\/www\.recipetineats\.com\/[^<]+)<\/loc>/g) || [];
      for (const loc of locs) {
        const url = loc.replace(/<loc>|<\/loc>/g, '').trim();
        if (!url.includes('/blog/') && !url.includes('/category/') && !url.includes('-map/') && !url.includes('/contact/')) {
          recipeUrls.add(url);
          if (recipeUrls.size >= limit) break;
        }
      }
    } catch (e) {
      console.warn(`Warning: Sitemap ${smUrl}:`, e.message);
    }
  }
  return Array.from(recipeUrls).slice(0, limit);
}

async function getTheWoksOfLifeUrls(limit = 1200) {
  console.log('📡 Fetching The Woks of Life sitemaps...');
  const sitemaps = [
    'https://thewoksoflife.com/post-sitemap.xml',
    'https://thewoksoflife.com/post-sitemap2.xml',
    'https://thewoksoflife.com/post-sitemap3.xml'
  ];

  const recipeUrls = new Set();
  for (const smUrl of sitemaps) {
    if (recipeUrls.size >= limit) break;
    try {
      const xml = await fetchHtml(smUrl);
      const locs = xml.match(/<loc>(https:\/\/thewoksoflife\.com\/[^<]+)<\/loc>/g) || [];
      for (const loc of locs) {
        const url = loc.replace(/<loc>|<\/loc>/g, '').trim();
        if (!url.includes('/category/') && !url.includes('/about/') && !url.includes('/visual-recipe-index/')) {
          recipeUrls.add(url);
          if (recipeUrls.size >= limit) break;
        }
      }
    } catch (e) {
      console.warn(`Warning: Sitemap ${smUrl}:`, e.message);
    }
  }
  return Array.from(recipeUrls).slice(0, limit);
}

async function getTasteUrls(limit = 100) {
  console.log('📡 Fetching Taste.com.au recipe collections & sitemaps...');
  const recipeUrls = new Set();
  const collections = [
    'https://www.taste.com.au/recipes/collections/quick-easy-dinner-recipes',
    'https://www.taste.com.au/recipes/collections/easy-dinner-recipes',
    'https://www.taste.com.au/recipes/collections/healthy-dinners',
    'https://www.taste.com.au/recipes/collections/asian-dinner-recipes'
  ];

  for (const colUrl of collections) {
    if (recipeUrls.size >= limit) break;
    try {
      const html = await fetchHtml(colUrl);
      const matches = html.match(/href="(\/recipes\/[a-z0-9\-]+\/[a-f0-9\-]+)"/gi) || [];
      matches.forEach((m) => {
        const pathOnly = m.replace(/^href="/i, '').replace(/"$/, '');
        recipeUrls.add(`https://www.taste.com.au${pathOnly}`);
      });
      await sleep(200);
    } catch (e) {
      console.warn(`Warning: Taste collection ${colUrl}:`, e.message);
    }
  }

  if (recipeUrls.size < limit) {
    try {
      const xml = await fetchHtml('https://www.taste.com.au/sitemap1.xml');
      const locs = xml.match(/<loc>(https:\/\/www\.taste\.com\.au\/recipes\/[^<]+)<\/loc>/g) || [];
      locs.forEach((loc) => {
        const u = loc.replace(/<loc>|<\/loc>/g, '').trim();
        recipeUrls.add(u);
      });
    } catch (e) {
      // ignore
    }
  }

  return Array.from(recipeUrls).slice(0, limit);
}

async function getFoodComUrls(limit = 100) {
  console.log('📡 Fetching Food.com 30-minute dinners & top collections...');
  const recipeUrls = new Set();
  const collections = [
    'https://www.food.com/ideas/30-minute-dinners-6720',
    'https://www.food.com/ideas/easy-dinner-ideas-6028',
    'https://www.food.com/ideas/asian-dinner-recipes-6831'
  ];

  for (const colUrl of collections) {
    if (recipeUrls.size >= limit) break;
    try {
      const html = await fetchHtml(colUrl);
      const matches = html.match(/href="(\/recipe\/[a-z0-9\-]+-\d+)"/gi) || [];
      matches.forEach((m) => {
        const pathOnly = m.replace(/^href="/i, '').replace(/"$/, '');
        recipeUrls.add(`https://www.food.com${pathOnly}`);
      });
      await sleep(200);
    } catch (e) {
      console.warn(`Warning: Food.com collection ${colUrl}:`, e.message);
    }
  }

  return Array.from(recipeUrls).slice(0, limit);
}

async function getICookUrls(pageCount = 10) {
  console.log(`📡 Fetching iCook Taiwan search pages (1 to ${pageCount})...`);
  const recipeUrls = new Set();

  for (let p = 1; p <= pageCount; p++) {
    try {
      const url = `https://icook.tw/search/%E5%AE%B6%E5%B8%B8%E8%8F%9C/?page=${p}`;
      const html = await fetchHtml(url);
      const matches = html.match(/\/recipes\/\d+/g) || [];
      matches.forEach((m) => recipeUrls.add(`https://icook.tw${m}`));
      await sleep(250);
    } catch (e) {
      console.warn(`Error fetching iCook page ${p}:`, e.message);
    }
  }

  return Array.from(recipeUrls);
}

// -------------------------------------------------------------
// Concurrent Batch Runner
// -------------------------------------------------------------
async function scrapeUrlList(urls, concurrency = 4) {
  const dishes = [];
  let completed = 0;
  const total = urls.length;

  console.log(`\n🚀 Starting batch scrape of ${total} recipes with concurrency of ${concurrency}...\n`);

  for (let i = 0; i < total; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const promises = chunk.map(async (url) => {
      try {
        const html = await fetchHtml(url);
        const dish = extractRecipeFromJsonLd(html, url);
        completed++;
        if (dish) {
          dishes.push(dish);
          console.log(`[${completed}/${total}] ✅ ${dish.name} (${dish.cuisine} • ${dish.ingredients.length} ingr)`);
        } else {
          console.log(`[${completed}/${total}] ⚠️ No recipe JSON-LD found at: ${url}`);
        }
      } catch (err) {
        completed++;
        console.log(`[${completed}/${total}] ❌ Failed: ${url} (${err.message})`);
      }
    });

    await Promise.all(promises);
    await sleep(250);
  }

  return dishes;
}

// -------------------------------------------------------------
// Main CLI
// -------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || 'help').toLowerCase();

  let targetUrls = [];
  let filenameLabel = command;

  if (command === 'justonecookbook' || command === 'joc') {
    const limit = parseInt(args[1], 10) || 1100;
    console.log(`🎯 Target: Just One Cookbook (Full catalog up to ${limit} recipes)`);
    targetUrls = await getJustOneCookbookUrls(limit);
    filenameLabel = `justonecookbook_${targetUrls.length}`;
  } else if (command === 'recipetineats') {
    const limit = parseInt(args[1], 10) || 1500;
    console.log(`🎯 Target: RecipeTin Eats (Up to ${limit} recipes)`);
    targetUrls = await getRecipeTinEatsUrls(limit);
    filenameLabel = `recipetineats_${targetUrls.length}`;
  } else if (command === 'thewoksoflife' || command === 'woks') {
    const limit = parseInt(args[1], 10) || 1200;
    console.log(`🎯 Target: The Woks of Life (Up to ${limit} recipes)`);
    targetUrls = await getTheWoksOfLifeUrls(limit);
    filenameLabel = `thewoksoflife_${targetUrls.length}`;
  } else if (command === 'taste') {
    const limit = parseInt(args[1], 10) || 100;
    console.log(`🎯 Target: Taste.com.au (Up to ${limit} recipes)`);
    targetUrls = await getTasteUrls(limit);
    filenameLabel = `taste_${targetUrls.length}`;
  } else if (command === 'food') {
    const limit = parseInt(args[1], 10) || 100;
    console.log(`🎯 Target: Food.com 30-Minute Dinners (Up to ${limit} recipes)`);
    targetUrls = await getFoodComUrls(limit);
    filenameLabel = `foodcom_${targetUrls.length}`;
  } else if (command === 'icook') {
    const pages = parseInt(args[1], 10) || 10;
    console.log(`🎯 Target: iCook Taiwan (${pages} search pages)`);
    targetUrls = await getICookUrls(pages);
    filenameLabel = `icook_${targetUrls.length}`;
  } else if (command === 'url') {
    const singleUrl = args[1];
    if (!singleUrl) {
      console.error('Error: Please provide a URL. Example: node scripts/batch-scraper.js url "https://..."');
      process.exit(1);
    }
    targetUrls = [singleUrl];
    filenameLabel = 'single';
  } else if (command === 'list') {
    const filePath = args[1] || 'urls.txt';
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File ${filePath} not found. Create a file with 1 URL per line.`);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    targetUrls = raw.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('http'));
    filenameLabel = `custom_list_${targetUrls.length}`;
  } else {
    console.log(`
🥘 Gyummy Planner Batch Recipe Scraper 🥘

1-Command Bulk Scrapers:
  node scripts/batch-scraper.js justonecookbook [count] (e.g. 1000 for ALL 22 pages)
  node scripts/batch-scraper.js recipetineats [count]   (e.g. 1500 for all recipes)
  node scripts/batch-scraper.js thewoksoflife [count]   (e.g. 1000 for all recipes)
  node scripts/batch-scraper.js taste [count]           (e.g. 100, 300)
  node scripts/batch-scraper.js food [count]            (e.g. 30-min dinners)
  node scripts/batch-scraper.js icook [pages]           (e.g. 10, 20 pages)

Custom URL / List:
  node scripts/batch-scraper.js url "<Recipe_URL>"
  node scripts/batch-scraper.js list urls.txt
    `);
    process.exit(0);
  }

  if (targetUrls.length === 0) {
    console.log('No URLs found to scrape.');
    return;
  }

  const dishes = await scrapeUrlList(targetUrls, 4);

  if (dishes.length === 0) {
    console.log('\n❌ No recipes were successfully extracted.');
    return;
  }

  const exportPayload = {
    app: 'Gyummy Planner',
    version: 2,
    exportedAt: new Date().toISOString(),
    dishes
  };

  const outputFileName = `Gyummy_Scraped_${filenameLabel}_${Date.now()}.json`;
  const outputPath = path.resolve(process.cwd(), outputFileName);
  fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2), 'utf-8');

  console.log(`\n======================================================`);
  console.log(`🎉 Scraping complete!`);
  console.log(`📦 Successfully extracted: ${dishes.length} recipes`);
  console.log(`📁 File saved to: ${outputFileName}`);
  console.log(`👉 In Gyummy Planner, go to Recipes -> Upload icon (↑) -> Select this file to import all recipes into your System Library!`);
  console.log(`======================================================\n`);
}

main();
