import type { IntentType } from "./intent-types.js";

export interface IntentResult {
  intent: IntentType;
  confidence: number;
}
