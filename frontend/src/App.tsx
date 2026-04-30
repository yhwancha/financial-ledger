import { useState, useMemo, useEffect } from 'react';
import AuthScreen from './AuthScreen';
import {
  Wallet, Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowDownLeft, ArrowUpRight, PiggyBank, AlertTriangle, Target, Pencil,
  PieChart as PieChartIcon, Receipt, Briefcase, TrendingUp, Gift,
  MoreHorizontal, Utensils, Bus, ShoppingBag, Home as HomeIcon, Smartphone,
  HeartPulse, Gamepad2, BookOpen, History, List as ListIcon, Settings,
  Calendar, NotebookPen, X, AlertCircle, Trash2, Info, Palette,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  memo: string;
}

type TabKey = 'home' | 'calendar' | 'list' | 'more';

interface ChartItem { name: string; value: number; color: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComp = React.FC<{ size?: number; strokeWidth?: number; className?: string }>;

interface CatDef { key: string; icon: IconComp; shade?: number; }

// ─── Category / palette constants ─────────────────────────────────────────────

const INCOME_CATS: CatDef[] = [
  { key: '급여',   icon: Briefcase as IconComp },
  { key: '부수입', icon: TrendingUp as IconComp },
  { key: '용돈',   icon: Gift as IconComp },
  { key: '기타',   icon: MoreHorizontal as IconComp },
];

const EXPENSE_CATS: CatDef[] = [
  { key: '식비',   icon: Utensils as IconComp,      shade: 500 },
  { key: '교통',   icon: Bus as IconComp,            shade: 400 },
  { key: '쇼핑',   icon: ShoppingBag as IconComp,    shade: 300 },
  { key: '주거',   icon: HomeIcon as IconComp,       shade: 600 },
  { key: '통신',   icon: Smartphone as IconComp,     shade: 700 },
  { key: '의료',   icon: HeartPulse as IconComp,     shade: 400 },
  { key: '여가',   icon: Gamepad2 as IconComp,       shade: 200 },
  { key: '교육',   icon: BookOpen as IconComp,       shade: 800 },
  { key: '기타',   icon: MoreHorizontal as IconComp, shade: 100 },
];

const PALETTES: Record<string, { label: string; swatch: string; scale: Record<number, string> }> = {
  mint:   { label: '민트',   swatch: '#1fbd72', scale: { 50:'239 253 246',100:'216 251 232',200:'179 245 210',300:'126 234 179',400:'70 214 143', 500:'31 189 114', 600:'17 154 91', 700:'15 122 74', 800:'16 97 61',  900:'14 80 52'  } },
  indigo: { label: '인디고', swatch: '#6366f1', scale: { 50:'238 242 255',100:'224 231 255',200:'199 210 254',300:'165 180 252',400:'129 140 248',500:'99 102 241', 600:'79 70 229', 700:'67 56 202', 800:'55 48 163', 900:'49 46 129' } },
  rose:   { label: '로즈',   swatch: '#f43f5e', scale: { 50:'255 241 242',100:'255 228 230',200:'254 205 211',300:'253 164 175',400:'251 113 133',500:'244 63 94',  600:'225 29 72', 700:'190 18 60', 800:'159 18 57', 900:'136 19 55' } },
  amber:  { label: '앰버',   swatch: '#f59e0b', scale: { 50:'255 251 235',100:'254 243 199',200:'253 230 138',300:'252 211 77', 400:'251 191 36', 500:'245 158 11', 600:'217 119 6', 700:'180 83 9',  800:'146 64 14', 900:'120 53 15' } },
  slate:  { label: '슬레이트',swatch: '#475569', scale: { 50:'248 250 252',100:'241 245 249',200:'226 232 240',300:'203 213 225',400:'148 163 184',500:'100 116 139',600:'71 85 105', 700:'51 65 85',  800:'30 41 59',  900:'15 23 42'  } },
  plum:   { label: '플럼',   swatch: '#a855f7', scale: { 50:'250 245 255',100:'243 232 255',200:'233 213 255',300:'216 180 254',400:'192 132 252',500:'168 85 247', 600:'147 51 234',700:'126 34 206',800:'107 33 168', 900:'88 28 135' } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KRW = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');
const KRW_signed = (n: number, type: string) => (type === 'income' ? '+' : '−') + KRW(Math.abs(n));
const ymKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}월 ${d}일`;
};

const fmtWeekday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return ['일','월','화','수','목','금','토'][new Date(y, m-1, d).getDay()];
};

function compactKRW(n: number) {
  n = Math.round(Math.abs(n));
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 10000) { const v = n / 10000; return (v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + '만'; }
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + '천';
  return String(n);
}

const catMeta = (type: string, key: string): CatDef => {
  const list = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  return list.find(c => c.key === key) ?? list[list.length - 1];
};

const accentColor = (theme: string, shade: number) => {
  const p = PALETTES[theme] ?? PALETTES.mint;
  return `rgb(${p.scale[shade]})`;
};

function applyPalette(key: string) {
  const p = PALETTES[key];
  if (!p) return;
  const root = document.documentElement;
  Object.entries(p.scale).forEach(([shade, channels]) => {
    root.style.setProperty(`--color-mint-${shade}`, `rgb(${channels})`);
  });
}

// ─── Sample data ──────────────────────────────────────────────────────────────

function buildSampleData(): Transaction[] {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const ym = (offset: number) => { const d = new Date(y, m + offset, 1); return { y: d.getFullYear(), m: d.getMonth() }; };
  const iso = (yy: number, mm: number, dd: number) =>
    `${yy}-${String(mm+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  const cur = ym(0), prev = ym(-1);
  let id = 1;
  const tx = (date: string, type: 'income'|'expense', category: string, amount: number, memo: string): Transaction =>
    ({ id: id++, date, type, category, amount, memo });
  return [
    tx(iso(cur.y,cur.m,25),'expense','식비',  12800,'점심 백반'),
    tx(iso(cur.y,cur.m,25),'expense','교통',   1500,'지하철'),
    tx(iso(cur.y,cur.m,24),'expense','쇼핑',  45900,'운동화 끈'),
    tx(iso(cur.y,cur.m,23),'expense','식비',   8900,'편의점 도시락'),
    tx(iso(cur.y,cur.m,22),'expense','여가',  18000,'영화 1인'),
    tx(iso(cur.y,cur.m,21),'expense','식비',  34500,'친구랑 저녁'),
    tx(iso(cur.y,cur.m,20),'expense','통신',  55000,'휴대폰 요금'),
    tx(iso(cur.y,cur.m,18),'expense','주거', 680000,'월세'),
    tx(iso(cur.y,cur.m,17),'expense','의료',  15000,'감기약'),
    tx(iso(cur.y,cur.m,15),'expense','식비',  23000,'장보기'),
    tx(iso(cur.y,cur.m,12),'expense','교육',  89000,'온라인 강의'),
    tx(iso(cur.y,cur.m,10),'expense','교통',  60000,'교통카드 충전'),
    tx(iso(cur.y,cur.m, 8),'expense','식비',   7200,'아침 김밥'),
    tx(iso(cur.y,cur.m, 5),'expense','쇼핑', 120000,'셔츠 2벌'),
    tx(iso(cur.y,cur.m, 3),'expense','식비',  14500,'점심 파스타'),
    tx(iso(cur.y,cur.m,25),'income', '부수입',80000,'중고 판매'),
    tx(iso(cur.y,cur.m,10),'income', '용돈',100000,'부모님'),
    tx(iso(cur.y,cur.m, 1),'income', '급여',2800000,'4월 월급'),
    tx(iso(prev.y,prev.m,28),'expense','식비',  45000,'저녁 외식'),
    tx(iso(prev.y,prev.m,18),'expense','주거',680000,'월세'),
    tx(iso(prev.y,prev.m, 1),'income', '급여',2800000,'지난달 월급'),
  ];
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ monthLabel, onPrev, onNext, onToday, tab }: {
  monthLabel: string; onPrev: () => void; onNext: () => void;
  onToday: () => void; tab: TabKey;
}) {
  const showNav = tab !== 'more';
  return (
    <header className="pt-6 pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-mint-500 grid place-items-center shadow-soft">
            <Wallet size={16} strokeWidth={2.4} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-400 font-semibold">Ledger</div>
            <div className="text-[15px] font-semibold text-ink-900 -mt-0.5">
              {tab === 'more' ? '설정' : '가계부'}
            </div>
          </div>
        </div>
        {showNav && (
          <button onClick={onToday} className="text-xs font-medium text-ink-500 hover:text-mint-600 px-2.5 py-1.5 rounded-lg hover:bg-mint-50 transition">
            오늘
          </button>
        )}
      </div>

      {showNav && (
        <div className="mt-5 flex items-center justify-between bg-white rounded-2xl border border-ink-100 px-2 py-2 shadow-soft">
          <button onClick={onPrev} aria-label="이전 달" className="h-10 w-10 grid place-items-center rounded-xl text-ink-500 hover:text-mint-600 hover:bg-mint-50 active:scale-95 transition">
            <ChevronLeft size={20} />
          </button>
          <div className="text-[18px] font-bold tnum text-ink-900">{monthLabel}</div>
          <button onClick={onNext} aria-label="다음 달" className="h-10 w-10 grid place-items-center rounded-xl text-ink-500 hover:text-mint-600 hover:bg-mint-50 active:scale-95 transition">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </header>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ totals, compact = false }: {
  totals: { income: number; expense: number; balance: number }; compact?: boolean;
}) {
  const positive = totals.balance >= 0;
  if (compact) {
    return (
      <section className="mt-4">
        <div className="bg-white rounded-2xl border border-ink-100 shadow-soft px-3 py-3 grid grid-cols-3 divide-x divide-ink-100">
          <CompactStat label="수입"  value={totals.income}  cls="text-blue-600" />
          <CompactStat label="지출"  value={totals.expense} cls="text-rose-600" />
          <CompactStat label="잔액"  value={Math.abs(totals.balance)}
            cls={positive ? 'text-mint-700' : 'text-rose-600'}
            prefix={positive ? '' : '−'} />
        </div>
      </section>
    );
  }
  return (
    <section className="mt-4">
      <div className="bg-white rounded-2xl border border-ink-100 shadow-soft overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-ink-100">
          <Stat label="수입" value={totals.income} cls="text-blue-600" icon={<ArrowDownLeft size={14} strokeWidth={2.4} />} iconCls="text-blue-600 bg-blue-50" />
          <Stat label="지출" value={totals.expense} cls="text-rose-600" icon={<ArrowUpRight size={14} strokeWidth={2.4} />} iconCls="text-rose-600 bg-rose-50" />
        </div>
        <div className="border-t border-ink-100 px-4 py-4 flex items-center justify-between bg-gradient-to-br from-mint-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 rounded-xl grid place-items-center ${positive ? 'bg-mint-100 text-mint-700' : 'bg-rose-100 text-rose-600'}`}>
              {positive ? <PiggyBank size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <div className="text-[11px] text-ink-500 font-medium">잔액</div>
              <div className="text-[10px] text-ink-400">수입 − 지출</div>
            </div>
          </div>
          <div className={`text-[22px] font-bold tnum ${positive ? 'text-mint-700' : 'text-rose-600'}`}>
            {positive ? '' : '−'}{KRW(Math.abs(totals.balance))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CompactStat({ label, value, cls, prefix = '' }: { label: string; value: number; cls: string; prefix?: string }) {
  return (
    <div className="px-2 text-center">
      <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-[14px] font-bold tnum ${cls}`}>{prefix}{KRW(value)}</div>
    </div>
  );
}

function Stat({ label, value, cls, icon, iconCls }: {
  label: string; value: number; cls: string;
  icon: React.ReactNode; iconCls: string;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-lg grid place-items-center ${iconCls}`}>{icon}</div>
        <span className="text-[12px] text-ink-500 font-medium">{label}</span>
      </div>
      <div className={`mt-2 text-[20px] font-bold tnum ${cls}`}>{KRW(value)}</div>
    </div>
  );
}

// ─── Budget card ──────────────────────────────────────────────────────────────

function BudgetCard({ budget, spent, pct, over, onSave }: {
  budget: number; spent: number; pct: number; over: boolean;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(budget);
  useEffect(() => { if (editing) setDraft(budget); }, [editing, budget]);

  return (
    <section className="mt-3 bg-white rounded-2xl border border-ink-100 shadow-soft p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-mint-600" />
          <span className="text-sm font-semibold text-ink-900">월 예산</span>
          {over && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">초과</span>}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-ink-500 hover:text-mint-600 font-medium inline-flex items-center gap-1">
            <Pencil size={12} /> 수정
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-[13px] text-ink-500 tnum">
              <span className={`font-semibold ${over ? 'text-rose-600' : 'text-ink-900'}`}>{KRW(spent)}</span>
              <span className="text-ink-400"> / {KRW(budget)}</span>
            </div>
            <div className={`text-[13px] font-bold tnum ${over ? 'text-rose-600' : 'text-mint-700'}`}>{Math.round(pct)}%</div>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-ink-100 overflow-hidden">
            <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${over ? 'bg-rose-500' : 'bg-mint-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="mt-2 text-[12px] text-ink-500">
            {over
              ? <>예산을 <span className="font-semibold text-rose-600 tnum">{KRW(spent - budget)}</span> 초과했어요</>
              : <>이번 달 남은 예산 <span className="font-semibold text-mint-700 tnum">{KRW(Math.max(0, budget - spent))}</span></>}
          </div>
        </>
      ) : (
        <div className="mt-3 anim-slidedown">
          <label className="text-[12px] text-ink-500 font-medium">예산 금액</label>
          <div className="mt-1 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 font-medium">₩</span>
              <input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(Number(e.target.value || 0))}
                className="w-full rounded-xl border border-ink-200 bg-white pl-8 pr-3 py-2.5 tnum text-[15px] focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200" />
            </div>
            <button onClick={() => { onSave(Math.max(0, draft)); setEditing(false); }}
              className="px-3.5 py-2.5 rounded-xl bg-mint-500 text-white text-sm font-semibold hover:bg-mint-600 active:scale-95 transition">저장</button>
            <button onClick={() => setEditing(false)}
              className="px-3 py-2.5 rounded-xl bg-ink-100 text-ink-700 text-sm font-medium hover:bg-ink-200 active:scale-95 transition">취소</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[500000,1000000,1500000,2000000,3000000].map(v => (
              <button key={v} onClick={() => setDraft(v)}
                className={`text-[11px] px-2 py-1 rounded-lg tnum font-medium transition ${draft === v ? 'bg-mint-500 text-white' : 'bg-ink-100 text-ink-700 hover:bg-mint-50 hover:text-mint-700'}`}>
                {KRW(v)}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Donut card ───────────────────────────────────────────────────────────────

function DonutCard({ data, total }: { data: ChartItem[]; total: number }) {
  const has = data.length > 0 && total > 0;
  return (
    <section className="mt-3 bg-white rounded-2xl border border-ink-100 shadow-soft p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChartIcon size={15} className="text-mint-600" />
          <span className="text-sm font-semibold text-ink-900">카테고리별 지출</span>
        </div>
        <span className="text-[11px] text-ink-400 font-medium tnum">{data.length}개 항목</span>
      </div>

      {!has ? (
        <div className="mt-4 py-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-ink-50 grid place-items-center">
            <Receipt size={20} className="text-ink-400" />
          </div>
          <div className="mt-2 text-[13px] text-ink-500">이번 달 지출 내역이 없어요</div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[140px_1fr] gap-4 items-center">
          <div className="relative h-[140px] w-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={46} outerRadius={66} paddingAngle={2} stroke="none">
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip cursor={false} content={(props) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { active, payload } = props as any;
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  const pct = total ? ((p.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-ink-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg">
                      <div className="font-semibold">{p.name}</div>
                      <div className="tnum opacity-90">{KRW(p.value)} · {pct}%</div>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-[10px] text-ink-400 font-medium">총 지출</div>
                <div className="text-[13px] font-bold tnum text-ink-900 mt-0.5">{KRW(total)}</div>
              </div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {data.slice(0, 5).map(d => {
              const pct = total ? (d.value / total) * 100 : 0;
              return (
                <li key={d.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-ink-700 font-medium flex-1 truncate">{d.name}</span>
                  <span className="tnum text-ink-400">{pct.toFixed(0)}%</span>
                  <span className="tnum text-ink-900 font-semibold w-[68px] text-right">{KRW(d.value)}</span>
                </li>
              );
            })}
            {data.length > 5 && <li className="text-[11px] text-ink-400 pl-4">외 {data.length - 5}개 카테고리</li>}
          </ul>
        </div>
      )}
    </section>
  );
}

// ─── Calendar card ────────────────────────────────────────────────────────────

function CalendarCard({ cursor, dailyTotals, selectedDate, onSelectDate }: {
  cursor: Date;
  dailyTotals: Map<string, { income: number; expense: number }>;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
}) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayISO();

  const cells: Array<{ d: number; iso: string; totals?: { income: number; expense: number } } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, iso, totals: dailyTotals.get(iso) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="mt-3 bg-white rounded-2xl border border-ink-100 shadow-soft p-3">
      <div className="grid grid-cols-7 gap-1 px-1 pb-1.5">
        {['일','월','화','수','목','금','토'].map((w, i) => (
          <div key={w} className={`text-[10px] font-semibold text-center py-1 ${i===0?'text-rose-500':i===6?'text-blue-500':'text-ink-400'}`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c) return <div key={idx} className="aspect-[1/1.05]" />;
          const dow = (firstDow + c.d - 1) % 7;
          const selected = selectedDate === c.iso;
          const today = c.iso === todayStr;
          return (
            <button key={c.iso} type="button"
              onClick={() => onSelectDate(selected ? null : c.iso)}
              className={`group aspect-[1/1.05] rounded-lg p-1 text-left flex flex-col transition active:scale-95 ${selected ? 'bg-mint-500 text-white shadow-sm' : 'hover:bg-ink-50 border border-transparent'} ${today && !selected ? 'border-mint-300' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold tnum ${selected?'text-white':dow===0?'text-rose-500':dow===6?'text-blue-500':'text-ink-700'}`}>{c.d}</span>
                {today && !selected && <span className="h-1 w-1 rounded-full bg-mint-500" />}
              </div>
              {c.totals && (
                <div className="mt-auto space-y-0.5 leading-tight">
                  {c.totals.income > 0 && <div className={`text-[8.5px] tnum truncate font-semibold ${selected?'text-white/95':'text-blue-600'}`}>+{compactKRW(c.totals.income)}</div>}
                  {c.totals.expense > 0 && <div className={`text-[8.5px] tnum truncate font-semibold ${selected?'text-white/90':'text-rose-600'}`}>−{compactKRW(c.totals.expense)}</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-4 text-[10px] text-ink-400 font-medium">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> 수입</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> 지출</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full border border-mint-400" /> 오늘</span>
      </div>
    </section>
  );
}

// ─── Recent list ──────────────────────────────────────────────────────────────

function RecentList({ groups, onSeeAll, empty }: {
  groups: [string, Transaction[]][]; onSeeAll: () => void; empty: boolean;
}) {
  return (
    <section className="bg-white rounded-2xl border border-ink-100 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
        <div className="flex items-center gap-2">
          <History size={15} className="text-mint-600" />
          <span className="text-sm font-semibold text-ink-900">최근 내역</span>
        </div>
        <button onClick={onSeeAll} className="text-[12px] font-medium text-ink-500 hover:text-mint-700 inline-flex items-center gap-0.5">
          전체 보기 <ChevronRight size={13} />
        </button>
      </div>
      {empty ? (
        <div className="px-4 py-8 text-center"><div className="text-[12px] text-ink-400">이번 달 내역이 없어요</div></div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {groups.flatMap(([, items]) => items.slice(0, 4).map(t => <MiniRow key={t.id} tx={t} />)).slice(0, 5)}
        </ul>
      )}
    </section>
  );
}

function MiniRow({ tx }: { tx: Transaction }) {
  const meta = catMeta(tx.type, tx.category);
  const Icon = meta.icon;
  const isIncome = tx.type === 'income';
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className={`h-8 w-8 rounded-lg grid place-items-center flex-shrink-0 ${isIncome ? 'bg-blue-50 text-blue-600' : 'bg-mint-50 text-mint-700'}`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-ink-900 truncate">{tx.memo || tx.category}</div>
        <div className="text-[10px] text-ink-400">{fmtDate(tx.date)} · {tx.category}</div>
      </div>
      <div className={`text-[12px] font-bold tnum flex-shrink-0 ${isIncome ? 'text-blue-600' : 'text-rose-600'}`}>
        {KRW_signed(tx.amount, tx.type)}
      </div>
    </li>
  );
}

// ─── Entry form ───────────────────────────────────────────────────────────────

function EntryForm({ initial, defaultDate, onSubmit, onCancel }: {
  initial: Transaction | null; defaultDate: string;
  onSubmit: (tx: Omit<Transaction, 'id'> & { id?: number }) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'expense'|'income'>(initial?.type ?? 'expense');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category ?? '식비');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    const list = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
    if (!list.find(c => c.key === category)) setCategory(list[0].key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!date) return setError('날짜를 입력하세요');
    if (!num || num <= 0) return setError('금액을 0보다 큰 수로 입력하세요');
    setError('');
    onSubmit({ id: initial?.id, date, type, category, amount: Math.round(num), memo: memo.trim() });
  };

  return (
    <form id="entry-form" onSubmit={submit} className="mt-2 bg-white rounded-2xl border border-ink-100 shadow-soft p-4 anim-slidedown">
      <div className="grid grid-cols-2 bg-ink-50 rounded-xl p-1 text-[13px] font-semibold">
        <button type="button" onClick={() => setType('expense')}
          className={`py-2 rounded-lg transition ${type==='expense'?'bg-white shadow-sm text-rose-600':'text-ink-400'}`}>지출</button>
        <button type="button" onClick={() => setType('income')}
          className={`py-2 rounded-lg transition ${type==='income'?'bg-white shadow-sm text-blue-600':'text-ink-400'}`}>수입</button>
      </div>

      <div className="mt-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">금액</label>
        <div className="mt-1 relative">
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-bold ${type==='income'?'text-blue-500':'text-rose-500'}`}>₩</span>
          <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 py-3 text-[22px] font-bold tnum text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200" />
          {Number(amount) > 0 && <div className="mt-1 text-[11px] text-ink-400 tnum pl-1">{KRW(Number(amount))}</div>}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">날짜</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[14px] tnum focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200" />
      </div>

      <div className="mt-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">카테고리</label>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {cats.map(c => {
            const Icon = c.icon;
            const active = category === c.key;
            return (
              <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition ${active?'border-mint-500 bg-mint-50 text-mint-700':'border-ink-100 bg-white text-ink-500 hover:border-ink-200'}`}>
                <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[11px] font-medium">{c.key}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">메모</label>
        <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 점심 백반" maxLength={40}
          className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[14px] focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200" />
      </div>

      {error && <div className="mt-3 text-[12px] text-rose-600 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</div>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-ink-100 text-ink-700 text-sm font-semibold hover:bg-ink-200 active:scale-95 transition">취소</button>
        <button type="submit"
          className="flex-[1.5] py-3 rounded-xl bg-mint-500 text-white text-sm font-semibold hover:bg-mint-600 active:scale-95 transition shadow-sm">
          {initial ? '저장' : '추가'}
        </button>
      </div>
    </form>
  );
}

// ─── Transaction list ─────────────────────────────────────────────────────────

function TransactionList({ groups, onEdit, onDelete, monthLabel, selectedDate, onClearDate, hideHeading }: {
  groups: [string, Transaction[]][]; onEdit: (tx: Transaction) => void; onDelete: (id: number) => void;
  monthLabel: string; selectedDate: string | null; onClearDate: () => void; hideHeading?: boolean;
}) {
  return (
    <section className={hideHeading ? '' : 'mt-6'}>
      {!hideHeading && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-500">거래 내역</h2>
            {selectedDate && (
              <button onClick={onClearDate}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-mint-700 bg-mint-50 hover:bg-mint-100 px-2 py-0.5 rounded-full transition">
                {fmtDate(selectedDate)} ({fmtWeekday(selectedDate)}) <X size={11} strokeWidth={2.6} />
              </button>
            )}
          </div>
          <span className="text-[11px] text-ink-400 tnum">{groups.reduce((a, [,l]) => a + l.length, 0)}건</span>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-soft py-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-mint-50 grid place-items-center">
            <NotebookPen size={22} className="text-mint-600" />
          </div>
          <div className="mt-3 text-[14px] font-semibold text-ink-900">
            {selectedDate ? `${fmtDate(selectedDate)} 내역이 없어요` : `${monthLabel} 내역이 비었어요`}
          </div>
          <div className="mt-1 text-[12px] text-ink-500">+ 버튼으로 첫 내역을 추가해보세요</div>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(([date, items]) => {
            const dayTotal = items.reduce((acc, t) => acc + (t.type==='income' ? t.amount : -t.amount), 0);
            return (
              <div key={date} className="bg-white rounded-2xl border border-ink-100 shadow-soft overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-bold text-ink-900">{fmtDate(date)}</span>
                    <span className="text-[11px] text-ink-400 font-medium">({fmtWeekday(date)})</span>
                  </div>
                  <span className={`text-[11px] tnum font-semibold ${dayTotal >= 0 ? 'text-mint-700' : 'text-ink-400'}`}>
                    {dayTotal >= 0 ? '+' : '−'}{KRW(Math.abs(dayTotal))}
                  </span>
                </div>
                <ul className="divide-y divide-ink-100">
                  {items.map(t => <TxRow key={t.id} tx={t} onEdit={onEdit} onDelete={onDelete} />)}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TxRow({ tx, onEdit, onDelete }: { tx: Transaction; onEdit: (t: Transaction) => void; onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const meta = catMeta(tx.type, tx.category);
  const Icon = meta.icon;
  const isIncome = tx.type === 'income';
  return (
    <li>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-50/60 active:bg-ink-100 transition">
        <div className={`h-10 w-10 rounded-xl grid place-items-center flex-shrink-0 ${isIncome?'bg-blue-50 text-blue-600':'bg-mint-50 text-mint-700'}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink-900 truncate">{tx.memo || tx.category}</div>
          <div className="text-[11px] text-ink-400 mt-0.5">{tx.category}</div>
        </div>
        <div className={`text-[14px] font-bold tnum flex-shrink-0 ${isIncome?'text-blue-600':'text-rose-600'}`}>
          {KRW_signed(tx.amount, tx.type)}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 -mt-1 flex gap-2 anim-slidedown">
          <button onClick={() => onEdit(tx)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 text-[12px] font-semibold transition">
            <Pencil size={13} /> 수정
          </button>
          <button onClick={() => { if (window.confirm('이 내역을 삭제할까요?')) onDelete(tx.id); }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[12px] font-semibold transition">
            <Trash2 size={13} /> 삭제
          </button>
        </div>
      )}
    </li>
  );
}

// ─── Bottom tabs ──────────────────────────────────────────────────────────────

function BottomTabs({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; icon: IconComp }[] = [
    { key: 'home',     label: '홈',     icon: HomeIcon as IconComp },
    { key: 'calendar', label: '캘린더', icon: Calendar as IconComp },
    { key: 'list',     label: '내역',   icon: ListIcon as IconComp },
    { key: 'more',     label: '설정',   icon: Settings as IconComp },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-ink-100 bg-white/85 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto max-w-md grid grid-cols-4">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = value === t.key;
          return (
            <button key={t.key} onClick={() => onChange(t.key)}
              className={`flex flex-col items-center gap-1 pt-2.5 pb-2.5 transition ${active?'text-mint-600':'text-ink-400 hover:text-ink-700'}`}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className={`text-[10px] ${active?'font-bold':'font-medium'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── More / Settings page ─────────────────────────────────────────────────────

function MorePage({ budget, onSaveBudget, theme, onSetTheme, txCount, monthLabel, email, onLogout }: {
  budget: number; onSaveBudget: (v: number) => void;
  theme: string; onSetTheme: (k: string) => void;
  txCount: number; monthLabel: string;
  email: string; onLogout: () => void;
}) {
  const [draftBudget, setDraftBudget] = useState(budget);
  useEffect(() => { setDraftBudget(budget); }, [budget]);

  return (
    <div className="space-y-4 pt-1">
      <section className="bg-white rounded-2xl border border-ink-100 shadow-soft p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={15} className="text-mint-600" />
          <span className="text-sm font-semibold text-ink-900">테마 색상</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PALETTES).map(([key, p]) => {
            const active = theme === key;
            return (
              <button key={key} onClick={() => onSetTheme(key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition ${active?'border-mint-500 bg-mint-50 text-mint-700':'border-ink-100 bg-white text-ink-700 hover:border-ink-200'}`}>
                <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ background: p.swatch, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-ink-100 shadow-soft p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={15} className="text-mint-600" />
          <span className="text-sm font-semibold text-ink-900">{monthLabel} 예산</span>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 font-medium">₩</span>
          <input type="number" inputMode="numeric" value={draftBudget} onChange={e => setDraftBudget(Number(e.target.value || 0))}
            className="w-full rounded-xl border border-ink-200 bg-white pl-8 pr-3 py-3 tnum text-[16px] focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[500000,1000000,1500000,2000000,3000000].map(v => (
            <button key={v} onClick={() => setDraftBudget(v)}
              className={`text-[11px] px-2 py-1 rounded-lg tnum font-medium transition ${draftBudget===v?'bg-mint-500 text-white':'bg-ink-100 text-ink-700 hover:bg-mint-50 hover:text-mint-700'}`}>
              {KRW(v)}
            </button>
          ))}
        </div>
        <button onClick={() => onSaveBudget(Math.max(0, draftBudget))} disabled={draftBudget === budget}
          className="mt-3 w-full py-2.5 rounded-xl bg-mint-500 text-white text-sm font-semibold hover:bg-mint-600 active:scale-[0.98] transition disabled:bg-ink-200 disabled:text-ink-400">
          {draftBudget === budget ? '저장됨' : '예산 저장'}
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-ink-100 shadow-soft p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-mint-600" />
          <span className="text-sm font-semibold text-ink-900">정보</span>
        </div>
        <div className="space-y-2 text-[12px]">
          {[['저장된 거래', `${txCount}건`],['버전','1.0.0'],['화폐 단위','대한민국 원 (KRW)']].map(([l,v]) => (
            <div key={l} className="flex items-center justify-between py-1">
              <span className="text-ink-500">{l}</span>
              <span className="text-ink-900 font-semibold tnum">{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 계정 */}
      <section className="bg-white rounded-2xl border border-ink-100 shadow-soft p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-ink-400 font-medium">로그인 계정</div>
            <div className="text-[13px] font-semibold text-ink-900 mt-0.5">{email}</div>
          </div>
          <button onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-[12px] font-semibold hover:bg-rose-100 transition">
            로그아웃
          </button>
        </div>
      </section>

      <p className="text-center text-[11px] text-ink-400 pt-2 pb-4">Ledger · 개인 가계부</p>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [email, setEmail] = useState<string>(() => localStorage.getItem('email') ?? '');

  const handleLogin = (newToken: string, newEmail: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('email', newEmail);
    setToken(newToken);
    setEmail(newEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setToken(null);
    setEmail('');
  };

  if (!token) return <AuthScreen onLogin={handleLogin} />;

  return <LedgerApp email={email} onLogout={handleLogout} />;
}

function LedgerApp({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>(buildSampleData);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('home');
  const [theme, setTheme] = useState('mint');

  useEffect(() => { applyPalette(theme); }, [theme]);

  const monthKey = ymKey(cursor);
  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;

  const monthTx = useMemo(() =>
    transactions.filter(t => t.date.startsWith(monthKey))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id),
    [transactions, monthKey]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    monthTx.forEach(t => { if (t.type==='income') income += t.amount; else expense += t.amount; });
    return { income, expense, balance: income - expense };
  }, [monthTx]);

  const expenseByCat = useMemo<ChartItem[]>(() => {
    const map = new Map<string, number>();
    monthTx.filter(t => t.type === 'expense').forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value, color: accentColor(theme, catMeta('expense', name).shade ?? 500) }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx, theme]);

  const budget = budgets[monthKey] ?? 1500000;
  const budgetPct = budget > 0 ? Math.min(999, (totals.expense / budget) * 100) : 0;
  const overBudget = totals.expense > budget && budget > 0;

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    monthTx.forEach(t => { if (!map.has(t.date)) map.set(t.date, []); map.get(t.date)!.push(t); });
    return [...map.entries()];
  }, [monthTx]);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    monthTx.forEach(t => {
      const cur = map.get(t.date) ?? { income: 0, expense: 0 };
      if (t.type === 'income') cur.income += t.amount; else cur.expense += t.amount;
      map.set(t.date, cur);
    });
    return map;
  }, [monthTx]);

  useEffect(() => { setSelectedDate(null); }, [monthKey]);

  const visibleGroups = useMemo(() =>
    selectedDate ? groupedByDate.filter(([d]) => d === selectedDate) : groupedByDate,
    [groupedByDate, selectedDate]);

  const moveMonth = (delta: number) => setCursor(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  const upsertTx = (tx: Omit<Transaction, 'id'> & { id?: number }) => {
    if (tx.id) {
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...tx, id: tx.id! } : t));
    } else {
      const newId = Math.max(0, ...transactions.map(t => t.id)) + 1;
      setTransactions(prev => [{ ...tx, id: newId } as Transaction, ...prev]);
    }
    setEditing(null); setFormOpen(false);
  };

  const removeTx = (id: number) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  const startEdit = (tx: Transaction) => {
    setEditing(tx); setFormOpen(true); setTab('list');
    setTimeout(() => document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const switchTab = (next: TabKey) => {
    if (next !== 'calendar') setSelectedDate(null);
    setTab(next); setFormOpen(false); setEditing(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <Header monthLabel={monthLabel} onPrev={() => moveMonth(-1)} onNext={() => moveMonth(+1)}
          onToday={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} tab={tab} />

        {/* HOME */}
        {tab === 'home' && (
          <div className="space-y-3 anim-slidedown">
            <SummaryCards totals={totals} />
            <BudgetCard budget={budget} spent={totals.expense} pct={budgetPct} over={overBudget}
              onSave={v => setBudgets(p => ({ ...p, [monthKey]: v }))} />
            <DonutCard data={expenseByCat} total={totals.expense} />
            <RecentList groups={groupedByDate.slice(0, 3)} onSeeAll={() => setTab('list')} empty={groupedByDate.length === 0} />
          </div>
        )}

        {/* CALENDAR */}
        {tab === 'calendar' && (
          <div className="space-y-3 anim-slidedown">
            <SummaryCards totals={totals} compact />
            <CalendarCard cursor={cursor} dailyTotals={dailyTotals} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            {selectedDate && (
              <TransactionList groups={visibleGroups} onEdit={startEdit} onDelete={removeTx}
                monthLabel={monthLabel} selectedDate={selectedDate} onClearDate={() => setSelectedDate(null)} hideHeading />
            )}
          </div>
        )}

        {/* LIST */}
        {tab === 'list' && (
          <div className="space-y-3 anim-slidedown">
            <SummaryCards totals={totals} compact />
            <div className="mt-5 flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-500">
                {editing ? '내역 수정' : '새 내역'}
              </h2>
              <button onClick={() => { if (formOpen && editing) setEditing(null); setFormOpen(o => !o); }}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-500 hover:text-mint-600 px-2 py-1 rounded-lg transition">
                {formOpen ? '접기' : '펴기'} {formOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {formOpen && (
              <EntryForm key={editing?.id ?? 'new'} initial={editing} defaultDate={selectedDate ?? todayISO()}
                onSubmit={upsertTx} onCancel={() => { setEditing(null); setFormOpen(false); }} />
            )}
            <TransactionList groups={visibleGroups} onEdit={startEdit} onDelete={removeTx}
              monthLabel={monthLabel} selectedDate={selectedDate} onClearDate={() => setSelectedDate(null)} />
          </div>
        )}

        {/* MORE */}
        {tab === 'more' && (
          <div className="anim-slidedown">
            <MorePage budget={budget} onSaveBudget={v => setBudgets(p => ({ ...p, [monthKey]: v }))}
              theme={theme} onSetTheme={k => { setTheme(k); applyPalette(k); }}
              txCount={transactions.length} monthLabel={monthLabel}
              email={email} onLogout={onLogout} />
          </div>
        )}
      </div>

      {/* FAB */}
      {tab !== 'more' && !formOpen && (
        <button onClick={() => { setEditing(null); setFormOpen(true); setTab('list'); setTimeout(() => document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
          className="fixed bottom-[88px] right-6 sm:right-[max(1.5rem,calc(50vw-220px))] z-30 inline-flex items-center gap-2 rounded-full bg-mint-500 px-5 py-3.5 text-white shadow-lg active:scale-95 transition">
          <Plus size={18} strokeWidth={2.5} />
          <span className="text-sm font-semibold">내역 추가</span>
        </button>
      )}

      <BottomTabs value={tab} onChange={switchTab} />
    </div>
  );
}
