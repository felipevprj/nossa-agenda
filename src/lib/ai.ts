import type {
  AgendaEvent,
  AgendaTask,
  ShoppingItem,
  ParsedResult,
} from "./types";

export async function analisarRotinaComIA(
  events: AgendaEvent[],
  tasks: AgendaTask[],
  shopping: ShoppingItem[]
): Promise<string[]> {
  const hoje = new Date().toISOString().split("T")[0];

  const insights: string[] = [];

  const eventosHoje = events.filter((event) => event.date === hoje);

  if (eventosHoje.length > 0) {
    insights.push(`Hoje há ${eventosHoje.length} compromisso(s) na agenda.`);
  }

  const tarefasPendentes = tasks.filter((task) => task.status === "pendente");

  if (tarefasPendentes.length > 0) {
    insights.push(`Há ${tarefasPendentes.length} tarefa(s) pendente(s).`);
  }

  const comprasPendentes = shopping.filter((item) => item.status === "pendente");

  if (comprasPendentes.length > 0) {
    insights.push(`Há ${comprasPendentes.length} item(ns) pendente(s) na lista de compras.`);
  }

  const eventosComHorario = events
    .filter((event) => event.date && event.startTime)
    .sort((a, b) => {
      const dataA = `${a.date} ${a.startTime}`;
      const dataB = `${b.date} ${b.startTime}`;
      return dataA.localeCompare(dataB);
    });

  for (let i = 0; i < eventosComHorario.length - 1; i++) {
    const atual = eventosComHorario[i];
    const proximo = eventosComHorario[i + 1];

    if (
      atual.date === proximo.date &&
      atual.endTime &&
      proximo.startTime &&
      atual.endTime > proximo.startTime
    ) {
      insights.push(
        `Possível choque de horário em ${atual.date}: "${atual.title}" e "${proximo.title}".`
      );
    }
  }

  if (insights.length === 0) {
    insights.push("O radar está limpo. Tudo organizado por enquanto.");
  }

  return insights;
}

export async function interpretarEntradaRapidaComIA(input: string): Promise<ParsedResult | null> {
  const textoLimpo = input.trim();

  if (!textoLimpo) {
    return null;
  }

  try {
    const resposta = await fetch("/api/interpretar-agenda", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: textoLimpo }),
    });

    if (!resposta.ok) {
      console.error("Erro ao interpretar com IA:", await resposta.text());
      return null;
    }

    const data = await resposta.json();

    if (!data || !data.kind || !data.data) {
      console.error("Resposta inválida da IA:", data);
      return null;
    }

    return data as ParsedResult;
  } catch (error) {
    console.error("Falha ao chamar função de IA:", error);
    return null;
  }
}