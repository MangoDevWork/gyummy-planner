import React, { useState, useMemo } from 'react';
import type { Dish, MealPlan, MealScheduleConfig, MealScheduleEntry, UserProfile, MemberPreferences, FamilyPersonalisation } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Copy,
  SlidersHorizontal,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { MealScheduleModal } from './MealScheduleModal';
import { WeekCopyModal } from './WeekCopyModal';
import { MealScheduleSettingsModal } from '../settings/MealScheduleSettingsModal';
import { copyMealPlanAsMessage } from '../../services/zipExportService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish } from '../../services/dataLocalizationService';

interface PlannerViewProps {
  currentProfile?: UserProfile | null;
  familyMembers?: string[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
  dishes: Dish[];
  mealPlan: MealPlan;
  mealSchedules: MealScheduleConfig[];
  onUpdateMealPlan: (date: string, scheduleId: string, entry: MealScheduleEntry | null) => void;
  onBatchUpdateMealPlan: (updatedPlan: MealPlan) => void;
  onSaveMealSchedules: (schedules: MealScheduleConfig[]) => void;
  onOpenDishCreator: () => void;
  onToggleFamilyRecipe?: (dishId: string) => void;
  onToggleFavoriteDish?: (dishId: string) => void;
  onGoToGrocery: (startDate: string, endDate: string) => void;
}

function ToolbarButton({
  children,
  onClick,
  title
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EDE8DF] bg-white text-[#9A8A7E] transition-colors hover:text-[#2D2640] dark:border-[#3A332C] dark:bg-[#28231E] dark:hover:text-[#F0EDE8] cursor-pointer"
    >
      {children}
    </button>
  );
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  currentProfile,
  familyMembers,
  memberProfiles,
  familyPersonalisation,
  dishes,
  mealPlan,
  mealSchedules,
  onUpdateMealPlan,
  onBatchUpdateMealPlan,
  onSaveMealSchedules,
  onOpenDishCreator,
  onToggleFamilyRecipe,
  onToggleFavoriteDish,
  onGoToGrocery
}) => {
  const { language, t, formatScheduleName, formatDayOfWeek, formatDate } = useLanguage();
  const [currentBaseDate, setCurrentBaseDate] = useState<Date>(new Date());
  
  // Modals
  const [selectedModalSchedule, setSelectedModalSchedule] = useState<{
    date: string;
    scheduleId: string;
    scheduleName: string;
    entry?: MealScheduleEntry;
  } | null>(null);

  const [isWeekCopyOpen, setIsWeekCopyOpen] = useState(false);
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Manual per-day extra schedules added
  const [customDaySchedules, setCustomDaySchedules] = useState<Record<string, string[]>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Map for fast dish lookup
  const dishMap = useMemo(() => {
    const map = new Map<string, Dish>();
    dishes.forEach((d) => map.set(d.id, d));
    return map;
  }, [dishes]);

  // Helper for date formatting
  const formatDateISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatDateISO(new Date());

  // Week generator: Get 7 days for the currentBaseDate (Mon to Sun)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(currentBaseDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7; // Monday as first day

    const monday = new Date(curr);
    monday.setDate(curr.getDate() - distanceToMonday);

    const days: Array<{
      dateStr: string;
      dateObj: Date;
      dayOfWeek: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = formatDateISO(d);
      days.push({
        dateStr: iso,
        dateObj: d,
        dayOfWeek: formatDayOfWeek(iso),
        dayName: formatDayOfWeek(iso),
        dayNumber: d.getDate(),
        isToday: iso === todayISO
      });
    }

    return days;
  }, [currentBaseDate, todayISO, formatDayOfWeek]);

  const weekStartISO = currentWeekDays.length > 0 ? currentWeekDays[0].dateStr : '';
  const weekEndISO = currentWeekDays.length > 0 ? currentWeekDays[6].dateStr : '';

  // Formatted week header range label (e.g. "1 – 7 Sep")
  const weekRangeLabel = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0].dateObj;
    const end = currentWeekDays[6].dateObj;
    const sMonth = start.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short' });
    const eMonth = end.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short' });

    if (sMonth === eMonth) {
      return `${start.getDate()} – ${end.getDate()} ${sMonth}`;
    }
    return `${start.getDate()} ${sMonth} – ${end.getDate()} ${eMonth}`;
  }, [currentWeekDays, language]);

  // Week navigation
  const handlePrevPeriod = () => {
    const d = new Date(currentBaseDate);
    d.setDate(d.getDate() - 7);
    setCurrentBaseDate(d);
  };

  const handleNextPeriod = () => {
    const d = new Date(currentBaseDate);
    d.setDate(d.getDate() + 7);
    setCurrentBaseDate(d);
  };

  const handleJumpToday = () => {
    setCurrentBaseDate(new Date());
  };

  // Add extra schedule slot
  const handleAddManualScheduleToDay = (dateStr: string) => {
    const extraName = window.prompt(language === 'zh-CN' ? '输入加餐段名称 (如: 下午茶、加餐):' : 'Enter extra meal schedule name:');
    if (!extraName || !extraName.trim()) return;

    const extraId = `extra_${Date.now()}`;
    setCustomDaySchedules((prev) => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), extraId]
    }));

    setSelectedModalSchedule({
      date: dateStr,
      scheduleId: extraId,
      scheduleName: extraName.trim()
    });
  };

  // Share weekly plan
  const handleShareMealPlan = async () => {
    const days = currentWeekDays.map((d) => ({
      dateStr: d.dateStr,
      dayName: d.dayName,
      isToday: d.isToday
    }));
    const res = await copyMealPlanAsMessage(mealPlan, dishes, days, weekRangeLabel, language);
    if (res.success) {
      showToast(language === 'zh-CN' ? '📋 已复制本周餐饮计划到剪贴板！' : '📋 Copied weekly meal plan to clipboard!');
    } else {
      showToast(`⚠️ ${res.text}`);
    }
  };

  // Count total planned meals this week
  const totalMealsPlannedThisWeek = useMemo(() => {
    let count = 0;
    currentWeekDays.forEach((day) => {
      const dayPlan = mealPlan[day.dateStr];
      if (dayPlan) {
        Object.values(dayPlan).forEach((slot) => {
          if ((slot?.dishIds && slot.dishIds.length > 0) || slot?.dishId || slot?.customText) count++;
        });
      }
    });
    return count;
  }, [currentWeekDays, mealPlan]);

  return (
    <div className="relative">
      <div className="px-4 pb-32 pt-4 max-w-md mx-auto">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#2D2640]" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Week Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center min-w-[120px]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B8AFA4]">
                {language === 'zh-CN' ? '当前排餐' : 'This Week'}
              </p>
              <p className="text-[14px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                {weekRangeLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextPeriod}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDE8DF] bg-white text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#28231E] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleJumpToday}
            className="rounded-full bg-[#FFD13B] px-3 py-1.5 text-[11px] font-bold text-[#2D2640] transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            {t('common.today')}
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <ToolbarButton onClick={handleShareMealPlan} title="Share week as message">
            <Share2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setIsWeekCopyOpen(true)} title="Copy week schedule">
            <Copy className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setIsScheduleSettingsOpen(true)} title="Configure meal slots">
            <SlidersHorizontal className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Day Cards Stack */}
        <div className="space-y-3">
          {currentWeekDays.map((day) => {
            const dayPlan = mealPlan[day.dateStr] || {};
            const dayNum = day.dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            // Applicable meal schedules for this day
            const applicableDefaultSchedules = mealSchedules.filter((s) => {
              if (!s.defaultEnabled) return false;
              if (!s.applicableDays || s.applicableDays.length === 0) return true;
              return s.applicableDays.includes(dayNum);
            });

            const extraManualIds = customDaySchedules[day.dateStr] || [];
            const allScheduleIds = Array.from(
              new Set([
                ...applicableDefaultSchedules.map((s) => s.id),
                ...Object.keys(dayPlan),
                ...extraManualIds
              ])
            );

            return (
              <div
                key={day.dateStr}
                className={`rounded-2xl border bg-white shadow-sm dark:bg-[#28231E] ${
                  day.isToday
                    ? 'border-l-4 border-l-[#FFD13B] border-y-[#EDE8DF] border-r-[#EDE8DF] dark:border-y-[#3A332C] dark:border-r-[#3A332C]'
                    : 'border-[#EDE8DF] dark:border-[#3A332C]'
                }`}
              >
                {/* Day Header Row */}
                <div className="flex items-center justify-between px-4 pb-2 pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                      {day.dayOfWeek}
                    </span>
                    <span className="text-[12px] text-[#8A7A70] dark:text-[#9A8A7E]">
                      {formatDate(day.dateStr, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {day.isToday && (
                      <span className="rounded-full bg-[#FFD13B] px-2 py-0.5 text-[10px] font-bold text-[#2D2640]">
                        {t('common.today')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddManualScheduleToDay(day.dateStr)}
                      className="p-1 text-[#C4B0A5] hover:text-[#2D2640] rounded-lg transition cursor-pointer"
                      title={t('planner.addSchedule')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Slots Stack */}
                <div className="space-y-1.5 px-3 pb-3">
                  {allScheduleIds.map((scheduleId) => {
                    const configuredSchedule = mealSchedules.find((s) => s.id === scheduleId);
                    const scheduleLabel = configuredSchedule?.name || scheduleId.replace('extra_', 'Extra ').replace('schedule_', '');
                    const displayScheduleName = formatScheduleName(scheduleLabel);
                    const entry = dayPlan[scheduleId];

                    const entryDishIds = entry?.dishIds && entry.dishIds.length > 0
                      ? entry.dishIds
                      : (entry?.dishId ? [entry.dishId] : []);
                    const entryDishes = entryDishIds.map((id) => dishMap.get(id)).filter(Boolean) as Dish[];
                    const hasPlan = Boolean(entryDishes.length > 0 || entry?.customText);

                    if (hasPlan) {
                      const firstDish = entryDishes[0];
                      const localizedFirst = firstDish ? getLocalizedDish(firstDish, language) : null;
                      const title = localizedFirst ? localizedFirst.name : (entry?.customText || 'Planned Meal');
                      const emoji = firstDish?.imageEmoji || '🍲';
                      const extraCount = entryDishes.length > 1 ? entryDishes.length - 1 : 0;

                      return (
                        <div
                          key={scheduleId}
                          onClick={() =>
                            setSelectedModalSchedule({
                              date: day.dateStr,
                              scheduleId,
                              scheduleName: displayScheduleName,
                              entry
                            })
                          }
                          className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] px-3 py-2.5 dark:bg-[#201C18] cursor-pointer hover:bg-[#F5F0E8] dark:hover:bg-[#2A2420] transition-colors"
                        >
                          <span className="text-lg leading-none" aria-hidden="true">
                            {emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8AFA4]">
                              {displayScheduleName}
                            </p>
                            <p className="truncate text-[13.5px] font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
                              {title}
                              {extraCount > 0 && (
                                <span className="ml-1 text-[11px] text-[#8A7A70] font-normal">
                                  +{extraCount}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={scheduleId}
                        type="button"
                        onClick={() =>
                          setSelectedModalSchedule({
                            date: day.dateStr,
                            scheduleId,
                            scheduleName: displayScheduleName,
                            entry
                          })
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#E0D6CB] px-3 py-2.5 text-left transition-colors hover:border-[#FFD13B] dark:border-[#3A332C] cursor-pointer"
                      >
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C4B0A5]">
                            {displayScheduleName}
                          </p>
                          <p className="text-[13px] text-[#C4B0A5]">
                            {language === 'zh-CN' ? `今天${displayScheduleName}吃什么？` : `What's for ${displayScheduleName.toLowerCase()}?`}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 rounded-lg bg-[#F5F0E8] px-2 py-1 text-[11px] font-semibold text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E]">
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                          <span>{language === 'zh-CN' ? '排餐' : 'Add'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Bar Sticky at Bottom */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#2D2640]/10 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-[#3A332C] dark:bg-[#28231E]/95">
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-[#2D2640] dark:text-[#F0EDE8]">
                {totalMealsPlannedThisWeek} {language === 'zh-CN' ? '餐已排定' : 'meals planned'}
              </p>
              <p className="text-[11px] text-[#8A7A70] dark:text-[#9A8A7E]">
                {weekRangeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToGrocery(weekStartISO, weekEndISO)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-4 py-2.5 text-[13px] font-semibold text-[#2D2640] transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2.4} />
              <span>{language === 'zh-CN' ? '采购清单' : 'Grocery List'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meal Selection / Custom Note Schedule Modal */}
      {selectedModalSchedule && (
        <MealScheduleModal
          isOpen={Boolean(selectedModalSchedule)}
          onClose={() => setSelectedModalSchedule(null)}
          date={selectedModalSchedule.date}
          scheduleId={selectedModalSchedule.scheduleId}
          scheduleName={selectedModalSchedule.scheduleName}
          currentEntry={selectedModalSchedule.entry}
          dishes={dishes}
          familyMembers={familyMembers}
          memberProfiles={memberProfiles}
          familyPersonalisation={familyPersonalisation}
          currentProfile={currentProfile}
          onSaveEntry={(date, schedId, entry) => {
            onUpdateMealPlan(date, schedId, entry);
            setSelectedModalSchedule(null);
            showToast('✅ Saved meal plan');
          }}
          onCreateNewDish={onOpenDishCreator}
          onToggleFamilyRecipe={onToggleFamilyRecipe}
          onToggleFavoriteDish={onToggleFavoriteDish}
        />
      )}

      {/* Week Copy Modal */}
      <WeekCopyModal
        isOpen={isWeekCopyOpen}
        onClose={() => setIsWeekCopyOpen(false)}
        currentWeekStartISO={weekStartISO}
        mealPlan={mealPlan}
        onApplyCopy={(updated) => {
          onBatchUpdateMealPlan(updated);
          setIsWeekCopyOpen(false);
          showToast('📋 Copied weekly schedule!');
        }}
      />

      {/* Meal Schedule Settings Modal */}
      <MealScheduleSettingsModal
        isOpen={isScheduleSettingsOpen}
        onClose={() => setIsScheduleSettingsOpen(false)}
        mealSchedules={mealSchedules}
        onSaveMealSchedules={onSaveMealSchedules}
      />
    </div>
  );
};
