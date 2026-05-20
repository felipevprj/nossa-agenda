import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Home,
  ListPlus,
  Plus,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';

// ==========================================
// 1. DADOS E CONFIGURAÇÕES
// ==========================================
const PEOPLE: Record<string, any> = {
  F1: { code: 'F1', name: 'Felipe', color: 'blue' },
  F2: { code: 'F2', name: 'Fabiane', color: 'pink' },
  FF: { code: 'FF', name: 'Família', color: 'green' },
  CL: { code: 'CL', name: 'Clarisse', color: 'yellow' },
};

const uid = () => Math.random().toString(36).substring(2, 9);
const nowISO = () => new Date().toISOString();
const formatBR = (dateIso: string) => {
  if (!dateIso) return '';
  const [y, m, d] = dateIso.split('-');
  return `${d}/${m}/${y}`;
};

// Proteção contra bloqueios de segurança
function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

const storage = {
  loadEvents: (): any[] => {
    try {
      return JSON.parse(safeGet('AgendaEvts') || '[]');
    } catch {
      return [];
    }
  },
  saveEvents: (d: any[]) => safeSet('AgendaEvts', JSON.stringify(d)),
};

// ==========================================
// 2. MOTOR DE INTELIGÊNCIA (PARSER)
// ==========================================
function parseEventInput(input: string) {
  const lower = input.toLowerCase();

  let personCode = null;
  let category = 'Evento';
  let title = input;
  let startTime = null;
  let date = null;

  // Identificação de Pessoa e Categoria
  if (
    lower.includes('f1') ||
    lower.includes('formação') ||
    lower.includes('turma')
  ) {
    personCode = 'F1';
    category = 'Escola';
  } else if (lower.includes('f2') || lower.includes('cliente')) {
    personCode = 'F2';
    category = 'Trabalho';
  } else if (lower.includes('clarisse') || lower.includes('pediatra')) {
    personCode = 'CL';
    category = 'Saúde';
  } else if (lower.includes('ff') || lower.includes('família')) {
    personCode = 'FF';
    category = 'Família';
  }

  // Identificação de Horário (Ex: 19h)
  const timeMatch = input.match(/(\d{1,2})(?:h|:)(\d{2})?/i);
  if (timeMatch) {
    startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`;
    title = title.replace(timeMatch[0], '').trim();
  }

  // Identificação de Data (Ex: 12/06)
  const dateMatch = input.match(/(\d{2})\/(\d{2})/);
  if (dateMatch) {
    date = `${new Date().getFullYear()}-${dateMatch[2]}-${dateMatch[1]}`;
    title = title.replace(dateMatch[0], '').trim();
  }

  // Preservar organização por ciclo para F1
  const isCiclo = lower.includes('ciclo');

  return {
    personCode,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    date,
    startTime,
    category,
    metadata: isCiclo ? { organização: 'por ciclo' } : undefined,
  };
}

// ==========================================
// 3. INTERFACE PRINCIPAL
// ==========================================
export default function App() {
  const [view, setView] = useState('today');
  const [events, setEvents] = useState<any[]>([]);

  // Carrega os dados ao abrir
  useEffect(() => {
    setEvents(storage.loadEvents());
  }, []);

  // Salva os dados sempre que houver mudança
  useEffect(() => {
    storage.saveEvents(events);
  }, [events]);

  function handleSave(text: string) {
    if (!text.trim()) return;
    const parsed = parseEventInput(text);

    const newEvent = {
      id: uid(),
      personCode: parsed.personCode,
      title: parsed.title || 'Sem título',
      date: parsed.date,
      startTime: parsed.startTime,
      category: parsed.category,
      createdAt: nowISO(),
    };

    setEvents([...events, newEvent]);
    setView('today');
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <div className="mx-auto flex max-w-4xl flex-col md:flex-row">
        {/* BARRA LATERAL (Computador) */}
        <aside className="hidden w-60 border-r border-gray-100 px-4 py-8 md:block min-h-screen">
          <div className="mb-8 flex items-center gap-2 px-2 font-bold text-lg text-blue-600">
            <Sparkles className="h-5 w-5" /> Nossa Agenda
          </div>
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setView('today')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                view === 'today'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Home className="h-5 w-5" /> Hoje
            </button>
            <button
              onClick={() => setView('add')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                view === 'add'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ListPlus className="h-5 w-5" /> Agendar
            </button>
          </nav>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 px-4 pb-24 pt-8 md:px-8">
          {view === 'today' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="rounded-3xl bg-blue-50/50 p-6 border border-blue-100">
                <h2 className="text-2xl font-bold text-blue-900">
                  Bom dia, família 👋
                </h2>
                <p className="mt-2 text-sm text-blue-700/80">
                  Tudo pronto para organizar o seu dia.
                </p>
                <button
                  onClick={() => setView('add')}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" /> Agendar compromisso
                </button>
              </div>

              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Próximos Compromissos
                </h3>
                {events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                    Sua agenda está livre. Aproveite o dia!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">
                            {e.title}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {e.date ? formatBR(e.date) : 'Sem data'}{' '}
                            {e.startTime ? `às ${e.startTime}` : ''} •{' '}
                            {e.category}
                          </div>
                        </div>
                        {e.personCode && (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                            {e.personCode}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {view === 'add' && (
            <div className="animate-in fade-in duration-500">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Agendar Rápido
              </h2>
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="mb-4 text-sm text-gray-500">
                  Escreva como você fala e deixe que eu organizo.
                </p>
                <textarea
                  placeholder="Ex: F1 correas ciclo 2 7h 12/06"
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSave(e.currentTarget.value);
                    }
                  }}
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-400">
                    Pressione{' '}
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                      Enter
                    </span>{' '}
                    para salvar
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* BARRA INFERIOR (Celular) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white/90 backdrop-blur-md md:hidden">
        <div className="mx-auto grid grid-cols-2 p-2">
          <button
            onClick={() => setView('today')}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
              view === 'today'
                ? 'text-blue-600'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Home className="h-5 w-5" /> Hoje
          </button>
          <button
            onClick={() => setView('add')}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
              view === 'add'
                ? 'text-blue-600'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <ListPlus className="h-5 w-5" /> Agendar
          </button>
        </div>
      </nav>
    </div>
  );
}
