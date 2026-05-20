import { PersonCode } from "./types";

export const PEOPLE: Record<PersonCode, any> = {
  F1: { code: "F1", name: "Felipe", role: "Pai", colorVar: "blue-500", softVar: "blue-100", defaultPhoto: null },
  F2: { code: "F2", name: "Fabiane", role: "Mãe", colorVar: "pink-500", softVar: "pink-100", defaultPhoto: null },
  FF: { code: "FF", name: "Família", role: "Todos", colorVar: "green-500", softVar: "green-100", defaultPhoto: null },
  CL: { code: "CL", name: "Clarisse", role: "Bebê", colorVar: "yellow-500", softVar: "yellow-100", defaultPhoto: null }
};

export const F1_ROUTINE: Record<number, {start: string, end: string} | null> = {
  1: { start: "07:30", end: "17:45" },
  2: { start: "07:30", end: "16:30" },
  3: { start: "07:30", end: "16:30" },
  4: { start: "07:30", end: "17:30" },
  5: { start: "07:30", end: "16:30" }
};