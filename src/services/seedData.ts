import type { AppData, Dish, MealScheduleConfig } from '../types';
import { DEFAULT_MASTER_INGREDIENTS } from './masterIngredients';

export const DEFAULT_MEAL_SCHEDULES: MealScheduleConfig[] = [
  { id: 'breakfast', name: 'Breakfast', defaultEnabled: true, order: 1 },
  { id: 'lunch', name: 'Lunch', defaultEnabled: true, order: 2 },
  { id: 'dinner', name: 'Dinner', defaultEnabled: true, order: 3 },
  { id: 'snack', name: 'Snack', defaultEnabled: true, order: 4 },
];

export const INITIAL_DISHES: Dish[] = [
  {
    id: 'dish_tomato_meatball',
    name: 'Tomato Meat Ball',
    category: 'Dinner',
    cuisine: 'Western',
    servings: 4,
    imageEmoji: '🧆',
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 30,
    tags: ['Family Favorite', 'Comfort Food', 'Western'],
    instructions: '1. Season ground beef with salt, pepper, and shape into 12-14 round meatballs.\n2. Heat olive oil in a pan over medium heat and sear meatballs until browned on all sides (5-7 mins).\n3. Add chopped onion, minced garlic, and diced tomatoes with sauce.\n4. Simmer gently on low heat for 20 minutes until sauce thickens and meatballs are cooked through.\n5. Garnish with fresh herbs and serve hot over rice or pasta.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_mb_1', name: 'Ground Beef', amount: 500, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_mb_2', name: 'Roma Tomato', amount: 4, unit: 'pcs', category: 'Produce' },
      { id: 'ing_mb_3', name: 'Garlic Clove', amount: 3, unit: 'pcs', category: 'Produce' },
      { id: 'ing_mb_4', name: 'Yellow Onion', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_mb_5', name: 'Olive Oil', amount: 15, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_chicken_teriyaki',
    name: 'Japanese Chicken Teriyaki',
    category: 'Dinner',
    cuisine: 'Japanese',
    servings: 3,
    imageEmoji: '🍗',
    imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 20,
    tags: ['Japanese', 'Quick & Easy', 'Kid Friendly'],
    instructions: '1. Pat chicken thighs dry and prick skin with a fork for crispiness.\n2. Mix soy sauce, mirin/honey, sugar, and minced ginger in a small bowl.\n3. Pan-sear chicken skin-side down in a hot skillet for 6 minutes until golden and crispy, then flip.\n4. Pour sauce mixture into the pan and simmer until glazed and bubbly.\n5. Slice chicken and drizzle with rich pan glaze. Serve with steamed rice and broccoli.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_ty_1', name: 'Chicken Thigh', amount: 500, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_ty_2', name: 'Soy Sauce', amount: 45, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_ty_3', name: 'Honey', amount: 30, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_ty_4', name: 'Ginger Root', amount: 10, unit: 'g', category: 'Produce' },
      { id: 'ing_ty_5', name: 'Garlic Clove', amount: 2, unit: 'pcs', category: 'Produce' },
      { id: 'ing_ty_6', name: 'Sesame Seed', amount: 5, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_korean_beef_bulgogi',
    name: 'Korean Beef Bulgogi Bowl',
    category: 'Dinner',
    cuisine: 'Korean',
    servings: 4,
    imageEmoji: '🥩',
    imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 15,
    tags: ['Korean', 'High Protein', 'Fast'],
    instructions: '1. In a bowl, whisk soy sauce, sesame oil, brown sugar, grated garlic, and black pepper.\n2. Toss sliced beef or ground beef in the marinade for 5-10 minutes.\n3. Heat a wok or skillet over high heat with cooking oil.\n4. Stir-fry the beef and sliced onions rapidly for 4-5 minutes until caramelized and fragrant.\n5. Top with chopped scallions and toasted sesame seeds over a warm bowl of rice.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_bg_1', name: 'Beef Tenderloin', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_bg_2', name: 'Soy Sauce', amount: 40, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_bg_3', name: 'Sesame Oil', amount: 15, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_bg_4', name: 'Brown Sugar', amount: 20, unit: 'g', category: 'Pantry & Spices' },
      { id: 'ing_bg_5', name: 'Green Onion / Scallion', amount: 3, unit: 'stalks', category: 'Produce' },
      { id: 'ing_bg_6', name: 'Garlic Clove', amount: 3, unit: 'pcs', category: 'Produce' }
    ]
  },
  {
    id: 'dish_egg_fried_rice',
    name: 'Classic Golden Egg Fried Rice',
    category: 'Lunch',
    cuisine: 'Cantonese',
    servings: 2,
    imageEmoji: '🍳',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 10,
    tags: ['Cantonese', 'Quick & Easy', 'Budget Friendly'],
    instructions: '1. Beat 3 eggs in a bowl with a pinch of salt.\n2. Heat oil in a wok until shimmering; scramble eggs quickly until 80% set, then set aside.\n3. Add cold jasmine rice to wok and break apart clumps with a spatula.\n4. Drizzle light soy sauce, white pepper, and sesame oil around the rim.\n5. Fold scrambled eggs and chopped green onions back in, tossing over high flame for 2 mins.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_fr_1', name: 'White Rice (Cooked)', amount: 400, unit: 'g', category: 'Pantry & Spices' },
      { id: 'ing_fr_2', name: 'Chicken Egg', amount: 3, unit: 'pcs', category: 'Dairy & Eggs' },
      { id: 'ing_fr_3', name: 'Green Onion / Scallion', amount: 3, unit: 'stalks', category: 'Produce' },
      { id: 'ing_fr_4', name: 'Soy Sauce', amount: 20, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_fr_5', name: 'Cooking Oil', amount: 15, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_thai_basil_chicken',
    name: 'Thai Basil Chicken (Pad Krapow)',
    category: 'Dinner',
    cuisine: 'Thai',
    servings: 2,
    imageEmoji: '🍛',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 15,
    tags: ['Thai', 'Spicy', 'Fast Dinner'],
    instructions: '1. Pound garlic and fresh bird\'s eye chilies roughly in a mortar.\n2. Heat 2 tbsp oil in a wok and fry the garlic-chili mixture until intensely fragrant (30 seconds).\n3. Add minced chicken breast/thigh and stir-fry, breaking up chunks until cooked through.\n4. Stir in soy sauce, oyster sauce, and fish sauce with a splash of water.\n5. Turn off heat, immediately fold in a generous bunch of fresh Holy/Thai Basil leaves until just wilted. Serve with a crispy fried egg on top!',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_tb_1', name: 'Minced Chicken', amount: 350, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_tb_2', name: 'Thai Basil', amount: 30, unit: 'g', category: 'Produce' },
      { id: 'ing_tb_3', name: 'Garlic Clove', amount: 4, unit: 'pcs', category: 'Produce' },
      { id: 'ing_tb_4', name: 'Soy Sauce', amount: 15, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_tb_5', name: 'Fish Sauce', amount: 10, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_steamed_fish_fillet',
    name: 'Garlic Soy Steamed Fish Fillet',
    category: 'Dinner',
    cuisine: 'Cantonese',
    servings: 3,
    imageEmoji: '🐟',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 15,
    tags: ['Cantonese', 'Healthy', 'Light', 'Steam'],
    instructions: '1. Arrange fresh white fish fillets on a heatproof plate with ginger slices underneath.\n2. Steam over boiling water for 8-10 minutes until fish flakes tenderly with a fork.\n3. Pour off any excess liquid from the plate and layer finely shredded scallions on top.\n4. Drizzle seasoned premium soy sauce over the fish.\n5. Heat 2 tbsp cooking oil until smoking hot and pour directly over scallions to release an incredible aroma!',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_sf_1', name: 'Fish Fillet (White)', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_sf_2', name: 'Ginger Root', amount: 20, unit: 'g', category: 'Produce' },
      { id: 'ing_sf_3', name: 'Green Onion / Scallion', amount: 4, unit: 'stalks', category: 'Produce' },
      { id: 'ing_sf_4', name: 'Soy Sauce', amount: 30, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_sf_5', name: 'Cooking Oil', amount: 20, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_japanese_chicken_curry',
    name: 'Japanese Golden Chicken Curry',
    category: 'Dinner',
    cuisine: 'Japanese',
    servings: 4,
    imageEmoji: '🍛',
    imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 30,
    tags: ['Japanese', 'Family Favorite', 'Comfort Food'],
    instructions: '1. Sauté sliced onions in a pot with oil on medium-low heat until lightly caramelized (8 mins).\n2. Add bite-sized chicken pieces, diced carrots, and cubed potatoes. Brown for 3 minutes.\n3. Add 500ml water or chicken broth, bring to a boil, skim foam, and simmer covered for 15 minutes.\n4. Turn off heat, break in Japanese curry roux cubes and stir until completely dissolved.\n5. Simmer on low for another 5 minutes until rich and velvety. Serve over hot short-grain rice.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_jc_1', name: 'Chicken Breast', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_jc_2', name: 'Potato', amount: 2, unit: 'pcs', category: 'Produce' },
      { id: 'ing_jc_3', name: 'Carrot', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_jc_4', name: 'Yellow Onion', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_jc_5', name: 'Japanese Curry Roux', amount: 100, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_scallion_oil_noodles',
    name: 'Cantonese Scallion Oil Noodles',
    category: 'Lunch',
    cuisine: 'Cantonese',
    servings: 2,
    imageEmoji: '🍜',
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 12,
    tags: ['Cantonese', 'Fast', 'Vegetarian Friendly', '10 mins'],
    instructions: '1. Cut scallions into 2-inch segments.\n2. Heat vegetable oil in a pan over low heat; gently fry scallions for 10-12 minutes until crispy and golden brown.\n3. Remove browned scallions. Pour light soy sauce, dark soy sauce, and sugar into the fragrant oil; simmer for 1 min.\n4. Cook fresh wheat noodles in boiling water for 3 minutes, then drain thoroughly.\n5. Toss noodles with the scallion oil sauce and top with the crispy scallions.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    dishRole: 'one_pot_meal',
    spiceLevel: 0,
    kidFriendly: true,
    nutrition: {
      calories: 480,
      protein: 12,
      carbs: 68,
      fat: 18,
      fiber: 3,
      sodium: 580
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_sn_1', name: 'Wheat Noodles', amount: 300, unit: 'g', category: 'Pantry & Spices' },
      { id: 'ing_sn_2', name: 'Green Onion / Scallion', amount: 6, unit: 'stalks', category: 'Produce' },
      { id: 'ing_sn_3', name: 'Soy Sauce', amount: 30, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_sn_4', name: 'Cooking Oil', amount: 40, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_sn_5', name: 'Sugar', amount: 10, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_lemongrass_pork',
    name: 'Vietnamese Lemongrass Pork Chops',
    category: 'Dinner',
    cuisine: 'Vietnamese',
    servings: 3,
    imageEmoji: '🥩',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 20,
    tags: ['Vietnamese', 'Aromatic', 'Grill / Pan Sear'],
    instructions: '1. Finely mince lemongrass, garlic, and shallots.\n2. Mix with fish sauce, brown sugar, soy sauce, and black pepper into a marinade.\n3. Coat pork chops and let marinate for at least 15 minutes.\n4. Heat skillet with oil over medium-high heat. Sear pork for 4-5 minutes per side until caramelized.\n5. Rest for 3 minutes, slice and serve with cucumber slices, pickled carrots, and steamed rice.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    dishRole: 'main_protein',
    spiceLevel: 0,
    kidFriendly: true,
    nutrition: {
      calories: 420,
      protein: 38,
      carbs: 12,
      fat: 24,
      fiber: 1,
      sodium: 620
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_lp_1', name: 'Pork Chops', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_lp_2', name: 'Lemongrass Stalk', amount: 2, unit: 'stalks', category: 'Produce' },
      { id: 'ing_lp_3', name: 'Garlic Clove', amount: 3, unit: 'pcs', category: 'Produce' },
      { id: 'ing_lp_4', name: 'Fish Sauce', amount: 25, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_lp_5', name: 'Brown Sugar', amount: 15, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_sweet_sour_chicken',
    name: 'Hong Kong Sweet & Sour Chicken',
    category: 'Dinner',
    cuisine: 'Cantonese',
    servings: 3,
    imageEmoji: '🥘',
    imageUrl: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 25,
    tags: ['Cantonese', 'Classic', 'Sweet & Savory'],
    instructions: '1. Cut chicken breast into bite-sized cubes, toss with cornstarch and a pinch of salt.\n2. Pan-sear chicken pieces in oil over high heat until crispy and cooked through (6 mins), then set aside.\n3. In the same pan, toss bell peppers, onion, and pineapple chunks for 2 minutes.\n4. Whisk tomato ketchup, rice vinegar, sugar, and soy sauce; pour into the pan to bubble and glaze.\n5. Fold chicken back into the sweet & tangy glaze until glossy. Serve immediately.',
    favoritedByMembers: [],
    isFamilyRecipe: true,
    dishRole: 'main_protein',
    spiceLevel: 0,
    kidFriendly: true,
    nutrition: {
      calories: 460,
      protein: 34,
      carbs: 42,
      fat: 16,
      fiber: 2,
      sodium: 540
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_ss_1', name: 'Chicken Breast', amount: 400, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_ss_2', name: 'Bell Pepper (Capsicum)', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_ss_3', name: 'Pineapple (Canned or Fresh)', amount: 150, unit: 'g', category: 'Produce' },
      { id: 'ing_ss_4', name: 'Yellow Onion', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_ss_5', name: 'Tomato Sauce / Paste', amount: 40, unit: 'g', category: 'Pantry & Spices' }
    ]
  }
];

export const DEFAULT_PANTRY_INGREDIENTS: string[] = [
  'Jasmine Rice',
  'Soy Sauce',
  'Cooking Oil',
  'Sea Salt',
  'Black Pepper'
];

export function getInitialAppData(currentProfile: AppData['currentProfile'] | null = null): AppData {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const getDayStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return formatDate(d);
  };

  // Clean empty initial meal plan (no pre-planned meals on user calendar launch)
  const emptyMealPlan: AppData['mealPlan'] = {};

  const startDate = getDayStr(0);
  const endDate = getDayStr(6);

  return {
    version: 2,
    currentProfile: currentProfile,
    familyMembers: currentProfile ? [currentProfile.memberName] : [],
    memberProfiles: currentProfile ? {
      [currentProfile.memberName]: {
        allergies: [],
        favoriteCuisines: ['Chinese', 'Japanese', 'Italian'],
        favoriteCategories: ['Dinner', 'Lunch']
      }
    } : {},
    familyPersonalisation: {
      strictAllergyFilter: true,
      householdAllergies: [],
      householdCuisines: [],
      householdCategories: []
    },
    dishes: INITIAL_DISHES,
    masterIngredients: DEFAULT_MASTER_INGREDIENTS,
    pantryIngredients: DEFAULT_PANTRY_INGREDIENTS,
    mealSchedules: DEFAULT_MEAL_SCHEDULES,
    mealPlan: emptyMealPlan,
    groceryList: {
      startDate,
      endDate,
      items: [],
      undoStack: []
    },
    settings: {
      weekStartsOn: 'Monday',
      defaultServings: 4,
      theme: 'warm',
      hasCompletedScheduleOnboarding: false,
      hasCompletedPersonalisationOnboarding: false
    }
  };
}
