import React, { useState } from 'react';
import { X, ShieldAlert, BookOpen, FileText, Lock, Mail, Scale } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'allergies' | 'recipes' | 'terms' | 'privacy';
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'allergies'
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'allergies' | 'recipes' | 'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  const isZh = language === 'zh-CN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-lg max-h-[88vh] rounded-3xl border border-[#EDE8DF] bg-white dark:border-[#3D362E] dark:bg-[#201C18] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EDE8DF] px-5 py-4 dark:border-[#3D362E] bg-[#FAF8F5] dark:bg-[#26211C]">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[#FFD13B] dark:text-[#FFD13B]" />
            <h2 className="text-base font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
              {isZh ? '法律条款与免责声明' : 'Terms & Legal Disclaimers'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#786F66] hover:bg-[#EDE8DF] dark:text-[#A39C90] dark:hover:bg-[#3D362E] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#EDE8DF] px-3 pt-2 bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#26211C] gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'allergies', labelEn: 'Allergies & Health', labelZh: '过敏与健康免责', icon: ShieldAlert },
            { id: 'recipes', labelEn: 'Recipes & Safety', labelZh: '菜谱与食品安全', icon: BookOpen },
            { id: 'terms', labelEn: 'Terms & Liability', labelZh: '服务与责任条款', icon: FileText },
            { id: 'privacy', labelEn: 'Privacy & Data', labelZh: '隐私与数据安全', icon: Lock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isSel
                    ? 'border-[#FFD13B] text-[#1E1B2E] dark:text-[#FFD13B]'
                    : 'border-transparent text-[#786F66] hover:text-[#1E1B2E] dark:text-[#A39C90] dark:hover:text-[#F5F2EB]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{isZh ? tab.labelZh : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs leading-relaxed text-[#5A5046] dark:text-[#C4BCB3]">
          
          {/* ─── TAB 1: ALLERGIES & HEALTH ─── */}
          {activeTab === 'allergies' && (
            <div className="space-y-3.5">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 dark:border-rose-950/60 dark:bg-rose-950/20">
                <p className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-[12.5px]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {isZh ? '重要健康提示：非医疗或临床建议' : 'CRITICAL NOTICE: NOT MEDICAL OR CLINICAL ADVICE'}
                </p>
                <p className="mt-1 text-rose-900/90 dark:text-rose-300/90 text-[11.5px]">
                  {isZh
                    ? 'Gyummy 提供的所有过敏原标签、食品安全过滤（如“全家无过敏”模式）及成分分析均由计算机算法估算生成，仅供参考，绝不能替代专业医疗诊断、临床指导或医嘱。'
                    : 'All allergen tags, safety filters (such as "Family Safety Mode"), and ingredient estimations provided by Gyummy are algorithmic approximations for informational planning purposes only and DO NOT constitute medical, nutritional, or clinical advice.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '1. 用户自身核实义务与物理标签' : '1. Obligation to Inspect Physical Product Packaging'}
                </h4>
                <p>
                  {isZh
                    ? '食品生产商随时可能更改原料配方、添加剂或共用生产线。用户在使用任何食材制作餐食前，必须亲自仔细阅读所购实物商品外包装上的官方配料表、过敏原警示及“可能含有”交叉污染声明。'
                    : 'Food manufacturers regularly alter formulations, processing lines, and packaging. You must independently inspect the physical packaging, ingredient statements, and cross-contamination disclosures of all purchased products before preparation or consumption.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '2. 交叉污染与严重过敏反应 (过敏性休克)' : '2. Cross-Contamination & Severe Allergic Reactions (Anaphylaxis)'}
                </h4>
                <p>
                  {isZh
                    ? 'Gyummy 无法检测厨房烹饪器具、餐厅外卖、调味酱料制造过程中的微量过敏原交叉接触。对于患有严重或致命性食物过敏（如花生、坚果、甲壳水产等严重过敏）的人士，请务必咨询执业医生或过敏专科医师，切勿单纯依赖本软件做出安全判断。'
                    : 'Gyummy cannot detect micro-level cross-contamination in manufacturing facilities, commercial kitchens, or home cookware. Individuals with severe, life-threatening allergies (anaphylaxis) must consult a qualified medical physician or allergist and must never rely solely on software estimations.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '3. 免除过敏损害责任' : '3. Disclaimer of Allergic Reaction Liability'}
                </h4>
                <p>
                  {isZh
                    ? '在法律允许的最大范围内，开发者及运营方对于因使用本应用、阅读菜谱、遗漏过敏原标识或软件估算误差而导致或诱发的任何身体不适、过敏发作、疾病、人身伤害或医疗费用概不承担任何法律责任。'
                    : 'To the maximum extent permitted under applicable law, the creator and operator of Gyummy disclaim any and all liability for bodily harm, adverse allergic episodes, anaphylaxis, illness, or medical expenses resulting directly or indirectly from reliance on the software.'}
                </p>
              </div>
            </div>
          )}

          {/* ─── TAB 2: RECIPES & FOOD SAFETY ─── */}
          {activeTab === 'recipes' && (
            <div className="space-y-3.5">
              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '1. 第三方与开源菜谱免责' : '1. Third-Party & Community Sourced Recipes'}
                </h4>
                <p>
                  {isZh
                    ? 'Gyummy 菜谱库（Recipe Library）中的菜谱及烹饪说明收录自公开网络烹饪资源、传统家庭食谱及第三方分享。开发者不对任何菜谱的口味、烹饪成功率、营养价值或准确性做任何明示或暗示的保证。'
                    : 'The recipes and culinary methods in the Recipe Library are aggregated from publicly available culinary resources and traditional culinary practices. We make no representations or warranties regarding the accuracy, culinary outcome, taste, or nutritional completeness of any recipe.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '2. 食品安全、烹饪温度与卫生常识' : '2. Food Safety, Internal Temperatures & Handling'}
                </h4>
                <p>
                  {isZh
                    ? '用户须自行遵循当地公认的食品安全卫生标准，包括但不限于生熟食分开、家禽及肉类彻底煮熟达到安全内部温度、生海鲜及生鸡蛋的食用风险控制、食材保质期管理以及安全冷藏储存。因食材变质、未熟或操作不当引发的食源性疾病由用户自行承担责任。'
                    : 'Users are solely responsible for adhering to recognized food hygiene standards, including safe meat/poultry internal cooking temperatures, safe handling of raw eggs/seafood, preventing cross-contamination between raw and cooked items, and proper refrigeration. We accept no responsibility for foodborne illnesses or spoilage.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '3. 厨房工具与用火用电安全' : '3. Kitchen Equipment & Operational Safety'}
                </h4>
                <p>
                  {isZh
                    ? '在按照菜谱使用刀具、明火、高压锅、热油煎炸、烤箱及各类厨房电器时，用户应具备基本的厨房安全防范能力。本应用不对任何厨房烫伤、割伤、火灾或意外事故承担责任。'
                    : 'Users are solely responsible for exercising standard safety precautions when handling kitchen knives, open flame, hot cooking oil, pressure cookers, ovens, and electrical appliances. We bear no liability for burns, lacerations, kitchen fires, or accidents.'}
                </p>
              </div>
            </div>
          )}

          {/* ─── TAB 3: TERMS & LIABILITY ─── */}
          {activeTab === 'terms' && (
            <div className="space-y-3.5">
              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '1. 条款接受与“现状”提供' : '1. Acceptance of Terms & "As-Is" Provision'}
                </h4>
                <p>
                  {isZh
                    ? '访问或使用 Gyummy 即表示您完全知晓并同意本服务条款。本软件及其云端同步功能按“现状（As-Is）”和“现有（As-Available）”基础提供，不提供任何形式的明示或暗示担保。'
                    : 'By accessing or using Gyummy, you agree to be bound by these Terms of Service. The application, local storage, and cloud synchronization features are provided strictly on an "As-Is" and "As-Available" basis without warranties of any kind.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '2. 知识产权与商业版权保护' : '2. Intellectual Property & Commercial Proprietary Rights'}
                </h4>
                <p>
                  {isZh
                    ? 'Gyummy 的所有原创源代码、前端交互设计、算法（包括过敏原检测引擎、双语分词索引、排餐调度逻辑）、品牌名称、LOGO 及视觉资产均为开发者独家拥有的知识产权，受澳大利亚、美国及国际知识产权与版权法保护（Copyright © 2026 Gyummy. All rights reserved）。未经开发者明确书面授权，任何第三方不得对本软件进行反向工程、反编译、爬取、转售或用于构建竞争性商业服务。'
                    : 'All original source code, user interfaces, proprietary algorithms (including allergen detection engines, cross-lingual indexing, and scheduling engines), branding, logos, and visual assets of Gyummy are the exclusive intellectual property of the developer and protected by Australian, US, and international copyright and intellectual property laws (Copyright © 2026 Gyummy. All rights reserved). Unauthorized copying, scraping, reverse engineering, or resale of the service is strictly prohibited.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '3. 版权保护与 DMCA 避风港下架流程' : '3. Copyright Takedown Notice & DMCA Safe Harbor'}
                </h4>
                <p>
                  {isZh
                    ? 'Gyummy 严格尊重他人知识产权。若任何权利人认为应用中的任何菜谱、文字或图片涉嫌侵犯其合法版权，请发送通知至法定联络邮箱 gilbert.choy.official@gmail.com（包含侵权内容链接与权属证明），开发者将在核实后依据 DMCA 及法定避风港原则及时进行下架或修正处理。'
                    : 'Gyummy respects intellectual property rights. If you believe any recipe, text, or image on the platform infringes upon your copyright, please submit a written takedown notice with proof of ownership to gilbert.choy.official@gmail.com. We will promptly investigate and remove or modify verified infringing content pursuant to applicable DMCA and statutory Safe Harbor provisions.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '4. 用户原创内容（UGC）与社区菜谱数据库许可' : '4. User-Generated Content & Recipe Pool License'}
                </h4>
                <p>
                  {isZh
                    ? '用户对其在 Gyummy 中自行录入或创建的原创家常菜谱享有署名权。为实现多端家庭同步、丰富公共社区菜谱库及持续优化本地离线 AI 膳食模型，用户在录入并同步菜谱时，即授予 Gyummy 一项永久、全球性、免版税、非排他的许可，允许我们对该菜谱数据（包括菜品名、食材配比、烹饪步骤、营养估算）进行去标识化汇总、索引并纳入 Gyummy 社区菜谱数据库。Gyummy 郑重承诺：在归纳菜谱时，将严格剔除所有家庭名称、个人身份及私人照片等隐私信息。'
                    : 'Users retain moral ownership of custom recipes they create. To facilitate multi-device synchronization, enrich the community recipe repository, and train and calibrate our offline AI meal models, users grant Gyummy a perpetual, worldwide, royalty-free, non-exclusive license to anonymize, aggregate, index, format, and incorporate custom recipe data (dish names, ingredients, steps, timings, and nutritional tags) into the master Gyummy recipe pool. Gyummy guarantees that all personally identifying details (family names, member identities, and private photos) are permanently stripped before any recipe aggregation.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '5. 责任限制与最高赔偿额' : '5. Limitation of Liability'}
                </h4>
                <p>
                  {isZh
                    ? '在适用法律允许的最大范围内，无论是合同、侵权（包括疏忽）还是其他法理，开发者对于因使用或无法使用本应用造成的任何直接、间接、附带、特殊、惩罚性或后果性损害（包括但不限于人身伤害、数据丢失、利润损失）均不承担责任。在任何情况下，最高累积赔偿责任不得超过您为使用本服务而向开发者实际支付的金额（若为免费使用，则为 0 元）。'
                    : 'Under no circumstances shall the developer or operator be liable for any direct, indirect, incidental, punitive, or consequential damages (including bodily injury, personal distress, or data loss) arising out of the use of Gyummy. In all events, aggregate liability is strictly limited to the amount paid by you for the service ($0 for free access).'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '6. 适用法律与管辖权 (澳大利亚与国际规范)' : '6. Governing Law & Jurisdiction'}
                </h4>
                <p>
                  {isZh
                    ? '本条款受澳大利亚法律（包括《澳大利亚消费者法》ACL 在合法允许范围内的适用）管辖，并同时参照国际通行的数字消费者标准及美国相关互联网免责通用原则。若任何条款被裁定为无效，其余条款依然完全有效。'
                    : 'These Terms are governed by and construed under the laws of Australia (including applicable provisions of Australian Consumer Law to the extent non-excludable), alongside standard international digital consumer protections and US general disclaimer principles. If any clause is found invalid, remaining clauses remain fully enforceable.'}
                </p>
              </div>
            </div>
          )}

          {/* ─── TAB 4: PRIVACY & DATA ─── */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '1. 数据存储与家庭空间' : '1. Data Storage & Family Spaces'}
                </h4>
                <p>
                  {isZh
                    ? 'Gyummy 尊重您的家庭隐私。您的排餐记录、自定义菜谱、储藏室清单及过敏原偏好保存在您浏览器的本地存储（LocalStorage / IndexedDB）中，并在您连接家庭空间时通过安全加密协议备份至 Google Firebase Firestore。'
                    : 'Gyummy respects your household privacy. Your meal plans, custom recipes, pantry lists, and member preferences are saved locally on your device and synchronized to Google Firebase Firestore under your designated Family Space.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '2. 家庭 PIN 码与访问安全' : '2. PIN Security & Household Access'}
                </h4>
                <p>
                  {isZh
                    ? '您的家庭空间由您设置的 4 位家庭 PIN 码保护。请妥善保管您的家庭名称与 PIN 码。任何知晓该 PIN 码的家庭成员均可同步和编辑家庭共享数据。'
                    : 'Family spaces are protected by your 4-digit family PIN. Please protect your family name and PIN. Any person in possession of your credentials will be able to synchronize and edit your family meal data.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '3. 数据导出与完全控制' : '3. Data Export & User Control'}
                </h4>
                <p>
                  {isZh
                    ? '您可以随时在“设置”页面将您家庭的所有菜谱和排餐数据一键导出为标准的 ZIP / JSON 备份文件，您始终拥有自己数据的完整所有权。'
                    : 'You retain full ownership of your recipes and data. You may export your entire recipe collection and schedules as an offline ZIP archive at any time via the Settings page.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1E1B2E] dark:text-[#F5F2EB] text-[13px] mb-1">
                  {isZh ? '4. 法定注销与彻底删除权 (Right to be Forgotten)' : '4. Statutory Right of Deletion & Account Erasure'}
                </h4>
                <p>
                  {isZh
                    ? '依据《澳大利亚隐私原则》(APP 11)、欧盟通用数据保护条例 (GDPR 第17条被遗忘权) 及加州消费者隐私法案 (CCPA)，用户享有随时撤回授权并彻底永久删除其个人及家庭空间数据的合法权利。您可在“设置 > 账号与隐私管理”中随时点击“永久注销账号与删除家庭数据”。在输入家庭 PIN 码确认后，系统将立即从 Google Firebase 云端数据库彻底抹除该家庭的所有云端数据，并同步清除当前设备上的所有本地缓存，此过程不可逆。'
                    : 'Pursuant to Australian Privacy Principle 11, GDPR Article 17 (Right to Erasure / "Right to be Forgotten"), and the California Consumer Privacy Act (CCPA), users possess the statutory right to permanently delete their account and personal data at any time. You may exercise this right via "Settings > Account & Privacy > Delete Account & Family Data". Upon PIN confirmation, all cloud records in Google Firebase Firestore and all local storage caches are irrevocably and permanently destroyed.'}
                </p>
              </div>
            </div>
          )}

          {/* Contact Footer */}
          <div className="mt-4 pt-3 border-t border-[#EDE8DF] dark:border-[#3D362E] text-[11px] text-[#A89F95] space-y-1">
            <p className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#FFD13B]" />
              <span>{isZh ? '法律与版权联络邮箱：' : 'Legal & Contact Email:'}</span>
              <a
                href="mailto:gilbert.choy.official@gmail.com"
                className="font-semibold text-[#1E1B2E] dark:text-[#F5F2EB] hover:underline"
              >
                gilbert.choy.official@gmail.com
              </a>
            </p>
            <p>
              {isZh ? '最后更新日期：2026 年 9 月' : 'Last Updated: September 2026'}
            </p>
          </div>
        </div>

        {/* Modal Footer Button */}
        <div className="border-t border-[#EDE8DF] bg-[#FAF8F5] px-5 py-3 dark:border-[#3D362E] dark:bg-[#26211C] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#FFD13B] px-5 py-2 text-xs font-bold text-[#1E1B2E] hover:bg-[#FFC720] transition active:scale-95 cursor-pointer shadow-xs"
          >
            {isZh ? '我已阅读并知晓' : 'I Understand & Agree'}
          </button>
        </div>

      </div>
    </div>
  );
};
