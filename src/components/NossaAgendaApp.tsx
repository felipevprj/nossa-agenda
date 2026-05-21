import { useState, useMemo } from "react";
import {
  Calendar, CalendarDays, CheckSquare, Home, ListPlus, Mic, Plus,
  Radar, ShoppingCart, Sparkles, Trash2, Users, X, Pencil, Copy as CopyIcon,
  Bell, ChevronRight
} from "lucide-react";
import { parseEventInput } from "../lib/parser";
import { uid, nowISO } from "../lib/storage";
import { PEOPLE, F1_ROUTINE } from "../lib/people";
import { usePersonPhotos, fileToDataUrl } from "../lib/photos";
import { generateRadarInsights, formatBR } from "../lib/radar";
import { useAgendaSync } from "../lib/firebase";
import type {
  AgendaEvent, AgendaTask, Category, ParsedResult,
  PersonCode, Priority, ShoppingItem,
} from "../lib/types";

type View = "today" | "add" | "month" | "week" | "day" | "tasks" | "shopping" | "family" | "radar";

const FAMILY_ID = "nossa-familia";
const CREATED_BY = "F1";
const CATEGORIES: Category[] = ["Saúde", "Trabalho", "Escola", "Casa", "Família", "Evento", "Documento", "Outro"];

export default function NossaAgendaApp() {
  const [view, setView] = useState<View>("today");
  const [selectedDay, setSelectedDay] = useState<string>(toISODate(new Date()));
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [defaultDateForAdd, setDefaultDateForAdd] = useState<string | undefined>(undefined);

  const { events, setEvents, tasks, setTasks, shopping, setShopping, isLoading } = useAgendaSync();

  function openDay(date: string) { setSelectedDay(date); setView("day"); }
  function openAddForDay(date: string) { setDefaultDateForAdd(date); setView("add"); }

  function saveParsed(parsed: ParsedResult) {
    const now = nowISO();
    if (parsed.kind === "event") {
      const e: AgendaEvent = {
        id: uid(), type: "event", familyId: FAMILY_ID, createdBy: CREATED_BY,
        personCode: parsed.data.personCode ?? null,
        personName: parsed.data.personCode && PEOPLE[parsed.data.personCode] ? PEOPLE[parsed.data.personCode].name : null,
        title: parsed.data.title ?? "Sem título", date: parsed.data.date ?? null,
        startTime: parsed.data.startTime ?? null, endTime: parsed.data.endTime ?? null,
        durationMinutes: parsed.data.durationMinutes ?? null, location: parsed.data.location ?? null,
        category: parsed.data.category ?? "Evento", priority: parsed.data.priority ?? "Normal",
        reminders: parsed.data.reminders ?? ["1 dia antes"], notes: "", sourceText: parsed.data.sourceText ?? "",
        createdAt: now, updatedAt: now, isAllDay: !parsed.data.startTime,
        isRecurring: false, recurrenceRule: null, needsConfirmation: false, missingFields: [],
      };
      setEvents((prev) => [...prev, e]);
    } else if (parsed.kind === "task") {
      const t: AgendaTask = {
        id: uid(), type: "task", familyId: FAMILY_ID, createdBy: CREATED_BY,
        personCode: parsed.data.personCode ?? null, title: parsed.data.title ?? "Tarefa",
        date: parsed.data.date ?? null, category: parsed.data.category ?? "Casa",
        priority: parsed.data.priority ?? "Normal", status: "pendente",
        sourceText: parsed.data.sourceText ?? "", createdAt: now, updatedAt: now,
      };
      setTasks((prev) => [...prev, t]);
    } else {
      const s: ShoppingItem = {
        id: uid(), type: "shopping", familyId: FAMILY_ID,
        item: parsed.data.item ?? "", quantity: parsed.data.quantity ?? null,
        category: parsed.data.category ?? "Outros", status: "pendente", notes: "",
        sourceText: parsed.data.sourceText ?? "", createdAt: now, updatedAt: now,
      };
      setShopping((prev) => [...prev, s]);
    }
    setDefaultDateForAdd(undefined);
    setView("today");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mb-4 flex justify-center"><Sparkles className="h-10 w-10 animate-pulse text-indigo-600" /></div>
          <p className="text-sm font-medium text-slate-500">Sincronizando com a nuvem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 md:pb-0 md:pl-64 font-sans">
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-white border-r border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-indigo-600 p-2 rounded-xl"><Sparkles className="h-5 w-5 text-white" /></div>
          <span className="font-bold text-xl tracking-tight">Nossa Agenda</span>
        </div>
        <div className="space-y-1">
          <MenuBtn icon={Home} label="Dashboard" active={view === "today"} onClick={() => setView("today")} />
          <MenuBtn icon={Calendar} label="Mês" active={view === "month"} onClick={() => setView("month")} />
          <MenuBtn icon={CalendarDays} label="Semana" active={view === "week"} onClick={() => setView("week")} />
          <MenuBtn icon={Users} label="Família" active={view === "family"} onClick={() => setView("family")} />
          <MenuBtn icon={CheckSquare} label="Tarefas" active={view === "tasks"} onClick={() => setView("tasks")} />
          <MenuBtn icon={ShoppingCart} label="Compras" active={view === "shopping"} onClick={() => setView("shopping")} />
          <MenuBtn icon={Radar} label="Radar" active={view === "radar"} onClick={() => setView("radar")} />
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 capitalize">
              {view === 'today' ? 'Dashboard' : view === 'add' ? 'Agendar' : view === 'month' ? 'Calendário' : view === 'week' ? 'Semana' : view}
            </h1>
            <p className="text-slate-500 text-sm">{formatLongDate(new Date())}</p>
          </div>
          <div className="hidden md:flex gap-2">
            {Object.values(PEOPLE).map((p) => <PersonChip key={p.code} code={p.code} />)}
          </div>
        </header>

        {view === "today" && <TodayView events={events} tasks={tasks} shopping={shopping} onOpenAdd={() => setView("add")} onOpenDay={openDay} onEditEvent={setEditing} />}
        {view === "add" && <QuickAddView onSave={saveParsed} onCancel={() => { setDefaultDateForAdd(undefined); setView("today"); }} defaultDate={defaultDateForAdd} history={[...events.map((e:any) => e.sourceText), ...tasks.map((t:any) => t.sourceText), ...shopping.map((s:any) => s.sourceText)].filter(Boolean)} />}
        {view === "month" && <MonthView events={events} onOpenDay={openDay} />}
        {view === "week" && <WeekView events={events} onOpenDay={openDay} />}
        {view === "day" && <DayView date={selectedDay} events={events} tasks={tasks} onAdd={() => openAddForDay(selectedDay)} onEdit={setEditing} onDelete={(id: string) => setEvents((prev) => prev.filter((e) => e.id !== id))} onDuplicate={(e: AgendaEvent) => setEvents((prev) => [...prev, { ...e, id: uid(), createdAt: nowISO(), updatedAt: nowISO() }])} />}
        {view === "tasks" && <TasksView tasks={tasks} onToggle={(id: string) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: t.status === "pendente" ? "concluida" : "pendente", updatedAt: nowISO() } : t))} onDelete={(id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))} onAdd={(title: string) => setTasks((prev) => [...prev, mkTask({ title })])} />}
        {view === "shopping" && <ShoppingView items={shopping} onToggle={(id: string) => setShopping((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === "pendente" ? "comprado" : "pendente", updatedAt: nowISO() } : s))} onDelete={(id: string) => setShopping((prev) => prev.filter((s) => s.id !== id))} onAdd={(name: string) => setShopping((prev) => [...prev, mkShop(name)])} />}
        {view === "family" && <FamilyView events={events} />}
        {view === "radar" && <RadarView events={events} tasks={tasks} shopping={shopping} />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around py-3 z-40">
        <NavIcon icon={Home} active={view === "today"} onClick={() => setView("today")} label="Hoje" />
        <NavIcon icon={Calendar} active={view === "month"} onClick={() => setView("month")} label="Mês" />
        <div className="w-12"></div>
        <NavIcon icon={CheckSquare} active={view === "tasks"} onClick={() => setView("tasks")} label="Tarefas" />
        <NavIcon icon={Users} active={view === "family"} onClick={() => setView("family")} label="Família" />
      </nav>

      <button onClick={() => setView("add")} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 h-14 w-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center text-white active:scale-95 transition-transform z-50">
        <Plus className="h-6 w-6" />
      </button>

      {editing && <EventEditor event={editing} onClose={() => setEditing(null)} onSave={(updated: AgendaEvent) => { setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e))); setEditing(null); }} onDelete={(id: string) => { setEvents((prev) => prev.filter((e) => e.id !== id)); setEditing(null); }} />}
    </div>
  );
}

/* ================== COMPONENTES DE UI ================== */

function MenuBtn({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
      <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : ''}`} /><span>{label}</span>
    </button>
  );
}

function NavIcon({ icon: Icon, active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <Icon className="h-6 w-6" /><span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

/* ================== VIEWS ================== */

function TodayView({ events, tasks, shopping, onOpenAdd, onOpenDay, onEditEvent }: any) {
  const todayISO = toISODate(new Date()); const dow = new Date().getDay();
  const todays = events.filter((e: any) => e.date === todayISO).sort(sortByTime);
  const upcoming = events.filter((e: any) => e.date && e.date > todayISO).sort((a: any, b: any) => (a.date! < b.date! ? -1 : 1)).slice(0, 4);
  const pendingTasks = tasks.filter((t: any) => t.status === "pendente").slice(0, 4);
  const urgentShop = shopping.filter((s: any) => s.status === "pendente").slice(0, 4);
  const f1Routine = F1_ROUTINE[dow as keyof typeof F1_ROUTINE];

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Olá, família 👋</h2>
          <p className="text-indigo-100 text-sm mb-6">{todays.length > 0 ? `Temos ${todays.length} compromissos hoje.` : "Nada marcado para hoje. Aproveite!"}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onOpenAdd} className="bg-white text-indigo-600 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Agendar Rápido</button>
            {f1Routine && <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-white/10"><span className="h-2 w-2 rounded-full bg-green-400" /> Felipe: {f1Routine.start}–{f1Routine.end}</span>}
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-64 w-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Hoje</h3>
          <div className="space-y-3">
            {todays.length === 0 ? <EmptyState text="Sem compromissos hoje." /> : todays.map((e: any) => <EventCardPremium key={e.id} event={e} onClick={() => onEditEvent(e)} />)}
          </div>
        </section>
        
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Próximos</h3>
          <div className="space-y-3">
            {upcoming.length === 0 ? <EmptyState text="Sem compromissos futuros." /> : upcoming.map((e: any) => (<button key={e.id} onClick={() => onOpenDay(e.date!)} className="w-full text-left"><EventCardPremium event={e} showDate /></button>))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Tarefas Pendentes</h3>
          {pendingTasks.length === 0 ? <p className="text-slate-400 text-sm">Tudo feito!</p> : pendingTasks.map((t: any) => (<div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"><div className="h-5 w-5 rounded border-2 border-slate-300"></div><div><p className="text-sm font-medium text-slate-700">{t.title}</p><p className="text-[10px] text-slate-400">{t.category}</p></div></div>))}
        </section>
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Lista de Compras</h3>
          {urgentShop.length === 0 ? <p className="text-slate-400 text-sm">Lista vazia!</p> : urgentShop.map((s: any) => (<div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"><ShoppingCart className="h-4 w-4 text-slate-300" /><div><p className="text-sm font-medium text-slate-700 capitalize">{s.item}</p><p className="text-[10px] text-slate-400">{s.category}</p></div></div>))}
        </section>
      </div>
    </div>
  );
}

function MonthView({ events, onOpenDay }: any) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]); 
  const byDate = useMemo(() => { const m = new Map<string, AgendaEvent[]>(); for (const e of events) if (e.date) { (m.get(e.date) ?? m.set(e.date, []).get(e.date)!).push(e); } return m; }, [events]);
  return (
    <div className="bg-white rounded-[2rem] p-4 md:p-8 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold capitalize text-slate-800">{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2><div className="flex gap-2"><button onClick={() => setCursor(addMonths(cursor, -1))} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100">←</button><button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100">→</button></div></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => <div key={i}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {grid.map(({ iso, inMonth, day }: any) => {
          const ev = byDate.get(iso) ?? []; const isToday = iso === toISODate(new Date());
          return (<button key={iso} onClick={() => onOpenDay(iso)} className={`flex flex-col items-start p-2 min-h-[80px] rounded-2xl border transition-all ${inMonth ? "bg-white border-slate-100 hover:border-indigo-200" : "bg-slate-50/50 border-transparent opacity-50"} ${isToday ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}><span className={`text-sm ${isToday ? "font-bold text-indigo-600" : "font-medium text-slate-600"}`}>{day}</span><div className="mt-1 flex flex-col gap-1 w-full">{ev.slice(0, 2).map((e: any) => <div key={e.id} className="text-[9px] truncate px-1 rounded bg-slate-100 text-slate-600 w-full text-left">{e.title}</div>)}{ev.length > 2 && <span className="text-[10px] text-slate-400">+{ev.length - 2}</span>}</div></button>);
        })}
      </div>
    </div>
  );
}

function WeekView({ events, onOpenDay }: any) {
  const days = useMemo(() => { const today = new Date(); return Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return d; }); }, []);
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {days.map((d) => { 
        const iso = toISODate(d); const evs = events.filter((e: any) => e.date === iso).sort(sortByTime); 
        return (
          <button key={iso} onClick={() => onOpenDay(iso)} className="bg-white rounded-[2rem] p-6 text-left shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
            <div className="mb-4 flex justify-between items-end">
              <div><div className="text-xs font-bold uppercase text-slate-400">{d.toLocaleDateString("pt-BR", { weekday: "long" })}</div><div className="text-2xl font-bold text-slate-800">{d.getDate()} {d.toLocaleDateString("pt-BR", { month: "short" })}</div></div>
              <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-lg font-bold">{evs.length}</span>
            </div>
            <div className="space-y-2">{evs.length === 0 && <p className="text-sm text-slate-400 italic">Dia livre</p>}{evs.slice(0, 4).map((e: any) => <div key={e.id} className="flex gap-2 text-sm items-center"><PersonDot code={e.personCode} /><span className="text-slate-500 text-xs w-10">{e.startTime || '--'}</span><span className="truncate font-medium text-slate-700">{e.title}</span></div>)}</div>
          </button>
        ); 
      })}
    </div>
  );
}

function DayView({ date, events, tasks, onAdd, onEdit, onDelete, onDuplicate }: any) {
  const dayEvents = events.filter((e: any) => e.date === date).sort(sortByTime);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div><p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Detalhes do Dia</p><h2 className="text-2xl font-bold text-slate-800">{formatBR(date)}</h2></div>
        <button onClick={onAdd} className="bg-indigo-600 text-white p-3 rounded-xl shadow-md"><Plus className="h-5 w-5" /></button>
      </div>
      <div className="space-y-3">
        {dayEvents.length === 0 ? <EmptyState text="Nenhum compromisso marcado para esta data." /> : dayEvents.map((e: any) => <EventCardPremium key={e.id} event={e} onClick={() => onEdit(e)} actions={<><IconBtn onClick={(ev:any) => {ev.stopPropagation(); onEdit(e)}}><Pencil className="h-4 w-4" /></IconBtn><IconBtn onClick={(ev:any) => {ev.stopPropagation(); onDuplicate(e)}}><CopyIcon className="h-4 w-4" /></IconBtn><IconBtn onClick={(ev:any) => {ev.stopPropagation(); onDelete(e.id)}}><Trash2 className="h-4 w-4 text-red-400" /></IconBtn></>} />)}
      </div>
    </div>
  );
}

function TasksView({ tasks, onToggle, onDelete, onAdd }: any) {
  const [input, setInput] = useState(""); const pending = tasks.filter((t: any) => t.status === "pendente"); const done = tasks.filter((t: any) => t.status === "concluida");
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onAdd(input.trim()); setInput(""); } }} placeholder="Nova tarefa..." className="flex-1 bg-transparent px-4 py-2 text-slate-700 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(""); } }} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm">Adicionar</button>
      </div>
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Pendentes</h3>
        {pending.length === 0 ? <p className="text-slate-400 text-sm">Tudo feito!</p> : <div className="space-y-2">{pending.map((t: any) => <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />)}</div>}
        {done.length > 0 && <><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-8">Concluídas</h3><div className="space-y-2 opacity-60">{done.map((t: any) => <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />)}</div></>}
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: any) { const done = task.status === "concluida"; return (<div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"><button onClick={() => onToggle(task.id)} className={`flex-shrink-0 grid h-6 w-6 rounded-md border-2 transition-colors ${done ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>{done && <CheckSquare className="h-4 w-4" />}</button><div className={`flex-1 text-sm ${done ? "line-through text-slate-400" : "font-medium text-slate-700"}`}>{task.title}</div><button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="h-4 w-4" /></button></div>); }

function ShoppingView({ items, onToggle, onDelete, onAdd }: any) {
  const [input, setInput] = useState(""); const pending = items.filter((i: any) => i.status === "pendente"); const done = items.filter((i: any) => i.status === "comprado");
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onAdd(input.trim()); setInput(""); } }} placeholder="Item para comprar..." className="flex-1 bg-transparent px-4 py-2 text-slate-700 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(""); } }} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm">Adicionar</button>
      </div>
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Falta Comprar</h3>
        {pending.length === 0 ? <p className="text-slate-400 text-sm">Lista vazia!</p> : <div className="space-y-2">{pending.map((s: any) => <ShoppingRow key={s.id} item={s} onToggle={onToggle} onDelete={onDelete} />)}</div>}
        {done.length > 0 && <><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-8">No Carrinho</h3><div className="space-y-2 opacity-60">{done.map((s: any) => <ShoppingRow key={s.id} item={s} onToggle={onToggle} onDelete={onDelete} />)}</div></>}
      </div>
    </div>
  );
}

function ShoppingRow({ item, onToggle, onDelete }: any) { const done = item.status === "comprado"; return (<div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"><button onClick={() => onToggle(item.id)} className={`flex-shrink-0 grid h-6 w-6 rounded-full border-2 transition-colors ${done ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>{done && <CheckSquare className="h-4 w-4" />}</button><div className={`flex-1 text-sm capitalize ${done ? "line-through text-slate-400" : "font-medium text-slate-700"}`}>{item.item}</div><button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="h-4 w-4" /></button></div>); }

function FamilyView({ events }: any) {
  const todayISO = toISODate(new Date()); const next30 = events.filter((e: any) => e.date && e.date >= todayISO); const { photos, setPhoto } = usePersonPhotos();
  const handleFile = async (code: PersonCode, file: File | undefined) => { if (!file) return; try { const url = await fileToDataUrl(file, 256); setPhoto(code, url); } catch (err) { console.error(err); } };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {(Object.keys(PEOPLE) as PersonCode[]).map((code) => {
        const p = PEOPLE[code]; const evs = next30.filter((e: any) => e.personCode === code).sort((a: any, b: any) => (a.date! < b.date! ? -1 : 1));
        const photo = photos[code] ?? p.defaultPhoto; const isCustom = !!photos[code]; const inputId = `photo-input-${code}`;
        return (
          <div key={code} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
              <label htmlFor={inputId} className="relative h-16 w-16 rounded-full overflow-hidden cursor-pointer bg-slate-100 flex items-center justify-center font-bold text-xl border-2 border-transparent hover:border-indigo-200 transition-all" style={{ color: `var(--color-${p.colorVar})` }}>
                {photo ? <img src={photo} alt={p.name} className="h-full w-full object-cover" /> : p.name[0]}
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[10px] uppercase font-bold transition-opacity">Mudar</div>
              </label>
              <input id={inputId} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(code, e.target.files?.[0])} />
              <div className="flex-1"><h3 className="font-bold text-lg text-slate-800">{p.name}</h3><p className="text-sm text-slate-400">{p.role}</p></div>
              {isCustom && <button onClick={() => setPhoto(code, null)} className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-md font-medium hover:bg-red-100">Reset</button>}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Próximos Compromissos</h4>
              {evs.length === 0 ? <p className="text-sm text-slate-400 italic">Agenda livre</p> : <div className="space-y-3">{evs.slice(0, 4).map((e: any) => (<div key={e.id} className="flex justify-between items-center"><span className="text-sm font-medium text-slate-700 truncate">{e.title}</span><span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{formatBR(e.date!)} {e.startTime ? ` ${e.startTime}` : ""}</span></div>))}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadarView({ events, tasks, shopping }: any) { 
  const insights = generateRadarInsights(events, tasks, shopping); 
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-indigo-600 rounded-[2rem] p-8 text-white text-center shadow-xl shadow-indigo-100 mb-8"><Radar className="h-12 w-12 mx-auto mb-4 opacity-80" /><h2 className="text-2xl font-bold mb-2">Radar Inteligente</h2><p className="text-indigo-200 text-sm">Análise automática de conflitos na rotina da família.</p></div>
      {insights.length === 0 ? <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center text-slate-500">Tudo sob controle! Nenhum alerta detectado.</div> : insights.map((msg, i) => <div key={i} className="flex gap-4 bg-white p-5 rounded-2xl shadow-sm border border-orange-100"><div className="h-10 w-10 shrink-0 bg-orange-50 rounded-full flex items-center justify-center text-orange-500"><Sparkles className="h-5 w-5" /></div><p className="text-sm text-slate-700 mt-1">{msg}</p></div>)}
    </div>
  ); 
}

/* ================== COMPONENTES AUXILIARES ================== */

function QuickAddView({ onSave, onCancel, defaultDate, history }: any) {
  const [text, setText] = useState(""); const [preview, setPreview] = useState<ParsedResult | null>(null);
  function doParse() { if(text.trim()) setPreview(parseEventInput(text.trim(), { defaultDate })); }
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Ditado Mágico</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doParse(); } }} placeholder="Ex: Clarisse no pediatra amanhã às 15h" className="w-full h-32 bg-slate-50 rounded-2xl border-none p-4 text-lg focus:ring-2 focus:ring-indigo-500 resize-none mb-4" />
        <div className="flex gap-2"><button onClick={doParse} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl">Entender</button><button onClick={onCancel} className="bg-slate-100 text-slate-600 font-bold py-3 px-6 rounded-xl">Cancelar</button></div>
      </div>
      {preview && <ParsedPreview preview={preview} onConfirm={(p: any) => { onSave(p); setPreview(null); setText(""); }} onCancel={() => setPreview(null)} onChange={setPreview} />}
    </div>
  );
}

function ParsedPreview({ preview, onConfirm, onCancel, onChange }: any) {
  if (preview.kind === "event") {
    const d = preview.data;
    return (
      <div className="bg-indigo-50 rounded-[2rem] p-6 border border-indigo-100">
        <h3 className="text-indigo-800 font-bold mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5" /> Entendi assim:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Título"><input value={d.title ?? ""} onChange={(e) => onChange({ ...preview, data: { ...d, title: e.target.value } })} className="w-full bg-white rounded-xl p-3 text-sm border border-transparent focus:border-indigo-300 outline-none" /></Field>
          <Field label="Data"><input type="date" value={d.date ?? ""} onChange={(e) => onChange({ ...preview, data: { ...d, date: e.target.value || null } })} className="w-full bg-white rounded-xl p-3 text-sm border border-transparent focus:border-indigo-300 outline-none" /></Field>
          <Field label="Horário"><div className="flex gap-2"><input type="time" value={d.startTime ?? ""} onChange={(e) => onChange({ ...preview, data: { ...d, startTime: e.target.value || null } })} className="w-full bg-white rounded-xl p-3 text-sm border border-transparent outline-none" /><input type="time" value={d.endTime ?? ""} onChange={(e) => onChange({ ...preview, data: { ...d, endTime: e.target.value || null } })} className="w-full bg-white rounded-xl p-3 text-sm border border-transparent outline-none" /></div></Field>
          <Field label="Categoria"><select value={d.category ?? "Evento"} onChange={(e) => onChange({ ...preview, data: { ...d, category: e.target.value as Category } })} className="w-full bg-white rounded-xl p-3 text-sm border border-transparent outline-none">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <div className="mt-6 flex gap-2"><button onClick={() => onConfirm(preview)} className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold">Confirmar e Salvar</button><button onClick={onCancel} className="bg-white text-slate-600 py-3 px-6 rounded-xl font-bold">Refazer</button></div>
      </div>
    );
  }
  return <div className="bg-indigo-50 p-6 rounded-2xl">Confirmar tarefa/compra: {preview.data.title || preview.data.item} <button onClick={() => onConfirm(preview)} className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Adicionar</button></div>;
}

function EventEditor({ event, onClose, onSave, onDelete }: any) {
  const [e, setE] = useState(event);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm md:items-center p-0 md:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800">Editar Compromisso</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 sm:grid-cols-2 max-h-[60vh] overflow-y-auto p-1">
          <Field label="Quem"><select value={e.personCode ?? ""} onChange={(ev) => setE({ ...e, personCode: (ev.target.value || null) as PersonCode | null, personName: ev.target.value ? PEOPLE[ev.target.value as PersonCode].name : null })} className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-200"><option value="">— Família —</option>{(Object.keys(PEOPLE) as PersonCode[]).map((c) => <option key={c} value={c}>{PEOPLE[c].name}</option>)}</select></Field>
          <Field label="Título"><input value={e.title ?? ""} onChange={(ev) => setE({ ...e, title: ev.target.value })} className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-200" /></Field>
          <Field label="Data"><input type="date" value={e.date ?? ""} onChange={(ev) => setE({ ...e, date: ev.target.value || null })} className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-200" /></Field>
          <Field label="Início"><input type="time" value={e.startTime ?? ""} onChange={(ev) => setE({ ...e, startTime: ev.target.value || null })} className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-200" /></Field>
          <Field label="Fim"><input type="time" value={e.endTime ?? ""} onChange={(ev) => setE({ ...e, endTime: ev.target.value || null })} className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-200" /></Field>
          <Field label="Categoria"><select value={e.category} onChange={(ev) => setE({ ...e, category: ev.target.value as Category })} className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-200">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <div className="mt-8 flex gap-2"><button onClick={() => onSave({ ...e, updatedAt: nowISO() })} className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold flex-1">Salvar</button><button onClick={() => onDelete(e.id)} className="bg-red-50 text-red-500 py-3 px-6 rounded-xl font-bold">Apagar</button></div>
      </div>
    </div>
  );
}

function EventCardPremium({ event, onClick, showDate, actions }: any) {
  const p = event.personCode && PEOPLE ? PEOPLE[event.personCode] : null;
  return (
    <div onClick={onClick} className={`bg-white p-4 rounded-2xl border ${p ? 'border-l-4' : 'border'} border-slate-100 shadow-sm flex flex-col gap-2 hover:border-indigo-200 transition-colors cursor-pointer`} style={{ borderLeftColor: p ? `var(--color-${p.colorVar})` : undefined }}>
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center text-[10px] uppercase font-bold text-slate-400">{p && <span style={{ color: `var(--color-${p.colorVar})` }}>{p.name}</span>}<span>• {event.category}</span></div>
        {actions && <div className="flex gap-1 bg-slate-50 rounded-lg p-1">{actions}</div>}
      </div>
      <p className="font-bold text-slate-800 leading-tight">{event.title || "Sem título"}</p>
      <div className="flex gap-2 items-center text-xs text-slate-500 font-medium mt-1">
        {showDate && event.date && <span className="bg-slate-100 px-2 py-0.5 rounded">{formatBR(event.date)}</span>}
        {event.startTime ? <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {event.startTime}{event.endTime ? ` às ${event.endTime}` : ''}</span> : <span>Dia todo</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return (<div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">{label}</label>{children}</div>); }
function PersonChip({ code }: any) { const p = PEOPLE[code]; if (!p) return null; return (<span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm" style={{ color: `var(--color-${p.colorVar})` }}><span className="h-2 w-2 rounded-full" style={{ background: `var(--color-${p.colorVar})` }} />{p.name}</span>); }
function PersonDot({ code }: any) { return <span className="h-2.5 w-2.5 rounded-full" style={{ background: code && PEOPLE[code] ? `var(--color-${PEOPLE[code].colorVar})` : "#cbd5e1" }} />; }
function EmptyState({ text }: { text: string }) { return <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-medium">{text}</div>; }
function IconBtn({ children, onClick, ...rest }: any) { return <button onClick={onClick} {...rest} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">{children}</button>; }

function toISODate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function formatLongDate(d: Date): string { return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); }
function sortByTime(a: AgendaEvent, b: AgendaEvent): number { const at = a.startTime ?? "99:99"; const bt = b.startTime ?? "99:99"; return at < bt ? -1 : at > bt ? 1 : 0; }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function buildMonthGrid(cursor: Date): Array<{ iso: string; inMonth: boolean; day: number }> { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { iso: toISODate(d), inMonth: d.getMonth() === cursor.getMonth(), day: d.getDate() }; }); }
function mkTask(p: Partial<AgendaTask>): AgendaTask { const now = nowISO(); return { id: uid(), type: "task", familyId: FAMILY_ID, createdBy: CREATED_BY, personCode: null, title: "Tarefa", date: null, category: "Casa", priority: "Normal", status: "pendente", sourceText: "", createdAt: now, updatedAt: now, ...p, } as AgendaTask; }
function mkShop(name: string, category?: string): ShoppingItem { const now = nowISO(); return { id: uid(), type: "shopping", familyId: FAMILY_ID, item: name, quantity: null, category: category ?? "Outros", status: "pendente", notes: "", sourceText: name, createdAt: now, updatedAt: now, } as ShoppingItem; }