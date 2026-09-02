'use client'

import { useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, Clock, Minus, Plus } from 'lucide-react'
import { recipeDetail } from '@/lib/gyummy-data'

export function RecipeDetailModal({ onClose }: { onClose: () => void }) {
  const [servings, setServings] = useState(recipeDetail.servings)
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const toggle = (i: number) => setChecked((c) => ({ ...c, [i]: !c[i] }))

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[448px] flex-col bg-[#F8F5F0] dark:bg-[#1C1917]">
        {/* Hero */}
        <div className="relative flex h-56 shrink-0 items-center justify-center bg-gradient-to-b from-[#FDEAE3] to-[#FADFD3] dark:from-[#3A2A24] dark:to-[#2A1F1A]">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#2D2640] backdrop-blur dark:bg-[#28231E]/80 dark:text-[#F0EDE8]"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-7xl" aria-hidden="true">
            {recipeDetail.emoji}
          </span>
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-block rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#8A7A70] backdrop-blur dark:bg-[#28231E]/80 dark:text-[#9A8A7E]">
              {recipeDetail.cuisine}
            </span>
            <h2 className="mt-1.5 text-2xl font-bold text-[#2D2640] text-balance dark:text-[#F0EDE8]">
              {recipeDetail.name}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
          {/* Meta row */}
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#EDE8DF] bg-white px-4 py-3 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
            <div className="flex items-center gap-2 text-[#4A3F35] dark:text-[#F0EDE8]">
              <Clock className="h-4 w-4 text-[#9A8A7E]" />
              <span className="text-[13px] font-medium">{recipeDetail.prepMins} min</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-[#8A7A70] dark:text-[#9A8A7E]">
                Servings
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF7F2] text-[#4A3F35] dark:bg-[#201C18] dark:text-[#F0EDE8]"
                  aria-label="Fewer servings"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
                </button>
                <span className="w-5 text-center text-[14px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                  {servings}
                </span>
                <button
                  onClick={() => setServings((s) => s + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFD13B] text-[#2D2640]"
                  aria-label="More servings"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>

          {/* Allergen warning */}
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/25 dark:bg-rose-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#E05050]" />
            <div>
              <p className="text-[13px] font-semibold text-[#E05050]">Allergy warning</p>
              <p className="text-[12px] text-rose-600/80 dark:text-rose-300/80">
                Contains {recipeDetail.allergens.join(', ')} — Emma is allergic to dairy.
              </p>
            </div>
          </div>

          {/* Ingredients */}
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
            Ingredients
          </h3>
          <div className="mb-6 space-y-1.5">
            {recipeDetail.ingredients.map((ing, i) => (
              <button
                key={ing}
                onClick={() => toggle(i)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#EDE8DF] bg-white px-3 py-2.5 text-left dark:border-[#3A332C] dark:bg-[#28231E]"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                    checked[i]
                      ? 'border-[#4E9E72] bg-[#EBF5EE]'
                      : 'border-[#D8CCC0] bg-transparent'
                  }`}
                >
                  {checked[i] ? (
                    <Check className="h-3.5 w-3.5 text-[#4E9E72]" strokeWidth={3} />
                  ) : null}
                </span>
                <span
                  className={`text-[13.5px] ${
                    checked[i]
                      ? 'text-[#B8AFA4] line-through'
                      : 'text-[#4A3F35] dark:text-[#F0EDE8]'
                  }`}
                >
                  {ing}
                </span>
              </button>
            ))}
          </div>

          {/* Steps */}
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
            Instructions
          </h3>
          <ol className="space-y-3">
            {recipeDetail.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFD13B] text-[13px] font-bold text-[#2D2640]">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-[13.5px] leading-relaxed text-[#4A3F35] dark:text-[#F0EDE8]">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
