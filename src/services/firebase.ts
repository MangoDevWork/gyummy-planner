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
import type { AppData } from '../types';

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
    return {
      dishes: data.dishes || [],
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

export async function pushAppDataToCloud(
  familyName: string,
  data: AppData,
  onSyncStateChange?: (status: 'syncing' | 'synced' | 'error') => void,
  immediate = false
): Promise<void> {
  // Filter dishes:
  // System recipes (3,000+ scraped recipes and 10 built-in seeds) live client-side in IndexedDB/JSON.
  // ONLY sync user-created custom recipes (which have user IDs like 'dish_17...'), or dishes favorited by family members.
  const systemSeedDishIds = new Set([
    'dish_tomato_meatball',
    'dish_chicken_teriyaki',
    'dish_korean_beef_bulgogi',
    'dish_egg_fried_rice',
    'dish_thai_basil_chicken',
    'dish_steamed_fish_fillet',
    'dish_japanese_chicken_curry',
    'dish_scallion_oil_noodles',
    'dish_lemongrass_pork',
    'dish_sweet_sour_chicken'
  ]);

  const persistedDishes = (data.dishes || []).filter((d) => {
    // 1. If it's explicitly marked as NOT a family recipe and has no favorites, NEVER upload to Firestore
    if (d.isFamilyRecipe === false && (!d.favoritedByMembers || d.favoritedByMembers.length === 0)) {
      return false;
    }
    // 2. If it's one of the 10 built-in seed dishes without customization or favorites, skip (already on all clients)
    if (systemSeedDishIds.has(d.id) && (!d.favoritedByMembers || d.favoritedByMembers.length === 0)) {
      return false;
    }
    // 3. User custom created recipes or system recipes explicitly added to Family Cookbook (isFamilyRecipe !== false)
    return Boolean(d.isFamilyRecipe || (d.favoritedByMembers && d.favoritedByMembers.length > 0));
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

  // Build the minimal data payload
  const rawPayload = {
    familyName: data.currentProfile?.familyName || familyName,
    familyMembers: data.familyMembers || [],
    dishes: persistedDishes.map((d) => ({
      id: d.id,
      name: d.name || '',
      category: d.category || 'Main',
      cuisine: d.cuisine || 'Chinese',
      servings: typeof d.servings === 'number' ? d.servings : 2,
      prepTimeMinutes: typeof d.prepTimeMinutes === 'number' ? d.prepTimeMinutes : 20,
      imageUrl: d.imageUrl || null,
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
      language: d.language || 'en'
    })),
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

      // Asynchronously stage user-created custom recipes into the community pool for monthly review
      const customDishes = (data.dishes || []).filter(
        (d) => d && d.id && (d.id.startsWith('dish_1') || d.id.startsWith('custom_')) && d.isFamilyRecipe !== false
      );
      if (customDishes.length > 0) {
        Promise.all(customDishes.map((dish) => submitCustomRecipeToCommunityPool(dish))).catch(() => {});
      }
    } catch (err) {
      console.error('Firebase cloud push error:', err);
      onSyncStateChange?.('error');
      throw err;
    }
  };

  if (immediate) {
    return executeWrite();
  } else {
    debounceTimer = setTimeout(executeWrite, 1000);
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

        const receivedCore = {
          familyName: data.familyName || familyName,
          familyMembers: membersList,
          dishes: (data.dishes || []).map((d: any) => ({
            id: d.id,
            name: d.name || '',
            category: d.category || 'Main',
            cuisine: d.cuisine || 'Chinese',
            servings: typeof d.servings === 'number' ? d.servings : 2,
            prepTimeMinutes: typeof d.prepTimeMinutes === 'number' ? d.prepTimeMinutes : 20,
            imageUrl: d.imageUrl || null,
            imageEmoji: d.imageEmoji || null,
            isFamilyRecipe: Boolean(d.isFamilyRecipe),
            favoritedByMembers: d.favoritedByMembers || [],
            ingredients: d.ingredients || [],
            instructions: d.instructions || [],
            tags: d.tags || [],
            translations: d.translations || null,
            language: d.language || 'en'
          })),
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
            }))
          },
          settings: data.settings || {}
        };

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
