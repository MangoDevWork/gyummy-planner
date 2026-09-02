'use client'

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Lock,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { familyMembers } from '@/lib/gyummy-data'

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7A70] dark:text-[#9A8A7E]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ConfigureButton({ label = 'Configure' }: { label?: string }) {
  return (
    <button className="inline-flex items-center gap-0.5 rounded-lg bg-[#F5F0E8] px-2.5 py-1 text-[11px] font-semibold text-[#2D2640] dark:bg-[#201C18] dark:text-[#F0EDE8]">
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  )
}

export function SettingsScreen({
  dark,
  onToggleDark,
}: {
  dark: boolean
  onToggleDark: (v: boolean) => void
}) {
  return (
    <div className="space-y-4 px-4 pb-10 pt-4">
      {/* My Profile */}
      <SectionCard title="My Profile" action={<ConfigureButton label="Switch Member" />}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD13B] text-lg font-bold text-[#2D2640]">
            S
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">Sarah</p>
            <span className="mt-0.5 inline-block rounded-full bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E]">
              The Bennetts
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Family & Allergies */}
      <SectionCard
        title={`Family & Allergies (${familyMembers.length} members)`}
        action={<ConfigureButton />}
      >
        <div className="space-y-2">
          {familyMembers.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-xl bg-[#FAF7F2] px-3 py-2.5 dark:bg-[#201C18]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#2D2640] dark:bg-[#28231E] dark:text-[#F0EDE8]">
                  {m.initial}
                </span>
                <span className="text-[13.5px] font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
                  {m.name}
                </span>
                {m.you ? (
                  <span className="rounded-full bg-[#FFD13B] px-1.5 py-0.5 text-[10px] font-bold text-[#2D2640]">
                    You
                  </span>
                ) : null}
              </div>
              {m.allergyCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-[#E05050] dark:bg-rose-500/10">
                  <AlertTriangle className="h-3 w-3" />
                  {m.allergyCount} {m.allergyCount === 1 ? 'allergy' : 'allergies'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5EE] px-2 py-0.5 text-[11px] font-semibold text-[#4E9E72]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  No allergies
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            placeholder="Add family member..."
            className="flex-1 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] px-3 py-2 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:border-[#A0867A] focus:outline-none dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
          />
          <button className="flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-3 py-2 text-[12px] font-semibold text-[#2D2640]">
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            Add
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-[#EBF5EE] px-3 py-2.5 dark:from-amber-500/10 dark:to-[#4E9E72]/10">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#4E9E72]" />
          <p className="text-[12px] font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
            Family Safety Mode is on — allergens are filtered from recipes.
          </p>
        </div>
      </SectionCard>

      {/* Meal Schedules */}
      <SectionCard title="Meal Schedules" action={<ConfigureButton />}>
        <p className="text-[13px] text-[#8A7A70] dark:text-[#9A8A7E]">
          Choose which meal slots appear on your planner each day.
        </p>
      </SectionCard>

      {/* Family PIN & Cloud Sync */}
      <SectionCard title="Family PIN & Cloud Sync">
        <p className="mb-3 text-[13px] text-[#8A7A70] dark:text-[#9A8A7E]">
          Protect your family plan with a PIN and keep everything synced across devices.
        </p>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E8DDD5] bg-[#F5F0E8] py-2.5 text-[12.5px] font-semibold text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]">
            <Lock className="h-4 w-4" />
            Change PIN
          </button>
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] py-2.5 text-[12.5px] font-semibold text-[#2D2640]">
            <RefreshCw className="h-4 w-4" />
            Force Sync
          </button>
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard title="Language">
        <div className="flex rounded-full border border-[#EDE8DF] bg-[#FAF7F2] p-1 dark:border-[#3A332C] dark:bg-[#201C18]">
          {['EN', '中文'].map((lang, i) => (
            <button
              key={lang}
              className={`flex-1 rounded-full py-1.5 text-[12.5px] font-semibold transition-colors ${
                i === 0
                  ? 'bg-[#FFD13B] text-[#2D2640]'
                  : 'text-[#8A7A70] dark:text-[#9A8A7E]'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Display */}
      <SectionCard title="Display">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {dark ? (
              <Moon className="h-4 w-4 text-[#8A7A70] dark:text-[#9A8A7E]" />
            ) : (
              <Sun className="h-4 w-4 text-[#8A7A70]" />
            )}
            <span className="text-[13.5px] font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
              {dark ? 'Dark mode' : 'Light mode'}
            </span>
          </div>
          <button
            onClick={() => onToggleDark(!dark)}
            role="switch"
            aria-checked={dark}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              dark ? 'bg-[#FFD13B]' : 'bg-[#E0D6CB]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                dark ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account">
        <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-[13px] font-semibold text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10">
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </SectionCard>
    </div>
  )
}
