'use client'

import { Check, Plus } from 'lucide-react'

export function TopNavbar({ showNewRecipe }: { showNewRecipe?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#EDE8DF]/80 bg-white/90 backdrop-blur-md dark:border-[#3A332C]/80 dark:bg-[#28231E]/90">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFD13B] text-sm font-bold text-[#2D2640]">
            S
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">Gyummy</p>
            <p className="mt-0.5 inline-flex rounded-full bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E]">
              The Bennetts • Sarah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showNewRecipe ? (
            <button className="inline-flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-3 py-2 text-[12px] font-semibold text-[#2D2640] transition-transform active:scale-95">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New Recipe
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Synced
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
