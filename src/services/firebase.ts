import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore';
import type { AppData, Dish } from '../types';
import { INITIAL_DISHES } from './seedData';
import { getIdbRecipeImage, setIdbRecipeImage } from './indexedDbStorage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDDbz3VrrVTxsXX-iCbwj2LxuSHdup5h10',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gyummy-75a5f.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://gyummy-75a5f-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gyummy-75a5f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gyummy-75a5f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '147446208643',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:147446208643:web:1dbe1c44cb5520bb22e3b6'
};

export const DEFAULT_FAMILY_PIN = '0307';
export const MASTER_RECOVERY_KEY = 'gyummy2026';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization warning:', err);
}

export function sanitizeFamilyId(familyName: string): string {
  return familyName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

/**
 * Ensure the client is signed in anonymously to interact with Firestore.
 * Caches in-flight auth promise to prevent race conditions across concurrent callers.
 */
let authPromise: Promise<string | null> | null = null;

export async function ensureFirebaseAuth(): Promise<string | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;

  if (!authPromise) {
    authPromise = new Promise(async (resolve) => {
      try {
        const cred = await signInAnonymously(auth);
        resolve(cred.user.uid);
      } catch (err) {
        console.error('Anonymous auth failed:', err);
        // Retry once via onAuthStateChanged
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user ? user.uid : null);
        });
      } finally {
        authPromise = null;
      }
    });
  }
  return authPromise;
}

export interface FamilyAuthResult {
  success: boolean;
  isNewFamily?: boolean;
  error?: string;
  cloudData?: Partial<AppData> | null;
  members?: string[];
}

/**
 * Hydrates custom images for dishes that have hasCustomImage=true or missing imageUrl
 */
export async function hydrateRemoteDishImages(familyName: string, dishes: Dish[]): Promise<Dish[]> {
  if (!db || !familyName || !Array.isArray(dishes)) return dishes;
  const familyId = sanitizeFamilyId(familyName);

  const hydrated = await Promise.all(
    dishes.map(async (dish) => {
      // If already has a valid imageUrl, return as-is
      if (dish.imageUrl) return dish;
      if (!dish.hasCustomImage) return dish;

      // 1. Check local IndexedDB first (instant, zero network cost)
      const localImg = await getIdbRecipeImage(dish.id);
      if (localImg) {
        return { ...dish, imageUrl: localImg };
      }

      // 2. Fetch from Firestore subcollection: families/{familyId}/recipe_images/{dishId}
      try {
        const imageDocRef = doc(db, 'families', familyId, 'recipe_images', dish.id);
        const snap = await getDoc(imageDocRef);
        if (snap.exists()) {
          const imgData = snap.data();
          if (imgData?.imageUrl) {
            await setIdbRecipeImage(dish.id, imgData.imageUrl);
            return { ...dish, imageUrl: imgData.imageUrl };
          }
        }
      } catch (err) {
        console.warn(`Could not fetch remote image for dish ${dish.id}:`, err);
      }

      return dish;
    })
  );

  return hydrated;
}

/**
 * Fetch existing family document from Cloud Firestore directly
 */
export async function fetchFamilyCloudData(familyName: string): Promise<Partial<AppData> | null> {
  if (!db || !familyName) return null;
  try {
    await ensureFirebaseAuth();
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const dishes = await hydrateRemoteDishImages(familyName, (data.dishes || []) as Dish[]);

    return {
      dishes,
      mealSchedules: data.mealSchedules || [],
      mealPlan: data.mealPlan || {},
      pantryIngredients: data.pantryIngredients || [],
      groceryList: data.groceryList
        ? {
            startDate: data.groceryList.startDate || '',
            endDate: data.groceryList.endDate || '',
            items: data.groceryList.items || [],
            undoStack: []
          }
        : undefined,
      familyMembers: Array.isArray(data.familyMembers) ? data.familyMembers : (Array.isArray(data.members) ? data.members : []),
      memberProfiles: data.memberProfiles || {},
      familyPersonalisation: data.familyPersonalisation || undefined,
      settings: data.settings,
      lastSyncedAt: data.updatedAt || new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to fetch family cloud data:', err);
    return null;
  }
}

/**
 * Verify or initialize a family PIN in Firestore.
 * - If the family doesn't exist in Firestore, creates it with the given pin.
 * - If the family exists and has no pin yet, sets pin to '0307' or given pin.
 * - If family exists, compares pin with stored pin.
 * - Merges and updates the family members list in cloud.
 */
export async function verifyOrCreateFamily(
  familyName: string,
  pin: string,
  memberName: string,
  _isRegistering?: boolean
): Promise<FamilyAuthResult> {
  try {
    await ensureFirebaseAuth();
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      // New family in Cloud
      const cleanPin = pin.trim() || DEFAULT_FAMILY_PIN;
      const initialMembers = [memberName.trim()];
      await setDoc(docRef, {
        familyId,
        familyName: familyName.trim(),
        pin: cleanPin,
        members: initialMembers,
        familyMembers: initialMembers,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: memberName.trim()
      }, { merge: true });
      return { success: true, isNewFamily: true, members: initialMembers };
    }

    const data = snapshot.data();
    const existingPin = data?.pin || DEFAULT_FAMILY_PIN;

    // If existing family had no pin set in document, migrate it to DEFAULT_FAMILY_PIN
    if (!data?.pin) {
      await setDoc(docRef, { pin: DEFAULT_FAMILY_PIN }, { merge: true });
    }

    if (pin.trim() !== existingPin) {
      return {
        success: false,
        error: `Incorrect 4-digit PIN for "${familyName}".`
      };
    }

    // Support both 'familyMembers' and legacy 'members' field
    const rawMembers: string[] = Array.isArray(data?.familyMembers)
      ? data.familyMembers
      : (Array.isArray(data?.members) ? data.members : []);

    const membersSet = new Set(rawMembers);
    membersSet.add(memberName.trim());
    const updatedMembers = Array.from(membersSet);

    if (updatedMembers.length !== rawMembers.length || !data?.familyMembers) {
      await setDoc(docRef, {
        members: updatedMembers,
        familyMembers: updatedMembers,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: memberName.trim()
      }, { merge: true });
    }

    // Prepare existing cloud data to immediately seed the new device
    const cloudData: Partial<AppData> = {
      dishes: data.dishes,
      mealSchedules: data.mealSchedules,
      mealPlan: data.mealPlan,
      pantryIngredients: data.pantryIngredients,
      groceryList: data.groceryList
        ? {
            startDate: data.groceryList.startDate || '',
            endDate: data.groceryList.endDate || '',
            items: data.groceryList.items || [],
            undoStack: []
          }
        : undefined,
      familyMembers: updatedMembers,
      memberProfiles: data.memberProfiles || {},
      familyPersonalisation: data.familyPersonalisation || undefined,
      settings: data.settings,
      lastSyncedAt: data.updatedAt || new Date().toISOString()
    };

    return { success: true, isNewFamily: false, cloudData, members: updatedMembers };
  } catch (err) {
    console.error('Error during family auth:', err);
    // If offline or Firestore error, allow local graceful fallback
    return { success: true, isNewFamily: false, members: [memberName.trim()] };
  }
}

/**
 * Reset a forgotten family PIN using the master recovery key
 */
export async function resetFamilyPinWithRecovery(
  familyName: string,
  newPin: string,
  recoverySecret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanSecret = recoverySecret.trim().toLowerCase();
    if (cleanSecret !== MASTER_RECOVERY_KEY.toLowerCase()) {
      return { success: false, error: 'Invalid recovery passphrase.' };
    }
    if (!/^\d{4}$/.test(newPin.trim())) {
      return { success: false, error: 'New PIN must be exactly 4 numeric digits.' };
    }

    await ensureFirebaseAuth();
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);

    await setDoc(docRef, {
      pin: newPin.trim(),
      pinUpdatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Update family PIN from settings (when already logged in)
 */
export async function updateFamilyPinFromSettings(
  familyName: string,
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!/^\d{4}$/.test(newPin.trim())) {
      return { success: false, error: 'New PIN must be exactly 4 numeric digits.' };
    }

    await ensureFirebaseAuth();
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const existingPin = data?.pin || DEFAULT_FAMILY_PIN;
      if (currentPin.trim() !== existingPin) {
        return { success: false, error: 'Current PIN is incorrect.' };
      }
    }

    await setDoc(docRef, {
      pin: newPin.trim(),
      pinUpdatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Push synchronization with deep hash comparison & debouncing to minimize Firebase writes & quota usage
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedPayloadHash: string | null = null;
const syncedImageLengths = new Map<string, number>();
let isWriteInFlight = false;
let pendingWriteQueue: (() => Promise<void>) | null = null;

export async function pushAppDataToCloud(
  familyName: string,
  data: AppData,
  onSyncStateChange?: (status: 'syncing' | 'synced' | 'error') => void,
  immediate = false
): Promise<void> {
  // Only sync recipes that belong to this Family Cookbook (isFamilyRecipe !== false), custom/starter recipes, or favorited
  const starterIds = new Set(INITIAL_DISHES.map((d) => d.id));
  const persistedDishes = (data.dishes || []).filter((d) => {
    if (!d || !d.id) return false;

    // 1. Scraped system library recipes:
    // ONLY persist if the user explicitly added to Family Cookbook, favorited, or customized!
    if (d.id.startsWith('dish_scraped_')) {
      return Boolean(
        d.isFamilyRecipe ||
        (d.favoritedByMembers && d.favoritedByMembers.length > 0) ||
        d.isUserEdited
      );
    }

    // 2. Starter recipes from INITIAL_DISHES:
    // Always persist so cookbook state / favorites are saved
    if (starterIds.has(d.id)) return true;

    // 3. User custom recipes created in app (e.g. dish_1725..., custom_..., dish_ai_...):
    // Always persist
    return true;
  });

  // Deep sanitization to ensure:
  // 1. ZERO undefined values exist (Firestore rejects undefined)
  // 2. ZERO nested arrays exist (Firestore strictly rejects arrays inside arrays, e.g. [[...]])
  const sanitizeForFirestore = (val: any, isInsideArray = false): any => {
    if (val === undefined) return null;
    if (val === null) return null;

    if (Array.isArray(val)) {
      // If we are ALREADY inside an array, Firestore rejects nested arrays.
      // Convert nested array items into strings or flattened representation.
      if (isInsideArray) {
        return val.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
      }
      return val.map((item) => sanitizeForFirestore(item, true));
    }

    if (typeof val === 'object' && !(val instanceof Date)) {
      const sanitizedObj: Record<string, any> = {};
      Object.keys(val).forEach((key) => {
        sanitizedObj[key] = sanitizeForFirestore(val[key], false);
      });
      return sanitizedObj;
    }

    return val;
  };

  // Collect any custom base64 images that haven't been synced yet or have changed
  const customImagesToSync = persistedDishes.filter(
    (d) => d.imageUrl && d.imageUrl.startsWith('data:image/') && syncedImageLengths.get(d.id) !== d.imageUrl.length
  );

  // Build the minimal data payload
  const rawPayload = {
    familyName: data.currentProfile?.familyName || familyName,
    familyMembers: data.familyMembers || [],
    dishes: persistedDishes.map((d) => {
      const isBase64 = Boolean(d.imageUrl && d.imageUrl.startsWith('data:image/'));
      return {
        id: d.id,
        name: d.name || '',
        category: d.category || 'Main',
        cuisine: d.cuisine || 'Chinese',
        servings: typeof d.servings === 'number' ? d.servings : 2,
        prepTimeMinutes: typeof d.prepTimeMinutes === 'number' ? d.prepTimeMinutes : 20,
        // Large base64 images are stored in recipe_images subcollection, not inlined in main doc!
        imageUrl: isBase64 ? null : (d.imageUrl || null),
        hasCustomImage: Boolean(isBase64 || d.hasCustomImage),
        imageEmoji: d.imageEmoji || null,
        isFamilyRecipe: Boolean(d.isFamilyRecipe),
        favoritedByMembers: d.favoritedByMembers || [],
        timesPlanned: typeof d.timesPlanned === 'number' ? d.timesPlanned : 0,
        lastPlannedAt: d.lastPlannedAt || null,
        allergens: d.allergens || [],
        ingredients: (d.ingredients || []).map((ing) => ({
          id: ing.id || '',
          name: ing.name || '',
          amount: ing.amount !== undefined ? ing.amount : null,
          unit: ing.unit || '',
          category: ing.category || 'Produce'
        })),
        instructions: typeof d.instructions === 'string' ? d.instructions : (Array.isArray(d.instructions as any) ? (d.instructions as any).join('\n') : ''),
        tags: d.tags || [],
        translations: d.translations || null,
        language: d.language || 'en',
        isUserEdited: Boolean(d.isUserEdited),
        updatedAt: d.updatedAt || null,
        createdAt: d.createdAt || null
      };
    }),
    memberProfiles: data.memberProfiles || {},
    familyPersonalisation: data.familyPersonalisation || {
      strictAllergyFilter: true,
      householdAllergies: [],
      householdCuisines: [],
      householdCategories: []
    },
    mealSchedules: data.mealSchedules || [],
    mealPlan: data.mealPlan || {},
    pantryIngredients: data.pantryIngredients || [],
    groceryList: {
      startDate: data.groceryList?.startDate || '',
      endDate: data.groceryList?.endDate || '',
      items: (data.groceryList?.items || []).map((item) => ({
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: item.name || '',
        amount: item.amount !== undefined ? item.amount : null,
        unit: item.unit || '',
        category: item.category || 'Other',
        checked: Boolean(item.checked),
        inPantry: Boolean(item.inPantry),
        sourceDishes: item.sourceDishes || [],
        isManual: Boolean(item.isManual)
      }))
    },
    customIngredients: data.customIngredients || [],
    settings: data.settings || {}
  };

  const corePayload = sanitizeForFirestore(rawPayload);

  // Quick JSON string hash check: if nothing meaningful changed, DO NOT push to cloud!
  const currentHash = JSON.stringify(corePayload);
  if (lastPushedPayloadHash === currentHash && !immediate) {
    // Data is identical to what's already on the cloud. Zero network call needed.
    onSyncStateChange?.('synced');
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  onSyncStateChange?.('syncing');

  const executeWrite = async () => {
    // Prevent overlapping write streams to Firestore
    if (isWriteInFlight) {
      pendingWriteQueue = executeWrite;
      return;
    }
    isWriteInFlight = true;

    try {
      await ensureFirebaseAuth();
      const familyId = sanitizeFamilyId(familyName);
      const docRef = doc(db, 'families', familyId);

      const finalWritePayload = {
        ...corePayload,
        lastUpdatedBy: data.currentProfile?.memberName || 'Member',
        updatedAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      };

      await setDoc(docRef, finalWritePayload, { merge: true });
      lastPushedPayloadHash = currentHash;
      onSyncStateChange?.('synced');

      // Sequentially sync any new or changed recipe images to subcollection
      if (customImagesToSync.length > 0) {
        for (const dish of customImagesToSync) {
          try {
            const imageDocRef = doc(db, 'families', familyId, 'recipe_images', dish.id);
            await setDoc(imageDocRef, {
              dishId: dish.id,
              imageUrl: dish.imageUrl,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            syncedImageLengths.set(dish.id, dish.imageUrl!.length);
          } catch (imgErr) {
            console.warn(`Failed to sync custom image for ${dish.id}:`, imgErr);
          }
        }
      }
    } catch (err: any) {
      if (err?.code === 'resource-exhausted') {
        console.warn('Firestore write stream busy; write will retry on next user change.');
      } else {
        console.error('Firebase cloud push error:', err);
      }
      onSyncStateChange?.('error');
    } finally {
      isWriteInFlight = false;
      if (pendingWriteQueue) {
        const next = pendingWriteQueue;
        pendingWriteQueue = null;
        setTimeout(next, 1000);
      }
    }
  };

  if (immediate) {
    return executeWrite();
  } else {
    debounceTimer = setTimeout(executeWrite, 2000);
    return Promise.resolve();
  }
}

/**
 * Subscribe to Firestore real-time updates for the family
 */
export function subscribeToFamilyCloudData(
  familyName: string,
  onRemoteDataReceived: (remoteData: Partial<AppData>) => void,
  onStatusChange?: (status: 'synced' | 'syncing' | 'offline' | 'error') => void
): Unsubscribe | null {
  if (!db || !familyName) return null;

  try {
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        // Check if snapshot is coming from server vs local pending write
        const isFromCache = docSnap.metadata.hasPendingWrites;
        if (isFromCache) {
          return;
        }

        // Deliver remote data
        const membersList = Array.isArray(data.familyMembers)
          ? data.familyMembers
          : (Array.isArray(data.members) ? data.members : []);

        const rawDishes = (data.dishes || []).map((d: any) => ({
          id: d.id,
          name: d.name || '',
          category: d.category || 'Main',
          cuisine: d.cuisine || 'Chinese',
          servings: typeof d.servings === 'number' ? d.servings : 2,
          prepTimeMinutes: typeof d.prepTimeMinutes === 'number' ? d.prepTimeMinutes : 20,
          imageUrl: d.imageUrl || null,
          hasCustomImage: Boolean(d.hasCustomImage),
          imageEmoji: d.imageEmoji || null,
          isFamilyRecipe: Boolean(d.isFamilyRecipe),
          favoritedByMembers: d.favoritedByMembers || [],
          ingredients: d.ingredients || [],
          instructions: typeof d.instructions === 'string' ? d.instructions : (Array.isArray(d.instructions) ? d.instructions.join('\n') : ''),
          tags: d.tags || [],
          translations: d.translations || null,
          language: d.language || 'en',
          isUserEdited: Boolean(d.isUserEdited),
          updatedAt: d.updatedAt || undefined,
          createdAt: d.createdAt || undefined,
          timesPlanned: typeof d.timesPlanned === 'number' ? d.timesPlanned : 0,
          lastPlannedAt: d.lastPlannedAt || null,
          allergens: d.allergens || []
        }));

        const receivedCore = {
          familyName: data.familyName || familyName,
          familyMembers: membersList,
          memberProfiles: data.memberProfiles || {},
          familyPersonalisation: data.familyPersonalisation || {},
          dishes: rawDishes,
          mealSchedules: data.mealSchedules || [],
          mealPlan: data.mealPlan || {},
          pantryIngredients: data.pantryIngredients || [],
          groceryList: {
            startDate: data.groceryList?.startDate || '',
            endDate: data.groceryList?.endDate || '',
            items: (data.groceryList?.items || []).map((item: any) => ({
              id: item.id || '',
              name: item.name || '',
              amount: item.amount !== undefined ? item.amount : null,
              unit: item.unit || '',
              category: item.category || 'Other',
              checked: Boolean(item.checked),
              inPantry: Boolean(item.inPantry),
              sourceDishes: item.sourceDishes || [],
              isManual: Boolean(item.isManual)
            })),
            undoStack: []
          },
          settings: data.settings || {}
        };

        // 1. Immediately deliver received remote data
        onRemoteDataReceived(receivedCore);

        // 2. Asynchronously hydrate any custom images from local IndexedDB or remote subcollection
        hydrateRemoteDishImages(familyName, rawDishes).then((hydrated) => {
          if (hydrated.some((d, idx) => d.imageUrl !== rawDishes[idx]?.imageUrl)) {
            onRemoteDataReceived({
              ...receivedCore,
              dishes: hydrated
            });
          }
        }).catch(() => {});

        const newHash = JSON.stringify(receivedCore);
        if (lastPushedPayloadHash === newHash) {
          onStatusChange?.('synced');
          return;
        }

        lastPushedPayloadHash = newHash;
        onStatusChange?.('synced');

        onRemoteDataReceived({
          dishes: receivedCore.dishes,
          mealSchedules: receivedCore.mealSchedules,
          mealPlan: receivedCore.mealPlan,
          pantryIngredients: receivedCore.pantryIngredients,
          groceryList: {
            startDate: receivedCore.groceryList.startDate,
            endDate: receivedCore.groceryList.endDate,
            items: receivedCore.groceryList.items,
            undoStack: []
          },
          familyMembers: receivedCore.familyMembers,
          memberProfiles: data.memberProfiles || undefined,
          familyPersonalisation: data.familyPersonalisation || undefined,
          settings: receivedCore.settings,
          lastSyncedAt: data.updatedAt || new Date().toISOString()
        });
      },
      (err) => {
        console.error('Firestore snapshot error:', err);
        onStatusChange?.('offline');
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to cloud updates:', err);
    onStatusChange?.('offline');
    return null;
  }
}

/**
 * Check if a family space ID already exists in Cloud Firestore
 */
export async function checkFamilySpaceExists(familyName: string): Promise<boolean> {
  if (!db || !familyName) return false;
  try {
    await ensureFirebaseAuth();
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (err) {
    console.error('Error checking family existence:', err);
    return false;
  }
}

/**
 * Permanently delete a family account and all associated cloud data
 * Fulfills statutory Right of Deletion / Right to be Forgotten (GDPR Art. 17, CCPA, Australian Privacy Act)
 */
export async function deleteFamilyAccountAndData(
  familyName: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db || !familyName) {
      return { success: false, error: 'Database not initialized or family name missing.' };
    }

    await ensureFirebaseAuth();
    const familyId = sanitizeFamilyId(familyName);
    const docRef = doc(db, 'families', familyId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const existingPin = data?.pin || DEFAULT_FAMILY_PIN;
      if (pin.trim() !== existingPin) {
        return { success: false, error: 'Incorrect 4-digit PIN for account deletion.' };
      }

      // Irrevocably delete the cloud document
      await deleteDoc(docRef);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete family account';
    console.error('Account deletion error:', err);
    return { success: false, error: msg };
  }
}

/**
 * Anonymously stage user custom recipes into the community pool for monthly review
 */
export async function submitCustomRecipeToCommunityPool(dish: any): Promise<void> {
  if (!db || !dish || !dish.name) return;
  try {
    // Only submit if it's a real custom user recipe (not a system library dish)
    if (!dish.id || (!dish.id.startsWith('dish_') && !dish.id.startsWith('custom_'))) return;

    await ensureFirebaseAuth();
    const communityDocRef = doc(db, 'community_submissions', dish.id);

    // Completely strip any personal PII / family member tags
    const anonymizedDish = {
      dishId: dish.id,
      name: dish.name.trim(),
      category: dish.category || 'Dinner',
      cuisine: dish.cuisine || 'Other',
      servings: typeof dish.servings === 'number' ? dish.servings : 2,
      prepTimeMinutes: typeof dish.prepTimeMinutes === 'number' ? dish.prepTimeMinutes : 20,
      cookTimeMinutes: typeof dish.cookTimeMinutes === 'number' ? dish.cookTimeMinutes : 20,
      totalTimeMinutes: typeof dish.totalTimeMinutes === 'number' ? dish.totalTimeMinutes : 40,
      dishRole: dish.dishRole || 'one_pot_meal',
      spiceLevel: typeof dish.spiceLevel === 'number' ? dish.spiceLevel : 0,
      kidFriendly: Boolean(dish.kidFriendly),
      ingredients: (dish.ingredients || []).map((ing: any) => ({
        name: ing.name || '',
        amount: ing.amount !== undefined ? ing.amount : null,
        unit: ing.unit || '',
        category: ing.category || 'Produce'
      })),
      instructions: dish.instructions || '',
      stepList: dish.stepList || [],
      tags: dish.tags || [],
      submittedAt: new Date().toISOString()
    };

    await setDoc(communityDocRef, anonymizedDish, { merge: true });
  } catch (err) {
    // Non-blocking: community contribution failure should never break normal user workflows
    console.warn('Community recipe submission warning:', err);
  }
}
