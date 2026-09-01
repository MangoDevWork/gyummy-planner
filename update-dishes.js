const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'dishes', 'DishesView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Rules
const rules = [
  // Page background
  [
    /<div className="flex-1 pb-28 pt-3 px-4 space-y-3\.5 max-w-md mx-auto w-full">/g,
    '<div className="bg-[#F7F4EF] dark:bg-[#1A1714] flex-1 pb-28 pt-3 px-4 space-y-3.5 max-w-md mx-auto w-full">'
  ],
  // Scope Switcher container
  [
    /className="bg-white p-1\.5 rounded-2xl border border-\[#EAE6DF\] shadow-xs grid grid-cols-2 gap-2"/g,
    'className="bg-white dark:bg-[#252220] p-1.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] shadow-sm grid grid-cols-2 gap-2"'
  ],
  // Family Cookbook Button - Warm, Established, Prominent
  [
    /'bg-\[#2B2D42\] text-white shadow-md font-extrabold ring-2 ring-slate-800\/10 scale-\[1\.01\]'/g,
    "'bg-[#FFD13B] text-[#2D2640] shadow-sm font-extrabold rounded-xl scale-[1.01]'"
  ],
  [
    /'bg-\[#FAF8F5\] text-slate-700 hover:bg-\[#F4F1EA\] font-bold border border-\[#EAE6DF\]'/g,
    "'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] font-bold rounded-xl'"
  ],
  [
    /'text-amber-300' : 'text-slate-600'/g,
    "'text-[#2D2640]' : 'text-[#7A6E64] dark:text-[#9A9088]'"
  ],
  [
    /'bg-amber-400 text-slate-950 shadow-2xs'/g,
    "'bg-[#2D2640] text-[#FFD13B] shadow-sm'"
  ],
  [
    /'bg-slate-200 text-slate-700'/g,
    "'bg-[#EDE8DF] dark:bg-[#38332E] text-[#7A6E64] dark:text-[#9A9088]'"
  ],

  // Recipe Library Button - Vibrant, Discoverable, Inviting
  [
    /'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md font-extrabold ring-2 ring-amber-500\/20 scale-\[1\.01\]'/g,
    "'bg-gradient-to-r from-[#FFD13B] to-[#FFB347] text-[#2D2640] shadow-sm font-extrabold rounded-xl scale-[1.01]'"
  ],
  [
    /'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 hover:from-amber-100 hover:to-orange-100 font-bold border border-amber-200\/70 shadow-2xs'/g,
    "'bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/40 hover:border-[#FFD13B]/60 font-bold rounded-xl shadow-sm'"
  ],
  [
    /'text-yellow-200' : 'text-amber-600'/g,
    "'text-[#2D2640]' : 'text-[#7A5C00] dark:text-[#FFD13B]'"
  ],
  [
    /'bg-white\/20 text-white border border-white\/30'/g,
    "'bg-white/40 text-[#2D2640] border border-[#2D2640]/10'"
  ],
  [
    /'bg-amber-200\/80 text-amber-900'/g,
    "'bg-[#FFD13B]/20 text-[#7A5C00] dark:text-[#FFD13B]'"
  ],

  // Recipe Library promo banner
  [
    /className="bg-gradient-to-r from-slate-900 to-\[#2B2D42\] text-white/g,
    'className="bg-[#2D2640] dark:bg-[#252220] text-[#F0EDE8]'
  ],
  [
    /border border-slate-700 space-y-2/g,
    'border border-[#2D2640]/10 dark:border-[#38332E] space-y-2 rounded-2xl'
  ],

  // Safe Mode pill (Family Safe)
  [
    /'bg-emerald-700 text-white shadow-xs'/g,
    "'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC] dark:border-[#1D4A2A] shadow-sm'"
  ],
  [
    /'bg-white text-slate-600 border border-\[#EAE6DF\] hover:bg-slate-50'/g,
    "'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'"
  ],

  // My Taste pill
  [
    /'bg-indigo-700 text-white shadow-xs'/g,
    "'bg-[#FFD13B] text-[#2D2640] shadow-sm border border-[#2D2640]/10'"
  ],

  // Quick filter pills
  [
    /'bg-\[#2B2D42\] text-white shadow-xs'/g,
    "'bg-[#FFD13B] text-[#2D2640] shadow-sm border border-[#2D2640]/10'"
  ],

  // Category filter pills
  [
    /'bg-\[#2B2D42\] text-white border-\[#2B2D42\] shadow-xs'/g,
    "'bg-[#FFD13B] text-[#2D2640] shadow-sm border border-[#2D2640]/10'"
  ],
  [
    /'bg-white text-slate-700 border-\[#EAE6DF\] hover:bg-slate-50'/g,
    "'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'"
  ],
  [
    /'bg-white\/25 text-white'/g,
    "'bg-[#2D2640]/10 text-[#2D2640]'"
  ],
  [
    /'bg-\[#F4F1EA\] dark:bg-\[#1F2430\] text-slate-600 dark:text-slate-300'/g,
    "'bg-[#EDE8DF] dark:bg-[#38332E] text-[#9A8A7E] dark:text-[#7A6E64]'"
  ],

  // Sort & Cuisine Containers
  [
    /bg-white dark:bg-\[#151922\] px-2\.5 py-1\.5 rounded-xl border border-\[#EAE6DF\] dark:border-slate-800 shadow-2xs/g,
    "bg-white dark:bg-[#252220] px-2.5 py-1.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-sm"
  ],
  [
    /text-slate-900 dark:text-slate-100 bg-transparent/g,
    "text-[#2D2640] dark:text-[#F0EDE8] bg-transparent"
  ],
  [
    /bg-white dark:bg-\[#1E232F\] text-slate-900 dark:text-slate-100/g,
    "bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]"
  ],

  // Search input container and input
  [
    /w-full text-xs font-medium pl-9 pr-8 py-2\.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-\[#EAE6DF\] focus:outline-hidden focus:border-slate-400 shadow-2xs/g,
    "w-full text-xs font-medium pl-9 pr-8 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] rounded-xl border border-[#E8E0D5] dark:border-[#38332E] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-sm"
  ],

  // Dish Card
  [
    /className="bg-white rounded-2xl p-3\.5 border border-\[#EAE6DF\] hover:border-slate-300 transition-all cursor-pointer active:scale-\[0\.99\] flex items-center justify-between group shadow-sm"/g,
    'className="bg-white dark:bg-[#252220] rounded-2xl p-3.5 border border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B]/50 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between group shadow-sm"'
  ],
  [
    /border border-\[#EAE6DF\] shadow-2xs/g,
    "border border-[#EDE8DF] dark:border-[#38332E] shadow-sm"
  ],

  // In cookbook button
  [
    /'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'/g,
    "'bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/40 shadow-sm'"
  ],
  [
    /'bg-\[#EDF2F4\] text-slate-700 border-\[#E2E8F0\] hover:bg-\[#E2E8F0\]'/g,
    "'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'"
  ],
  [
    /text-emerald-700 stroke-\[3\]/g,
    "text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]"
  ],

  // Quick plan button
  [
    /className="px-2 py-0\.5 bg-\[#2B2D42\] hover:bg-\[#1E1F2E\] text-white text-\[10px\] font-bold rounded-md shadow-2xs active:scale-95 transition cursor-pointer"/g,
    'className="px-2 py-0.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-[10px] font-bold rounded-md shadow-sm border border-[#2D2640]/10 active:scale-95 transition cursor-pointer"'
  ],

  // Times planned badge
  [
    /text-amber-700 bg-amber-50 border border-amber-200/g,
    "text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40"
  ],

  // Empty state buttons
  [
    /bg-\[#2B2D42\] text-white/g,
    "bg-[#FFD13B] text-[#2D2640]"
  ],
  [
    /bg-\[#F4F1EA\] hover:bg-\[#EAE6DF\] text-slate-800/g,
    "bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E]"
  ],

  // Toast
  [
    /bg-slate-900 text-white/g,
    "bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640]"
  ],

  // Category tags inside card
  [
    /text-slate-600 bg-\[#F4F1EA\]/g,
    "text-[#7A6E64] dark:text-[#9A9088] bg-[#F5F0E8] dark:bg-[#2E2A26]"
  ],
  [
    /text-slate-500 bg-\[#FDFBF7\] border border-\[#EAE6DF\]/g,
    "text-[#9A8A7E] dark:text-[#7A6E64] bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E]"
  ],

  // Slate text updates (warm text)
  [
    /text-slate-900/g,
    "text-[#2D2640] dark:text-[#F0EDE8]"
  ],
  [
    /text-slate-800/g,
    "text-[#2D2640] dark:text-[#F0EDE8]"
  ],
  [
    /text-slate-700/g,
    "text-[#3D3530] dark:text-[#D0C8C0]"
  ],
  [
    /text-slate-600/g,
    "text-[#7A6E64] dark:text-[#9A9088]"
  ],
  [
    /text-slate-500/g,
    "text-[#9A8A7E] dark:text-[#7A6E64]"
  ],
  [
    /text-slate-400/g,
    "text-[#B8AFA4] dark:text-[#5A5450]"
  ],
  [
    /text-slate-300/g,
    "text-[#C4B8A8] dark:text-[#5A5450]"
  ],
  [
    /text-slate-200/g,
    "text-[#F0EAE0]"
  ],
  
  // Empty state container
  [
    /bg-white rounded-2xl p-7 text-center border border-dashed border-\[#EAE6DF\]/g,
    "bg-white dark:bg-[#252220] rounded-2xl p-7 text-center border border-dashed border-[#EDE8DF] dark:border-[#38332E]"
  ],
  [
    /bg-\[#F4F1EA\]/g,
    "bg-[#F5F0E8] dark:bg-[#2E2A26]"
  ],
  
  // Load More button
  [
    /bg-white border border-\[#EAE6DF\]/g,
    "bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E]"
  ]
];

for (const [regex, replacement] of rules) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete');
