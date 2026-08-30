import { useState, useEffect } from 'react';
import type { AppData, Dish, MasterIngredient, MealPlan, MealScheduleConfig, MealScheduleEntry, UserProfile } from './types';
import { loadAppData, saveAppData, generateGroceryList } from './services/storage';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import type { TabType } from './components/BottomNav';
import { PlannerView } from './components/planner/PlannerView';
import { DishesView } from './components/dishes/DishesView';
import { IngredientsView } from './components/ingredients/IngredientsView';
import { GroceryView } from './components/grocery/GroceryView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { LandingLoginPage } from './components/auth/LandingLoginPage';
import { FirstTimeOnboardingGuide } from './components/auth/FirstTimeOnboardingGuide';

import { loadMasterSystemRecipes, mergeSystemWithUserDishes, getCachedSystemRecipes } from './services/systemRecipesService';

export function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<TabType>('planner');
  const [isDishCreatorOpen, setIsDishCreatorOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingGuideOpen, setIsOnboardingGuideOpen] = useState(false);
  const [isSystemGuideActive, setIsSystemGuideActive] = useState(false);

  // Load master system recipes (3,000+ recipes) from static asset / IndexedDB on launch
  useEffect(() => {
    loadMasterSystemRecipes().then((systemRecipes) => {
      if (systemRecipes && systemRecipes.length > 50) {
        setAppData((prev) => ({
          ...prev,
          dishes: mergeSystemWithUserDishes(prev.dishes, systemRecipes)
        }));
      }
    });
  }, []);

  // Sync to local storage whenever appData changes
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Check if first-time onboarding schedule setup should be presented
  useEffect(() => {
    if (appData.currentProfile && !appData.settings?.hasCompletedScheduleOnboarding) {
      setIsOnboardingGuideOpen(true);
    }
  }, [appData.currentProfile, appData.settings?.hasCompletedScheduleOnboarding]);

  // Auth Profile handler
  const handleSelectProfile = (profile: UserProfile, updatedMembers: string[]) => {
    const isFirstTime = !appData.settings?.hasCompletedScheduleOnboarding;
    const systemDishes = getCachedSystemRecipes();
    setAppData((prev) => ({
      ...prev,
      currentProfile: profile,
      familyMembers: updatedMembers,
      dishes: mergeSystemWithUserDishes(prev.dishes, systemDishes)
    }));
    setIsProfileModalOpen(false);
    if (isFirstTime) {
      setIsOnboardingGuideOpen(true);
    }
  };

  const handleLogout = () => {
    setAppData((prev) => ({
      ...prev,
      currentProfile: null
    }));
    setIsProfileModalOpen(false);
  };

  const handleRemoveMember = (memberNameToRemove: string) => {
    if (memberNameToRemove === appData.currentProfile?.memberName) return;

    setAppData((prev) => {
      const updatedMembers = prev.familyMembers.filter((m) => m !== memberNameToRemove);
      const updatedDishes = prev.dishes.map((dish) => {
        if (dish.favoritedByMembers && dish.favoritedByMembers.includes(memberNameToRemove)) {
          return {
            ...dish,
            favoritedByMembers: dish.favoritedByMembers.filter((m) => m !== memberNameToRemove)
          };
        }
        return dish;
      });

      return {
        ...prev,
        familyMembers: updatedMembers,
        dishes: updatedDishes
      };
    });
  };

  // Dishes state handlers
  const handleSaveDish = (dish: Dish) => {
    setAppData((prev) => {
      const existingIdx = prev.dishes.findIndex((d) => d.id === dish.id);
      let updatedDishes: Dish[];
      if (existingIdx >= 0) {
        updatedDishes = [...prev.dishes];
        updatedDishes[existingIdx] = dish;
      } else {
        updatedDishes = [dish, ...prev.dishes];
      }
      return {
        ...prev,
        dishes: updatedDishes
      };
    });
  };

  const handleDeleteDish = (dishId: string) => {
    setAppData((prev) => {
      const updatedDishes = prev.dishes.filter((d) => d.id !== dishId);
      const updatedMealPlan: MealPlan = { ...prev.mealPlan };
      Object.keys(updatedMealPlan).forEach((date) => {
        const day = { ...updatedMealPlan[date] };
        Object.keys(day).forEach((scheduleId) => {
          if (day[scheduleId]?.dishId === dishId) {
            delete day[scheduleId];
          }
        });
        updatedMealPlan[date] = day;
      });

      return {
        ...prev,
        dishes: updatedDishes,
        mealPlan: updatedMealPlan
      };
    });
  };

  // Toggle user-specific favorite
  const handleToggleFavoriteDish = (dishId: string) => {
    const currentMember = appData.currentProfile?.memberName;
    if (!currentMember) {
      setIsProfileModalOpen(true);
      return;
    }

    setAppData((prev) => {
      const updatedDishes = prev.dishes.map((dish) => {
        if (dish.id !== dishId) return dish;
        const currentFavorites = dish.favoritedByMembers || [];
        const isFav = currentFavorites.includes(currentMember);
        const updatedFavs = isFav
          ? currentFavorites.filter((m) => m !== currentMember)
          : [...currentFavorites, currentMember];

        return {
          ...dish,
          favoritedByMembers: updatedFavs
        };
      });

      return {
        ...prev,
        dishes: updatedDishes
      };
    });
  };

  // Toggle Family Cookbook inclusion
  const handleToggleFamilyRecipe = (dishId: string) => {
    setAppData((prev) => {
      const updatedDishes = prev.dishes.map((dish) => {
        if (dish.id !== dishId) return dish;
        return {
          ...dish,
          isFamilyRecipe: dish.isFamilyRecipe === false ? true : false
        };
      });
      return {
        ...prev,
        dishes: updatedDishes
      };
    });
  };

  // Master Ingredient handlers
  const handleSaveIngredients = (updatedIngredients: MasterIngredient[]) => {
    setAppData((prev) => ({
      ...prev,
      masterIngredients: updatedIngredients
    }));
  };

  const handleUpdatePantryIngredients = (updatedPantry: string[]) => {
    setAppData((prev) => ({
      ...prev,
      pantryIngredients: updatedPantry
    }));
  };

  const handleAddSingleMasterIngredient = (newIngredient: MasterIngredient) => {
    setAppData((prev) => {
      const exists = prev.masterIngredients.some(
        (i) => i.name.trim().toLowerCase() === newIngredient.name.trim().toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        masterIngredients: [newIngredient, ...prev.masterIngredients]
      };
    });
  };

  // Planner state handlers
  const handleUpdateMealPlan = (date: string, scheduleId: string, entry: MealScheduleEntry | null) => {
    setAppData((prev) => {
      const currentDay = prev.mealPlan[date] ? { ...prev.mealPlan[date] } : {};
      if (entry) {
        currentDay[scheduleId] = entry;
      } else {
        delete currentDay[scheduleId];
      }

      return {
        ...prev,
        mealPlan: {
          ...prev.mealPlan,
          [date]: currentDay
        }
      };
    });
  };

  const handleBatchUpdateMealPlan = (updatedPlan: MealPlan) => {
    setAppData((prev) => ({
      ...prev,
      mealPlan: updatedPlan
    }));
  };

  const handleSaveMealSchedules = (schedules: MealScheduleConfig[]) => {
    setAppData((prev) => ({
      ...prev,
      mealSchedules: schedules,
      settings: {
        ...prev.settings,
        hasCompletedScheduleOnboarding: true
      }
    }));
  };

  // Grocery state handlers
  const handleUpdateGroceryList = (newList: AppData['groceryList']) => {
    setAppData((prev) => ({
      ...prev,
      groceryList: newList
    }));
  };

  const handleGoToGrocery = (startDate: string, endDate: string) => {
    const items = generateGroceryList(
      appData.dishes,
      appData.mealPlan,
      startDate,
      endDate,
      appData.groceryList.items,
      appData.pantryIngredients || []
    );
    setAppData((prev) => ({
      ...prev,
      groceryList: {
        ...prev.groceryList,
        startDate,
        endDate,
        items
      }
    }));
    setActiveTab('grocery');
  };

  // Import dishes batch handler
  const handleImportDishes = (incomingDishes: Dish[]) => {
    setAppData((prev) => {
      const existingIds = new Set(prev.dishes.map((d) => d.id));
      const existingNames = new Set(prev.dishes.map((d) => d.name.trim().toLowerCase()));
      const merged = [...prev.dishes];

      incomingDishes.forEach((dish) => {
        if (!existingIds.has(dish.id) && !existingNames.has(dish.name.trim().toLowerCase())) {
          merged.push(dish);
          existingIds.add(dish.id);
          existingNames.add(dish.name.trim().toLowerCase());
        }
      });

      return {
        ...prev,
        dishes: merged
      };
    });
  };

  // If no user profile logged in, render the sleek Landing & Login Page!
  if (!appData.currentProfile) {
    return (
      <LandingLoginPage
        currentProfile={appData.currentProfile}
        familyMembers={appData.familyMembers}
        onLogin={handleSelectProfile}
      />
    );
  }

  const pendingGroceryCount = appData.groceryList.items.filter((i) => !i.checked).length;
  const familyName = appData.currentProfile?.familyName || 'Family';

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-start text-slate-800">
      {/* Mobile Shell Constraints */}
      <div className="w-full max-w-md min-h-screen bg-[#FDFBF7] flex flex-col relative shadow-xl border-x border-[#EAE6DF]/80">
        
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          currentProfile={appData.currentProfile}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenDishCreator={() => setIsDishCreatorOpen(true)}
        />

        {/* Screen Content */}
        <main className="flex-1 flex flex-col">
          {activeTab === 'planner' && (
            <PlannerView
              familyName={familyName}
              dishes={appData.dishes}
              mealPlan={appData.mealPlan}
              mealSchedules={appData.mealSchedules || []}
              onUpdateMealPlan={handleUpdateMealPlan}
              onBatchUpdateMealPlan={handleBatchUpdateMealPlan}
              onSaveMealSchedules={handleSaveMealSchedules}
              onOpenDishCreator={() => {
                setActiveTab('dishes');
                setIsDishCreatorOpen(true);
              }}
              onGoToGrocery={handleGoToGrocery}
            />
          )}

          {activeTab === 'dishes' && (
            <DishesView
              familyName={familyName}
              currentProfile={appData.currentProfile}
              dishes={appData.dishes}
              masterIngredients={appData.masterIngredients}
              initialScope={isSystemGuideActive ? 'system' : 'family'}
              showSystemGuideHint={isSystemGuideActive}
              onSaveDish={handleSaveDish}
              onDeleteDish={handleDeleteDish}
              onToggleFavoriteDish={handleToggleFavoriteDish}
              onToggleFamilyRecipe={handleToggleFamilyRecipe}
              onAddMasterIngredient={handleAddSingleMasterIngredient}
              onImportDishes={handleImportDishes}
              onQuickPlanDish={(dish) => {
                const today = new Date().toISOString().split('T')[0];
                handleUpdateMealPlan(today, 'dinner', { dishId: dish.id });
                setActiveTab('planner');
              }}
              isCreatorOpen={isDishCreatorOpen}
              setIsCreatorOpen={setIsDishCreatorOpen}
            />
          )}

          {activeTab === 'ingredients' && (
            <IngredientsView
              familyName={familyName}
              ingredients={appData.masterIngredients}
              pantryIngredients={appData.pantryIngredients || []}
              onSaveIngredients={handleSaveIngredients}
              onUpdatePantryIngredients={handleUpdatePantryIngredients}
            />
          )}

          {activeTab === 'grocery' && (
            <GroceryView
              familyName={familyName}
              dishes={appData.dishes}
              mealPlan={appData.mealPlan}
              pantryIngredients={appData.pantryIngredients || []}
              groceryList={appData.groceryList}
              onUpdateGroceryList={handleUpdateGroceryList}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              appData={appData}
              onUpdateAppData={setAppData}
              onOpenProfileModal={() => setIsProfileModalOpen(true)}
              onLogout={handleLogout}
            />
          )}
        </main>

        {/* Bottom Mobile Tab Bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          groceryPendingCount={pendingGroceryCount}
        />

        {/* Auth / Register / Profile Switcher Modal */}
        <AuthModal
          isOpen={isProfileModalOpen}
          currentProfile={appData.currentProfile}
          familyMembers={appData.familyMembers}
          onSelectProfile={handleSelectProfile}
          onRemoveMember={handleRemoveMember}
          onLogout={handleLogout}
          onClose={() => setIsProfileModalOpen(false)}
          isMandatory={false}
        />

        {/* First Launch Guided Onboarding Modal (Meal Schedule Setup & Recipe Library Walkthrough) */}
        <FirstTimeOnboardingGuide
          isOpen={isOnboardingGuideOpen}
          mealSchedules={appData.mealSchedules}
          onSaveMealSchedules={handleSaveMealSchedules}
          onCompleteOnboarding={() => {
            setIsOnboardingGuideOpen(false);
            setAppData((prev) => ({
              ...prev,
              settings: { ...prev.settings, hasCompletedScheduleOnboarding: true }
            }));
          }}
          onGoToRecipeLibrary={() => {
            setActiveTab('dishes');
            setIsSystemGuideActive(true);
          }}
        />
      </div>
    </div>
  );
}

export default App;
