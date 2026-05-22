import { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Home,
  Mic,
  Radar,
  ShoppingCart,
  Trash2,
  Users,
  X,
  Pencil,
  ChevronRight,
  Moon,
  Sun,
  Briefcase,
  UserCircle,
  Sparkles
} from "lucide-react";
import { parseEventInput } from "../lib/parser";
import { uid, nowISO } from "../lib/storage";
import { PEOPLE, F1_ROUTINE } from "../lib/people";
import { usePersonPhotos, fileToDataUrl } from "../lib/photos";
import { formatBR } from "../lib/radar";
import { analisarRotinaComIA } from "../lib/ai";
import { useAgendaSync } from "../lib/firebase";
import type { AgendaEvent, AgendaTask, Category, ParsedResult, PersonCode, ShoppingItem } from "../lib/types";

type View = "inicio" | "adicionar" | "mes" | "semana" | "dia" | "tarefas" | "compras" | "familia" | "radar" | "trabalho" | "perfil";
const CATEGORIES: Category[] = ["Saúde", "Trabalho", "Escola", "Casa", "Família", "Evento", "Documento", "Outro"];

export default function NossaAgendaApp() {
  const [view, setView] = useState<View>("mes"); 
  const [selectedDay, setSelectedDay] = useState<string>(toISODate(new Date()));
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [isDark, setIsDark] = useState(false);
  
  const { events, setEvents, tasks, setTasks, shopping, setShopping, isLoading } = useAgendaSync();

  // O Segredo do Dark Mode: Injetar a classe direto no HTML da página
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const saveParsed = (parsed: ParsedResult) => {
    const now = nowISO();
  
    if (parsed.kind === "event") {
      const e: AgendaEvent = {
        id: uid(),
        type: "event",
        familyId: "nossa-familia",
        createdBy: "F1",
        personCode: parsed.data.personCode ?? null,
        personName: parsed.data.personCode ? PEOPLE[parsed.data.personCode].name : null,
        title: parsed.data.title ?? "Sem título",
        date: parsed.data.date ?? null,
        startTime: parsed.data.startTime ?? null,
        endTime: parsed.data.endTime ?? null,
        durationMinutes: parsed.data.durationMinutes ?? null,
        location: parsed.data.location ?? null,
        category: (parsed.data.category as Category) ?? "Evento",
        priority: parsed.data.priority ?? "Normal",
        reminders: parsed.data.reminders ?? ["15 min antes"],
        notes: parsed.data.notes ?? "",
        sourceText: parsed.data.sourceText ?? "",
        createdAt: now,
        updatedAt: now,
        isAllDay: !parsed.data.startTime,
        isRecurring: false,
        recurrenceRule: null,
        needsConfirmation: false,
        missingFields: [],
      };
  
      setEvents((prev) => [...prev, e]);
    }
  
    if (parsed.kind === "task") {
      const t: AgendaTask = {
        id: uid(),
        type: "task",
        familyId: "nossa-familia",
        createdBy: "F1",
        personCode: parsed.data.personCode ?? null,
        title: parsed.data.title ?? "Tarefa",
        date: parsed.data.date ?? null,
        category: (parsed.data.category as Category) ?? "Casa",
        priority: parsed.data.priority ?? "Normal",
        status: parsed.data.status ?? "pendente",
        sourceText: parsed.data.sourceText ?? "",
        createdAt: now,
        updatedAt: now,
      };
  
      setTasks((prev) => [...prev, t]);
    }
  
    if (parsed.kind === "shopping") {
      const item: ShoppingItem = {
        id: uid(),
        type: "shopping",
        familyId: "nossa-familia",
        item: parsed.data.item ?? "Item",
        quantity: parsed.data.quantity ?? null,
        category: parsed.data.category ?? "Geral",
        status: parsed.data.status ?? "pendente",
        notes: parsed.data.notes ?? "",
        sourceText: parsed.data.sourceText ?? "",
        createdAt: now,
        updatedAt: now,
      };
  
      setShopping((prev) => [...prev, item]);
    }
  
    setView("mes");
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        <p className="text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400">Carregando seus dados...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-24 md:pb-0 md:pl-64 font-sans transition-colors duration-300">
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 z-40 transition-colors">
        <div className="flex items-center justify-between mb-8">
          <span className="font-bold text-2xl tracking-tight text-blue-600 dark:text-blue-400">Agenda</span>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
          </button>
        </div>
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-2">
          <MenuBtn icon={Home} label="Início" active={view === "inicio"} onClick={() => setView("inicio")} />
          <MenuBtn icon={CalendarIcon} label="Mês" active={view === "mes"} onClick={() => setView("mes")} />
          <MenuBtn icon={Briefcase} label="Trabalho" active={view === "trabalho"} onClick={() => setView("trabalho")} />
          <MenuBtn icon={CheckSquare} label="Tarefas" active={view === "tarefas"} onClick={() => setView("tarefas")} />
          <MenuBtn icon={ShoppingCart} label="Compras" active={view === "compras"} onClick={() => setView("compras")} />
          <MenuBtn icon={Radar} label="Radar" active={view === "radar"} onClick={() => setView("radar")} />
          <MenuBtn icon={Users} label="Família" active={view === "familia"} onClick={() => setView("familia")} />
        </div>
        <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
           <MenuBtn icon={UserCircle} label="Meus Dados" active={view === "perfil"} onClick={() => setView("perfil")} />
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-6 md:mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight capitalize">
              {view === 'inicio' ? 'Hoje' : view === 'mes' ? 'Calendário Mensal' : view === 'dia' ? 'Detalhes do Dia' : view}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{formatLongDate(new Date())}</p>
          </div>
          <div className="flex gap-3 items-center">
            <button className="md:hidden p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
            </button>
          </div>
        </header>

        {view === "inicio" && <TodayView events={events} onEdit={setEditing} onOpenDay={(d:string) => {setSelectedDay(d); setView("dia")}} />}
        {view === "mes" && <MonthView events={events} onOpenDay={(d: string) => { setSelectedDay(d); setView("dia"); }} />}
        {view === "semana" && <WeekView events={events} onOpenDay={(d: string) => { setSelectedDay(d); setView("dia"); }} />}
        {view === "dia" && <DayDetailView date={selectedDay} events={events} onBack={() => setView("mes")} onEdit={setEditing} onDelete={(id: string) => setEvents(prev => prev.filter(e => e.id !== id))} />}
        {view === "tarefas" && <TasksView tasks={tasks} setTasks={setTasks} />}
        {view === "compras" && <ShoppingView items={shopping} setItems={setShopping} />}
        {view === "trabalho" && <WorkScheduleView />}
        {view === "perfil" && <ProfileLGPDView />}
        {view === "radar" && <RadarView events={events} tasks={tasks} shopping={shopping} />}
        {view === "familia" && <FamilyView events={events} />}
      </main>

      <button onClick={() => setView("adicionar")} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 h-16 w-16 bg-blue-600 rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all z-50">
        <Mic className="h-7 w-7" />
      </button>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 flex justify-around py-2 px-1 z-40 pb-safe">
  <NavIcon icon={CalendarIcon} label="Mês" active={view === "mes"} onClick={() => setView("mes")} />
  <NavIcon icon={Briefcase} label="Trabalho" active={view === "trabalho"} onClick={() => setView("trabalho")} />
  <NavIcon icon={Radar} label="Radar" active={view === "radar"} onClick={() => setView("radar")} />
  <NavIcon icon={CheckSquare} label="Tarefas" active={view === "tarefas"} onClick={() => setView("tarefas")} />
  <NavIcon icon={ShoppingCart} label="Compras" active={view === "compras"} onClick={() => setView("compras")} />
</nav>

      {view === "adicionar" && <SmartAudioModal onSave={saveParsed} onClose={() => setView("mes")} />}
      {editing && <EventEditor event={editing} onClose={() => setEditing(null)} onSave={(updated: AgendaEvent) => { setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e))); setEditing(null); }} onDelete={(id: string) => { setEvents((prev) => prev.filter((e) => e.id !== id)); setEditing(null); }} />}
    </div>
  );
}

/* ================= COMPONENTES DE INTERFACE ================= */
function MenuBtn({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${active ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      <Icon className="h-5 w-5" /> <span>{label}</span>
    </button>
  );
}
function NavIcon({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
      <Icon className="h-6 w-6" /><span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

/* ================= LÓGICAS DAS ABAS COMPLETAS ================= */
function TodayView({ events, onEdit, onOpenDay }: any) {
  const todayISO = toISODate(new Date());
  const todays = events.filter((e: any) => e.date === todayISO).sort(sortByTime);
  const upcoming = events.filter((e: any) => e.date && e.date > todayISO).sort((a: any, b: any) => (a.date! < b.date! ? -1 : 1)).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 pl-2">Sua Agenda Hoje</h2>
        <div className="space-y-3">
          {todays.length === 0 ? <EmptyState text="Nenhum compromisso para hoje. Aproveite o dia!" /> : todays.map((e: any) => (
            <div key={e.id} onClick={() => onEdit(e)} className="group bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center justify-center w-14">
                  <span className="text-lg font-bold">{e.startTime?.split(':')[0] || '--'}</span>
                  <span className="text-xs font-semibold text-gray-500">{e.startTime?.split(':')[1] || '--'}</span>
                </div>
                <div className="w-1 h-10 bg-blue-500 rounded-full"></div>
                <div><p className="font-bold text-lg">{e.title}</p><p className="text-xs font-semibold text-gray-500">{e.category}</p></div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500" />
            </div>
          ))}
        </div>
      </div>
      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 pl-2">Próximos</h2>
          <div className="space-y-3">
            {upcoming.map((e: any) => (
               <button key={e.id} onClick={() => onOpenDay(e.date!)} className="w-full text-left bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                 <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-3 rounded-2xl"><CalendarIcon className="h-5 w-5" /></div>
                 <div><p className="font-bold">{e.title}</p><p className="text-xs text-gray-500">{formatBR(e.date!)} {e.startTime ? `às ${e.startTime}` : ''}</p></div>
               </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({ events, onOpenDay }: any) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]); 
  const byDate = useMemo(() => { const m = new Map<string, AgendaEvent[]>(); for (const e of events) if (e.date) { (m.get(e.date) ?? m.set(e.date, []).get(e.date)!).push(e); } return m; }, [events]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold capitalize text-gray-800 dark:text-white">{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCursor(addMonths(cursor, -1))} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">←</button>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 mb-3">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {grid.map(({ iso, inMonth, day }: any) => {
          const ev = byDate.get(iso) ?? []; const isToday = iso === toISODate(new Date());
          return (
            <button key={iso} onClick={() => onOpenDay(iso)} className={`flex flex-col items-center sm:items-start p-1 sm:p-2 min-h-[60px] sm:min-h-[90px] rounded-2xl border transition-all ${inMonth ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700" : "bg-gray-50/50 dark:bg-gray-800/30 border-transparent opacity-50"} ${isToday ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : ""}`}>
              <span className={`text-sm ${isToday ? "font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 h-7 w-7 rounded-full flex items-center justify-center" : "font-medium text-gray-600 dark:text-gray-300 mt-1 sm:ml-1"}`}>{day}</span>
              <div className="hidden sm:flex mt-1 flex-col gap-1 w-full">
                {ev.slice(0, 2).map((e: any) => <div key={e.id} className="text-[10px] truncate px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 w-full text-left font-medium">{e.startTime ? `${e.startTime} ` : ''}{e.title}</div>)}
                {ev.length > 2 && <span className="text-[10px] text-gray-400 font-bold">+{ev.length - 2}</span>}
              </div>
              {/* Pontinhos para versão mobile */}
              <div className="flex sm:hidden mt-1 gap-0.5">
                 {ev.slice(0,3).map((e:any) => <div key={e.id} className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>)}
              </div>
            </button>
          );
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
          <button key={iso} onClick={() => onOpenDay(iso)} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 text-left shadow-sm border border-gray-100 dark:border-gray-800 hover:border-blue-300 transition-colors">
            <div className="mb-4 flex justify-between items-end">
              <div><div className="text-xs font-bold uppercase text-gray-400">{d.toLocaleDateString("pt-BR", { weekday: "long" })}</div><div className="text-2xl font-bold">{d.getDate()} {d.toLocaleDateString("pt-BR", { month: "short" })}</div></div>
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs px-2 py-1 rounded-lg font-bold">{evs.length}</span>
            </div>
            <div className="space-y-2">{evs.length === 0 && <p className="text-sm text-gray-400 italic">Dia livre</p>}{evs.slice(0, 4).map((e: any) => <div key={e.id} className="flex gap-2 text-sm items-center"><span className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-gray-500 text-xs w-10">{e.startTime || '--'}</span><span className="truncate font-medium">{e.title}</span></div>)}</div>
          </button>
        ); 
      })}
    </div>
  );
}

function DayDetailView({ date, events, onBack, onEdit, onDelete }: any) {
  const dayEvents = events.filter((e: any) => e.date === date).sort(sortByTime);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
        <div><p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Detalhes</p><h2 className="text-2xl font-bold">{formatBR(date)}</h2></div>
        <button onClick={onBack} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700">Voltar</button>
      </div>
      <div className="space-y-3">
        {dayEvents.length === 0 ? <EmptyState text="Nenhum compromisso marcado para este dia." /> : dayEvents.map((e: any) => (
          <div key={e.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">{e.startTime || 'Dia todo'}</span>
                 <span className="text-xs font-semibold text-gray-400 uppercase">{e.category}</span>
               </div>
               <p className="font-bold text-lg">{e.title}</p>
             </div>
             <div className="flex gap-2">
               <button onClick={() => onEdit(e)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"><Pencil className="h-4 w-4" /></button>
               <button onClick={() => onDelete(e.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksView({ tasks, setTasks }: any) {
  const [novo, setNovo] = useState("");
  const adicionar = () => { if(novo.trim()) { setTasks((p:any) => [...p, {id: uid(), title: novo, status: 'pendente'}]); setNovo(""); } };
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2 bg-white dark:bg-gray-900 p-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} placeholder="Adicionar nova tarefa..." className="flex-1 bg-transparent px-4 py-2 outline-none font-medium" />
        <button onClick={adicionar} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">Salvar</button>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
         <div className="space-y-2">
            {tasks.length === 0 && <p className="text-center text-gray-400 py-4">Nenhuma tarefa cadastrada.</p>}
            {tasks.map((t:any) => (
              <div key={t.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl group">
                 <button onClick={() => setTasks((p:any) => p.map((x:any) => x.id === t.id ? {...x, status: x.status === 'pendente' ? 'concluida' : 'pendente'} : x))} className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors ${t.status === 'concluida' ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                    {t.status === 'concluida' && <CheckSquare className="h-4 w-4" />}
                 </button>
                 <span className={`flex-1 font-medium ${t.status === 'concluida' ? 'line-through text-gray-400' : ''}`}>{t.title}</span>
                 <button onClick={() => setTasks((p:any) => p.filter((x:any) => x.id !== t.id))} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function ShoppingView({ items, setItems }: any) {
  const [novo, setNovo] = useState("");
  const adicionar = () => { if(novo.trim()) { setItems((p:any) => [...p, {id: uid(), item: novo, status: 'pendente'}]); setNovo(""); } };
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2 bg-white dark:bg-gray-900 p-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} placeholder="Adicionar item à lista..." className="flex-1 bg-transparent px-4 py-2 outline-none font-medium" />
        <button onClick={adicionar} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">Inserir</button>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
         <div className="space-y-2">
            {items.length === 0 && <p className="text-center text-gray-400 py-4">Lista vazia.</p>}
            {items.map((i:any) => (
              <div key={i.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl group transition-colors">
                 <button onClick={() => setItems((p:any) => p.map((x:any) => x.id === i.id ? {...x, status: x.status === 'pendente' ? 'comprado' : 'pendente'} : x))} className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${i.status === 'comprado' ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                    {i.status === 'comprado' && <CheckSquare className="h-4 w-4" />}
                 </button>
                 <input type="text" value={i.item} onChange={(e) => setItems((p:any) => p.map((x:any) => x.id === i.id ? {...x, item: e.target.value} : x))} className={`flex-1 font-medium bg-transparent outline-none border-b border-transparent focus:border-blue-500 transition-colors ${i.status === 'comprado' ? 'line-through text-gray-400' : ''}`} />
                 <button onClick={() => setItems((p:any) => p.filter((x:any) => x.id !== i.id))} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function WorkScheduleView() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl"><Briefcase className="h-6 w-6" /></div>
          <div><h2 className="text-xl font-bold">Colégio Santo Inácio</h2><p className="text-sm text-gray-500">Gestão de Equipe e Treinamentos</p></div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Equipe</h3>
             <div className="flex flex-wrap gap-2">
               {['Ariele', 'Laís', 'Lucas Vinicius', 'José'].map(nome => (
                 <div key={nome} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-semibold flex items-center gap-2"><UserCircle className="h-4 w-4 text-gray-400"/> {nome}</div>
               ))}
             </div>
          </div>
          <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Organização Funcional</h3>
             <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                <p className="font-bold text-lg mb-1">Preservada por Ciclo e Turma</p>
                <p className="text-sm text-gray-500">As formações estão categorizadas para acompanhamento preciso das turmas.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileLGPDView() {
  return (
    <div className="max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400"><UserCircle className="h-8 w-8" /></div>
        <div><h2 className="text-2xl font-bold">LGPD e Privacidade</h2><p className="text-sm text-gray-500">Seus dados estão seguros</p></div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        A <strong>Nossa Agenda</strong> não coleta nem processa dados sensíveis. Todas as informações da sua família, equipe e horários são armazenadas localmente e sincronizadas de forma criptografada apenas com o seu banco de dados privado (Firebase). 
      </p>
    </div>
  );
}

function RadarView({ events, tasks, shopping }: {
  events: AgendaEvent[];
  tasks: AgendaTask[];
  shopping: ShoppingItem[];
}) {
  const [insights, setInsights] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atualizarRadar = async () => {
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await analisarRotinaComIA(events, tasks, shopping);
      setInsights(Array.isArray(resposta) ? resposta : ["A IA respondeu em um formato inesperado."]);
    } catch (error) {
      console.error("Erro ao atualizar Radar:", error);
      setErro("Não foi possível consultar a IA agora.");
      setInsights([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    atualizarRadar();
  }, [events, tasks, shopping]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gray-900 dark:bg-gray-800 rounded-[2.5rem] p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <Radar className="h-10 w-10 text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Radar Inteligente</h2>
          <p className="text-gray-300 text-sm">
            A IA analisa compromissos, tarefas e compras para apontar choques de horário, pendências e riscos na rotina.
          </p>

          <button
            onClick={atualizarRadar}
            disabled={carregando}
            className="mt-5 bg-white text-gray-900 px-5 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          >
            {carregando ? "Analisando..." : "Atualizar Radar"}
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 h-48 w-48 border-[20px] border-white/5 rounded-full pointer-events-none"></div>
      </div>

      {erro && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-5 rounded-3xl text-sm font-medium">
          {erro}
        </div>
      )}

      {carregando && (
        <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-gray-400 text-sm font-medium">
          Consultando a inteligência artificial...
        </div>
      )}

      {!carregando && insights.length === 0 && !erro && (
        <EmptyState text="O radar está limpo. Tudo organizado por enquanto." />
      )}

      {!carregando && insights.map((msg, i) => (
        <div
          key={i}
          className="flex gap-4 bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="h-10 w-10 shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium mt-1">{msg}</p>
        </div>
      ))}
    </div>
  );
}

function FamilyView() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
      <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      <h2 className="text-xl font-bold mb-2">Visão da Família</h2>
      <p className="text-gray-500 text-sm">Acompanhe a agenda do Felipe, da Fabiane e da Clarisse integradas no calendário principal.</p>
    </div>
  );
}

function SmartAudioModal({ onSave, onClose }: any) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);

  const limparInterpretacao = () => {
    setParsed(null);
  };

  const atualizarCampo = (campo: string, valor: any) => {
    setParsed((atual) => {
      if (!atual) return atual;

      return {
        ...atual,
        data: {
          ...atual.data,
          [campo]: valor === "" ? null : valor,
        },
      } as ParsedResult;
    });
  };

  const interpretarTexto = () => {
    const textoLimpo = text.trim();

    if (!textoLimpo) {
      alert("Digite ou fale alguma informação antes de interpretar.");
      return;
    }

    try {
      const resultado = parseEventInput(textoLimpo);

      setParsed({
        ...resultado,
        data: {
          ...resultado.data,
          sourceText: textoLimpo,
        },
      } as ParsedResult);
    } catch (error) {
      console.error("Erro ao interpretar texto:", error);
      alert("Não consegui interpretar essa informação. Tente escrever de forma mais direta.");
    }
  };

  const confirmar = () => {
    if (!parsed) {
      alert("Interprete a informação antes de salvar.");
      return;
    }

    onSave(parsed);
    setText("");
    setParsed(null);
  };

  const startAudio = () => {
    try {
      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;

      if (!SR) {
        alert("Este navegador não suporta reconhecimento de voz. Digite sua informação no campo de texto.");
        return;
      }

      const r = new SR();

      r.lang = "pt-BR";
      r.continuous = false;
      r.interimResults = false;

      r.onstart = () => {
        setListening(true);
        limparInterpretacao();
      };

      r.onresult = (e: any) => {
        const transcricao = e.results?.[0]?.[0]?.transcript ?? "";
        setText(transcricao);
        setParsed(null);
      };

      r.onerror = (err: any) => {
        console.error("Erro no reconhecimento de voz:", err);
        setListening(false);
        alert("O microfone foi bloqueado ou falhou. Você pode digitar normalmente.");
      };

      r.onend = () => {
        setListening(false);
      };

      r.start();
    } catch (error) {
      console.error("Falha ao iniciar microfone:", error);
      setListening(false);
      alert("Falha ao iniciar o microfone. Use a digitação.");
    }
  };

  const tipoDaEntrada =
    parsed?.kind === "event"
      ? "Compromisso"
      : parsed?.kind === "task"
      ? "Tarefa"
      : parsed?.kind === "shopping"
      ? "Compra"
      : "";

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-lg font-bold">Entrada rápida</h2>
          </div>

          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Fale ou escreva
          </label>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsed(null);
            }}
            placeholder="Exemplos: reunião com Ariele amanhã às 10h, comprar sabão, varrer a casa, f2 cliente terça às 19h..."
            className="w-full h-36 bg-gray-50 dark:bg-gray-800 border-none rounded-3xl p-5 text-base outline-none resize-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={startAudio}
            className={`py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-blue-600 text-white"
            }`}
          >
            <Mic className="h-5 w-5" />
            {listening ? "Ouvindo..." : "Falar"}
          </button>

          <button
            onClick={interpretarTexto}
            className="py-4 rounded-full font-bold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
          >
            Interpretar
          </button>
        </div>

        {parsed && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-[2rem] p-5 border border-gray-100 dark:border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Confirme antes de salvar
                </p>
                <h3 className="text-xl font-bold">{tipoDaEntrada}</h3>
              </div>

              <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full">
                Prévia
              </span>
            </div>

            {parsed.kind === "event" && (
              <div className="space-y-3">
                <CampoTexto
                  label="Título"
                  value={parsed.data.title ?? ""}
                  onChange={(valor: string) => atualizarCampo("title", valor)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    label="Data"
                    type="date"
                    value={parsed.data.date ?? ""}
                    onChange={(valor: string) => atualizarCampo("date", valor)}
                  />

                  <CampoTexto
                    label="Início"
                    type="time"
                    value={parsed.data.startTime ?? ""}
                    onChange={(valor: string) => atualizarCampo("startTime", valor)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    label="Fim"
                    type="time"
                    value={parsed.data.endTime ?? ""}
                    onChange={(valor: string) => atualizarCampo("endTime", valor)}
                  />

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                      Categoria
                    </label>
                    <select
                      value={(parsed.data.category as Category) ?? "Evento"}
                      onChange={(e) => atualizarCampo("category", e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700"
                    >
                      {CATEGORIES.map((categoria) => (
                        <option key={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <CampoTexto
                  label="Local"
                  value={parsed.data.location ?? ""}
                  onChange={(valor: string) => atualizarCampo("location", valor)}
                />
              </div>
            )}

            {parsed.kind === "task" && (
              <div className="space-y-3">
                <CampoTexto
                  label="Tarefa"
                  value={parsed.data.title ?? ""}
                  onChange={(valor: string) => atualizarCampo("title", valor)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    label="Data"
                    type="date"
                    value={parsed.data.date ?? ""}
                    onChange={(valor: string) => atualizarCampo("date", valor)}
                  />

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                      Categoria
                    </label>
                    <select
                      value={(parsed.data.category as Category) ?? "Casa"}
                      onChange={(e) => atualizarCampo("category", e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700"
                    >
                      {CATEGORIES.map((categoria) => (
                        <option key={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {parsed.kind === "shopping" && (
              <div className="space-y-3">
                <CampoTexto
                  label="Item"
                  value={parsed.data.item ?? ""}
                  onChange={(valor: string) => atualizarCampo("item", valor)}
                />

                <CampoTexto
                  label="Quantidade"
                  value={parsed.data.quantity ?? ""}
                  onChange={(valor: string) => atualizarCampo("quantity", valor)}
                />

                <CampoTexto
                  label="Categoria"
                  value={parsed.data.category ?? "Geral"}
                  onChange={(valor: string) => atualizarCampo("category", valor)}
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-4 rounded-full font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            Cancelar
          </button>

          <button
            onClick={confirmar}
            disabled={!parsed}
            className="py-4 rounded-full font-bold bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar e salvar
          </button>
        </div>
      </div>
    </div>
  );
}
function CampoTexto({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700 focus:border-blue-500"
      />
    </div>
  );
}
function EventEditor({ event, onClose, onSave, onDelete }: any) {
  const [e, setE] = useState(event);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Editar Compromisso</h3><button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4">
          <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Título</label><input value={e.title ?? ""} onChange={(ev) => setE({ ...e, title: ev.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 font-medium outline-none border border-transparent focus:border-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Data</label><input type="date" value={e.date ?? ""} onChange={(ev) => setE({ ...e, date: ev.target.value || null })} className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 font-medium outline-none" /></div>
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Horário</label><input type="time" value={e.startTime ?? ""} onChange={(ev) => setE({ ...e, startTime: ev.target.value || null })} className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 font-medium outline-none" /></div>
          </div>
          <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Categoria</label><select value={e.category} onChange={(ev) => setE({ ...e, category: ev.target.value as Category })} className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 font-medium outline-none">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="mt-8 flex gap-3"><button onClick={() => onSave({ ...e, updatedAt: nowISO() })} className="bg-blue-600 text-white py-4 rounded-2xl font-bold flex-1">Salvar Alterações</button><button onClick={() => onDelete(e.id)} className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-2xl"><Trash2 className="h-5 w-5" /></button></div>
      </div>
    </div>
  );
}

/* ================= FUNÇÕES AUXILIARES ================= */
function EmptyState({ text }: { text: string }) { return <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-gray-400 text-sm font-medium">{text}</div>; }
function toISODate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function formatLongDate(d: Date): string { return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); }
function sortByTime(a: AgendaEvent, b: AgendaEvent): number { const at = a.startTime ?? "99:99"; const bt = b.startTime ?? "99:99"; return at < bt ? -1 : at > bt ? 1 : 0; }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function buildMonthGrid(cursor: Date): Array<{ iso: string; inMonth: boolean; day: number }> { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { iso: toISODate(d), inMonth: d.getMonth() === cursor.getMonth(), day: d.getDate() }; }); }