import type { AgendaEvent, AgendaTask, ShoppingItem } from './types';

export const uid = () => Math.random().toString(36).substring(2, 9);
export const nowISO = () => new Date().toISOString();

// Funções que protegem o app contra bloqueios de segurança do computador
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

export const storage = {
  isSeeded: () => safeGet('AgendaSeeded') === 'true',
  markSeeded: () => safeSet('AgendaSeeded', 'true'),

  loadEvents: (): AgendaEvent[] => {
    try {
      return JSON.parse(safeGet('AgendaEvts') || '[]');
    } catch {
      return [];
    }
  },
  saveEvents: (d: AgendaEvent[]) => safeSet('AgendaEvts', JSON.stringify(d)),

  loadTasks: (): AgendaTask[] => {
    try {
      return JSON.parse(safeGet('AgendaTsks') || '[]');
    } catch {
      return [];
    }
  },
  saveTasks: (d: AgendaTask[]) => safeSet('AgendaTsks', JSON.stringify(d)),

  loadShopping: (): ShoppingItem[] => {
    try {
      return JSON.parse(safeGet('AgendaShop') || '[]');
    } catch {
      return [];
    }
  },
  saveShopping: (d: ShoppingItem[]) => safeSet('AgendaShop', JSON.stringify(d)),
};
