import React, { useState, useMemo, useRef } from 'react';
import type { Dish, MealPlan, MealScheduleConfig, MealScheduleEntry } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Copy,
  Download,
  Upload,
  Sliders,
  CheckCircle2,
  Move,
  Sparkles,
  Calendar,
  MessageSquareShare
} from 'lucide-react';
import { MealScheduleModal } from './MealScheduleModal';
import { WeekCopyModal } from './WeekCopyModal';
import { MealScheduleSettingsModal } from '../settings/MealScheduleSettingsModal';
import { exportToZip, parseUploadedDataFile, copyMealPlanAsMessage } from '../../services/zipExportService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish } from '../../services/dataLocalizationService';

interface PlannerViewProps {
  familyName: string;
  dishes: Dish[];
  mealPlan: MealPlan;
  mealSchedules: MealScheduleConfig[];
  onUpdateMealPlan: (date: string, scheduleId: string, entry: MealScheduleEntry | null) => void;
  onBatchUpdateMealPlan: (updatedPlan: MealPlan) => void;
  onSaveMealSchedules: (schedules: MealScheduleConfig[]) => void;
  onOpenDishCreator: () => void;
  onNavigateToLibrary?: () => void;
  onToggleFamilyRecipe?: (dishId: string) => void;
  onGoToGrocery: (startDate: string, endDate: string) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  familyName,
  dishes,
  mealPlan,
  mealSchedules,
  onUpdateMealPlan,
  onBatchUpdateMealPlan,
  onSaveMealSchedules,
  onOpenDishCreator,
  onNavigateToLibrary,
  onToggleFamilyRecipe,
  onGoToGrocery
}) => {
  const { language, t, formatScheduleName, formatDayOfWeek, formatDate } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentBaseDate, setCurrentBaseDate] = useState<Date>(new Date());
  const [selectedMonthDate, setSelectedMonthDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  /**
   * Rolling 7-Day View:
   * Starts from currentBaseDate (which defaults to Today), and spans the next 6 days (7 days total).
   * This ensures users only see what is planned ahead or hasn't been planned yet.
   */
  const currentWeekDays = useMemo(() => {
    const start = new Date(currentBaseDate);
    const days: Array<{
      dateStr: string;
      dateObj: Date;
      isToday: boolean;
      dayName: string;
      dayNum: number;
      isNextWeekCutover: boolean; // True if this day is a Monday starting the new calendar week
    }> = [];

    let previousDayNum: number | null = null;

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = formatDateISO(d);
      const dayNum = d.getDay(); // 0 is Sunday, 1 is Monday

      // Sunday is considered the last day of the week, so if transition from Sunday(0) to Monday(1), or if dayNum is 1 and not day 0
      const isNextWeekCutover = previousDayNum === 0 && dayNum === 1;

      days.push({
        dateStr,
        dateObj: d,
        isToday: dateStr === todayISO,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum,
        isNextWeekCutover
      });

      previousDayNum = dayNum;
    }
    return days;
  }, [currentBaseDate, todayISO]);

  const weekStartISO = currentWeekDays[0].dateStr;
  const weekEndISO = currentWeekDays[6].dateStr;

  const weekRangeLabel = useMemo(() => {
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
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentBaseDate(d);
  };

  const handleNextPeriod = () => {
    const d = new Date(currentBaseDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentBaseDate(d);
  };

  const handleJumpToday = () => {
    setCurrentBaseDate(new Date());
    setSelectedMonthDate(todayISO);
  };

  // Monthly calendar calculations
  const monthCalendarData = useMemo(() => {
    const year = currentBaseDate.getFullYear();
    const month = currentBaseDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      hasMeals: boolean;
      mealCount: number;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, 0 - i);
      const str = formatDateISO(prevDate);
      const dayPlan = mealPlan[str] || {};
      const count = Object.values(dayPlan).filter((s) => (s?.dishIds && s.dishIds.length > 0) || s?.dishId || s?.customText).length;
      cells.push({
        dateStr: str,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        hasMeals: count > 0,
        mealCount: count,
        isToday: str === todayISO
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currDate = new Date(year, month, day);
      const str = formatDateISO(currDate);
      const dayPlan = mealPlan[str] || {};
      const count = Object.values(dayPlan).filter((s) => (s?.dishIds && s.dishIds.length > 0) || s?.dishId || s?.customText).length;
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: true,
        hasMeals: count > 0,
        mealCount: count,
        isToday: str === todayISO
      });
    }

    // Next month padding
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : (42 - cells.length > 0 ? 42 - cells.length : 0);
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const str = formatDateISO(nextDate);
      const dayPlan = mealPlan[str] || {};
      const count = Object.values(dayPlan).filter((s) => (s?.dishIds && s.dishIds.length > 0) || s?.dishId || s?.customText).length;
      cells.push({
        dateStr: str,
        dayNumber: i,
        isCurrentMonth: false,
        hasMeals: count > 0,
        mealCount: count,
        isToday: str === todayISO
      });
    }

    return {
      monthTitle: firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cells
    };
  }, [currentBaseDate, mealPlan, todayISO]);

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
    const res = await copyMealPlanAsMessage(mealPlan, dishes, days, weekRangeLabel);
    if (res.success) {
      showToast('📋 Copied weekly meal plan to clipboard!');
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

  const handleExportZip = async () => {
    try {
      const filename = await exportToZip(familyName, 'MealPlan', { mealPlan });
      showToast(`📦 Exported ${filename}`);
    } catch (err: any) {
      showToast(`❌ Export failed: ${err.message}`);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await parseUploadedDataFile(file);
    if (!res.success || !res.data) {
      showToast(`❌ ${res.message}`);
      return;
    }

    if (res.type !== 'mealPlan' && res.type !== 'full') {
      showToast('⚠️ Please choose a Meal Plan Zip/JSON file.');
      return;
    }

    const planToMerge: MealPlan = res.type === 'mealPlan' ? res.data : res.data.mealPlan || {};
    const updatedPlan = { ...mealPlan };
    let count = 0;

    Object.keys(planToMerge).forEach((date) => {
      const existingDay = updatedPlan[date] ? { ...updatedPlan[date] } : {};
      const incomingDay = planToMerge[date] || {};

      Object.keys(incomingDay).forEach((scheduleId) => {
        if (!existingDay[scheduleId]) {
          existingDay[scheduleId] = incomingDay[scheduleId];
          count++;
        }
      });
      updatedPlan[date] = existingDay;
    });

    onBatchUpdateMealPlan(updatedPlan);
    showToast(`✅ Merged ${count} scheduled meals!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-4 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".zip,.json"
        className="hidden"
      />

      {/* Top Header: View Toggle & Date Navigation */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#EAE6DF] shadow-sm space-y-3">
        {/* Weekly vs Monthly Toggle Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 bg-[#F4F1EA] p-1 rounded-xl flex-1 border border-[#EAE6DF]/60">
            <button
              onClick={() => setViewMode('week')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Weekly Plan
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Compact Toolbar Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleShareMealPlan}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Share Week's Meal Plan (Copy as Message)"
            >
              <MessageSquareShare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsWeekCopyOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Copy Schedule across weeks"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsScheduleSettingsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Configure Meal Schedules"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportZip}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Export Calendar Zip"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition border border-[#EAE6DF] cursor-pointer"
              title="Import Calendar Zip/JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handlePrevPeriod}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Previous Period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <h3 className="text-xs font-bold text-slate-900">
              {viewMode === 'week' ? weekRangeLabel : monthCalendarData.monthTitle}
            </h3>
            <button
              onClick={handleJumpToday}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              {t('common.today')}
            </button>
          </div>

          <button
            onClick={handleNextPeriod}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Next Period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grocery List Banner */}
      <div className="bg-[#E6EBE0] rounded-2xl p-3.5 text-slate-800 shadow-sm border border-[#D9E2D2] flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900">{t('nav.grocery')}</h4>
          <span className="text-[10px] text-slate-600 font-medium">
            {weekRangeLabel} ({t('planner.scheduledMealsCount', { count: totalMealsPlannedThisWeek })})
          </span>
        </div>
        <button
          onClick={() => onGoToGrocery(weekStartISO, weekEndISO)}
          className="flex items-center gap-1.5 bg-white text-slate-900 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all hover:bg-slate-50 cursor-pointer border border-[#D9E2D2]"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-slate-700" />
          <span>{t('grocery.shareListBtn').replace('分享', '查看').replace('Share', 'View')}</span>
        </button>
      </div>

      {/* Empty Week Encouragement Banner */}
      {viewMode === 'week' && totalMealsPlannedThisWeek === 0 && (
        <div className="bg-white rounded-2xl p-5 text-center border border-dashed border-[#EAE6DF] space-y-2 shadow-2xs animate-in fade-in">
          <div className="text-2xl">🗓️ 🍲</div>
          <h4 className="text-xs font-bold text-slate-900">{t('planner.emptyWeekTitle')}</h4>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            {t('planner.emptyWeekSubtitle')}
          </p>
        </div>
      )}

      {/* Calendar View Container (Swipe Gestures Removed as Requested) */}
      <div>
        {viewMode === 'week' ? (
          /* Weekly Schedule Days - 7-Day Rolling from Today to +6 Days */
          <div className="space-y-3.5">
            {currentWeekDays.map((day) => {
              const dayPlan = mealPlan[day.dateStr] || {};
              const dayNum = day.dayNum; // 0=Sun, 1=Mon, ..., 6=Sat

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
                  {/* Visual Cut-over divider into the next week when transition from Sunday to Monday */}
                  {day.isNextWeekCutover && (
                    <div className="flex items-center gap-2 py-1 px-1 my-1">
                      <div className="h-[1px] bg-slate-300 flex-1" />
                      <div className="flex items-center gap-1 bg-[#F4F1EA] text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#EAE6DF]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{language === 'zh-CN' ? '下周 (周一开始)' : 'NEXT WEEK (STARTS MON)'}</span>
                      </div>
                      <div className="h-[1px] bg-slate-300 flex-1" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 border transition-all shadow-sm ${
                      day.isToday
                        ? 'bg-white border-slate-900 ring-2 ring-slate-900/20 shadow-md'
                        : 'bg-white border-[#EAE6DF]'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F4F1EA]">
                      <div className="flex items-center gap-2">
                        {day.isToday ? (
                          <span className="flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-xl bg-[#2B2D42] text-white shadow-xs tracking-wide">
                            <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                            <span>{t('common.today')} • {formatDayOfWeek(day.dateStr)}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#F4F1EA] text-slate-700">
                            {formatDayOfWeek(day.dateStr)}
                          </span>
                        )}
                        <span className={`text-xs font-semibold ${day.isToday ? 'text-slate-900 font-bold' : 'text-slate-800'}`}>
                          {formatDate(day.dateStr, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Simplified '+' Button */}
                        <button
                          onClick={() => handleAddManualScheduleToDay(day.dateStr)}
                          className="w-7 h-7 rounded-xl bg-[#EDF2F4] hover:bg-[#E2E8F0] text-slate-700 flex items-center justify-center transition cursor-pointer border border-[#E2E8F0] shadow-2xs active:scale-95"
                          title={t('planner.addSchedule')}
                        >
                          <Plus className="w-4 h-4 text-slate-700" />
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
                                ? 'border-slate-500 bg-[#F4F1EA] ring-2 ring-slate-300 scale-102 shadow-md'
                                : hasPlan
                                ? 'bg-[#FAF8F5] border-[#EAE6DF] hover:border-slate-300 shadow-2xs'
                                : 'bg-[#FAF8F5] border-dashed border-[#EAE6DF] hover:border-slate-300 hover:bg-[#F4F1EA] shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span>🍲</span>
                                <span className="truncate max-w-[80px]">{displayScheduleName}</span>
                              </div>
                              {hasPlan ? (
                                <span title={t('planner.dragHint')}>
                                  <Move className="w-3 h-3 text-slate-400 opacity-60" />
                                </span>
                              ) : (
                                <Plus className="w-3 h-3 text-slate-400" />
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
                                      <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                                        {loc.name}
                                      </span>
                                    </div>
                                  );
                                })}
                                {entry?.customText && (
                                  <span className="text-[10px] text-slate-500 italic block truncate">
                                    📝 {entry.customText}
                                  </span>
                                )}
                              </div>
                            ) : entry?.customText ? (
                              <div className="mt-1">
                                <span className="text-[10px] text-slate-500 italic block truncate">
                                  📝 {entry.customText}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span className="text-[11px] text-slate-400 font-medium">{t('planner.addMeal')}</span>
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
        ) : (
          /* Monthly View Calendar Grid */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {(language === 'zh-CN' ? ['一', '二', '三', '四', '五', '六', '日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day) => (
                  <span key={day} className="text-[10px] font-bold uppercase text-slate-400">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCalendarData.cells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedMonthDate;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedMonthDate(cell.dateStr)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center relative p-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2B2D42] text-white font-bold shadow-sm'
                          : cell.isToday
                          ? 'border-2 border-slate-900 bg-[#F4F1EA] text-slate-900 font-bold'
                          : cell.isCurrentMonth
                          ? 'hover:bg-slate-50 text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-xs">{cell.dayNumber}</span>
                      {cell.hasMeals && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(cell.mealCount, 3) }).map((_, dotIdx) => (
                            <span
                              key={dotIdx}
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Month Date Details Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F4F1EA]">
                <h3 className="text-xs font-bold text-slate-900">
                  {t('planner.mealsOnDay', {
                    date: formatDate(selectedMonthDate, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })
                  })}
                </h3>
                <div className="flex items-center gap-1.5">
                  {selectedMonthDate === todayISO && (
                    <span className="text-[10px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded-md">
                      {t('common.today')}
                    </span>
                  )}
                  <button
                    onClick={() => handleAddManualScheduleToDay(selectedMonthDate)}
                    className="w-7 h-7 rounded-xl bg-[#EDF2F4] hover:bg-[#E2E8F0] text-slate-700 flex items-center justify-center transition cursor-pointer border border-[#E2E8F0] shadow-2xs active:scale-95"
                    title={t('planner.addSchedule')}
                  >
                    <Plus className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {mealSchedules.filter((s) => s.defaultEnabled).map((schedule) => {
                  const entry = (mealPlan[selectedMonthDate] || {})[schedule.id];
                  const entryDishIds = entry?.dishIds && entry.dishIds.length > 0
                    ? entry.dishIds
                    : (entry?.dishId ? [entry.dishId] : []);
                  const entryDishes = entryDishIds.map((id) => dishMap.get(id)).filter(Boolean) as Dish[];
                  const hasPlan = Boolean(entryDishes.length > 0 || entry?.customText);

                  return (
                    <div
                      key={schedule.id}
                      onClick={() =>
                        setSelectedModalSchedule({
                          date: selectedMonthDate,
                          scheduleId: schedule.id,
                          scheduleName: schedule.name,
                          entry
                        })
                      }
                      className={`rounded-xl p-2.5 border transition-all cursor-pointer active:scale-[0.98] ${
                        hasPlan
                          ? 'bg-[#FAF8F5] border-[#EAE6DF] hover:border-slate-300 shadow-2xs'
                          : 'bg-[#FAF8F5] border-dashed border-[#EAE6DF] hover:border-slate-300 hover:bg-[#F4F1EA] shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>🍲</span>
                          <span>{formatScheduleName(schedule.name)}</span>
                        </div>
                        {!hasPlan && <Plus className="w-3 h-3 text-slate-400" />}
                      </div>

                      {entryDishes.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {entryDishes.map((dish) => {
                            const loc = getLocalizedDish(dish, language);
                            return (
                              <div key={dish.id} className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base shrink-0">{dish.imageEmoji || '🍲'}</span>
                                <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                                  {loc.name}
                                </span>
                              </div>
                            );
                          })}
                          {entry?.customText && (
                            <span className="text-[10px] text-slate-500 italic block truncate">
                              📝 {entry.customText}
                            </span>
                          )}
                        </div>
                      ) : entry?.customText ? (
                        <div className="mt-1">
                          <span className="text-xs font-medium text-slate-700 italic truncate block">
                            📝 {entry.customText}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <span className="text-[11px] text-slate-400 font-medium">{t('planner.addMeal')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Date Navigation Controls */}
      <div className="sticky bottom-16 left-0 right-0 z-20 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-[#EAE6DF] shadow-md flex items-center justify-between">
          <button
            onClick={handlePrevPeriod}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
            <span>Prev 7 Days</span>
          </button>

          <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
            {viewMode === 'week' ? weekRangeLabel : monthCalendarData.monthTitle}
          </span>

          <button
            onClick={handleNextPeriod}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <span>Next 7 Days</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
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
          currentEntry={selectedModalSchedule.entry}
          dishes={dishes}
          onClose={() => setSelectedModalSchedule(null)}
          onSaveEntry={(date, scheduleId, entry) => {
            onUpdateMealPlan(date, scheduleId, entry);
            setSelectedModalSchedule(null);
          }}
          onCreateNewDish={onOpenDishCreator}
          onNavigateToLibrary={onNavigateToLibrary}
          onToggleFamilyRecipe={onToggleFamilyRecipe}
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
