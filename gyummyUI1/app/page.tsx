'use client'

import { useState } from 'react'
import { BottomTabBar, type TabId } from '@/components/gyummy/bottom-tab-bar'
import { TopNavbar } from '@/components/gyummy/top-navbar'
import { PlannerScreen } from '@/components/gyummy/planner-screen'
import { RecipesScreen } from '@/components/gyummy/recipes-screen'
import { PantryScreen } from '@/components/gyummy/pantry-screen'
import { GroceryScreen } from '@/components/gyummy/grocery-screen'
import { SettingsScreen } from '@/components/gyummy/settings-screen'

export default function Page() {
  const [tab, setTab] = useState<TabId>('planner')
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-[#EDE6DB] dark:bg-[#141210]">
        <div className="mx-auto flex min-h-screen w-full max-w-[448px] flex-col bg-[#F8F5F0] font-sans shadow-xl dark:bg-[#1C1917]">
          <TopNavbar showNewRecipe={tab === 'recipes'} />

          <main className="flex-1 overflow-y-auto">
            {tab === 'planner' && <PlannerScreen />}
            {tab === 'recipes' && <RecipesScreen />}
            {tab === 'pantry' && <PantryScreen />}
            {tab === 'grocery' && <GroceryScreen />}
            {tab === 'settings' && <SettingsScreen dark={dark} onToggleDark={setDark} />}
          </main>

          <BottomTabBar active={tab} onChange={setTab} />
        </div>
      </div>
    </div>
  )
}
