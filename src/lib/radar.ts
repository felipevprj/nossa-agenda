import type { AgendaEvent, AgendaTask, ShoppingItem } from "./types";
export function generateRadarInsights(events: AgendaEvent[], tasks: AgendaTask[], shopping: ShoppingItem[]): string[] {
  return ["Bem-vindo à Nossa Agenda. A rotina da família está tranquila!"];
}
export function formatBR(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  return `${d}/${m}/${y}`;
}