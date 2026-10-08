import type { EvaluateResponse } from "./shared/schema";

export interface HistoryItem extends EvaluateResponse {
  prompt: string;
  areaId: string | null;
  at: number;
}

/** One side of a comparison: a prompt, plus its result once evaluated or loaded from history. */
export interface Slot {
  prompt: string;
  areaId: string | null;
  result: EvaluateResponse | null;
  error: string | null;
}

export const emptySlot = (): Slot => ({ prompt: "", areaId: null, result: null, error: null });
