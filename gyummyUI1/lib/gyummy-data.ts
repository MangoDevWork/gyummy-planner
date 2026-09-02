export type Meal = {
  emoji: string
  name: string
}

export type DayPlan = {
  id: string
  label: string
  date: string
  isToday?: boolean
  meals: {
    Breakfast?: Meal
    Lunch?: Meal
    Dinner?: Meal
    Snack?: Meal
  }
}

export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const

export const weekPlan: DayPlan[] = [
  {
    id: 'mon',
    label: 'Mon',
    date: '1 Sep',
    isToday: true,
    meals: {
      Breakfast: { emoji: '🥞', name: 'Buttermilk Pancakes' },
      Lunch: { emoji: '🥗', name: 'Garden Chicken Salad' },
      Dinner: { emoji: '🍝', name: 'Creamy Tomato Pasta' },
    },
  },
  {
    id: 'tue',
    label: 'Tue',
    date: '2 Sep',
    meals: {
      Breakfast: { emoji: '🥣', name: 'Berry Oatmeal' },
      Dinner: { emoji: '🌮', name: 'Chicken Tacos' },
    },
  },
  {
    id: 'wed',
    label: 'Wed',
    date: '3 Sep',
    meals: {
      Lunch: { emoji: '🍲', name: 'Lentil Soup' },
      Dinner: { emoji: '🍛', name: 'Coconut Curry' },
      Snack: { emoji: '🍎', name: 'Apple & Almond Butter' },
    },
  },
  {
    id: 'thu',
    label: 'Thu',
    date: '4 Sep',
    meals: {
      Breakfast: { emoji: '🍳', name: 'Veggie Scramble' },
    },
  },
  {
    id: 'fri',
    label: 'Fri',
    date: '5 Sep',
    meals: {
      Dinner: { emoji: '🍕', name: 'Homemade Pizza Night' },
    },
  },
  {
    id: 'sat',
    label: 'Sat',
    date: '6 Sep',
    meals: {
      Breakfast: { emoji: '🧇', name: 'Waffles & Fruit' },
      Lunch: { emoji: '🥪', name: 'Turkey Club' },
    },
  },
  {
    id: 'sun',
    label: 'Sun',
    date: '7 Sep',
    meals: {
      Dinner: { emoji: '🍗', name: 'Sunday Roast Chicken' },
    },
  },
]

export type Recipe = {
  id: string
  emoji: string
  name: string
  cuisine: string
  prepMins: number
  ingredients: number
  servings: number
  favorite?: boolean
  hasAllergen?: boolean
}

export const cookbook: Recipe[] = [
  { id: 'c1', emoji: '🍝', name: 'Creamy Tomato Pasta', cuisine: 'Italian', prepMins: 25, ingredients: 8, servings: 4, favorite: true },
  { id: 'c2', emoji: '🌮', name: 'Chicken Tacos', cuisine: 'Mexican', prepMins: 30, ingredients: 11, servings: 4, favorite: true },
  { id: 'c3', emoji: '🍲', name: 'Hearty Lentil Soup', cuisine: 'Vegetarian', prepMins: 40, ingredients: 9, servings: 6 },
  { id: 'c4', emoji: '🥞', name: 'Buttermilk Pancakes', cuisine: 'Breakfast', prepMins: 20, ingredients: 7, servings: 4, favorite: true },
]

export const library: Recipe[] = [
  { id: 'l1', emoji: '🍛', name: 'Coconut Chickpea Curry', cuisine: 'Indian', prepMins: 35, ingredients: 12, servings: 4 },
  { id: 'l2', emoji: '🍤', name: 'Garlic Butter Shrimp', cuisine: 'Seafood', prepMins: 20, ingredients: 9, servings: 3, hasAllergen: true },
  { id: 'l3', emoji: '🥗', name: 'Mediterranean Bowl', cuisine: 'Greek', prepMins: 15, ingredients: 10, servings: 2 },
  { id: 'l4', emoji: '🍜', name: 'Miso Ramen', cuisine: 'Japanese', prepMins: 45, ingredients: 14, servings: 2 },
  { id: 'l5', emoji: '🥘', name: 'Spanish Paella', cuisine: 'Spanish', prepMins: 55, ingredients: 16, servings: 6, hasAllergen: true },
  { id: 'l6', emoji: '🍗', name: 'Herb Roast Chicken', cuisine: 'Comfort', prepMins: 70, ingredients: 8, servings: 5 },
]

export const recipeDetail = {
  emoji: '🍝',
  name: 'Creamy Tomato Pasta',
  cuisine: 'Italian',
  prepMins: 25,
  servings: 4,
  allergens: ['Dairy', 'Gluten'],
  ingredients: [
    '400g penne pasta',
    '2 tbsp olive oil',
    '3 garlic cloves, minced',
    '1 can crushed tomatoes',
    '150ml double cream',
    'Handful fresh basil',
    '50g parmesan, grated',
    'Salt & pepper to taste',
  ],
  steps: [
    'Bring a large pot of salted water to the boil and cook penne until al dente.',
    'Heat olive oil in a pan over medium heat, then soften the garlic for 1 minute.',
    'Pour in the crushed tomatoes and simmer for 8 minutes until thickened.',
    'Stir through the cream and parmesan until glossy and smooth.',
    'Toss the drained pasta with the sauce, finish with fresh basil and serve.',
  ],
}

export type PantryItem = {
  name: string
  inPantry: boolean
}

export const pantry: { category: string; items: PantryItem[] }[] = [
  {
    category: 'Vegetables',
    items: [
      { name: 'Tomatoes', inPantry: true },
      { name: 'Garlic', inPantry: true },
      { name: 'Spinach', inPantry: false },
      { name: 'Carrots', inPantry: true },
    ],
  },
  {
    category: 'Proteins',
    items: [
      { name: 'Chicken breast', inPantry: true },
      { name: 'Eggs', inPantry: true },
      { name: 'Shrimp', inPantry: false },
    ],
  },
  {
    category: 'Pantry Staples',
    items: [
      { name: 'Penne pasta', inPantry: true },
      { name: 'Olive oil', inPantry: true },
      { name: 'Crushed tomatoes', inPantry: false },
      { name: 'Rice', inPantry: true },
    ],
  },
  {
    category: 'Dairy',
    items: [
      { name: 'Double cream', inPantry: false },
      { name: 'Parmesan', inPantry: true },
      { name: 'Butter', inPantry: true },
    ],
  },
]

export type GroceryItem = {
  name: string
  qty: string
  inCart: boolean
  inPantry: boolean
}

export const grocery: { category: string; items: GroceryItem[] }[] = [
  {
    category: 'Produce',
    items: [
      { name: 'Fresh basil', qty: '1 bunch', inCart: false, inPantry: false },
      { name: 'Spinach', qty: '200g', inCart: false, inPantry: false },
      { name: 'Garlic', qty: '1 bulb', inCart: true, inPantry: true },
    ],
  },
  {
    category: 'Dairy',
    items: [
      { name: 'Double cream', qty: '150ml', inCart: false, inPantry: false },
      { name: 'Parmesan', qty: '50g', inCart: true, inPantry: true },
    ],
  },
  {
    category: 'Meat',
    items: [
      { name: 'Chicken breast', qty: '500g', inCart: false, inPantry: true },
      { name: 'Turkey slices', qty: '200g', inCart: false, inPantry: false },
    ],
  },
]

export type Member = {
  initial: string
  name: string
  you?: boolean
  allergyCount: number
}

export const familyMembers: Member[] = [
  { initial: 'S', name: 'Sarah', you: true, allergyCount: 2 },
  { initial: 'T', name: 'Tom', allergyCount: 0 },
  { initial: 'E', name: 'Emma', allergyCount: 1 },
]
