export const MAX_INPUT_LENGTH = 600;

const STOP_WORDS = new Set([
  "buscar",
  "busca",
  "buscarlo",
  "busqueda",
  "search",
  "debo",
  "quiero",
  "necesito",
  "ver",
  "donde",
  "que",
  "en",
  "con",
  "sin",
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "por",
  "para",
  "and",
  "the",
]);

function toSafeString(value = "") {
  if (typeof value === "string") {
    return value;
  }

  return String(value ?? "");
}

export function stripControlChars(value = "") {
  return toSafeString(value).replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
}

export function collapseSpaces(value = "") {
  return stripControlChars(value).replace(/\s+/g, " ").trim();
}

export function sanitizeUserInput(value = "", maxLength = MAX_INPUT_LENGTH) {
  const safeLength = Number.isFinite(maxLength) && maxLength > 0 ? maxLength : MAX_INPUT_LENGTH;
  const withoutControl = stripControlChars(value).slice(0, safeLength);
  return collapseSpaces(withoutControl);
}

export function sanitizeUserDraft(value = "", maxLength = MAX_INPUT_LENGTH) {
  const safeLength = Number.isFinite(maxLength) && maxLength > 0 ? maxLength : MAX_INPUT_LENGTH;
  return toSafeString(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .slice(0, safeLength);
}

export function normalizeText(value = "") {
  return collapseSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function extractQuotedText(value = "") {
  const safeValue = toSafeString(value);
  const match = safeValue.match(/"([^"]+)"/);
  return match ? collapseSpaces(match[1]) : "";
}

export function stripQuotedSegments(value = "") {
  return toSafeString(value).replace(/"[^"]*"/g, " ");
}

export function tokenize(value = "") {
  return collapseSpaces(value)
    .split(/[^a-zA-Z0-9_#]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function removeStopWords(tokens = []) {
  return tokens.filter((token) => !STOP_WORDS.has(token));
}

export function uniqueStrings(items = []) {
  const seen = new Set();
  const output = [];

  items.forEach((item) => {
    const normalized = collapseSpaces(item);
    if (!normalized) {
      return;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(normalized);
  });

  return output;
}

export function firstMeaningfulToken(tokens = []) {
  return tokens.find((token) => token && token.length > 1) || "";
}

export function toSentenceCase(value = "") {
  const clean = collapseSpaces(value);
  if (!clean) {
    return "";
  }

  const lower = clean.toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

export function stripKnownIntentWords(tokens = []) {
  const intentWords = new Set([
    "sp",
    "stored",
    "procedure",
    "procedimiento",
    "funcion",
    "function",
    "fn",
    "udf",
    "error",
    "exception",
    "excepcion",
    "archivo",
    "file",
    "controller",
    "controlador",
    "service",
    "services",
    "servicio",
    "servicios",
    "interface",
    "interfaces",
    "interfaz",
    "clase",
    "clases",
    "metodo",
    "method",
    "blazor",
    "razor",
    "component",
    "componente",
    "pagina",
    "page",
    "index",
    "indice",
    "cursor",
    "tabla",
    "table",
    "vista",
    "view",
    "crystal",
    "report",
    "reporte",
    "rpt",
    "js",
    "javascript",
    "ts",
    "typescript",
    "cs",
    "c#",
    "sql",
    "cshtml",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
    "imagen",
    "image",
    "foto",
  ]);

  return tokens.filter((token) => !intentWords.has(token));
}

export function clipWords(value = "", maxWords = 3) {
  const words = collapseSpaces(value).split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}
