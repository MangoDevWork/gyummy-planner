import type { Dish } from '../types';
import { INITIAL_DISHES } from './seedData';

let cachedSystemRecipes: Dish[] | null = null;
let isLoadingPromise: Promise<Dish[]> | null = null;

const INDEXED_DB_NAME = 'GyummySystemDB';
const INDEXED_DB_STORE = 'system_recipes';
const INDEXED_DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE, { keyPath: 'id' });
      }
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
        if (res && res.length > 0) {
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
 * 3. Fetches from public/master_system_recipes.json
 * 4. Fallback to INITIAL_DISHES
 */
export async function loadMasterSystemRecipes(): Promise<Dish[]> {
  if (cachedSystemRecipes && cachedSystemRecipes.length > 0) {
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

    // 2. Fetch static JSON from public folder
    try {
      // Determine correct base url (works with Vite and GitHub Pages subpath)
      const baseUrl = import.meta.env.BASE_URL || '/';
      const fetchUrl = `${baseUrl.replace(/\/$/, '')}/master_system_recipes.json`;
      
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const data = await res.json();
        const dishes = (data.dishes || data) as Dish[];
        if (Array.isArray(dishes) && dishes.length > 0) {
          cachedSystemRecipes = dishes;
          saveToIndexedDB(dishes); // async save to IndexedDB
          return dishes;
        }
      }
    } catch (err) {
      console.warn('Could not fetch master_system_recipes.json, falling back to starter recipes:', err);
    }

    // 3. Fallback
    cachedSystemRecipes = INITIAL_DISHES;
    return INITIAL_DISHES;
  })();

  return isLoadingPromise;
}

/**
 * Get synchronously available system recipes (or fallback)
 */
export function getCachedSystemRecipes(): Dish[] {
  return cachedSystemRecipes || INITIAL_DISHES;
}
