import { useState, useEffect } from 'react';
import type { AppData, Dish, MasterIngredient, MealPlan, MealScheduleConfig, MealScheduleEntry, UserProfile } from './types';
import { loadAppData, saveAppData, generateGroceryList, setActiveProfile, resetActiveSession } from './services/storage';
import { getInitialAppData } from './services/seedData';
import { DEFAULT_MASTER_INGREDIENTS } from './services/masterIngredients';
import { LanguageProvider } from './i18n/LanguageContext';
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
import { PersonalisationModal } from './components/personalisation/PersonalisationModal';

import { loadMasterSystemRecipes, mergeSystemWithUserDishes, getCachedSystemRecipes } from './services/systemRecipesService';
import { loadDarkModePreference, applyDarkMode } from './services/darkMode';
import { loadMemberLanguage } from './services/languageService';
import { subscribeToFamilyCloudData, fetchFamilyCloudData, pushAppDataToCloud } from './services/firebase';
import { mergeAppData } from './services/mergeSyncService';
import { calculateDishPlanStats } from './services/personalisationService';

export function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<TabType>('planner');
  const [isDishCreatorOpen, setIsDishCreatorOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingGuideOpen, setIsOnboardingGuideOpen] = useState(false);
  const [isPersonalisationOpen, setIsPersonalisationOpen] = useState(false);
  const [isSystemGuideActive, setIsSystemGuideActive] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // On first load, check if there's an active profile and restore their preference
    const stored = loadAppData();
    if (stored.currentProfile?.memberName) {
      return loadDarkModePreference(stored.currentProfile.memberName);
    }
    return false;
  });

  // Apply .dark class to <html> whenever isDarkMode changes
  useEffect(() => {
    applyDarkMode(isDarkMode);
  }, [isDarkMode]);

  // When the active member changes, restore their dark mode preference
  useEffect(() => {
    if (appData.currentProfile?.memberName) {
      const pref = loadDarkModePreference(appData.currentProfile.memberName);
      setIsDarkMode(pref);
    } else {
      // No profile logged in → reset to light
      setIsDarkMode(false);
    }
  }, [appData.currentProfile?.memberName]);

  // Subscribe to Cloud Firestore real-time updates for the current family
  useEffect(() => {
    const familyName = appData.currentProfile?.familyName;
    if (!familyName) return;

    const unsubscribe = subscribeToFamilyCloudData(
      familyName,
      (remoteData) => {
        setAppData((prev) => {
          const merged = mergeAppData(prev, remoteData);
          const systemDishes = getCachedSystemRecipes();
          const finalData = {
            ...merged,
            dishes: mergeSystemWithUserDishes(merged.dishes, systemDishes)
          };
          saveAppData(finalData, true); // save to localStorage only, do NOT re-push to cloud
          return finalData;
        });
      },
      (status) => {
        setCloudSyncStatus(status);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [appData.currentProfile?.familyName]);

  // 1-Tap Manual Force Sync handler
  const handleForceSync = async () => {
    const familyName = appData.currentProfile?.familyName;
    if (!familyName) return;

    setCloudSyncStatus('syncing');
    try {
      // 1. Push local changes immediately to cloud (immediate=true bypasses debounce)
      await pushAppDataToCloud(familyName, appData, (status) => setCloudSyncStatus(status), true);

      // 2. Pull remote cloud data and smart-merge
      const remoteData = await fetchFamilyCloudData(familyName);
      if (remoteData) {
        setAppData((prev) => {
          const merged = mergeAppData(prev, remoteData);
          const systemDishes = getCachedSystemRecipes();
          const finalData = {
            ...merged,
            dishes: mergeSystemWithUserDishes(merged.dishes, systemDishes)
          };
          saveAppData(finalData, true); // save locally, do not push duplicate write
          return finalData;
        });
      }
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Force sync error:', err);
      setCloudSyncStatus('error');
    }
  };

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

  // Sync to local storage and push debounced updates to cloud whenever user modifies appData
  useEffect(() => {
    if (appData.currentProfile) {
      saveAppData(appData);
    }
  }, [appData]);

  // Check if first-time onboarding schedule setup should be presented
  useEffect(() => {
    if (appData.currentProfile && !appData.settings?.hasCompletedScheduleOnboarding) {
      setIsOnboardingGuideOpen(true);
    }
  }, [appData.currentProfile, appData.settings?.hasCompletedScheduleOnboarding]);

  // Auth Profile handler: loads data isolated to this family and switches directly to Planner
  const handleSelectProfile = async (profile: UserProfile, updatedMembers?: string[], initialCloudData?: Partial<AppData>) => {
    setActiveProfile(profile);
    const loadedData = loadAppData(profile);
    const membersSet = new Set(loadedData.familyMembers || []);
    if (profile.memberName) membersSet.add(profile.memberName);
    if (updatedMembers) updatedMembers.forEach((m) => membersSet.add(m));

    const systemDishes = getCachedSystemRecipes();
    let finalData: AppData = {
      ...loadedData,
      currentProfile: profile,
      familyMembers: Array.from(membersSet),
      dishes: mergeSystemWithUserDishes(loadedData.dishes, systemDishes)
    };

    // Immediately merge cloud data (either passed from login verification or fetched fresh)
    try {
      const remoteData = initialCloudData || await fetchFamilyCloudData(profile.familyName);
      if (remoteData) {
        const merged = mergeAppData(finalData, remoteData);
        finalData = {
          ...merged,
          dishes: mergeSystemWithUserDishes(merged.dishes, systemDishes)
        };
      }
    } catch (err) {
      console.warn('Initial cloud hydration error on login:', err);
    }

    setAppData(finalData);
    saveAppData(finalData);
    setIsProfileModalOpen(false);
    setActiveTab('planner');

    // Never show first-time guide if user already configured on any device
    if (!finalData.settings?.hasCompletedScheduleOnboarding && (!finalData.mealSchedules || finalData.mealSchedules.length === 0)) {
      setIsOnboardingGuideOpen(true);
    } else {
      setIsOnboardingGuideOpen(false);
    }
  };

  const handleLogout = () => {
    resetActiveSession();
    const initial = getInitialAppData(null);
    setAppData(initial);
    setIsProfileModalOpen(false);
    setActiveTab('planner');
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
          const entry = day[scheduleId];
          if (!entry) return;

          if (entry.dishId === dishId) {
            entry.dishId = null;
          }
          if (entry.dishIds && entry.dishIds.includes(dishId)) {
            entry.dishIds = entry.dishIds.filter((id) => id !== dishId);
          }

          const hasDishes = Boolean((entry.dishIds && entry.dishIds.length > 0) || entry.dishId);
          if (!hasDishes && !entry.customText) {
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
      const currentList = prev.masterIngredients || [];
      const exists = currentList.some(
        (i) => i.name.trim().toLowerCase() === newIngredient.name.trim().toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        masterIngredients: [newIngredient, ...currentList]
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

      // Automatically promote any scheduled recipes to Family Cookbook (isFamilyRecipe = true)
      // This ensures all planned meals automatically sync across all family members' devices
      let updatedDishes = prev.dishes;
      if (entry) {
        const plannedIds = new Set<string>();
        if (entry.dishId) plannedIds.add(entry.dishId);
        if (entry.dishIds) entry.dishIds.forEach((id) => plannedIds.add(id));

        if (plannedIds.size > 0) {
          updatedDishes = prev.dishes.map((dish) => {
            if (plannedIds.has(dish.id) && !dish.isFamilyRecipe) {
              return { ...dish, isFamilyRecipe: true, updatedAt: new Date().toISOString() };
            }
            return dish;
          });
        }
      }

      const updatedPlan = {
        ...prev.mealPlan,
        [date]: currentDay
      };

      const dishesWithStats = calculateDishPlanStats(updatedDishes, updatedPlan);

      return {
        ...prev,
        dishes: dishesWithStats,
        mealPlan: updatedPlan
      };
    });
  };

  const handleBatchUpdateMealPlan = (updatedPlan: MealPlan) => {
    setAppData((prev) => {
      const dishesWithStats = calculateDishPlanStats(prev.dishes, updatedPlan);
      return {
        ...prev,
        dishes: dishesWithStats,
        mealPlan: updatedPlan
      };
    });
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
    const userLang = loadMemberLanguage(appData.currentProfile?.memberName);
    const items = generateGroceryList(
      appData.dishes,
      appData.mealPlan,
      startDate,
      endDate,
      appData.groceryList.items,
      appData.pantryIngredients || [],
      userLang
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
    <LanguageProvider activeMemberName={appData.currentProfile?.memberName}>
      <div className="min-h-screen bg-[#F4F1EA] dark:bg-[#12100E] flex flex-col items-center justify-start text-[#2B2D42] dark:text-[#F0EDE8]">
        {/* Mobile Shell Constraints */}
        <div className="w-full max-w-md min-h-screen bg-[#FDFBF7] dark:bg-[#1C1917] flex flex-col relative shadow-xl border-x border-[#EAE6DF]/80 dark:border-[#38332E]/80">
          
          {/* Top Navbar */}
          <Navbar
            activeTab={activeTab}
            currentProfile={appData.currentProfile}
            cloudSyncStatus={cloudSyncStatus}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onOpenDishCreator={() => setIsDishCreatorOpen(true)}
            onForceSync={handleForceSync}
          />

          {/* Screen Content */}
          <main className="flex-1 flex flex-col">
            {activeTab === 'planner' && (
              <PlannerView
                currentProfile={appData.currentProfile}
                familyMembers={appData.familyMembers}
                memberProfiles={appData.memberProfiles}
                familyPersonalisation={appData.familyPersonalisation}
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
                onToggleFamilyRecipe={handleToggleFamilyRecipe}
                onToggleFavoriteDish={handleToggleFavoriteDish}
                onGoToGrocery={handleGoToGrocery}
                onOpenPersonalisation={() => setIsPersonalisationOpen(true)}
              />
            )}

            {activeTab === 'dishes' && (
              <DishesView
                familyName={familyName}
                currentProfile={appData.currentProfile}
                familyMembers={appData.familyMembers}
                memberProfiles={appData.memberProfiles}
                familyPersonalisation={appData.familyPersonalisation}
                dishes={appData.dishes}
                masterIngredients={appData.masterIngredients || DEFAULT_MASTER_INGREDIENTS}
                initialScope={isSystemGuideActive ? 'system' : 'family'}
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
                ingredients={appData.masterIngredients || DEFAULT_MASTER_INGREDIENTS}
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
                onTogglePantryItem={(ingName) => {
                  const clean = ingName.trim();
                  if (!clean) return;
                  const current = appData.pantryIngredients || [];
                  const exists = current.some((p) => p.toLowerCase() === clean.toLowerCase());
                  const next = exists
                    ? current.filter((p) => p.toLowerCase() !== clean.toLowerCase())
                    : [...current, clean];
                  handleUpdatePantryIngredients(next);
                }}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                appData={appData}
                onUpdateAppData={(updatedData: AppData) => {
                  setAppData(updatedData);
                  saveAppData(updatedData);
                }}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                onLogout={handleLogout}
                isDarkMode={isDarkMode}
                onToggleDarkMode={(val: boolean) => setIsDarkMode(val)}
              />
            )}
          </main>

          {/* Bottom Mobile Tab Bar */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setIsSystemGuideActive(false);
              setActiveTab(tab);
            }}
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

          {/* First Launch Guided Onboarding Modal (Personalisation, Meal Schedule & Recipe Tour) */}
          <FirstTimeOnboardingGuide
            isOpen={isOnboardingGuideOpen}
            currentMember={appData.currentProfile?.memberName || ''}
            familyMembers={appData.familyMembers}
            memberProfiles={appData.memberProfiles || {}}
            familyPersonalisation={
              appData.familyPersonalisation || {
                strictAllergyFilter: true,
                householdAllergies: [],
                householdCuisines: [],
                householdCategories: []
              }
            }
            mealSchedules={appData.mealSchedules}
            onSavePersonalisation={(updatedProfiles, updatedFamilyPers) => {
              setAppData((prev) => ({
                ...prev,
                memberProfiles: updatedProfiles,
                familyPersonalisation: updatedFamilyPers
              }));
            }}
            onAddFamilyMember={(name) => {
              if (!appData.familyMembers.includes(name)) {
                setAppData((prev) => ({
                  ...prev,
                  familyMembers: [...prev.familyMembers, name]
                }));
              }
            }}
            onSaveMealSchedules={handleSaveMealSchedules}
            onCompleteOnboarding={() => {
              setIsOnboardingGuideOpen(false);
              setAppData((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  hasCompletedScheduleOnboarding: true,
                  hasCompletedPersonalisationOnboarding: true
                }
              }));
              setActiveTab('planner');
            }}
            onGoToRecipeLibrary={() => {
              setIsOnboardingGuideOpen(false);
              setActiveTab('dishes');
              setIsSystemGuideActive(true);
            }}
          />

          {/* Family Personalisation Modal */}
          <PersonalisationModal
            isOpen={isPersonalisationOpen}
            onClose={() => setIsPersonalisationOpen(false)}
            currentMember={appData.currentProfile?.memberName || appData.familyMembers[0] || 'Me'}
            familyMembers={appData.familyMembers}
            memberProfiles={appData.memberProfiles || {}}
            familyPersonalisation={appData.familyPersonalisation ?? { strictAllergyFilter: true }}
            onSavePersonalisation={(profiles, familyPrefs) => {
              const updated = {
                ...appData,
                memberProfiles: profiles,
                familyPersonalisation: familyPrefs
              };
              setAppData(updated);
              saveAppData(updated);
            }}
            onAddFamilyMember={(name) => {
              if (!appData.familyMembers.includes(name)) {
                const updated = {
                  ...appData,
                  familyMembers: [...appData.familyMembers, name]
                };
                setAppData(updated);
                saveAppData(updated);
              }
            }}
          />
        </div>
      </div>
    </LanguageProvider>
  );
}

export default App;
