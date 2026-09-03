import type { Dish } from '../types';
import { INITIAL_DISHES } from './seedData';
import { detectDishAllergens } from './personalisationService';

let cachedSystemRecipes: Dish[] | null = null;
let isLoadingPromise: Promise<Dish[]> | null = null;

const INDEXED_DB_NAME = 'GyummySystemDB';
const INDEXED_DB_STORE = 'system_recipes';
const INDEXED_DB_VERSION = 5;

/**
 * Open IndexedDB for offline persistent storage of large system recipes
 */
function openRecipeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.deleteObjectStore(INDEXED_DB_STORE);
      }
      db.createObjectStore(INDEXED_DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load recipes from IndexedDB cache
 */
async function loadFromIndexedDB(): Promise<Dish[] | null> {
  try {
    const db = await openRecipeDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
      const store = tx.objectStore(INDEXED_DB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result as Dish[];
        if (res && res.length >= 100) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save recipes into IndexedDB cache in background
 */
async function saveToIndexedDB(recipes: Dish[]): Promise<void> {
  try {
    const db = await openRecipeDatabase();
    const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_STORE);
    store.clear();
    recipes.forEach((r) => store.put(r));
  } catch (err) {
    console.warn('Could not save system recipes to IndexedDB:', err);
  }
}

/**
 * Fetch and load master system recipes
 * 1. Checks memory cache
 * 2. Checks IndexedDB cache
 * 3. Fetches from public/master_system_recipes.json (trying multiple paths)
 * 4. Fallback to INITIAL_DISHES
 */
export async function loadMasterSystemRecipes(): Promise<Dish[]> {
  if (cachedSystemRecipes && cachedSystemRecipes.length > 50) {
    return cachedSystemRecipes;
  }

  if (isLoadingPromise) {
    return isLoadingPromise;
  }

  isLoadingPromise = (async () => {
    // 1. Try IndexedDB first (instant offline loading)
    const idbRecipes = await loadFromIndexedDB();
    if (idbRecipes && idbRecipes.length >= 100) {
      cachedSystemRecipes = idbRecipes;
      return idbRecipes;
    }

    // 2. Fetch static JSON from public folder with path fallbacks
    const baseUrl = import.meta.env.BASE_URL || '/';
    const candidateUrls = [
      `${baseUrl.replace(/\/$/, '')}/master_system_recipes.json`,
      '/master_system_recipes.json',
      './master_system_recipes.json',
      'master_system_recipes.json'
    ];

    for (const fetchUrl of candidateUrls) {
      try {
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          const dishes = (data.dishes || data) as Dish[];
          if (Array.isArray(dishes) && dishes.length > 50) {
            cachedSystemRecipes = dishes;
            saveToIndexedDB(dishes); // async cache in IndexedDB
            return dishes;
          }
        }
      } catch (err) {
        // try next candidate url
      }
    }

    // 3. Fallback
    cachedSystemRecipes = INITIAL_DISHES;
    return INITIAL_DISHES;
  })();

  return isLoadingPromise;
}

/**
 * Merge master system recipes with user customized dishes
 */
export function mergeSystemWithUserDishes(userDishes: Dish[], systemDishes: Dish[]): Dish[] {
  const userMap = new Map<string, Dish>();
  userDishes.forEach((d) => userMap.set(d.id, d));

  const result: Dish[] = [...userDishes];
  systemDishes.forEach((sysDish) => {
    if (!userMap.has(sysDish.id)) {
      result.push(sysDish);
    }
  });

  return result.map((d) => {
    if (!d.allergens || d.allergens.length === 0) {
      return {
        ...d,
        allergens: detectDishAllergens(d),
        timesPlanned: typeof d.timesPlanned === 'number' ? d.timesPlanned : 0
      };
    }
    return d;
  });
}

/**
 * Get synchronously available system recipes (or fallback)
 */
export function getCachedSystemRecipes(): Dish[] {
  return cachedSystemRecipes || INITIAL_DISHES;
}
