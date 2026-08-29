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
    servings: 4,
    imageEmoji: '🧆',
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 30,
    tags: ['Family Favorite', 'Comfort Food'],
    instructions: '1. Season ground beef with salt, pepper, and shape into 12-14 round meatballs.\n2. Heat olive oil in a pan over medium heat and sear meatballs until browned on all sides (5-7 mins).\n3. Add chopped onion, minced garlic, and diced tomatoes with sauce.\n4. Simmer gently on low heat for 20 minutes until sauce thickens and meatballs are cooked through.\n5. Garnish with fresh herbs and serve hot over rice or pasta.',
    favoritedByMembers: [],
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
    servings: 3,
    imageEmoji: '🍗',
    imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 20,
    tags: ['Japanese', 'Quick & Easy', 'Kid Friendly'],
    instructions: '1. Pat chicken thighs dry and prick skin with a fork for crispiness.\n2. Mix soy sauce, mirin/honey, sugar, and minced ginger in a small bowl.\n3. Pan-sear chicken skin-side down in a hot skillet for 6 minutes until golden and crispy, then flip.\n4. Pour sauce mixture into the pan and simmer until glazed and bubbly.\n5. Slice chicken and drizzle with rich pan glaze. Serve with steamed rice and broccoli.',
    favoritedByMembers: [],
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
    servings: 4,
    imageEmoji: '🥩',
    imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 15,
    tags: ['Korean', 'High Protein', 'Fast'],
    instructions: '1. In a bowl, whisk soy sauce, sesame oil, brown sugar, grated garlic, and black pepper.\n2. Toss sliced beef or ground beef in the marinade for 5-10 minutes.\n3. Heat a wok or skillet over high heat with cooking oil.\n4. Stir-fry the beef and sliced onions rapidly for 4-5 minutes until caramelized and fragrant.\n5. Top with chopped scallions and toasted sesame seeds over a warm bowl of rice.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_bg_1', name: 'Beef Tenderloin', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_bg_2', name: 'Soy Sauce', amount: 40, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_bg_3', name: 'Sesame Oil', amount: 15, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_bg_4', name: 'Brown Sugar', amount: 20, unit: 'g', category: 'Pantry & Spices' },
      { id: 'ing_bg_5', name: 'Garlic Clove', amount: 3, unit: 'pcs', category: 'Produce' },
      { id: 'ing_bg_6', name: 'Green Onion', amount: 3, unit: 'stalks', category: 'Produce' }
    ]
  },
  {
    id: 'dish_egg_fried_rice',
    name: 'Classic Golden Egg Fried Rice',
    category: 'Lunch',
    servings: 2,
    imageEmoji: '🍳',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 10,
    tags: ['Chinese', 'Vegetarian', 'Quick & Easy'],
    instructions: '1. Beat 3 eggs with a pinch of salt and pepper.\n2. Heat 1 tbsp oil in a wok on medium-high heat. Scramble eggs softly, then remove.\n3. Add remaining oil to wok, toss in cold cooked rice, breaking up clumps.\n4. Drizzle soy sauce and sesame oil around the rim of the wok and toss vigorously.\n5. Return scrambled eggs and fold in generous sliced scallions. Toss for 1 minute and serve.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_fr_1', name: 'Cooked Rice', amount: 400, unit: 'g', category: 'Pantry & Spices' },
      { id: 'ing_fr_2', name: 'Eggs', amount: 3, unit: 'pcs', category: 'Dairy & Eggs' },
      { id: 'ing_fr_3', name: 'Green Onion', amount: 4, unit: 'stalks', category: 'Produce' },
      { id: 'ing_fr_4', name: 'Soy Sauce', amount: 20, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_fr_5', name: 'Sesame Oil', amount: 10, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_fr_6', name: 'Cooking Oil', amount: 15, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_thai_basil_chicken',
    name: 'Thai Basil Chicken (Pad Krapow)',
    category: 'Dinner',
    servings: 3,
    imageEmoji: '🌶️',
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 15,
    tags: ['Thai', 'Spicy', 'Fast Dinner'],
    instructions: '1. Crush garlic and fresh chilies in a mortar or chop finely.\n2. Heat oil in a wok, fry garlic and chili for 30 seconds until intensely aromatic.\n3. Add minced chicken and stir-fry over high heat, breaking it apart until cooked.\n4. Stir in oyster sauce, soy sauce, fish sauce, and a pinch of sugar.\n5. Turn off heat, toss in fresh basil leaves until wilted. Serve alongside a crispy fried egg.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_bc_1', name: 'Minced Chicken', amount: 400, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_bc_2', name: 'Fresh Basil', amount: 30, unit: 'g', category: 'Produce' },
      { id: 'ing_bc_3', name: 'Garlic Clove', amount: 4, unit: 'pcs', category: 'Produce' },
      { id: 'ing_bc_4', name: 'Soy Sauce', amount: 20, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_bc_5', name: 'Oyster Sauce', amount: 20, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_bc_6', name: 'Fish Sauce', amount: 10, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_steamed_garlic_fish',
    name: 'Garlic Soy Steamed Fish Fillet',
    category: 'Dinner',
    servings: 2,
    imageEmoji: '🐟',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 15,
    tags: ['Chinese', 'Healthy', 'Low Calorie'],
    instructions: '1. Place fish fillets on a heatproof plate. Top with julienned ginger and a splash of cooking wine.\n2. Steam over boiling water in a covered pot for 8-10 minutes until fish flakes easily.\n3. Discard excess steaming liquid. Top fish with thinly sliced scallions and fresh cilantro.\n4. Drizzle seasoned soy sauce around the fish.\n5. Heat 2 tbsp oil in a small ladle until shimmering hot, then pour sizzle oil over scallions to release aromatics.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_sf_1', name: 'White Fish Fillet', amount: 400, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_sf_2', name: 'Ginger Root', amount: 20, unit: 'g', category: 'Produce' },
      { id: 'ing_sf_3', name: 'Green Onion', amount: 3, unit: 'stalks', category: 'Produce' },
      { id: 'ing_sf_4', name: 'Soy Sauce', amount: 30, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_sf_5', name: 'Sesame Oil', amount: 10, unit: 'ml', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_japanese_curry',
    name: 'Japanese Golden Chicken Curry',
    category: 'Dinner',
    servings: 4,
    imageEmoji: '🍛',
    imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 30,
    tags: ['Japanese', 'Comfort Food', 'Meal Prep'],
    instructions: '1. Cut chicken, potatoes, carrots, and onions into bite-sized chunks.\n2. In a deep pot, sauté onions in oil until translucent, then add chicken and brown lightly.\n3. Add carrots and potatoes, pour in water to cover, and bring to a simmer for 15 mins.\n4. Turn off heat, dissolve Japanese curry roux cubes into the broth, stirring until velvety smooth.\n5. Simmer on low heat for 5 more minutes until luscious. Serve over fluffy Japanese rice.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_cy_1', name: 'Chicken Breast', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_cy_2', name: 'Potato', amount: 2, unit: 'pcs', category: 'Produce' },
      { id: 'ing_cy_3', name: 'Carrot', amount: 2, unit: 'pcs', category: 'Produce' },
      { id: 'ing_cy_4', name: 'Yellow Onion', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_cy_5', name: 'Curry Powder', amount: 50, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_scallion_noodles',
    name: 'Cantonese Scallion Oil Noodles',
    category: 'Lunch',
    servings: 2,
    imageEmoji: '🍜',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 12,
    tags: ['Cantonese', '15-min Meal', 'Vegetarian'],
    instructions: '1. Slice scallions into 2-inch segments, separating white and green parts.\n2. Heat oil in a pan on medium-low. Fry scallion whites first, then greens until crisp and browned (8 mins).\n3. Add light soy sauce, dark soy sauce, and sugar to the scallion oil. Simmer 1 minute.\n4. Boil wheat or ramen noodles until al dente, drain well.\n5. Toss noodles in the warm fragrant scallion sauce and top with crispy scallion threads.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_sn_1', name: 'Wheat Noodles', amount: 250, unit: 'g', category: 'Pantry & Spices' },
      { id: 'ing_sn_2', name: 'Green Onion', amount: 8, unit: 'stalks', category: 'Produce' },
      { id: 'ing_sn_3', name: 'Soy Sauce', amount: 30, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_sn_4', name: 'Cooking Oil', amount: 40, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_sn_5', name: 'Sugar', amount: 10, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_lemongrass_pork',
    name: 'Vietnamese Lemongrass Pork Chops',
    category: 'Dinner',
    servings: 3,
    imageEmoji: '🥩',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 20,
    tags: ['Vietnamese', 'Flavor Packed', 'Grill/Pan'],
    instructions: '1. Finely mince lemongrass stalks, garlic, and shallots.\n2. Mix minced aromatics with fish sauce, soy sauce, brown sugar, and black pepper.\n3. Coat pork chops or sliced pork in the marinade for 10 minutes.\n4. Pan-sear in a hot skillet with oil for 4-5 minutes per side until deeply caramelized and golden.\n5. Serve with cucumber slices, jasmine rice, and a squeeze of fresh lime juice.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_lp_1', name: 'Pork Chop', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_lp_2', name: 'Lemongrass', amount: 2, unit: 'stalks', category: 'Produce' },
      { id: 'ing_lp_3', name: 'Garlic Clove', amount: 3, unit: 'pcs', category: 'Produce' },
      { id: 'ing_lp_4', name: 'Fish Sauce', amount: 25, unit: 'ml', category: 'Pantry & Spices' },
      { id: 'ing_lp_5', name: 'Brown Sugar', amount: 15, unit: 'g', category: 'Pantry & Spices' }
    ]
  },
  {
    id: 'dish_sweet_sour_chicken',
    name: 'Hong Kong Sweet & Sour Chicken',
    category: 'Dinner',
    servings: 4,
    imageEmoji: '🍍',
    imageUrl: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
    prepTimeMinutes: 25,
    tags: ['Cantonese', 'Crispy', 'Classic'],
    instructions: '1. Cut chicken breast into bite-sized pieces and toss with cornstarch and a pinch of salt.\n2. Pan-fry chicken in hot oil until crispy and golden (6-8 mins), then drain.\n3. In a bowl, mix ketchup, rice vinegar, sugar, and soy sauce.\n4. In a clean pan, sauté bell pepper cubes, onion, and pineapple chunks for 2 minutes.\n5. Pour in sweet & sour sauce and bring to a simmer. Toss in crispy chicken to coat evenly.',
    favoritedByMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: 'ing_sc_1', name: 'Chicken Breast', amount: 450, unit: 'g', category: 'Meat & Seafood' },
      { id: 'ing_sc_2', name: 'Pineapple', amount: 150, unit: 'g', category: 'Produce' },
      { id: 'ing_sc_3', name: 'Bell Pepper', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_sc_4', name: 'Yellow Onion', amount: 1, unit: 'pcs', category: 'Produce' },
      { id: 'ing_sc_5', name: 'Roma Tomato', amount: 2, unit: 'pcs', category: 'Produce' }
    ]
  }
];

export function getInitialAppData(currentProfile: AppData['currentProfile'] = null): AppData {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const getDayStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return formatDate(d);
  };

  const sampleMealPlan: AppData['mealPlan'] = {
    [getDayStr(0)]: {
      dinner: { dishId: 'dish_chicken_teriyaki' }
    },
    [getDayStr(1)]: {
      lunch: { dishId: 'dish_egg_fried_rice' },
      dinner: { dishId: 'dish_korean_beef_bulgogi' }
    },
    [getDayStr(2)]: {
      dinner: { dishId: 'dish_thai_basil_chicken' }
    },
    [getDayStr(3)]: {
      dinner: { dishId: 'dish_tomato_meatball' }
    }
  };

  const startDate = getDayStr(0);
  const endDate = getDayStr(6);

  return {
    version: 2,
    currentProfile: currentProfile,
    familyMembers: currentProfile ? [currentProfile.memberName] : [],
    dishes: INITIAL_DISHES,
    masterIngredients: DEFAULT_MASTER_INGREDIENTS,
    mealSchedules: DEFAULT_MEAL_SCHEDULES,
    mealPlan: sampleMealPlan,
    groceryList: {
      startDate,
      endDate,
      items: [],
      undoStack: []
    },
    settings: {
      weekStartsOn: 'Monday',
      defaultServings: 4,
      theme: 'warm'
    }
  };
}
