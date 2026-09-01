import React, { useState, useMemo } from 'react';
import type { MemberPreferences, FamilyPersonalisation, DietaryPreference } from '../../types';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Utensils,
  Users,
  Search,
  Save,
  Check,
  Plus
} from 'lucide-react';
import { ALLERGEN_TAXONOMY, type AllergenCategory } from '../../services/personalisationService';
import { useLanguage } from '../../i18n/LanguageContext';

interface PersonalisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: string;
  familyMembers: string[];
  memberProfiles: Record<string, MemberPreferences>;
  familyPersonalisation: FamilyPersonalisation;
  onSavePersonalisation: (
    updatedProfiles: Record<string, MemberPreferences>,
    updatedFamilyPersonalisation: FamilyPersonalisation,
    updatedFamilyMembers?: string[]
  ) => void;
  onAddFamilyMember?: (name: string) => void;
}

const CUISINE_OPTIONS = [
  { id: 'Chinese', label: 'Chinese', labelZh: '中餐' },
  { id: 'Cantonese', label: 'Cantonese', labelZh: '粤菜 / 港式' },
  { id: 'Japanese', label: 'Japanese', labelZh: '日料 / 和风' },
  { id: 'Korean', label: 'Korean', labelZh: '韩料' },
  { id: 'Thai', label: 'Thai', labelZh: '泰餐 / 东南亚' },
  { id: 'Vietnamese', label: 'Vietnamese', labelZh: '越式' },
  { id: 'Italian', label: 'Italian', labelZh: '意式料理' },
  { id: 'Western', label: 'Western', labelZh: '西餐经典' },
  { id: 'French', label: 'French', labelZh: '法餐' },
  { id: 'American', label: 'American', labelZh: '美式' },
  { id: 'Mexican', label: 'Mexican', labelZh: '墨西哥风味' },
  { id: 'Mediterranean', label: 'Mediterranean', labelZh: '地中海料理' },
  { id: 'Indian', label: 'Indian', labelZh: '印度咖喱' }
];

const DIETARY_OPTIONS: { id: DietaryPreference; label: string; labelZh: string }[] = [
  { id: 'Vegetarian', label: 'Vegetarian', labelZh: '蛋奶素' },
  { id: 'Vegan', label: 'Strict Vegan', labelZh: '纯素' },
  { id: 'Pescatarian', label: 'Pescatarian', labelZh: '鱼素' },
  { id: 'Halal', label: 'Halal (No Pork)', labelZh: '清真 (无猪肉)' },
  { id: 'Gluten-Free', label: 'Gluten-Free', labelZh: '无麸质' },
  { id: 'Dairy-Free', label: 'Dairy-Free', labelZh: '无乳制品' },
  { id: 'Low-Carb', label: 'Low-Carb / Keto', labelZh: '低碳 / 生酮' }
];

const CATEGORY_TABS: { id: AllergenCategory; labelEn: string; labelZh: string; icon: string }[] = [
  { id: 'major', labelEn: 'Major (Big 9)', labelZh: '主要过敏原', icon: '🥛' },
  { id: 'regional', labelEn: 'Regional', labelZh: '贝类与谷物', icon: '🦪' },
  { id: 'meat', labelEn: 'Meats', labelZh: '肉类忌口', icon: '🥩' },
  { id: 'nightshade_allium', labelEn: 'Alliums & Nightshades', labelZh: '葱蒜与茄科', icon: '🧄' },
  { id: 'seed_legume', labelEn: 'Legumes & Seeds', labelZh: '豆类与种籽', icon: '🫛' },
  { id: 'fruit', labelEn: 'Fruits', labelZh: '水果类', icon: '🥝' }
];

export const PersonalisationModal: React.FC<PersonalisationModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  familyMembers,
  memberProfiles,
  familyPersonalisation,
  onSavePersonalisation,
  onAddFamilyMember
}) => {
  const { language } = useLanguage();

  const [activeMember, setActiveMember] = useState<string>(currentMember || familyMembers[0] || 'Member');
  const [localProfiles, setLocalProfiles] = useState<Record<string, MemberPreferences>>(memberProfiles || {});
  const [localFamilyPersonalisation, setLocalFamilyPersonalisation] = useState<FamilyPersonalisation>(
    familyPersonalisation || {
      strictAllergyFilter: true,
      householdAllergies: [],
      householdCuisines: [],
      householdCategories: []
    }
  );

  const [allergenSearch, setAllergenSearch] = useState('');
  const [activeAllergenCat, setActiveAllergenCat] = useState<AllergenCategory>('major');
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Active member's current preferences
  const activePrefs = localProfiles[activeMember] || {
    allergies: [],
    dislikedIngredients: [],
    favoriteCuisines: [],
    favoriteCategories: [],
    dietaryPreferences: []
  };

  const handleToggleAllergen = (allergenId: string) => {
    const current = activePrefs.allergies || [];
    const exists = current.includes(allergenId);
    const updated = exists ? current.filter((id) => id !== allergenId) : [...current, allergenId];

    setLocalProfiles({
      ...localProfiles,
      [activeMember]: {
        ...activePrefs,
        allergies: updated
      }
    });
  };

  const handleToggleCuisine = (cuisineId: string) => {
    const current = activePrefs.favoriteCuisines || [];
    const exists = current.includes(cuisineId);
    const updated = exists ? current.filter((id) => id !== cuisineId) : [...current, cuisineId];

    setLocalProfiles({
      ...localProfiles,
      [activeMember]: {
        ...activePrefs,
        favoriteCuisines: updated
      }
    });
  };

  const handleToggleDietary = (dietaryId: DietaryPreference) => {
    const current = activePrefs.dietaryPreferences || [];
    const exists = current.includes(dietaryId);
    const updated = exists ? current.filter((id) => id !== dietaryId) : [...current, dietaryId];

    // Special quick helpers: If Vegan/Halal selected, automatically manage helper allergen tags
    let allergies = [...(activePrefs.allergies || [])];
    if (!exists && dietaryId === 'Halal' && !allergies.includes('pork')) {
      allergies.push('pork');
    }
    if (!exists && dietaryId === 'Dairy-Free' && !allergies.includes('cow_milk')) {
      allergies.push('cow_milk');
    }
    if (!exists && dietaryId === 'Gluten-Free' && !allergies.includes('wheat_gluten')) {
      allergies.push('wheat_gluten');
    }

    setLocalProfiles({
      ...localProfiles,
      [activeMember]: {
        ...activePrefs,
        dietaryPreferences: updated,
        allergies
      }
    });
  };

  const handleAddNewMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemberName.trim();
    if (!clean) return;

    if (!familyMembers.includes(clean)) {
      onAddFamilyMember?.(clean);
    }

    setLocalProfiles({
      ...localProfiles,
      [clean]: {
        allergies: [],
        favoriteCuisines: ['Chinese', 'Japanese'],
        favoriteCategories: ['Dinner', 'Lunch'],
        dietaryPreferences: []
      }
    });

    setActiveMember(clean);
    setNewMemberName('');
    setIsAddingMember(false);
  };

  const handleSaveAll = () => {
    onSavePersonalisation(localProfiles, localFamilyPersonalisation);
    onClose();
  };

  // Filter allergens by search query or active category
  const visibleAllergens = useMemo(() => {
    const query = allergenSearch.toLowerCase().trim();
    if (query) {
      return ALLERGEN_TAXONOMY.filter(
        (a) =>
          a.nameEn.toLowerCase().includes(query) ||
          a.nameZh.toLowerCase().includes(query) ||
          a.commonSourcesEn.toLowerCase().includes(query) ||
          a.commonSourcesZh.toLowerCase().includes(query) ||
          a.keywords.some((k) => k.toLowerCase().includes(query))
      );
    }
    return ALLERGEN_TAXONOMY.filter((a) => a.category === activeAllergenCat);
  }, [allergenSearch, activeAllergenCat]);

  // Aggregate household allergy summary
  const householdAllergyCount = useMemo(() => {
    const set = new Set<string>();
    Object.values(localProfiles).forEach((p) => {
      p?.allergies?.forEach((a) => set.add(a));
    });
    (localFamilyPersonalisation.householdAllergies || []).forEach((a) => set.add(a));
    return set.size;
  }, [localProfiles, localFamilyPersonalisation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[#F8F5F0] dark:bg-[#1C1917] rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-[#EDE8DF] dark:border-[#3A332C] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-[#28231E] border-b border-[#EDE8DF] dark:border-[#3A332C] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FFD13B] text-[#2D2640] flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5 text-[#2D2640]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D2640] dark:text-[#F0EDE8] leading-tight">
                {language === 'zh-CN' ? '家庭成员偏好与过敏管理' : 'Family Personalisation & Allergies'}
              </h2>
              <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">
                {language === 'zh-CN'
                  ? '个性化推荐口味，自动屏蔽全家过敏食材'
                  : 'Customize tastes & automatically filter family allergens'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#B8AFA4] dark:text-[#5A5450] hover:text-[#3D3530] dark:hover:text-[#D0C8C0] hover:bg-[#F0EAE0] dark:hover:bg-[#38332E] rounded-full transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Selector Strip */}
        <div className="px-4 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1B18] border-b border-[#EDE8DF] dark:border-[#38332E] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[#9A8A7E] dark:text-[#7A6E64] shrink-0 mr-1">
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'zh-CN' ? '家庭成员' : 'Members'}:</span>
          </div>

          {familyMembers.map((member) => {
            const isSelected = activeMember === member;
            const memberAlgCount = localProfiles[member]?.allergies?.length || 0;
            return (
              <button
                key={member}
                type="button"
                onClick={() => setActiveMember(member)}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer border shadow-2xs ${
                  isSelected
                    ? 'bg-[#FFD13B] text-[#2D2640] border-[#FFD13B] shadow-sm'
                    : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                }`}
              >
                <span>{member === currentMember ? `👤 ${member} (You)` : member}</span>
                {memberAlgCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected 
                        ? 'bg-[#2D2640] text-[#FFD13B]' 
                        : 'bg-[#FAF7F2] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/40'
                    }`}
                  >
                    {memberAlgCount}
                  </span>
                )}
              </button>
            );
          })}

          {!isAddingMember ? (
            <button
              type="button"
              onClick={() => setIsAddingMember(true)}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#7A6E64] dark:text-[#9A9088] bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] border border-dashed border-[#EDE8DF] dark:border-[#38332E] px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'zh-CN' ? '添加成员' : 'Add Member'}</span>
            </button>
          ) : (
            <form onSubmit={handleAddNewMemberSubmit} className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder={language === 'zh-CN' ? '成员姓名' : 'Member Name'}
                autoFocus
                className="text-xs px-2.5 py-1.5 bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] rounded-xl text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] w-28"
              />
              <button
                type="submit"
                className="text-xs font-bold px-2 py-1.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] border border-[#2D2640]/10 rounded-xl cursor-pointer shadow-sm transition-all"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="text-xs font-bold px-2 py-1.5 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] rounded-xl cursor-pointer transition-all"
              >
                ✕
              </button>
            </form>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Member Focus Banner */}
          <div className="bg-white dark:bg-[#252220] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/40 flex items-center justify-center shrink-0 font-extrabold text-xs">
                {activeMember.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-extrabold text-[#2D2640] dark:text-[#F0EDE8] truncate">
                  {language === 'zh-CN' ? `${activeMember} 的个人健康与口味配置` : `Preferences for ${activeMember}`}
                </h3>
                <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64] truncate">
                  {activePrefs.allergies?.length
                    ? `${activePrefs.allergies.length} ${language === 'zh-CN' ? '项过敏原已选' : 'allergens declared'}`
                    : language === 'zh-CN'
                    ? '暂无过敏声明（可随意选择）'
                    : 'No allergens recorded yet'}
                </p>
              </div>
            </div>

            {/* Quick Dietary Preset Pills */}
            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
              {DIETARY_OPTIONS.slice(0, 3).map((diet) => {
                const isSelected = activePrefs.dietaryPreferences?.includes(diet.id);
                return (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => handleToggleDietary(diet.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-sm'
                        : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                    }`}
                  >
                    {language === 'zh-CN' ? diet.labelZh : diet.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Allergy Declaration Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider">
                  ⚠️ {language === 'zh-CN' ? '过敏原与忌口声明' : 'Allergies & Sensitivities'}
                </span>
                <span className="text-[10px] text-[#B8AFA4] dark:text-[#5A5450] font-normal">
                  ({language === 'zh-CN' ? '点选即可自动屏蔽' : 'Tap to exclude'})
                </span>
              </div>

              {/* Search input for allergens */}
              <div className="relative w-36 sm:w-44">
                <Search className="w-3 h-3 text-[#C4B8A8] dark:text-[#5A5048] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'zh-CN' ? '快速搜索过敏原...' : 'Search allergen...'}
                  value={allergenSearch}
                  onChange={(e) => setAllergenSearch(e.target.value)}
                  className="w-full text-[11px] pl-7 pr-2 py-1 bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] rounded-xl text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
                />
              </div>
            </div>

            {/* Category Tab Pills */}
            {!allergenSearch && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                {CATEGORY_TABS.map((cat) => {
                  const isSelected = activeAllergenCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveAllergenCat(cat.id)}
                      className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer border whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-sm'
                          : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{language === 'zh-CN' ? cat.labelZh : cat.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Allergen Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-0.5">
              {visibleAllergens.map((alg) => {
                const isSelected = activePrefs.allergies?.includes(alg.id);
                return (
                  <button
                    key={alg.id}
                    type="button"
                    onClick={() => handleToggleAllergen(alg.id)}
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 relative group ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-900 ring-2 ring-rose-300/40 dark:ring-rose-900/40 shadow-sm'
                        : 'bg-white dark:bg-[#252220] border-[#EDE8DF] dark:border-[#38332E] hover:border-[#2D2640]/20 dark:hover:border-[#F0EDE8]/20 hover:bg-[#F7F4EF] dark:hover:bg-[#2E2A26] shadow-sm'
                    }`}
                  >
                    <span className="text-xl p-1 bg-[#FAF7F2] dark:bg-[#1E1B18] rounded-xl shrink-0">{alg.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold ${isSelected ? 'text-rose-950 dark:text-rose-400' : 'text-[#2D2640] dark:text-[#F0EDE8]'}`}>
                          {language === 'zh-CN' ? alg.nameZh : alg.nameEn}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-rose-500 text-white px-1.5 py-0.2 rounded-full shrink-0">
                            <Check className="w-2.5 h-2.5" />
                            {language === 'zh-CN' ? '忌口' : 'Excluded'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] truncate mt-0.5">
                        {language === 'zh-CN' ? alg.commonSourcesZh : alg.commonSourcesEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Favorite Cuisines */}
          <div className="space-y-2 bg-white dark:bg-[#252220] p-3.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] shadow-sm">
            <div className="flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#FFD13B]" />
              <span className="text-[11px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider">
                {language === 'zh-CN' ? '偏好菜系 (多选)' : 'Favorite Cuisines (Multi-select)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {CUISINE_OPTIONS.map((c) => {
                const isSelected = activePrefs.favoriteCuisines?.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleCuisine(c.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 shadow-sm ${
                      isSelected
                        ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                        : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#2D2640]" />}
                    <span>{language === 'zh-CN' ? c.labelZh : c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Household Safety Policy */}
          <div className="bg-gradient-to-r from-amber-50/70 to-[#E8F5ED]/70 dark:from-[#2A1E00]/70 dark:to-[#0D2E1A]/70 p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2D6A4A] dark:text-[#4CAF82]" />
                <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                  {language === 'zh-CN' ? '🛡️ 全家安全防护过滤模式' : '🛡️ Strict Family Safety Mode'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFamilyPersonalisation.strictAllergyFilter}
                  onChange={(e) =>
                    setLocalFamilyPersonalisation({
                      ...localFamilyPersonalisation,
                      strictAllergyFilter: e.target.checked
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#EDE8DF] dark:bg-[#38332E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#EDE8DF] dark:after:border-[#38332E] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FFD13B]"></div>
              </label>
            </div>
            <p className="text-[11px] text-[#7A6E64] dark:text-[#9A9088] leading-relaxed">
              {language === 'zh-CN'
                ? `开启后，在菜谱搜索和周计划排餐时，系统将自动隐藏任何含有全家（${householdAllergyCount}项）过敏原的菜肴。`
                : `When enabled, Gyummy will automatically filter out any recipe containing any family member's allergens (${householdAllergyCount} total).`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-[#252220] border-t border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-xs font-bold rounded-2xl transition cursor-pointer"
          >
            {language === 'zh-CN' ? '取消' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="flex-1 py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold border border-[#2D2640]/10 rounded-2xl shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{language === 'zh-CN' ? '保存个性化设置' : 'Save Personalisation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
