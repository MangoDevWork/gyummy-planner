'use client'

import { useMemo, useState } from 'react'
import { Check, Home, Sparkles } from 'lucide-react'
import { grocery } from '@/lib/gyummy-data'

type Filter = 'buy' | 'cart' | 'all'

export function GroceryScreen() {
  const [filter, setFilter] = useState<Filter>('buy')
  const flat = useMemo(
    () => grocery.flatMap((g) => g.items.map((it) => ({ ...it, category: g.category }))),
    [],
  )
  const [cart, setCart] = useState<Record<string, boolean>>(
    Object.fromEntries(flat.map((i) => [i.name, i.inCart])),
  )

  const toggle = (name: string) => setCart((c) => ({ ...c, [name]: !c[name] }))
  const total = flat.length
  const inCart = Object.values(cart).filter(Boolean).length
  const pct = Math.round((inCart / total) * 100)

  const filtered = grocery
    .map((group) => ({
      ...group,
      items: group.items.filter((it) => {
        if (filter === 'buy') return !cart[it.name]
        if (filter === 'cart') return cart[it.name]
        return true
      }),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="relative">
      <div className="px-4 pb-28 pt-4">
        {/* Week selector + generate */}
        <div className="mb-4 rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
                Generating for
              </p>
              <p className="text-[14px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                Week of 1 – 7 Sep
              </p>
            </div>
            <span className="rounded-full bg-[#FAF7F2] px-2.5 py-1 text-[11px] font-medium text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E]">
              14 meals
            </span>
          </div>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] py-3 text-[13.5px] font-semibold text-[#2D2640] transition-transform active:scale-95">
            <Sparkles className="h-4 w-4" strokeWidth={2.4} />
            Generate Grocery List
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
              {inCart} of {total} items in cart
            </span>
            <span className="font-semibold text-[#8A7A70] dark:text-[#9A8A7E]">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EDE6DB] dark:bg-[#201C18]">
            <div
              className="h-full rounded-full bg-[#FFD13B] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex rounded-full border border-[#EDE8DF] bg-white p-1 dark:border-[#3A332C] dark:bg-[#28231E]">
          {(
            [
              { id: 'buy', label: 'To Buy' },
              { id: 'cart', label: 'In Cart' },
              { id: 'all', label: 'All' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex-1 rounded-full py-1.5 text-[12.5px] font-semibold transition-colors ${
                filter === t.id
                  ? 'bg-[#FFD13B] text-[#2D2640]'
                  : 'text-[#8A7A70] dark:text-[#9A8A7E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Groups */}
        <div className="space-y-5">
          {filtered.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#8A7A70] dark:text-[#9A8A7E]">
                {group.category}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-[#EDE8DF] bg-white shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
                {group.items.map((item, idx) => {
                  const done = cart[item.name]
                  return (
                    <div
                      key={item.name}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        idx !== 0 ? 'border-t border-[#EDE8DF] dark:border-[#3A332C]' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggle(item.name)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          done ? 'border-[#FFD13B] bg-[#FFD13B]' : 'border-[#D8CCC0]'
                        }`}
                        aria-label={done ? 'Uncheck' : 'Check off'}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5 text-[#2D2640]" strokeWidth={3} />
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[13.5px] font-medium ${
                            done
                              ? 'text-[#B8AFA4] line-through'
                              : 'text-[#4A3F35] dark:text-[#F0EDE8]'
                          }`}
                        >
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">{item.qty}</p>
                      </div>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          item.inPantry
                            ? 'bg-[#EBF5EE] text-[#4E9E72]'
                            : 'bg-[#FAF7F2] text-[#C4B0A5] dark:bg-[#201C18]'
                        }`}
                        title={item.inPantry ? 'Already in pantry' : 'Not in pantry'}
                      >
                        <Home className="h-4 w-4" />
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#8A7A70] dark:text-[#9A8A7E]">
              Nothing here yet.
            </p>
          ) : null}
        </div>
      </div>

      {/* Done shopping */}
      <div className="sticky bottom-3 z-20 px-4">
        <button className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#2D2640]/10 bg-[#FFD13B] py-3.5 text-[14px] font-semibold text-[#2D2640] shadow-lg transition-transform active:scale-95">
          <Check className="h-4 w-4" strokeWidth={2.6} />
          Done Shopping
        </button>
      </div>
    </div>
  )
}
