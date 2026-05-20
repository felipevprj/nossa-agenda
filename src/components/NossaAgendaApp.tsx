import { useEffect, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Home,
  ListPlus,
  Plus,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { parseEventInput } from '../lib/parser';
import { storage, uid, nowISO } from '../lib/storage';
import { PEOPLE } from '../lib/people';
import { formatBR } from '../lib/radar';
import type {
  AgendaEvent,
  AgendaTask,
  ParsedResult,
  ShoppingItem,
} from '../lib/types';

type View = 'today' | 'add' | 'month' | 'tasks' | 'shopping';

export default function NossaAgendaApp() {
  const [view, setView] = useState<View>('today');
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    setEvents(storage.loadEvents());
    setTasks(storage.loadTasks());
    setShopping(storage.loadShopping());
  }, []);

  useEffect(() => storage.saveEvents(events), [events]);
  useEffect(() => storage.saveTasks(tasks), [tasks]);
  useEffect(() => storage.saveShopping(shopping), [shopping]);

  function saveParsed(parsed: ParsedResult) {
    const now = nowISO();
    if (parsed.kind === 'event') {
      const e: AgendaEvent = {
        id: uid(),
        type: 'event',
        familyId: 'nossa-familia',
        createdBy: 'F1',
        personCode: parsed.data.personCode ?? null,
        personName: parsed.data.personCode
          ? PEOPLE[parsed.data.personCode].name
          : null,
        title: parsed.data.title ?? 'Sem título',
        date: parsed.data.date ?? null,
        startTime: parsed.data.startTime ?? null,
        endTime: parsed.data.endTime ?? null,
        durationMinutes: parsed.data.durationMinutes ?? null,
        location: parsed.data.location ?? null,
        category: parsed.data.category ?? 'Evento',
        priority: parsed.data.priority ?? 'Normal',
        reminders: ['1 dia antes'],
        notes: '',
        sourceText: parsed.data.sourceText ?? '',
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
    setView('today');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
        <Sidebar view={view} setView={setView} />
        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pt-10">
          <Header view={view} />
          {view === 'today' && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-blue-50 p-6 md:p-8">
                <h2 className="text-2xl font-semibold md:text-3xl text-blue-900">
                  Bom dia, família 👋
                </h2>
                <p className="mt-2 text-sm text-blue-700">
                  Bem-vindo à nossa agenda inteligente.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => setView('add')}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" /> Agendar rápido
                  </button>
                </div>
              </div>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Compromissos
                </h3>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nada agendado. Aproveite o dia.
                  </p>
                ) : (
                  events.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-2xl border bg-card p-4 shadow-sm mb-3"
                    >
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {e.date ? formatBR(e.date) : ''}{' '}
                        {e.startTime ? `às ${e.startTime}` : ''} - {e.category}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}
          {view === 'add' && (
            <div className="rounded-3xl bg-card p-6 shadow-sm border">
              <p className="text-sm text-muted-foreground mb-4">
                Escreva o compromisso. Eu organizo para si.
              </p>
              <textarea
                placeholder="Ex: F1 correas turma 43 7h 12/06"
                className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveParsed(parseEventInput(e.currentTarget.value));
                  }
                }}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Pressione Enter para guardar instantaneamente.
              </p>
            </div>
          )}
        </main>
      </div>
      <BottomNav view={view} setView={setView} />
      <button
        onClick={() => setView('add')}
        className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-lg transition active:scale-95 md:bottom-8"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function Header({ view }: { view: View }) {
  const titles: Record<View, string> = {
    today: 'Hoje',
    add: 'Agendar rápido',
    month: 'Mês',
    tasks: 'Tarefas',
    shopping: 'Compras',
  };
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nossa Agenda
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {titles[view] || 'Nossa Agenda'}
        </h1>
      </div>
      <div className="hidden gap-2 md:flex">
        {Object.values(PEOPLE).map((p: any) => (
          <span
            key={p.code}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800"
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Sidebar({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const items = [
    { id: 'today', label: 'Hoje', icon: Home },
    { id: 'add', label: 'Agendar', icon: ListPlus },
    { id: 'month', label: 'Mês', icon: Calendar },
  ];
  return (
    <aside className="hidden w-60 shrink-0 border-r px-4 py-8 md:block">
      <div className="mb-8 flex items-center gap-2 px-2 font-semibold">
        <Sparkles className="h-5 w-5 text-blue-600" /> Nossa Agenda
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((it) => {
          const Icon = it.icon; // <-- A CORREÇÃO ESTÁ AQUI
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id as View)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                view === it.id
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4" /> {it.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function BottomNav({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const items = [
    { id: 'today', label: 'Hoje', icon: Home },
    { id: 'month', label: 'Mês', icon: Calendar },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'shopping', label: 'Compras', icon: ShoppingCart },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon; // <-- A CORREÇÃO ESTÁ AQUI TAMBÉM
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id as View)}
              className={`flex flex-col items-center gap-1 py-3 text-[11px] ${
                view === it.id ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" /> {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}
