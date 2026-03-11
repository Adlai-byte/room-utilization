/**
 * Parses a CSV string into an array of objects.
 * Handles quoted fields (including newlines within quotes) and escaped quotes ("").
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const rows = parseCSVRows(csv);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const results: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = j < row.length ? row[j].trim() : "";
    }
    results.push(obj);
  }

  return results;
}

function parseCSVRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\r") {
        // Handle \r\n or standalone \r
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        if (i + 1 < csv.length && csv[i + 1] === "\n") {
          i += 2;
        } else {
          i++;
        }
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Push the last field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}
