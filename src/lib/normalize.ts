import type { ParsedResult } from "./types";

function normalizar(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatarHora(hora: number, minuto: number = 0): string {
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function minutosDoDia(horario: string): number {
  const [hora, minuto] = horario.split(":").map(Number);
  return hora * 60 + minuto;
}

function calcularDuracao(startTime: string, endTime: string): number | null {
  const inicio = minutosDoDia(startTime);
  const fim = minutosDoDia(endTime);

  if (fim <= inicio) return null;

  return fim - inicio;
}

function extrairIntervaloHorario(input: string): {
  startTime: string;
  endTime: string;
  durationMinutes: number;
} | null {
  const texto = input.toLowerCase();

  const padrao = texto.match(
    /(?:\b(?:das|de)\s*)?\b(\d{1,2})(?:(?:h|:)(\d{2}))?\s*(?:às|as|a|-)\s*(\d{1,2})(?:(?:h|:)(\d{2}))?\b/i
  );

  if (!padrao) return null;

  const horaInicio = Number(padrao[1]);
  const minutoInicio = padrao[2] ? Number(padrao[2]) : 0;
  const horaFim = Number(padrao[3]);
  const minutoFim = padrao[4] ? Number(padrao[4]) : 0;

  if (
    horaInicio < 0 ||
    horaInicio > 23 ||
    horaFim < 0 ||
    horaFim > 23 ||
    minutoInicio < 0 ||
    minutoInicio > 59 ||
    minutoFim < 0 ||
    minutoFim > 59
  ) {
    return null;
  }

  const startTime = formatarHora(horaInicio, minutoInicio);
  const endTime = formatarHora(horaFim, minutoFim);
  const durationMinutes = calcularDuracao(startTime, endTime);

  if (!durationMinutes) return null;

  return {
    startTime,
    endTime,
    durationMinutes,
  };
}

function limparTitulo(inputOriginal: string, tituloAtual: string | null | undefined): string {
  const texto = normalizar(inputOriginal);
  const turma = inputOriginal.match(/\bturma\s*(\d{2})\b/i);

  if (texto.includes("dia de formacao") && turma) {
    return `Dia de formação turma ${turma[1]}`;
  }

  if (texto.includes("manha de formacao") && turma) {
    return `Manhã de formação turma ${turma[1]}`;
  }

  if (texto.includes("cliente")) {
    return "Cliente";
  }

  if (texto.includes("pediatra")) {
    return "Pediatra da Clarisse";
  }

  if (texto.includes("vacina")) {
    return "Vacina da Clarisse";
  }

  let titulo = tituloAtual || "Compromisso";

  titulo = titulo
    .replace(
      /(?:\b(?:das|de)\s*)?\b\d{1,2}(?:(?:h|:)\d{2})?\s*(?:às|as|a|-)\s*\d{1,2}(?:(?:h|:)\d{2})?\b/gi,
      " "
    )
    .replace(/\bem\s+corrêas\b/gi, " ")
    .replace(/\bem\s+correas\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return titulo || "Compromisso";
}

function corrigirLocal(inputOriginal: string, localAtual: string | null | undefined): string | null {
  const texto = normalizar(inputOriginal);

  if (texto.includes("correas") || texto.includes("corrêas")) {
    return "Corrêas, Petrópolis";
  }

  if (texto.includes("santo inacio")) {
    return "Colégio Santo Inácio";
  }

  if (texto.includes("copacabana")) {
    return "Copacabana";
  }

  if (texto.includes("botafogo")) {
    return "Botafogo";
  }

  return localAtual ?? null;
}

export function corrigirParsedComTextoOriginal(
  inputOriginal: string,
  parsed: ParsedResult
): ParsedResult {
  if (parsed.kind !== "event") {
    return parsed;
  }

  const intervalo = extrairIntervaloHorario(inputOriginal);

  return {
    ...parsed,
    data: {
      ...parsed.data,
      title: limparTitulo(inputOriginal, parsed.data.title),
      location: corrigirLocal(inputOriginal, parsed.data.location),
      ...(intervalo
        ? {
            startTime: intervalo.startTime,
            endTime: intervalo.endTime,
            durationMinutes: intervalo.durationMinutes,
            isAllDay: false,
          }
        : {}),
    },
  };
}