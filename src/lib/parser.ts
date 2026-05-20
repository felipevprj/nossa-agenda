import { ParsedResult, PersonCode, Category } from "./types";

export function parseEventInput(input: string, context?: { defaultDate?: string }): ParsedResult {
  const lower = input.toLowerCase();
  
  if (lower.startsWith("comprar") || lower.includes("mercado")) {
    return { kind: "shopping", data: { item: input.replace(/comprar/i, "").trim(), category: "Casa", sourceText: input } };
  }

  if (["varrer", "passar pano", "sacar"].some(k => lower.startsWith(k))) {
    return { kind: "task", data: { title: input.charAt(0).toUpperCase() + input.slice(1), category: "Casa", sourceText: input } };
  }

  let personCode: PersonCode | null = null;
  let category: Category = "Evento";
  let duration = null;

  if (lower.includes("f1") || lower.includes("turma")) { personCode = "F1"; category = "Escola"; }
  else if (lower.includes("f2") || lower.includes("cliente")) { personCode = "F2"; category = "Trabalho"; duration = 60; }
  else if (lower.includes("clarisse") || lower.includes("pediatra")) { personCode = "CL"; category = "Saúde"; }
  else if (lower.includes("ff") || lower.includes("família")) { personCode = "FF"; category = "Família"; }

  const timeMatch = input.match(/(\d{1,2})(?:h|:)(\d{2})?/i);
  let startTime = timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2] || "00"}` : null;
  let title = timeMatch ? input.replace(timeMatch[0], "").trim() : input;
  
  let date = context?.defaultDate || null;
  const dateMatch = input.match(/(\d{2})\/(\d{2})/);
  if (dateMatch) {
    date = `${new Date().getFullYear()}-${dateMatch[2]}-${dateMatch[1]}`;
    title = title.replace(dateMatch[0], "").trim();
  }

  return {
    kind: "event",
    data: { personCode, title: title.charAt(0).toUpperCase() + title.slice(1), date, startTime, durationMinutes: duration, category, sourceText: input }
  };
}