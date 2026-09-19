import Papa from "papaparse";
import { csvRowSchema, type CsvRow } from "@/lib/validations/feedback";

export interface CsvParseResult {
  validRows: CsvRow[];
  failedRows: { row: number; errors: string[] }[];
}

const MAX_ROWS = 2000;

/**
 * Parses and validates a CSV file's text content against Appendix A's
 * suggested columns (content, channel, customer_label, created_at). Each
 * row is validated independently - a malformed row is reported and
 * skipped, not treated as a fatal error for the whole upload, so C3 AC2
 * ("reports how many imported / how many failed") has real per-row detail
 * to report rather than an all-or-nothing outcome.
 */
export function parseFeedbackCsv(csvText: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const validRows: CsvRow[] = [];
  const failedRows: { row: number; errors: string[] }[] = [];

  const rows = parsed.data.slice(0, MAX_ROWS);

  rows.forEach((rawRow, index) => {
    const result = csvRowSchema.safeParse({
      content: rawRow.content,
      channel: rawRow.channel
        ?.trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_"),
      customer_label: rawRow.customer_label,
      created_at: rawRow.created_at || undefined,
    });

    if (result.success) {
      validRows.push(result.data);
    } else {
      failedRows.push({
        // +2: 1-indexed, plus the header row itself, so the row number
        // matches what a person sees when they open the file.
        row: index + 2,
        errors: result.error.errors.map((e) => e.message),
      });
    }
  });

  return { validRows, failedRows };
}
