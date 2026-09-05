import { openDB, type IDBPDatabase } from 'idb';
import type { AppData, Dish } from '../types';

const DB_NAME = 'gyummy_db_v1';
const DB_VERSION = 1;

export const STORE_APP_DATA = 'app_data';
export const STORE_RECIPE_IMAGES = 'recipe_images';

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Check if IndexedDB is supported in the current environment
 */
export function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Open or retrieve singleton IndexedDB connection
 */
export function getGyummyDB(): Promise<IDBPDatabase> {
  if (!isIndexedDbSupported()) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_APP_DATA)) {
          db.createObjectStore(STORE_APP_DATA);
        }
        if (!db.objectStoreNames.contains(STORE_RECIPE_IMAGES)) {
          db.createObjectStore(STORE_RECIPE_IMAGES);
        }
      }
    });
  }

  return dbPromise;
}

/**
 * Store full AppData object in IndexedDB
 */
export async function setIdbFamilyData(familyId: string, data: AppData): Promise<void> {
  if (!isIndexedDbSupported()) return;
  try {
    const db = await getGyummyDB();
    const cleanKey = `family_${familyId.trim().toLowerCase()}`;
    await db.put(STORE_APP_DATA, data, cleanKey);
  } catch (err) {
    console.error('Failed to save data to IndexedDB:', err);
  }
}

/**
 * Retrieve AppData object from IndexedDB
 */
export async function getIdbFamilyData(familyId: string): Promise<AppData | null> {
  if (!isIndexedDbSupported()) return null;
  try {
    const db = await getGyummyDB();
    const cleanKey = `family_${familyId.trim().toLowerCase()}`;
    const result = await db.get(STORE_APP_DATA, cleanKey);
    return (result as AppData) || null;
  } catch (err) {
    console.warn('Failed to read data from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete family data from IndexedDB
 */
export async function deleteIdbFamilyData(familyId: string): Promise<void> {
  if (!isIndexedDbSupported()) return;
  try {
    const db = await getGyummyDB();
    const cleanKey = `family_${familyId.trim().toLowerCase()}`;
    await db.delete(STORE_APP_DATA, cleanKey);
  } catch (err) {
    console.error('Failed to delete family data from IndexedDB:', err);
  }
}

/**
 * Save a dish custom photo into the dedicated IndexedDB image store
 */
export async function setIdbRecipeImage(dishId: string, imageUrl: string): Promise<void> {
  if (!isIndexedDbSupported() || !dishId || !imageUrl) return;
  try {
    const db = await getGyummyDB();
    await db.put(STORE_RECIPE_IMAGES, imageUrl, dishId);
  } catch (err) {
    console.error(`Failed to save image for dish ${dishId} to IndexedDB:`, err);
  }
}

/**
 * Retrieve a dish photo from the dedicated IndexedDB image store
 */
export async function getIdbRecipeImage(dishId: string): Promise<string | null> {
  if (!isIndexedDbSupported() || !dishId) return null;
  try {
    const db = await getGyummyDB();
    const img = await db.get(STORE_RECIPE_IMAGES, dishId);
    return typeof img === 'string' ? img : null;
  } catch (err) {
    console.warn(`Failed to get image for dish ${dishId} from IndexedDB:`, err);
    return null;
  }
}

/**
 * Retrieve all custom recipe images from IndexedDB
 */
export async function getAllIdbRecipeImages(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!isIndexedDbSupported()) return map;
  try {
    const db = await getGyummyDB();
    const tx = db.transaction(STORE_RECIPE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_RECIPE_IMAGES);
    let cursor = await store.openCursor();
    while (cursor) {
      if (typeof cursor.value === 'string') {
        map.set(String(cursor.key), cursor.value);
      }
      cursor = await cursor.continue();
    }
  } catch (err) {
    console.warn('Failed to fetch all images from IndexedDB:', err);
  }
  return map;
}

/**
 * Automatically extracts any base64 image strings from dishes and stores them in IndexedDB.
 * Returns dishes with lean image references or original URL.
 */
export async function extractAndStoreIdbImages(dishes: Dish[]): Promise<{ cleanedDishes: Dish[]; storedCount: number }> {
  let storedCount = 0;
  if (!Array.isArray(dishes)) return { cleanedDishes: dishes, storedCount: 0 };

  const cleanedDishes: Dish[] = [];

  for (const dish of dishes) {
    if (!dish) continue;

    // Check if imageUrl is a large base64 data URL
    if (dish.imageUrl && dish.imageUrl.startsWith('data:image/')) {
      // Store into IndexedDB image store
      await setIdbRecipeImage(dish.id, dish.imageUrl);
      storedCount++;
      // Keep dish object intact for in-memory use, but we also have it indexed
      cleanedDishes.push(dish);
    } else {
      cleanedDishes.push(dish);
    }
  }

  return { cleanedDishes, storedCount };
}

/**
 * Hydrates dishes with custom images from IndexedDB if dish.imageUrl is missing or a placeholder
 */
export async function hydrateDishesWithIdbImages(dishes: Dish[]): Promise<Dish[]> {
  if (!Array.isArray(dishes) || dishes.length === 0) return dishes;

  try {
    const imageMap = await getAllIdbRecipeImages();
    if (imageMap.size === 0) return dishes;

    let hasModifications = false;
    const hydrated = dishes.map((dish) => {
      if (!dish || !dish.id) return dish;

      // If dish already has a valid full image (data URL or http URL), keep it
      if (dish.imageUrl && (dish.imageUrl.startsWith('data:image/') || dish.imageUrl.startsWith('http') || dish.imageUrl.startsWith('/'))) {
        return dish;
      }

      // Check if IndexedDB has custom image for this dish
      const storedImage = imageMap.get(dish.id);
      if (storedImage) {
        hasModifications = true;
        return {
          ...dish,
          imageUrl: storedImage
        };
      }

      return dish;
    });

    return hasModifications ? hydrated : dishes;
  } catch (err) {
    console.warn('Error hydrating dishes from IndexedDB:', err);
    return dishes;
  }
}
