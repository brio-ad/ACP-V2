export function parseRecipientCsv(
  text: string,
  eligibleUsers: ReadonlyMap<string, string>,
  directoryEmails?: ReadonlySet<string>,
) {
  const rows: string[][] = [];
  const clean = text.replace(/^\uFEFF/, "");
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;

  function finishField() {
    row.push(field.trim());
    field = "";
    closed = false;
  }

  function finishRow() {
    finishField();
    if (row.some(Boolean) || row.length > 1) rows.push(row);
    row = [];
  }

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else {
        field += c;
      }
    } else if (c === ",") {
      finishField();
    } else if (c === "\n" || c === "\r") {
      finishRow();
      if (c === "\r" && clean[i + 1] === "\n") i++;
    } else if (c === '"' && !field.trim() && !closed) {
      field = "";
      quoted = true;
    } else if (c === '"' || (closed && c.trim())) {
      throw new Error("Invalid CSV quoting. Check the file and try again.");
    } else {
      field += c;
    }
  }
  if (quoted) throw new Error("An opening quote is missing its closing quote.");
  finishRow();
  if (!rows.length) throw new Error("The CSV is empty.");

  const header = rows[0].map((name) => name.toLowerCase().replace(/[ _-]/g, ""));
  const emailColumn = header.findIndex((name) => name === "email" || name === "emailaddress");
  if (emailColumn < 0 && rows.some((record) => record.length > 1)) {
    throw new Error('A CSV with multiple columns must have an "email" column.');
  }

  const ids = new Set<string>();
  const seen = new Set<string>();
  const unmatched: string[] = [];
  const ineligible: string[] = [];
  let invalid = 0;
  let duplicates = 0;
  for (const record of emailColumn < 0 ? rows : rows.slice(1)) {
    const email = record[Math.max(0, emailColumn)]?.toLowerCase() ?? "";
    if (
      (emailColumn >= 0 && record.length !== header.length) ||
      !/^[^\s@,;"<>]+@[^\s@,;"<>]+\.[^\s@,;"<>]+$/.test(email)
    ) {
      invalid++;
    } else if (seen.has(email)) {
      duplicates++;
    } else {
      seen.add(email);
      const id = eligibleUsers.get(email);
      if (id) ids.add(id);
      else if (directoryEmails?.has(email)) ineligible.push(email);
      else unmatched.push(email);
    }
  }
  if (!ids.size && !invalid && !duplicates && !unmatched.length && !ineligible.length)
    throw new Error("The CSV contains no recipient records.");
  return { ids: [...ids], invalid, duplicates, unmatched, ineligible };
}
