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
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#EDE8DF] bg-white text-[#786F66] transition-colors hover:text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#2A2520] dark:text-[#A39C90] dark:hover:text-[#F5F2EB] cursor-pointer shadow-2xs"
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
      <div className="px-4 pb-44 pt-3 max-w-md mx-auto space-y-3">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1E1B2E] dark:bg-[#F5F2EB] text-white dark:text-[#1E1B2E] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#1E1B2E]" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Minimal Toolbar Row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
              {language === 'zh-CN' ? '周食谱排餐' : 'Weekly Plan'}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#2A2520] text-[#786F66] dark:text-[#A39C90] border border-[#EDE8DF] dark:border-[#3D362E]">
              {weekRangeLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ToolbarButton onClick={handleShareMealPlan} title="Share week as message">
              <Share2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setIsWeekCopyOpen(true)} title="Copy week schedule">
              <Copy className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setIsScheduleSettingsOpen(true)} title="Configure meal slots">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
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
                className={`rounded-2xl border bg-white shadow-xs dark:bg-[#2A2520] transition-all ${
                  day.isToday
                    ? 'border-l-4 border-l-[#FFD13B] border-y-[#EDE8DF] border-r-[#EDE8DF] dark:border-y-[#3D362E] dark:border-r-[#3D362E] ring-1 ring-[#FFD13B]/30'
                    : 'border-[#EDE8DF] dark:border-[#3D362E]'
                }`}
              >
                {/* Day Header Row */}
                <div className="flex items-center justify-between px-4 pb-2 pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                      {day.dayOfWeek}
                    </span>
                    <span className="text-[12px] font-medium text-[#786F66] dark:text-[#A39C90]">
                      {formatDate(day.dateStr, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {day.isToday && (
                      <span className="rounded-full bg-[#FFD13B] px-2.5 py-0.5 text-[10px] font-extrabold text-[#1E1B2E] shadow-2xs">
                        {t('common.today')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddManualScheduleToDay(day.dateStr)}
                      className="p-1 text-[#A89F95] hover:text-[#1E1B2E] dark:hover:text-[#F5F2EB] rounded-lg transition cursor-pointer"
                      title={t('planner.addSchedule')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Slots Stack */}
                <div className="space-y-2 px-3 pb-3">
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
                          className="rounded-xl bg-[#FAF8F5] p-2.5 dark:bg-[#221E1A] cursor-pointer hover:bg-[#F5F3EF] dark:hover:bg-[#28231E] transition-colors border border-[#F0ECE1] dark:border-[#383129] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A89F95] dark:text-[#786F66]">
                              {displayScheduleName}
                            </span>
                            <span className="text-[10px] text-[#786F66] dark:text-[#A39C90] font-medium">
                              {entryDishes.length > 0 ? `${entryDishes.length} ${language === 'zh-CN' ? '道菜' : 'dishes'}` : ''}
                            </span>
                          </div>

                          {/* All planned dishes displayed cleanly */}
                          {entryDishes.length > 0 ? (
                            <div className="space-y-1">
                              {entryDishes.map((dish) => {
                                const loc = getLocalizedDish(dish, language);
                                return (
                                  <div key={dish.id} className="flex items-center gap-2 min-w-0">
                                    {dish.imageUrl ? (
                                      <img
                                        src={dish.imageUrl}
                                        alt={dish.name}
                                        className="w-6 h-6 rounded-md object-cover shrink-0 border border-[#EDE8DF] dark:border-[#3D362E]"
                                      />
                                    ) : (
                                      <span className="w-6 h-6 rounded-md bg-white dark:bg-[#2A2520] flex items-center justify-center text-xs shrink-0 border border-[#EDE8DF] dark:border-[#3D362E]">
                                        {dish.imageEmoji || '🍲'}
                                      </span>
                                    )}
                                    <span className="text-[13px] font-semibold text-[#1E1B2E] dark:text-[#F5F2EB] truncate">
                                      {loc.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {entry?.customText && (
                            <p className="text-xs text-[#786F66] dark:text-[#A39C90] italic truncate">
                              📝 {entry.customText}
                            </p>
                          )}
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
                        className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#E0D8CB] dark:border-[#3D362E] px-3 py-2 text-left transition-colors hover:border-[#FFD13B] cursor-pointer bg-white/60 dark:bg-[#2A2520]/40"
                      >
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A89F95]">
                            {displayScheduleName}
                          </p>
                          <p className="text-[12.5px] text-[#A89F95]">
                            {language === 'zh-CN' ? `添加${displayScheduleName}菜谱...` : `What's for ${displayScheduleName.toLowerCase()}?`}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 rounded-lg bg-[#FAF8F5] dark:bg-[#221E1A] px-2 py-1 text-[11px] font-semibold text-[#786F66] dark:text-[#A39C90] border border-[#EDE8DF] dark:border-[#3D362E]">
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

      {/* ─── Integrated Bottom Navigation & Summary Bar (Thumb-Friendly) ─── */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="rounded-2xl border border-[#EDE8DF] bg-white/95 p-2.5 shadow-xl backdrop-blur-md dark:border-[#3D362E] dark:bg-[#2A2520]/95 space-y-2">
            
            {/* Top Row: Week Navigator + Today Shortcut */}
            <div className="flex items-center justify-between gap-1.5 px-1 pb-1 border-b border-[#F0ECE1] dark:border-[#383129]">
              <button
                type="button"
                onClick={handlePrevPeriod}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EDE8DF] bg-[#FAF8F5] text-[#786F66] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#A39C90] cursor-pointer hover:bg-white"
                title="Previous Week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-center flex items-center gap-1.5">
                <span className="text-[12.5px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                  {weekRangeLabel}
                </span>
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="rounded-full bg-[#FFD13B] px-2 py-0.5 text-[10px] font-extrabold text-[#1E1B2E] transition-transform active:scale-95 cursor-pointer shadow-2xs"
                >
                  {t('common.today')}
                </button>
              </div>

              <button
                type="button"
                onClick={handleNextPeriod}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EDE8DF] bg-[#FAF8F5] text-[#786F66] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#A39C90] cursor-pointer hover:bg-white"
                title="Next Week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Bottom Row: Meals Planned Count + Grocery Shortcut */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="leading-tight">
                <p className="text-[12.5px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                  {totalMealsPlannedThisWeek} {language === 'zh-CN' ? '餐已排定' : 'meals planned'}
                </p>
                <p className="text-[10.5px] text-[#786F66] dark:text-[#A39C90]">
                  {language === 'zh-CN' ? '点击右侧快速生成采购' : 'Ready to generate groceries'}
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => onGoToGrocery(weekStartISO, weekEndISO)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1E1B2E]/10 bg-[#FFD13B] px-3.5 py-2 text-[12.5px] font-bold text-[#1E1B2E] transition-transform active:scale-95 cursor-pointer shadow-xs"
              >
                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.4} />
                <span>{language === 'zh-CN' ? '采购清单' : 'Grocery List'}</span>
              </button>
            </div>

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
