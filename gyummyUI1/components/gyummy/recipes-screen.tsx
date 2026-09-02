'use client'

import { useState } from 'react'
import {
  CalendarPlus,
  ChevronDown,
  Clock,
  Heart,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { cookbook, library, type Recipe } from '@/lib/gyummy-data'
import { RecipeDetailModal } from '@/components/gyummy/recipe-detail-modal'

type Scope = 'cookbook' | 'library'

function CookbookCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="relative flex flex-col items-start gap-2 rounded-2xl border border-[#EDE8DF] bg-white p-3 text-left shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]"
    >
      <span
        className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full ${
          recipe.favorite ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-[#FAF7F2] dark:bg-[#201C18]'
        }`}
      >
        <Heart
          className={`h-3.5 w-3.5 ${recipe.favorite ? 'fill-[#E05050] text-[#E05050]' : 'text-[#C4B0A5]'}`}
        />
      </span>
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FAF7F2] text-3xl dark:bg-[#201C18]" aria-hidden="true">
        {recipe.emoji}
      </span>
      <div>
        <p className="text-[14px] font-semibold leading-tight text-[#2D2640] text-pretty dark:text-[#F0EDE8]">
          {recipe.name}
        </p>
        <p className="mt-1 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
          {recipe.cuisine} • {recipe.prepMins} min
        </p>
      </div>
    </button>
  )
}

function LibraryCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <div className="rounded-2xl border border-[#EDE8DF] bg-white p-3 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
      <div className="flex gap-3">
        <button
          onClick={onOpen}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FAF7F2] text-4xl dark:bg-[#201C18]"
          aria-label={`Open ${recipe.name}`}
        >
          {recipe.emoji}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold leading-tight text-[#2D2640] text-pretty dark:text-[#F0EDE8]">
              {recipe.name}
            </p>
            {recipe.hasAllergen ? (
              <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-[#E05050] dark:bg-rose-500/10">
                Allergen
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">{recipe.cuisine}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.prepMins} min
            </span>
            <span>{recipe.ingredients} ingredients</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#E8DDD5] bg-[#F5F0E8] py-2 text-[12px] font-semibold text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
          Cookbook
        </button>
        <button className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] py-2 text-[12px] font-semibold text-[#2D2640]">
          <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
          Plan
        </button>
      </div>
    </div>
  )
}

export function RecipesScreen() {
  const [scope, setScope] = useState<Scope>('cookbook')
  const [detailOpen, setDetailOpen] = useState(false)
  const [safeOnly, setSafeOnly] = useState(true)

  return (
    <>
      <div className="px-4 pb-8 pt-4">
        {/* Scope switcher */}
        <div className="mb-4 flex rounded-full border border-[#EDE8DF] bg-white p-1 dark:border-[#3A332C] dark:bg-[#28231E]">
          {(
            [
              { id: 'cookbook', label: 'Family Cookbook' },
              { id: 'library', label: 'Recipe Library' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`flex-1 rounded-full py-2 text-[12.5px] font-semibold transition-colors ${
                scope === s.id
                  ? 'bg-[#FFD13B] text-[#2D2640]'
                  : 'text-[#8A7A70] dark:text-[#9A8A7E]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {scope === 'cookbook' ? (
          <>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
              {cookbook.length} saved recipes
            </p>
            <div className="grid grid-cols-2 gap-3">
              {cookbook.map((r) => (
                <CookbookCard key={r.id} recipe={r} onOpen={() => setDetailOpen(true)} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B0A5]" />
              <input
                placeholder="Search 3,000+ recipes..."
                className="w-full rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] py-2.5 pl-9 pr-3 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:border-[#A0867A] focus:outline-none dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
              />
            </div>

            {/* Filter row */}
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setSafeOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  safeOnly
                    ? 'border-[#4E9E72]/30 bg-[#EBF5EE] text-[#4E9E72]'
                    : 'border-[#E8DDD5] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Safe for family
              </button>
              <button className="inline-flex items-center gap-1 rounded-full border border-[#E8DDD5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]">
                Cuisine
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button className="inline-flex items-center gap-1 rounded-full border border-[#E8DDD5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] dark:text-[#9A8A7E]">
                Sort
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {library.map((r) => (
                <LibraryCard key={r.id} recipe={r} onOpen={() => setDetailOpen(true)} />
              ))}
            </div>
          </>
        )}
      </div>

      {detailOpen ? <RecipeDetailModal onClose={() => setDetailOpen(false)} /> : null}
    </>
  )
}
