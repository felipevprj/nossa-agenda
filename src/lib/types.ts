export type PersonCode = 'F1' | 'F2' | 'FF' | 'CL';
export type Priority = 'Baixa' | 'Normal' | 'Alta';
export type Category =
  | 'Saúde'
  | 'Trabalho'
  | 'Escola'
  | 'Casa'
  | 'Família'
  | 'Evento'
  | 'Documento'
  | 'Outro';

export interface AgendaEvent {
  id: string;
  type: 'event';
  familyId: string;
  createdBy: string;
  personCode: PersonCode | null;
  personName: string | null;
  title: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  location: string | null;
  category: Category;
  priority: Priority;
  reminders: string[];
  notes: string;
  sourceText: string;
  createdAt: string;
  updatedAt: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceRule: string | null;
  needsConfirmation: boolean;
  missingFields: string[];
}

export interface AgendaTask {
  id: string;
  type: 'task';
  familyId: string;
  createdBy: string;
  personCode: PersonCode | null;
  title: string;
  date: string | null;
  category: Category;
  priority: Priority;
  status: 'pendente' | 'concluida';
  sourceText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  type: 'shopping';
  familyId: string;
  item: string;
  quantity: string | null;
  category: string;
  status: 'pendente' | 'comprado';
  notes: string;
  sourceText: string;
  createdAt: string;
  updatedAt: string;
}

export type ParsedResult =
  | { kind: 'event'; data: Partial<AgendaEvent> }
  | { kind: 'task'; data: Partial<AgendaTask> }
  | { kind: 'shopping'; data: Partial<ShoppingItem> };
