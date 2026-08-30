# 🤖 Gyummy Planner - High-Volume AI Recipe Research Guide

Why did full JSON fail previously? AI models hit strict **output token limits** after ~3-4 verbose JSON recipes.

To get **30 to 50 recipes in a single AI chat response**, use the **Compact Pipe-Separated Table Format** below!

---

## ⚡ 1. High-Volume Prompt for AI Models (30–50 recipes per prompt)

Copy and paste this prompt into ChatGPT, Claude, Gemini, or Perplexity:

```text
Please research 30 easy, delicious home-cooked Asian recipes (under 30 minutes).

Output your results as a clean Markdown table with EXACTLY these columns separated by pipes (|):
Recipe Name | Cuisine | Category | PrepTimeMinutes | Ingredients (quantity unit name, semicolon-separated) | Short Instructions

Rules:
1. Cuisine: Japanese, Korean, Cantonese, Thai, Vietnamese, Western, etc.
2. Category: Dinner, Lunch, Breakfast, Snack, Dessert
3. Do not include markdown code block formatting or conversational text, just the raw table rows.

Example Row:
Japanese Teriyaki Chicken | Japanese | Dinner | 20 | 500g Chicken thigh; 3tbsp Soy sauce; 2tbsp Honey; 1tbsp Ginger | 1. Pan-sear chicken skin down for 6m. 2. Pour sauce and simmer until glazed. 3. Serve with rice.
```

---

## 📥 2. How to Import the 30-50 Recipes

1. Copy the table output from the AI.
2. Save it into a file named `recipes.csv` or `recipes.txt`.
3. In **Gyummy Planner**, go to the **Recipes** tab.
4. Click the **Upload icon (↑)** and select `recipes.csv`!
5. All 30–50 recipes will be automatically parsed, categorized, and added directly to your **System Library**!

---

## 🌐 3. Scraping Directly from Recipe Websites (100s of recipes)

If you have a recipe website you love (e.g. *Just One Cookbook, The Woks of Life, Allrecipes, Serious Eats*):

Run this script in your terminal to scrape any recipe link automatically into Gyummy Planner format:

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
node scripts/scrape-recipes.js "https://www.justonecookbook.com/chicken-teriyaki/"
```
It generates `scraped_recipe.json`, which can be imported with 1 click.
