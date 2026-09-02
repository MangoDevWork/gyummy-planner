'use client'

import { useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { pantry } from '@/lib/gyummy-data'

type Toggles = Record<string, boolean>

export function PantryScreen() {
  const initial: Toggles = {}
  pantry.forEach((g) => g.items.forEach((it) => (initial[it.name] = it.inPantry)))
  const [state, setState] = useState<Toggles>(initial)

  const toggle = (name: string) => setState((s) => ({ ...s, [name]: !s[name] }))
  const stockedCount = Object.values(state).filter(Boolean).length
  const total = Object.keys(state).length

  return (
    <div className="relative">
      <div className="px-4 pb-28 pt-4">
        {/* Summary */}
        <div className="mb-4 rounded-2xl border border-[#EDE8DF] bg-white px-4 py-3 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
            Your Pantry
          </p>
          <p className="mt-1 text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
            {stockedCount} of {total} ingredients in stock
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B0A5]" />
          <input
            placeholder="Search pantry items..."
            className="w-full rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] py-2.5 pl-9 pr-3 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:border-[#A0867A] focus:outline-none dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
          />
        </div>

        {/* Groups */}
        <div className="space-y-5">
          {pantry.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#8A7A70] dark:text-[#9A8A7E]">
                {group.category}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-[#EDE8DF] bg-white shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
                {group.items.map((item, idx) => {
                  const on = state[item.name]
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggle(item.name)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                        idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3A332C]' : ''
                      } ${on ? 'bg-[#EBF5EE]/60 dark:bg-[#4E9E72]/10' : ''}`}
                    >
                      <span
                        className={`text-[13.5px] font-medium ${
                          on ? 'text-[#4E9E72]' : 'text-[#4A3F35] dark:text-[#F0EDE8]'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                          on
                            ? 'border-[#4E9E72] bg-[#4E9E72]'
                            : 'border-[#D8CCC0] bg-transparent'
                        }`}
                      >
                        {on ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Quick-add bar */}
      <div className="sticky bottom-3 z-20 px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-[#2D2640]/10 bg-white/95 p-2 shadow-lg backdrop-blur-md dark:border-[#3A332C] dark:bg-[#28231E]/95">
          <input
            placeholder="Add a pantry item..."
            className="flex-1 rounded-xl bg-[#FAF7F2] px-3 py-2.5 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:outline-none dark:bg-[#201C18] dark:text-[#F0EDE8]"
          />
          <button className="flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-4 py-2.5 text-[13px] font-semibold text-[#2D2640] transition-transform active:scale-95">
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
