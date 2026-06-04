import type { AgendaEvent, AgendaTask, ShoppingItem } from "./types";

type BackupData = {
  app: string;
  version: number;
  exportedAt: string;
  events: AgendaEvent[];
  tasks: AgendaTask[];
  shopping: ShoppingItem[];
};

export function baixarBackupAgendaFF(
  events: AgendaEvent[],
  tasks: AgendaTask[],
  shopping: ShoppingItem[]
) {
  const hoje = new Date().toISOString().split("T")[0];

  const backup: BackupData = {
    app: "Agenda FF",
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    tasks,
    shopping,
  };

  const conteudo = JSON.stringify(backup, null, 2);

  const blob = new Blob([conteudo], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `agenda-ff-backup-${hoje}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}