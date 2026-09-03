export type GroceryCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Pantry & Spices'
  | 'Bakery'
  | 'Frozen'
  | 'Canned Goods'
  | 'Other';

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Spices',
  'Bakery',
  'Frozen',
  'Canned Goods',
  'Other'
];

export interface UserProfile {
  familyName: string;
  memberName: string;
  avatarUrl?: string; // Base64 data URL or photo URL
  pin?: string;
}

export interface MasterIngredient {
  id: string;
  canonicalId?: string;
  name: string;
  defaultValue: number | null;
  defaultUnit: string;
  category: GroceryCategory;
  translations?: Partial<Record<'en' | 'zh-CN', string>>;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  category: GroceryCategory;
  translations?: Partial<Record<'en' | 'zh-CN', string>>;
}

export interface LocalizedDishContent {
  name: string;
  instructions?: string;
  tags?: string[];
  ingredients?: { id: string; name: string }[];
}

export interface NutritionInfo {
  calories: number; // kcal per serving
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  fiber?: number;   // grams
  sodium?: number;  // mg
}

export interface Dish {
  id: string;
  canonicalId?: string; // Identifier to link translations / variants together
  language?: 'en' | 'zh-CN'; // The base language this recipe was authored in
  name: string;
  category: string; // e.g., "Dinner", "Lunch", "Breakfast", "Snack", "Dessert"
  cuisine?: string;  // e.g., "Japanese", "Korean", "Cantonese", "Thai", "Western", "Italian", etc.
  servings: number;
  ingredients: Ingredient[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  instructions?: string;
  stepList?: string[];
  imageEmoji?: string;
  imageUrl?: string; // Base64 compressed image URL for recipe photo
  tags?: string[];
  favoritedByMembers: string[]; // List of member names in the family who marked this dish as favorite
  isFamilyRecipe?: boolean;     // True if added to this Family's Cookbook
  timesPlanned?: number;        // Total number of times this dish has been scheduled in meal plans
  lastPlannedAt?: string;       // Date YYYY-MM-DD when this recipe was last scheduled
  allergens?: string[];         // Detected allergen identifiers (e.g. 'peanuts', 'cow_milk', 'shellfish_crustacean')
  nutrition?: NutritionInfo;    // Per-serving nutritional values
  dishRole?: 'one_pot_meal' | 'main_protein' | 'vegetable_side' | 'soup' | 'sauce_condiment';
  spiceLevel?: 0 | 1 | 2 | 3;
  kidFriendly?: boolean;
  cleanupEffort?: 'one_pot' | 'standard' | 'multi_equipment';
  cookingMethod?: string;
  freezerFriendly?: boolean;
  createdAt: string;
  updatedAt: string;
  translations?: Partial<Record<'en' | 'zh-CN', LocalizedDishContent>>;
}

export interface MealScheduleConfig {
  id: string;
  name: string;
  defaultEnabled: boolean;
  order: number;
  applicableDays?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]. Empty/undefined means all days.
}

export interface MealScheduleEntry {
  dishId?: string | null;
  dishIds?: string[]; // Array of dish IDs for multiple recipes in one meal slot
  customText?: string;
  servingsMultiplier?: number;
  notes?: string;
}

// DayMealPlan maps scheduleId (e.g., 'breakfast', 'lunch', 'dinner', 'snack', or custom schedule id) to MealScheduleEntry
export type DayMealPlan = Record<string, MealScheduleEntry>;

// Keyed by date in YYYY-MM-DD format
export type MealPlan = Record<string, Partial<DayMealPlan>>;

export interface GroceryItem {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
  inPantry?: boolean;             // True if user declared this ingredient as in stock at home
  pantrySubstituteNote?: string; // e.g. "Covered by Cooking Oil at home"
  sourceDishes: string[];         // List of dish names that contributed this ingredient
  isManual?: boolean;             // True if user manually added it
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface GroceryHistorySnapshot {
  id: string;
  timestamp: number;
  description: string;
  items: GroceryItem[];
}

export interface AppSettings {
  weekStartsOn: 'Monday' | 'Sunday';
  defaultServings: number;
  theme: 'warm' | 'fresh' | 'lavender';
  hasCompletedScheduleOnboarding?: boolean;
  hasCompletedPersonalisationOnboarding?: boolean;
}

export type DietaryPreference =
  | 'Vegetarian'
  | 'Vegan'
  | 'Pescatarian'
  | 'Halal'
  | 'Gluten-Free'
  | 'Dairy-Free'
  | 'Keto'
  | 'Low-Carb';

export interface MemberPreferences {
  allergies: string[];            // Allergen IDs declared for this member
  dislikedIngredients?: string[]; // Specific ingredients this member dislikes
  isChild?: boolean;              // True if this member is a child / kid
  favoriteCuisines?: string[];    // e.g. ['Chinese', 'Japanese', 'Italian']
  favoriteCategories?: string[];  // e.g. ['Dinner', 'Quick Meals']
  dietaryPreferences?: DietaryPreference[];
}

export interface FamilyPersonalisation {
  strictAllergyFilter: boolean;     // Automatically filter out any recipe with a family allergen
  spiceTolerance?: 'none' | 'mild' | 'medium' | 'spicy'; // Household spice baseline (default: 'mild')
  cookingForKids?: boolean;         // Prioritize mild, universally kid-friendly dishes
  weeknightSpeed?: 'quick' | 'standard'; // Prefer <= 25m meals on weeknights
  householdAllergies?: string[];    // Additional family-wide excluded allergens
  householdCuisines?: string[];     // Family top cuisine choices
  householdCategories?: string[];   // Family top meal categories
}

// AI Recipe Generation Background Preparation Types
export interface AiDiscoveredRecipe {
  id: string;
  name: string;
  cuisine: string;
  category: string;
  servings: number;
  prepTimeMinutes: number;
  instructions: string;
  tags: string[];
  ingredients: Ingredient[];
  status: 'pending_review' | 'added' | 'dismissed';
  suggestedAt: string;
}

export interface AiPromptUsageTracker {
  date: string; // YYYY-MM-DD
  promptsUsed: number; // Max 5 per day
}

export interface AppData {
  version: number;
  currentProfile: UserProfile | null;
  familyMembers: string[];
  memberProfiles?: Record<string, MemberPreferences>; // Keyed by memberName
  familyPersonalisation?: FamilyPersonalisation;
  dishes: Dish[];
  masterIngredients?: MasterIngredient[];
  pantryIngredients: string[]; // List of ingredient names the family has in stock at home
  mealSchedules: MealScheduleConfig[];
  mealPlan: MealPlan;
  groceryList: {
    startDate: string;
    endDate: string;
    items: GroceryItem[];
    undoStack: GroceryHistorySnapshot[];
  };
  aiStagingRecipes?: AiDiscoveredRecipe[];
  aiPromptUsage?: AiPromptUsageTracker;
  settings: AppSettings;
  familyPin?: string;
  lastSyncedAt?: string;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
}

// Backward compatibility alias for any existing code
export type MealSlotConfig = MealScheduleConfig;
export type MealSlotEntry = MealScheduleEntry;
