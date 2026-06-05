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
  Sparkles,
  MapPin,
  ExternalLink,
} from "lucide-react";

import { parseEventInput } from "../lib/parser";
import { corrigirParsedComTextoOriginal } from "../lib/normalize";
import { uid, nowISO } from "../lib/storage";
import { PEOPLE } from "../lib/people";
import { formatBR } from "../lib/radar";
import { analisarRotinaComIA, interpretarEntradaRapidaComIA } from "../lib/ai";
import { sairDaAgenda, useAgendaSync, useAuthUser } from "../lib/firebase";
import LoginScreen from "./LoginScreen";
import { baixarBackupAgendaFF } from "../lib/backup";
import { criarLinkGoogleMaps, criarLinkRotaGoogleMaps } from "../lib/maps";
import type {
  AgendaEvent,
  AgendaTask,
  Category,
  ParsedResult,
  PersonCode,
  ShoppingItem,
} from "../lib/types";

type View =
  | "inicio"
  | "adicionar"
  | "mes"
  | "semana"
  | "dia"
  | "tarefas"
  | "compras"
  | "familia"
  | "radar"
  | "trabalho"
  | "perfil";

const CATEGORIES: Category[] = [
  "Saúde",
  "Trabalho",
  "Escola",
  "Casa",
  "Família",
  "Evento",
  "Documento",
  "Outro",
];

const PERSON_LABELS: Record<PersonCode, string> = {
  F1: "Felipe",
  F2: "Fabiane",
  CL: "Clarisse",
  FF: "Família",
};

export default function NossaAgendaApp() {
  const [view, setView] = useState<View>("mes");
  const [selectedDay, setSelectedDay] = useState<string>(toISODate(new Date()));
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [isDark, setIsDark] = useState(false);

  const { user, isAuthLoading } = useAuthUser();

  const { events, setEvents, tasks, setTasks, shopping, setShopping, isLoading } =
    useAgendaSync(user);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const saveParsed = (parsed: ParsedResult) => {
    const now = nowISO();

    if (parsed.kind === "event") {
      const personCode = parsed.data.personCode ?? null;

      const e: AgendaEvent = {
        id: uid(),
        type: "event",
        familyId: "nossa-familia",
        createdBy: "F1",
        personCode,
        personName: personCode ? getPersonName(personCode) : null,
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

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400">
            Carregando seus dados...
          </p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-24 md:pb-0 md:pl-64 font-sans transition-colors duration-300">
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 z-40 transition-colors">
        <div className="flex items-center justify-between mb-8">
          <span className="font-bold text-2xl tracking-tight text-blue-600 dark:text-blue-400">
            Nossa Agenda
          </span>

          <button
            onClick={() => setIsDark((prev) => !prev)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Alternar modo escuro"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
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
              {getViewTitle(view)}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {formatLongDate(new Date())}
            </p>
          </div>

          <button
            className="md:hidden p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label="Alternar modo escuro"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </header>
        <button
  onClick={() => baixarBackupAgendaFF(events, tasks, shopping)}
  className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-bold dark:bg-white dark:text-gray-900"
>
  Backup
</button>
        {view === "inicio" && (
          <TodayView
            events={events}
            onEdit={setEditing}
            onOpenDay={(date: string) => {
              setSelectedDay(date);
              setView("dia");
            }}
          />
        )}

        {view === "mes" && (
          <MonthView
            events={events}
            onOpenDay={(date: string) => {
              setSelectedDay(date);
              setView("dia");
            }}
          />
        )}

        {view === "semana" && (
          <WeekView
            events={events}
            onOpenDay={(date: string) => {
              setSelectedDay(date);
              setView("dia");
            }}
          />
        )}

        {view === "dia" && (
          <DayDetailView
            date={selectedDay}
            events={events}
            onBack={() => setView("mes")}
            onEdit={setEditing}
            onDelete={(id: string) => setEvents((prev) => prev.filter((event) => event.id !== id))}
          />
        )}

        {view === "tarefas" && <TasksView tasks={tasks} setTasks={setTasks} />}
        {view === "compras" && <ShoppingView items={shopping} setItems={setShopping} />}
        {view === "trabalho" && <WorkScheduleView />}
        {view === "perfil" && (
  <ProfileLGPDView
    events={events}
    tasks={tasks}
    shopping={shopping}
  />
)}
        {view === "radar" && <RadarView events={events} tasks={tasks} shopping={shopping} />}
        {view === "familia" && <FamilyView />}
      </main>

      <button
        onClick={() => setView("adicionar")}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 h-16 w-16 bg-blue-600 rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all z-50"
        aria-label="Adicionar por voz ou texto"
      >
        <Mic className="h-7 w-7" />
      </button>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 flex justify-around py-2 px-1 z-40">
        <NavIcon icon={CalendarIcon} label="Mês" active={view === "mes"} onClick={() => setView("mes")} />
        <NavIcon icon={Briefcase} label="Trabalho" active={view === "trabalho"} onClick={() => setView("trabalho")} />
        <NavIcon icon={Radar} label="Radar" active={view === "radar"} onClick={() => setView("radar")} />
        <NavIcon icon={CheckSquare} label="Tarefas" active={view === "tarefas"} onClick={() => setView("tarefas")} />
        <NavIcon icon={ShoppingCart} label="Compras" active={view === "compras"} onClick={() => setView("compras")} />
      </nav>

      {view === "adicionar" && (
        <SmartAudioModal onSave={saveParsed} onClose={() => setView("mes")} />
      )}

      {editing && (
        <EventEditor
          event={editing}
          onClose={() => setEditing(null)}
          onSave={(updated: AgendaEvent) => {
            setEvents((prev) => prev.map((event) => (event.id === updated.id ? updated : event)));
            setEditing(null);
          }}
          onDelete={(id: string) => {
            setEvents((prev) => prev.filter((event) => event.id !== id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ================= COMPONENTES DE INTERFACE ================= */

function MenuBtn({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${
        active
          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function NavIcon({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
        active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

/* ================= LÓGICAS DAS ABAS ================= */

function TodayView({
  events,
  onEdit,
  onOpenDay,
}: {
  events: AgendaEvent[];
  onEdit: (event: AgendaEvent) => void;
  onOpenDay: (date: string) => void;
}) {
  const todayISO = toISODate(new Date());

  const todays = events
    .filter((event) => event.date === todayISO)
    .sort(sortByTime);

  const upcoming = events
    .filter((event) => event.date && event.date > todayISO)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 pl-2">
          Sua agenda hoje
        </h2>

        <div className="space-y-3">
          {todays.length === 0 ? (
            <EmptyState text="Nenhum compromisso para hoje. Aproveite o dia!" />
          ) : (
            todays.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                onClick={() => onEdit(event)}
              />
            ))
          )}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 pl-2">
            Próximos
          </h2>

          <div className="space-y-3">
            {upcoming.map((event) => (
              <button
                key={event.id}
                onClick={() => onOpenDay(event.date!)}
                className="w-full text-left bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-3 rounded-2xl">
                  <CalendarIcon className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatBR(event.date!)} {event.startTime ? `às ${event.startTime}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({
  events,
  onOpenDay,
}: {
  events: AgendaEvent[];
  onOpenDay: (date: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();

    for (const event of events) {
      if (!event.date) continue;

      const current = map.get(event.date) ?? [];
      current.push(event);
      map.set(event.date, current);
    }

    return map;
  }, [events]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold capitalize text-gray-800 dark:text-white">
          {cursor.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Mês anterior"
          >
            ←
          </button>

          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Próximo mês"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 mb-3">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {grid.map(({ iso, inMonth, day }) => {
          const dayEvents = byDate.get(iso) ?? [];
          const isToday = iso === toISODate(new Date());

          return (
            <button
              key={iso}
              onClick={() => onOpenDay(iso)}
              className={`flex flex-col items-center sm:items-start p-1 sm:p-2 min-h-[60px] sm:min-h-[90px] rounded-2xl border transition-all ${
                inMonth
                  ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                  : "bg-gray-50/50 dark:bg-gray-800/30 border-transparent opacity-50"
              } ${isToday ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : ""}`}
            >
              <span
                className={`text-sm ${
                  isToday
                    ? "font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 h-7 w-7 rounded-full flex items-center justify-center"
                    : "font-medium text-gray-600 dark:text-gray-300 mt-1 sm:ml-1"
                }`}
              >
                {day}
              </span>

              <div className="hidden sm:flex mt-1 flex-col gap-1 w-full">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] truncate px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 w-full text-left font-medium"
                  >
                    {event.startTime ? `${event.startTime} ` : ""}
                    {event.title}
                  </div>
                ))}

                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-gray-400 font-bold">
                    +{dayEvents.length - 2}
                  </span>
                )}
              </div>

              <div className="flex sm:hidden mt-1 gap-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  events,
  onOpenDay,
}: {
  events: AgendaEvent[];
  onOpenDay: (date: string) => void;
}) {
  const days = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {days.map((date) => {
        const iso = toISODate(date);
        const evs = events.filter((event) => event.date === iso).sort(sortByTime);

        return (
          <button
            key={iso}
            onClick={() => onOpenDay(iso)}
            className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 text-left shadow-sm border border-gray-100 dark:border-gray-800 hover:border-blue-300 transition-colors"
          >
            <div className="mb-4 flex justify-between items-end">
              <div>
                <div className="text-xs font-bold uppercase text-gray-400">
                  {date.toLocaleDateString("pt-BR", { weekday: "long" })}
                </div>

                <div className="text-2xl font-bold">
                  {date.getDate()} {date.toLocaleDateString("pt-BR", { month: "short" })}
                </div>
              </div>

              <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs px-2 py-1 rounded-lg font-bold">
                {evs.length}
              </span>
            </div>

            <div className="space-y-2">
              {evs.length === 0 && (
                <p className="text-sm text-gray-400 italic">Dia livre</p>
              )}

              {evs.slice(0, 4).map((event) => (
                <div key={event.id} className="flex gap-2 text-sm items-center">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-gray-500 text-xs w-10">{event.startTime || "--"}</span>
                  <span className="truncate font-medium">{event.title}</span>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayDetailView({
  date,
  events,
  onBack,
  onEdit,
  onDelete,
}: {
  date: string;
  events: AgendaEvent[];
  onBack: () => void;
  onEdit: (event: AgendaEvent) => void;
  onDelete: (id: string) => void;
}) {
  const dayEvents = events.filter((event) => event.date === date).sort(sortByTime);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Detalhes
          </p>
          <h2 className="text-2xl font-bold">{formatBR(date)}</h2>
        </div>

        <button
          onClick={onBack}
          className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Voltar
        </button>
      </div>

      <div className="space-y-3">
        {dayEvents.length === 0 ? (
          <EmptyState text="Nenhum compromisso marcado para este dia." />
        ) : (
          dayEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => onEdit(event)}
              className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                    {event.startTime || "Dia todo"}
                  </span>

                  <span className="text-xs font-semibold text-gray-400 uppercase">
                    {event.category}
                  </span>

                  {event.personCode && (
                    <span className="text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md">
                      {event.personCode} · {getPersonLabel(event.personCode)}
                    </span>
                  )}
                </div>

                <p className="font-bold text-lg">{event.title}</p>

                {event.location && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {event.location && (
                  <a
                    href={criarLinkGoogleMaps(event.location) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100"
                    aria-label="Abrir local no Maps"
                  >
                    <MapPin className="h-4 w-4" />
                  </a>
                )}

                <button
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEdit(event);
                  }}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  aria-label="Editar compromisso"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onDelete(event.id);
                  }}
                  className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
                  aria-label="Excluir compromisso"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TasksView({ tasks, setTasks }: any) {
  const [novo, setNovo] = useState("");

  const adicionar = () => {
    const title = novo.trim();
    if (!title) return;

    const now = nowISO();

    const task: AgendaTask = {
      id: uid(),
      type: "task",
      familyId: "nossa-familia",
      createdBy: "F1",
      personCode: null,
      title,
      date: null,
      category: "Casa",
      priority: "Normal",
      status: "pendente",
      sourceText: title,
      createdAt: now,
      updatedAt: now,
    };

    setTasks((prev: AgendaTask[]) => [...prev, task]);
    setNovo("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2 bg-white dark:bg-gray-900 p-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
        <input
          value={novo}
          onChange={(event) => setNovo(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && adicionar()}
          placeholder="Adicionar nova tarefa..."
          className="flex-1 bg-transparent px-4 py-2 outline-none font-medium"
        />

        <button onClick={adicionar} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">
          Salvar
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-center text-gray-400 py-4">Nenhuma tarefa cadastrada.</p>
          )}

          {tasks.map((task: AgendaTask) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl group"
            >
              <button
                onClick={() =>
                  setTasks((prev: AgendaTask[]) =>
                    prev.map((item) =>
                      item.id === task.id
                        ? {
                            ...item,
                            status: item.status === "pendente" ? "concluida" : "pendente",
                            updatedAt: nowISO(),
                          }
                        : item
                    )
                  )
                }
                className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  task.status === "concluida"
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                aria-label="Alternar tarefa"
              >
                {task.status === "concluida" && <CheckSquare className="h-4 w-4" />}
              </button>

              <span
                className={`flex-1 font-medium ${
                  task.status === "concluida" ? "line-through text-gray-400" : ""
                }`}
              >
                {task.title}
              </span>

              <button
                onClick={() => setTasks((prev: AgendaTask[]) => prev.filter((item) => item.id !== task.id))}
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                aria-label="Excluir tarefa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShoppingView({ items, setItems }: any) {
  const [novo, setNovo] = useState("");

  const adicionar = () => {
    const itemName = novo.trim();
    if (!itemName) return;

    const now = nowISO();

    const item: ShoppingItem = {
      id: uid(),
      type: "shopping",
      familyId: "nossa-familia",
      item: itemName,
      quantity: null,
      category: "Geral",
      status: "pendente",
      notes: "",
      sourceText: itemName,
      createdAt: now,
      updatedAt: now,
    };

    setItems((prev: ShoppingItem[]) => [...prev, item]);
    setNovo("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2 bg-white dark:bg-gray-900 p-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
        <input
          value={novo}
          onChange={(event) => setNovo(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && adicionar()}
          placeholder="Adicionar item à lista..."
          className="flex-1 bg-transparent px-4 py-2 outline-none font-medium"
        />

        <button onClick={adicionar} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">
          Inserir
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-center text-gray-400 py-4">Lista vazia.</p>
          )}

          {items.map((item: ShoppingItem) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl group transition-colors"
            >
              <button
                onClick={() =>
                  setItems((prev: ShoppingItem[]) =>
                    prev.map((current) =>
                      current.id === item.id
                        ? {
                            ...current,
                            status: current.status === "pendente" ? "comprado" : "pendente",
                            updatedAt: nowISO(),
                          }
                        : current
                    )
                  )
                }
                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  item.status === "comprado"
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                aria-label="Alternar item"
              >
                {item.status === "comprado" && <CheckSquare className="h-4 w-4" />}
              </button>

              <input
                type="text"
                value={item.item}
                onChange={(event) =>
                  setItems((prev: ShoppingItem[]) =>
                    prev.map((current) =>
                      current.id === item.id
                        ? { ...current, item: event.target.value, updatedAt: nowISO() }
                        : current
                    )
                  )
                }
                className={`flex-1 font-medium bg-transparent outline-none border-b border-transparent focus:border-blue-500 transition-colors ${
                  item.status === "comprado" ? "line-through text-gray-400" : ""
                }`}
              />

              <button
                onClick={() => setItems((prev: ShoppingItem[]) => prev.filter((current) => current.id !== item.id))}
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                aria-label="Excluir item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Briefcase className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold">Colégio Santo Inácio</h2>
            <p className="text-sm text-gray-500">Gestão de equipe e formações</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Equipe
            </h3>

            <div className="flex flex-wrap gap-2">
              {["Ariele", "Laís", "Lucas Vinicius", "José"].map((nome) => (
                <div
                  key={nome}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  {nome}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Organização funcional
            </h3>

            <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <p className="font-bold text-lg mb-1">Preservada por Ciclo e Turma</p>
              <p className="text-sm text-gray-500">
                As formações estão categorizadas para acompanhamento preciso das turmas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileLGPDView({
  events,
  tasks,
  shopping,
}: {
  events: AgendaEvent[];
  tasks: AgendaTask[];
  shopping: ShoppingItem[];
}) {
  return (
    <div className="max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
          <UserCircle className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-2xl font-bold">Privacidade e backup</h2>
          <p className="text-sm text-gray-500">
            Controle básico dos dados da família
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
          A <strong>Agenda FF</strong> guarda compromissos, tarefas e compras da família.
          Por isso, o acesso deve ficar restrito apenas aos usuários autorizados.
        </p>

        <button
          onClick={() => baixarBackupAgendaFF(events, tasks, shopping)}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-2xl font-bold"
        >
          Baixar backup da Agenda FF
        </button>

        <p className="text-xs text-gray-400 leading-relaxed">
          O backup será salvo como arquivo JSON. Guarde esse arquivo em local seguro.
        </p>
      </div>
    </div>
  );
}

function RadarView({
  events,
  tasks,
  shopping,
}: {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, tasks, shopping]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gray-900 dark:bg-gray-800 rounded-[2.5rem] p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <Radar className="h-10 w-10 text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Radar Inteligente</h2>
          <p className="text-gray-300 text-sm">
            A IA analisa compromissos, tarefas e compras para apontar choques de horário,
            pendências e riscos na rotina.
          </p>

          <button
            onClick={atualizarRadar}
            disabled={carregando}
            className="mt-5 bg-white text-gray-900 px-5 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          >
            {carregando ? "Analisando..." : "Atualizar Radar"}
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 h-48 w-48 border-[20px] border-white/5 rounded-full pointer-events-none" />
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

      {!carregando &&
        insights.map((message, index) => (
          <div
            key={`${message}-${index}`}
            className="flex gap-4 bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <div className="h-10 w-10 shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500">
              <Sparkles className="h-5 w-5" />
            </div>

            <p className="text-sm font-medium mt-1">{message}</p>
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
      <p className="text-gray-500 text-sm">
        Acompanhe a agenda do Felipe, da Fabiane e da Clarisse integradas no calendário principal.
      </p>
    </div>
  );
}

/* ================= ENTRADA RÁPIDA ================= */

function SmartAudioModal({ onSave, onClose }: any) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [interpretando, setInterpretando] = useState(false);
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

  const interpretarTexto = async () => {
    const textoLimpo = text.trim();
  
    if (!textoLimpo) {
      alert("Digite ou fale alguma informação antes de interpretar.");
      return;
    }
  
    setInterpretando(true);
  
    try {
      const resultadoIA = await interpretarEntradaRapidaComIA(textoLimpo);
  
      if (resultadoIA) {
        const textoCorrigido = resultadoIA.data.sourceText || textoLimpo;
  
        const resultadoBase = {
          ...resultadoIA,
          data: {
            ...resultadoIA.data,
            sourceText: textoCorrigido,
          },
        } as ParsedResult;
  
        const resultadoCorrigido = corrigirParsedComTextoOriginal(
          textoLimpo,
          resultadoBase
        );
  
        setText(textoCorrigido);
        setParsed(resultadoCorrigido);
  
        return;
      }
  
      const resultadoLocal = parseEventInput(textoLimpo);
  
      const resultadoCorrigido = corrigirParsedComTextoOriginal(
        textoLimpo,
        {
          ...resultadoLocal,
          data: {
            ...resultadoLocal.data,
            sourceText: textoLimpo,
          },
        } as ParsedResult
      );
  
      setParsed(resultadoCorrigido);
    } catch (error) {
      console.error("Erro ao interpretar texto:", error);
  
      const resultadoLocal = parseEventInput(textoLimpo);
  
      const resultadoCorrigido = corrigirParsedComTextoOriginal(
        textoLimpo,
        {
          ...resultadoLocal,
          data: {
            ...resultadoLocal.data,
            sourceText: textoLimpo,
          },
        } as ParsedResult
      );
  
      setParsed(resultadoCorrigido);
    } finally {
      setInterpretando(false);
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

      const recognition = new SR();

      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListening(true);
        limparInterpretacao();
      };

      recognition.onresult = (event: any) => {
        const transcricao = event.results?.[0]?.[0]?.transcript ?? "";
        setText(transcricao);
        setParsed(null);
      };

      recognition.onerror = (error: any) => {
        console.error("Erro no reconhecimento de voz:", error);
        setListening(false);
        alert("O microfone foi bloqueado ou falhou. Você pode digitar normalmente.");
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
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
      <div className="bg-white/95 dark:bg-gray-900/95 w-full max-w-xl rounded-t-[2.25rem] md:rounded-[2.5rem] p-5 md:p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] border border-white/70 dark:border-gray-800 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-lg font-bold">Entrada rápida</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
            aria-label="Fechar entrada rápida"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Fale ou escreva
          </label>

          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setParsed(null);
            }}
            placeholder="Ex.: F2 cliente terça às 19h, comprar sabão, varrer a casa amanhã, F1 Corrêas turma 43 12/06 às 7h..."
            className="w-full h-36 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700 rounded-[1.75rem] p-5 text-base outline-none resize-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 font-medium"
          />

          <p className="text-xs text-gray-400 mt-2 ml-1">
            Primeiro interprete. Depois confira os campos antes de salvar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={startAudio}
            className={`py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
              listening ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"
            }`}
          >
            <Mic className="h-5 w-5" />
            {listening ? "Ouvindo..." : "Falar"}
          </button>

          <button
            onClick={interpretarTexto}
            disabled={interpretando}
            className="py-4 rounded-full font-bold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-50"
          >
            {interpretando ? "Interpretando..." : "Interpretar"}
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
                <CampoPessoa
                  value={parsed.data.personCode ?? ""}
                  onChange={(valor) => atualizarCampo("personCode", valor || null)}
                />

                <CampoTexto
                  label="Título"
                  value={parsed.data.title ?? ""}
                  onChange={(valor) => atualizarCampo("title", valor)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    label="Data"
                    type="date"
                    value={parsed.data.date ?? ""}
                    onChange={(valor) => atualizarCampo("date", valor)}
                  />

                  <CampoTexto
                    label="Início"
                    type="time"
                    value={parsed.data.startTime ?? ""}
                    onChange={(valor) => atualizarCampo("startTime", valor)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    label="Fim"
                    type="time"
                    value={parsed.data.endTime ?? ""}
                    onChange={(valor) => atualizarCampo("endTime", valor)}
                  />

                  <CampoCategoria
                    value={(parsed.data.category as Category) ?? "Evento"}
                    onChange={(valor) => atualizarCampo("category", valor)}
                  />
                </div>

                <CampoTexto
                  label="Local"
                  value={parsed.data.location ?? ""}
                  onChange={(valor) => atualizarCampo("location", valor)}
                />

                {parsed.data.location && (
                  <MapsActions location={parsed.data.location} />
                )}
              </div>
            )}

            {parsed.kind === "task" && (
              <div className="space-y-3">
                <CampoPessoa
                  value={parsed.data.personCode ?? ""}
                  onChange={(valor) => atualizarCampo("personCode", valor || null)}
                />

                <CampoTexto
                  label="Tarefa"
                  value={parsed.data.title ?? ""}
                  onChange={(valor) => atualizarCampo("title", valor)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    label="Data"
                    type="date"
                    value={parsed.data.date ?? ""}
                    onChange={(valor) => atualizarCampo("date", valor)}
                  />

                  <CampoCategoria
                    value={(parsed.data.category as Category) ?? "Casa"}
                    onChange={(valor) => atualizarCampo("category", valor)}
                  />
                </div>
              </div>
            )}

            {parsed.kind === "shopping" && (
              <div className="space-y-3">
                <CampoTexto
                  label="Item"
                  value={parsed.data.item ?? ""}
                  onChange={(valor) => atualizarCampo("item", valor)}
                />

                <CampoTexto
                  label="Quantidade"
                  value={parsed.data.quantity ?? ""}
                  onChange={(valor) => atualizarCampo("quantity", valor)}
                />

                <CampoTexto
                  label="Categoria"
                  value={parsed.data.category ?? "Geral"}
                  onChange={(valor) => atualizarCampo("category", valor)}
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
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700 focus:border-blue-500"
      />
    </div>
  );
}

function CampoPessoa({
  value,
  onChange,
}: {
  value: PersonCode | "";
  onChange: (valor: PersonCode | "") => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
        Pessoa
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as PersonCode | "")}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700 focus:border-blue-500"
      >
        <option value="">Não definido</option>
        <option value="F1">F1 - Felipe</option>
        <option value="F2">F2 - Fabiane</option>
        <option value="CL">CL - Clarisse</option>
        <option value="FF">FF - Família</option>
      </select>
    </div>
  );
}

function CampoCategoria({
  value,
  onChange,
}: {
  value: Category;
  onChange: (valor: Category) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
        Categoria
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Category)}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700 focus:border-blue-500"
      >
        {CATEGORIES.map((categoria) => (
          <option key={categoria}>{categoria}</option>
        ))}
      </select>
    </div>
  );
}

/* ================= EDIÇÃO DE EVENTO ================= */

function EventEditor({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event: AgendaEvent;
  onClose: () => void;
  onSave: (event: AgendaEvent) => void;
  onDelete: (id: string) => void;
}) {
  const [e, setE] = useState<AgendaEvent>(event);

  const updateField = (field: keyof AgendaEvent, value: any) => {
    setE((current) => ({
      ...current,
      [field]: value === "" ? null : value,
    }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white/95 dark:bg-gray-900/95 w-full max-w-xl p-5 md:p-6 rounded-t-[2.25rem] md:rounded-[2.5rem] border border-white/70 dark:border-gray-800 shadow-[0_24px_80px_rgba(15,23,42,0.22)] max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Compromisso
            </p>
            <h3 className="text-xl font-bold">Editar detalhes</h3>
          </div>

          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full" aria-label="Fechar edição">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <CampoPessoa
            value={e.personCode ?? ""}
            onChange={(valor) => {
              const personCode = valor || null;
              setE((current) => ({
                ...current,
                personCode,
                personName: personCode ? getPersonName(personCode) : null,
              }));
            }}
          />

          <CampoTexto
            label="Título"
            value={e.title ?? ""}
            onChange={(valor) => updateField("title", valor)}
          />

          <div className="grid grid-cols-2 gap-4">
            <CampoTexto
              label="Data"
              type="date"
              value={e.date ?? ""}
              onChange={(valor) => updateField("date", valor)}
            />

            <CampoTexto
              label="Início"
              type="time"
              value={e.startTime ?? ""}
              onChange={(valor) => updateField("startTime", valor)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CampoTexto
              label="Fim"
              type="time"
              value={e.endTime ?? ""}
              onChange={(valor) => updateField("endTime", valor)}
            />

            <CampoCategoria
              value={e.category ?? "Evento"}
              onChange={(valor) => updateField("category", valor)}
            />
          </div>

          <CampoTexto
            label="Local ou endereço"
            value={e.location ?? ""}
            onChange={(valor) => updateField("location", valor)}
          />

          {e.location && <MapsActions location={e.location} />}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
              Observações
            </label>

            <textarea
              value={e.notes ?? ""}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Anote detalhes importantes deste compromisso..."
              className="w-full h-24 bg-white dark:bg-gray-900 rounded-2xl p-3 font-medium outline-none border border-gray-200 dark:border-gray-700 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => onSave({ ...e, updatedAt: nowISO(), isAllDay: !e.startTime })}
            className="bg-blue-600 text-white py-4 rounded-2xl font-bold flex-1"
          >
            Salvar alterações
          </button>

          <button
            onClick={() => onDelete(e.id)}
            className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-2xl"
            aria-label="Excluir compromisso"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EventListItem({
  event,
  onClick,
}: {
  event: AgendaEvent;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
      <div className="flex items-center gap-5 min-w-0">
        <div className="flex flex-col items-center justify-center w-14 shrink-0">
          <span className="text-lg font-bold">{event.startTime?.split(":")[0] || "--"}</span>
          <span className="text-xs font-semibold text-gray-500">{event.startTime?.split(":")[1] || "--"}</span>
        </div>

        <div className="w-1 h-10 bg-blue-500 rounded-full shrink-0" />

        <div className="min-w-0">
          <p className="font-bold text-lg truncate">{event.title}</p>
          <p className="text-xs font-semibold text-gray-500 truncate">
            {event.category}
            {event.personCode ? ` · ${event.personCode} ${getPersonLabel(event.personCode)}` : ""}
          </p>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 shrink-0" />
    </div>
  );
}

function MapsActions({ location }: { location: string }) {
  const searchLink = criarLinkGoogleMaps(location);
  const routeLink = criarLinkRotaGoogleMaps(location);

  return (
    <div className="flex flex-wrap gap-2">
      {searchLink && (
        <a
          href={searchLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-bold"
        >
          <MapPin className="h-4 w-4" />
          Abrir no Maps
        </a>
      )}

      {routeLink && (
        <a
          href={routeLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold"
        >
          <ExternalLink className="h-4 w-4" />
          Ver rota
        </a>
      )}
    </div>
  );
}

/* ================= FUNÇÕES AUXILIARES ================= */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-gray-400 text-sm font-medium">
      {text}
    </div>
  );
}

function getViewTitle(view: View): string {
  if (view === "inicio") return "Hoje";
  if (view === "mes") return "Calendário Mensal";
  if (view === "dia") return "Detalhes do Dia";
  if (view === "perfil") return "Meus Dados";
  return view;
}

function getPersonName(code: PersonCode): string | null {
  return (PEOPLE as Record<PersonCode, { name: string } | undefined>)[code]?.name ?? PERSON_LABELS[code] ?? null;
}

function getPersonLabel(code: PersonCode): string {
  return PERSON_LABELS[code] ?? code;
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function sortByTime(a: AgendaEvent, b: AgendaEvent): number {
  const at = a.startTime ?? "99:99";
  const bt = b.startTime ?? "99:99";

  return at < bt ? -1 : at > bt ? 1 : 0;
}

function addMonths(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function buildMonthGrid(cursor: Date): Array<{ iso: string; inMonth: boolean; day: number }> {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);

  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      iso: toISODate(date),
      inMonth: date.getMonth() === cursor.getMonth(),
      day: date.getDate(),
    };
  });
}
