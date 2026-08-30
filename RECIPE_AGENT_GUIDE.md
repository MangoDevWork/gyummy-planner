# 🤖 Gyummy Planner - AI Recipe Research Agent Guide

Use this prompt to instruct any AI agent (ChatGPT, Claude, Gemini, Perplexity, etc.) to research recipes online and format them for 1-click import into Gyummy Planner.

---

## 📋 Copy & Paste Prompt for AI Researcher Agents

```markdown
You are a culinary research assistant for Gyummy Planner. Research authentic, delicious, and easy-to-make homemade recipes (especially Asian cuisines or simple weeknight dinners under 30 minutes).

Output your findings as a SINGLE valid JSON document matching the exact schema below. Do not wrap with extra commentary, only output the JSON.

### Constraints & Rules:
1. "cuisine": Must be one of ["Asian", "Japanese", "Korean", "Cantonese", "Thai", "Vietnamese", "Western", "Italian", "Mexican", "Mediterranean", "Other"].
2. "category": Must be one of ["Dinner", "Lunch", "Breakfast", "Snack", "Dessert"].
3. "prepTimeMinutes": Keep between 10 and 35 minutes for home-friendly cooking.
4. "ingredients":
   - "category": Must match one of ["Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry & Spices", "Bakery", "Frozen", "Canned Goods", "Other"].
   - "unit": Must be standard (e.g. "g", "kg", "ml", "tbsp", "tsp", "pcs", "slices", "can", "stalks", "cloves", "cup").
   - "amount": Provide realistic numeric amount for the given servings count.

### Required JSON Structure:
{
  "app": "Gyummy Planner",
  "version": 2,
  "exportedAt": "2026-08-30T10:00:00.000Z",
  "dishes": [
    {
      "id": "dish_unique_id_1",
      "name": "Recipe Name",
      "category": "Dinner",
      "cuisine": "Japanese",
      "servings": 4,
      "prepTimeMinutes": 20,
      "imageEmoji": "🍲",
      "imageUrl": "https://images.unsplash.com/...",
      "tags": ["Quick", "Family Favorite"],
      "instructions": "1. Step one...\n2. Step two...",
      "favoritedByMembers": [],
      "isFamilyRecipe": true,
      "createdAt": "2026-08-30T10:00:00.000Z",
      "updatedAt": "2026-08-30T10:00:00.000Z",
      "ingredients": [
        {
          "id": "ing_1",
          "name": "Ingredient Name",
          "amount": 500,
          "unit": "g",
          "category": "Produce"
        }
      ]
    }
  ]
}
```

---

## 📥 How to Import into Gyummy Planner

1. Save the AI's output into a `.json` file (or compress into `.zip`).
2. In **Gyummy Planner**, go to the **Recipes** tab.
3. Click the **Upload icon (↑)** next to the search bar.
4. Select your file — all recipes will be instantly imported into your library!
