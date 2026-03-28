/**
 * Lightweight CSV loader using only Node.js built-ins.
 * No external CSV parsing library needed.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Project root → data/ directory */
const DATA_DIR = resolve(__dirname, "..", "..", "..", "data");

export interface CsvRow {
  [key: string]: string;
}

/**
 * Parse a CSV line handling quoted fields (fields may contain commas inside quotes).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Load a CSV file from the data/ directory.
 * Returns an array of objects keyed by header column names.
 */
export function loadCsv(filename: string): CsvRow[] {
  const filepath = resolve(DATA_DIR, filename);
  const content = readFileSync(filepath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Load intents CSV and return structured intent data.
 */
export interface IntentEntry {
  intent: string;
  keywordsZh: string[];
  keywordsEn: string[];
  priority: number;
  slots: string[];
  description: string;
  /** Combined searchable text for BM25 indexing */
  searchText: string;
}

export function loadIntents(): IntentEntry[] {
  const rows = loadCsv("intents.csv");
  return rows.map((row) => {
    const keywordsZh = (row["Keywords_ZH"] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    const keywordsEn = (row["Keywords_EN"] ?? "").split(",").map((k) => k.trim()).filter(Boolean);

    return {
      intent: row["Intent"] ?? "",
      keywordsZh,
      keywordsEn,
      priority: parseInt(row["Priority"] ?? "99", 10),
      slots: (row["Slots"] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      description: row["Description"] ?? "",
      searchText: [...keywordsZh, ...keywordsEn, row["Description"] ?? ""].join(" ")
    };
  });
}

/**
 * Load response templates CSV.
 */
export interface ResponseEntry {
  key: string;
  templateZh: string;
  templateEn: string;
  variables: string[];
}

export function loadResponses(): ResponseEntry[] {
  const rows = loadCsv("responses.csv");
  return rows.map((row) => ({
    key: row["Key"] ?? "",
    templateZh: row["Template_ZH"] ?? "",
    templateEn: row["Template_EN"] ?? "",
    variables: (row["Variables"] ?? "").split(",").map((v) => v.trim()).filter(Boolean)
  }));
}

/**
 * Load music reasoning CSV.
 */
export interface ReasoningEntry {
  scene: string;
  keywordsZh: string[];
  keywordsEn: string[];
  timeRange: string;
  mood: string;
  recommendedGenre: string[];
  recommendedTempoBpm: string;
  antiPatterns: string[];
  decisionRules: Record<string, string>;
  /** Combined searchable text */
  searchText: string;
}

export function loadReasoning(): ReasoningEntry[] {
  const rows = loadCsv("music-reasoning.csv");
  return rows.map((row) => {
    const keywordsZh = (row["Keywords_ZH"] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    const keywordsEn = (row["Keywords_EN"] ?? "").split(",").map((k) => k.trim()).filter(Boolean);

    let decisionRules: Record<string, string> = {};
    try {
      decisionRules = JSON.parse(row["Decision_Rules"] ?? "{}");
    } catch {
      /* ignore parse errors */
    }

    return {
      scene: row["Scene"] ?? "",
      keywordsZh,
      keywordsEn,
      timeRange: row["Time_Range"] ?? "any",
      mood: row["Mood"] ?? "",
      recommendedGenre: (row["Recommended_Genre"] ?? "").split(",").map((g) => g.trim()).filter(Boolean),
      recommendedTempoBpm: row["Recommended_Tempo_BPM"] ?? "",
      antiPatterns: (row["Anti_Patterns"] ?? "").split(",").map((a) => a.trim()).filter(Boolean),
      decisionRules,
      searchText: [row["Scene"] ?? "", ...keywordsZh, ...keywordsEn, row["Mood"] ?? ""].join(" ")
    };
  });
}
