/**
 * Reads the bytes of an exported file as text. Ad cabinets are not consistent
 * about encoding: Google Ads exports are commonly UTF-16 with a byte-order
 * mark, Excel-saved files often carry a UTF-8 BOM or are Windows-1251, and
 * reading any of those as plain UTF-8 yields garbage or an empty table. The BOM
 * decides when there is one; otherwise strict UTF-8, then Windows-1251.
 */
export function decodeCsvBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1251").decode(bytes);
  }
}

const DELIMITERS = [",", ";", "\t"] as const;

/** One pass of RFC 4180: quoted fields, `""` escapes, newlines inside quotes, CRLF or LF. */
function parseWith(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/**
 * Parses CSV text into rows of cells. The delimiter is detected rather than
 * assumed — Ukrainian-locale Excel writes `;`, Google Ads writes tabs — by
 * taking the one that yields the most rows of three or more columns, which a
 * title line or a stray comma inside a quoted cell cannot fake.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  let best: string[][] = [];
  let bestScore = -1;
  for (const delimiter of DELIMITERS) {
    const rows = parseWith(clean, delimiter);
    const score = rows.filter((cells) => cells.length >= 3).length;
    if (score > bestScore) {
      best = rows;
      bestScore = score;
    }
  }
  return best;
}
