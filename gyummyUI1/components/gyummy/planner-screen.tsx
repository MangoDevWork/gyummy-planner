'use client'

import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Share2,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react'
import { MEAL_SLOTS, weekPlan, type DayPlan } from '@/lib/gyummy-data'

function ToolbarButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EDE8DF] bg-white text-[#9A8A7E] transition-colors hover:text-[#2D2640] dark:border-[#3A332C] dark:bg-[#28231E] dark:hover:text-[#F0EDE8]">
      {children}
    </button>
  )
}

function DayCard({ day }: { day: DayPlan }) {
  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm dark:bg-[#28231E] ${
        day.isToday
          ? 'border-l-4 border-l-[#FFD13B] border-y-[#EDE8DF] border-r-[#EDE8DF] dark:border-y-[#3A332C] dark:border-r-[#3A332C]'
          : 'border-[#EDE8DF] dark:border-[#3A332C]'
      }`}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
            {day.label}
          </span>
          <span className="text-[12px] text-[#8A7A70] dark:text-[#9A8A7E]">{day.date}</span>
        </div>
        {day.isToday ? (
          <span className="rounded-full bg-[#FFD13B] px-2 py-0.5 text-[10px] font-bold text-[#2D2640]">
            Today
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 px-3 pb-3">
        {MEAL_SLOTS.map((slot) => {
          const meal = day.meals[slot]
          if (meal) {
            return (
              <div
                key={slot}
                className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] px-3 py-2.5 dark:bg-[#201C18]"
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {meal.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8AFA4]">
                    {slot}
                  </p>
                  <p className="truncate text-[13.5px] font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
                    {meal.name}
                  </p>
                </div>
              </div>
            )
          }
          return (
            <button
              key={slot}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#E0D6CB] px-3 py-2.5 text-left transition-colors hover:border-[#FFD13B] dark:border-[#3A332C]"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C4B0A5]">
                  {slot}
                </p>
                <p className="text-[13px] text-[#C4B0A5]">What&apos;s for {slot.toLowerCase()}?</p>
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-[#F5F0E8] px-2 py-1 text-[11px] font-semibold text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E]">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                Add
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PlannerScreen() {
  return (
    <div className="relative">
      <div className="px-4 pb-32 pt-4">
        {/* Week header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
                This Week
              </p>
              <p className="text-[14px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                1 – 7 Sep
              </p>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button className="rounded-full bg-[#FFD13B] px-3 py-1.5 text-[11px] font-bold text-[#2D2640]">
            Today
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <ToolbarButton>
            <Share2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton>
            <Copy className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton>
            <SlidersHorizontal className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Days */}
        <div className="space-y-3">
          {weekPlan.map((day) => (
            <DayCard key={day.id} day={day} />
          ))}
        </div>
      </div>

      {/* Floating action bar */}
      <div className="pointer-events-none sticky bottom-3 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-2xl border border-[#2D2640]/10 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-[#3A332C] dark:bg-[#28231E]/95">
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-[#2D2640] dark:text-[#F0EDE8]">
              14 meals planned
            </p>
            <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">23 ingredients needed</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-4 py-2.5 text-[13px] font-semibold text-[#2D2640] transition-transform active:scale-95">
            <ShoppingCart className="h-4 w-4" strokeWidth={2.4} />
            Grocery List
          </button>
        </div>
      </div>
    </div>
  )
}
