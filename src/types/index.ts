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
}

export interface MasterIngredient {
  id: string;
  name: string;
  defaultValue: number | null;
  defaultUnit: string;
  category: GroceryCategory;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  category: GroceryCategory;
}

export interface Dish {
  id: string;
  name: string;
  category: string; // e.g., "Dinner", "Lunch", "Quick & Easy", "Pasta", "Soup"
  servings: number;
  ingredients: Ingredient[];
  prepTimeMinutes?: number;
  instructions?: string;
  imageEmoji?: string;
  imageUrl?: string; // Base64 compressed image URL for recipe photo
  tags?: string[];
  favoritedByMembers: string[]; // List of member names in the family who marked this dish as favorite
  createdAt: string;
  updatedAt: string;
}

export interface MealScheduleConfig {
  id: string;
  name: string;
  defaultEnabled: boolean;
  order: number;
  applicableDays?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]. Empty/undefined means all days.
}

export interface MealScheduleEntry {
  dishId: string | null;
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
  sourceDishes: string[]; // List of dish names that contributed this ingredient
  isManual?: boolean;     // True if user manually added it
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
}

export interface AppData {
  version: number;
  currentProfile: UserProfile | null;
  familyMembers: string[];
  dishes: Dish[];
  masterIngredients: MasterIngredient[];
  mealSchedules: MealScheduleConfig[];
  mealPlan: MealPlan;
  groceryList: {
    startDate: string;
    endDate: string;
    items: GroceryItem[];
    undoStack: GroceryHistorySnapshot[];
  };
  settings: AppSettings;
}

// Backward compatibility alias for any existing code
export type MealSlotConfig = MealScheduleConfig;
export type MealSlotEntry = MealScheduleEntry;
