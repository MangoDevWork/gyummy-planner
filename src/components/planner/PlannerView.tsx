import React, { useState, useMemo } from 'react';
import type { Dish, MealPlan, MealScheduleConfig, MealScheduleEntry, UserProfile, MemberPreferences, FamilyPersonalisation } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Copy,
  Sliders,
  CheckCircle2,
  Move,
  Sparkles,
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

  // Drag & Drop Rescheduling state
  const [draggedMeal, setDraggedMeal] = useState<{
    fromDate: string;
    fromScheduleId: string;
    entry: MealScheduleEntry;
  } | null>(null);

  const [dragOverTarget, setDragOverTarget] = useState<{
    toDate: string;
    toScheduleId: string;
  } | null>(null);

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

  // Week generator: Get 7 days for the currentBaseDate
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
      dayOfWeekFull: string;
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
        dayOfWeekFull: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayNumber: d.getDate(),
        isToday: iso === todayISO
      });
    }

    return days;
  }, [currentBaseDate, todayISO, formatDayOfWeek]);

  const weekStartISO = currentWeekDays.length > 0 ? currentWeekDays[0].dateStr : '';
  const weekEndISO = currentWeekDays.length > 0 ? currentWeekDays[6].dateStr : '';

  // Formatted week header range label (e.g. "Oct 14 – 20, 2024")
  const weekRangeLabel = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0].dateObj;
    const end = currentWeekDays[6].dateObj;
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }, [currentWeekDays]);

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

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    date: string,
    scheduleId: string,
    entry: MealScheduleEntry
  ) => {
    setDraggedMeal({ fromDate: date, fromScheduleId: scheduleId, entry });
    e.dataTransfer.setData('text/plain', JSON.stringify({ date, scheduleId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, toDate: string, toScheduleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverTarget || dragOverTarget.toDate !== toDate || dragOverTarget.toScheduleId !== toScheduleId) {
      setDragOverTarget({ toDate, toScheduleId });
    }
  };

  const handleDrop = (e: React.DragEvent, toDate: string, toScheduleId: string) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (!draggedMeal) return;
    const { fromDate, fromScheduleId, entry } = draggedMeal;

    if (fromDate === toDate && fromScheduleId === toScheduleId) {
      setDraggedMeal(null);
      return;
    }

    const updated = { ...mealPlan };
    const srcDay = updated[fromDate] ? { ...updated[fromDate] } : {};
    const dstDay = updated[toDate] ? { ...updated[toDate] } : {};

    const targetExistingEntry = dstDay[toScheduleId];

    dstDay[toScheduleId] = entry;

    if (targetExistingEntry) {
      srcDay[fromScheduleId] = targetExistingEntry;
    } else {
      delete srcDay[fromScheduleId];
    }

    updated[fromDate] = srcDay;
    updated[toDate] = dstDay;

    onBatchUpdateMealPlan(updated);
    setDraggedMeal(null);
    showToast(`🔄 Rescheduled meal to ${toScheduleId}`);
  };

  // Manual per-day extra meal schedule addition override
  const handleAddManualScheduleToDay = (dateStr: string) => {
    const extraName = window.prompt('Enter extra meal schedule name (e.g. Afternoon Tea, Snack):');
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
    <div className="flex-1 pb-28 pt-3 px-4 space-y-4 max-w-md mx-auto w-full bg-[#F7F4EF] dark:bg-[#1A1714]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#2D2640]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header: Date Navigation & Weekly Toolbar */}
      <div className="bg-white dark:bg-[#252220] rounded-2xl p-3.5 border border-[#EDE8DF] dark:border-[#38332E] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          {/* Week Date Navigator */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button
              onClick={handlePrevPeriod}
              className="w-8 h-8 flex items-center justify-center bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
              title="Previous 7 Days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
              <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate">
                {weekRangeLabel}
              </h3>
              <button
                onClick={handleJumpToday}
                className="bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] px-2 py-0.5 rounded-xl text-[10px] font-bold hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition active:scale-95 shadow-sm cursor-pointer shrink-0"
                title="Jump to Today"
              >
                {t('common.today')}
              </button>
            </div>

            <button
              onClick={handleNextPeriod}
              className="w-8 h-8 flex items-center justify-center bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
              title="Next 7 Days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Toolbar Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleShareMealPlan}
              className="p-2 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
              title={language === 'zh-CN' ? '复制并分享周餐单' : 'Share Weekly Plan as text'}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsWeekCopyOpen(true)}
              className="p-2 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
              title={language === 'zh-CN' ? '复制排餐至其他周' : 'Copy Schedule across weeks'}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsScheduleSettingsOpen(true)}
              className="p-2 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
              title={language === 'zh-CN' ? '自定义餐段配置' : 'Configure Meal Schedules'}
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grocery List Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-3.5 text-[#2D2640] dark:text-[#F0EDE8] shadow-sm border border-amber-200 dark:border-amber-900 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold">{t('nav.grocery')}</h4>
          <span className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
            {weekRangeLabel} ({t('planner.scheduledMealsCount', { count: totalMealsPlannedThisWeek })})
          </span>
        </div>
        <button
          onClick={() => onGoToGrocery(weekStartISO, weekEndISO)}
          className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{t('grocery.shareListBtn').replace('分享', '查看').replace('Share', 'View')}</span>
        </button>
      </div>

      {/* Empty Week Encouragement Banner */}
      {totalMealsPlannedThisWeek === 0 && (
        <div className="bg-white dark:bg-[#252220] rounded-2xl p-5 text-center border border-dashed border-[#EDE8DF] dark:border-[#38332E] space-y-2 shadow-sm animate-in fade-in">
          <div className="text-2xl">🗓️ 🍲</div>
          <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">{t('planner.emptyWeekTitle')}</h4>
          <p className="text-[11px] text-[#7A6E64] dark:text-[#9A9088] max-w-xs mx-auto">
            {t('planner.emptyWeekSubtitle')}
          </p>
        </div>
      )}

      {/* Weekly Schedule Days - 7-Day Rolling from Monday to Sunday */}
      <div className="space-y-3.5">
        {currentWeekDays.map((day) => {
          const dayPlan = mealPlan[day.dateStr] || {};
          const dayNum = day.dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

          // Filter default enabled schedules that apply to this day of week
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
            <React.Fragment key={day.dateStr}>

                  <div
                    className={`rounded-2xl p-4 border transition-all shadow-sm ${
                      day.isToday
                        ? 'bg-white dark:bg-[#252220] border-[#FFD13B] ring-2 ring-[#FFD13B]/40 shadow-md'
                        : 'bg-white dark:bg-[#252220] border-[#EDE8DF] dark:border-[#38332E]'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F0EAE0] dark:border-[#38332E]">
                      <div className="flex items-center gap-2">
                        {day.isToday ? (
                          <span className="flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-xl bg-[#FFD13B] text-[#2D2640] shadow-sm tracking-wide">
                            <Sparkles className="w-3 h-3 fill-current text-[#2D2640]" />
                            <span>{t('common.today')} • {formatDayOfWeek(day.dateStr)}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088]">
                            {formatDayOfWeek(day.dateStr)}
                          </span>
                        )}
                        <span className={`text-xs font-semibold ${day.isToday ? 'text-[#2D2640] dark:text-[#F0EDE8] font-bold' : 'text-[#3D3530] dark:text-[#D0C8C0]'}`}>
                          {formatDate(day.dateStr, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Simplified '+' Button */}
                        <button
                          onClick={() => handleAddManualScheduleToDay(day.dateStr)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer shadow-sm active:scale-95 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]"
                          title={t('planner.addSchedule')}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Meal Schedules Grid for this Day */}
                    <div className="grid grid-cols-2 gap-2.5">
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

                        const isDropTarget =
                          dragOverTarget?.toDate === day.dateStr && dragOverTarget?.toScheduleId === scheduleId;

                        return (
                          <div
                            key={scheduleId}
                            draggable={Boolean(hasPlan)}
                            onDragStart={(e) => {
                              if (hasPlan && entry) {
                                handleDragStart(e, day.dateStr, scheduleId, entry);
                              }
                            }}
                            onDragOver={(e) => handleDragOver(e, day.dateStr, scheduleId)}
                            onDrop={(e) => handleDrop(e, day.dateStr, scheduleId)}
                            onClick={() =>
                              setSelectedModalSchedule({
                                date: day.dateStr,
                                scheduleId,
                                scheduleName: scheduleLabel,
                                entry
                              })
                            }
                            className={`rounded-xl p-2.5 border transition-all cursor-pointer active:scale-[0.98] ${
                              isDropTarget
                                ? 'border-[#FFD13B] bg-[#FFF8E6] ring-2 ring-[#FFD13B]/30 scale-102 shadow-md'
                                : hasPlan
                                ? 'bg-[#FAF7F2] dark:bg-[#1E1B18] border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B] shadow-sm'
                                : 'bg-[#FAF7F2] dark:bg-[#1E1B18] border-dashed border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B]/50 hover:bg-[#F7F4EF] dark:hover:bg-[#252220] shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E64] dark:text-[#9A9088]">
                                <span>🍲</span>
                                <span className="truncate max-w-[80px]">{displayScheduleName}</span>
                              </div>
                              {hasPlan ? (
                                <span title={t('planner.dragHint')}>
                                  <Move className="w-3 h-3 text-[#9A8A7E] dark:text-[#7A6E64] opacity-60" />
                                </span>
                              ) : (
                                <Plus className="w-3 h-3 text-[#B8AFA4] dark:text-[#5A5450]" />
                              )}
                            </div>

                            {entryDishes.length > 0 ? (
                              <div className="space-y-1 mt-1">
                                {entryDishes.map((dish) => {
                                  const loc = getLocalizedDish(dish, language);
                                  return (
                                    <div key={dish.id} className="flex items-center gap-1.5 min-w-0">
                                      {dish.imageUrl ? (
                                        <img
                                          src={dish.imageUrl}
                                          alt={loc.name}
                                          className="w-4 h-4 rounded-md object-cover shrink-0"
                                        />
                                      ) : (
                                        <span className="text-sm shrink-0">{dish.imageEmoji || '🍲'}</span>
                                      )}
                                      <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate leading-tight">
                                        {loc.name}
                                      </span>
                                    </div>
                                  );
                                })}
                                {entry?.customText && (
                                  <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] italic block truncate">
                                    📝 {entry.customText}
                                  </span>
                                )}
                              </div>
                            ) : entry?.customText ? (
                              <div className="mt-1">
                                <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] italic block truncate">
                                  📝 {entry.customText}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span className="text-[11px] text-[#B8AFA4] dark:text-[#5A5450] font-medium">{t('planner.addMeal')}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
      </div>

      {/* Sticky Bottom Date Navigation Controls */}
      <div className="sticky bottom-16 left-0 right-0 z-20 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto bg-white/95 dark:bg-[#252220]/95 backdrop-blur-md rounded-2xl p-2.5 border border-[#EDE8DF] dark:border-[#38332E] shadow-md flex items-center justify-between">
          <button
            onClick={handlePrevPeriod}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 transition cursor-pointer bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev 7 Days</span>
          </button>

          <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate max-w-[150px]">
            {weekRangeLabel}
          </span>

          <button
            onClick={handleNextPeriod}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 transition cursor-pointer bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]"
          >
            <span>Next 7 Days</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedModalSchedule && (
        <MealScheduleModal
          isOpen={Boolean(selectedModalSchedule)}
          date={selectedModalSchedule.date}
          scheduleId={selectedModalSchedule.scheduleId}
          scheduleName={selectedModalSchedule.scheduleName}
          currentProfile={currentProfile}
          familyMembers={familyMembers}
          memberProfiles={memberProfiles}
          familyPersonalisation={familyPersonalisation}
          currentEntry={selectedModalSchedule.entry}
          dishes={dishes}
          onClose={() => setSelectedModalSchedule(null)}
          onSaveEntry={(date, scheduleId, entry) => {
            onUpdateMealPlan(date, scheduleId, entry);
            setSelectedModalSchedule(null);
          }}
          onCreateNewDish={onOpenDishCreator}
          onToggleFamilyRecipe={onToggleFamilyRecipe}
          onToggleFavoriteDish={onToggleFavoriteDish}
        />
      )}

      <WeekCopyModal
        isOpen={isWeekCopyOpen}
        onClose={() => setIsWeekCopyOpen(false)}
        currentWeekStartISO={weekStartISO}
        mealPlan={mealPlan}
        onApplyCopy={onBatchUpdateMealPlan}
        onShowToast={showToast}
      />

      <MealScheduleSettingsModal
        isOpen={isScheduleSettingsOpen}
        onClose={() => setIsScheduleSettingsOpen(false)}
        mealSchedules={mealSchedules}
        onSaveMealSchedules={onSaveMealSchedules}
      />
    </div>
  );
};
