import { SEARCH_TYPE_VALUES } from "../data/searchTypes";
import {
  collapseSpaces,
  extractQuotedText,
  firstMeaningfulToken,
  normalizeText,
  removeStopWords,
  sanitizeUserInput,
  stripKnownIntentWords,
  stripQuotedSegments,
  tokenize,
} from "./text";

const TYPE_KEYWORDS = {
  [SEARCH_TYPE_VALUES.COLUMN]: [
    "columna",
    "column",
    "columnas",
    "columns",
    "campo",
    "campos",
    "field",
    "fields",
    "table column",
    "columna tabla",
    "column sp",
    "columna sp",
    "boolean",
    "booleano",
    "bool",
    "bit",
    "flag",
    "bandera",
    "sn",
    "si_no",
    "si/no",
    "sino",
  ],
  [SEARCH_TYPE_VALUES.STORED_PROCEDURE]: [
    "sp",
    "stored procedure",
    "stored",
    "procedure",
    "procedimiento",
  ],
  [SEARCH_TYPE_VALUES.FUNCTION]: [
    "funcion",
    "function",
    "fn",
    "metodo",
    "method",
    "udf",
  ],
  [SEARCH_TYPE_VALUES.FILE]: [
    "archivo",
    "file",
    "controller",
    "controlador",
    "service",
    "servicio",
    "interface",
    "interfaz",
    "blazor",
    "razor",
    "imagen",
    "image",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
  ],
  [SEARCH_TYPE_VALUES.VIEW]: ["vista", "view", "cshtml", "razor page"],
  [SEARCH_TYPE_VALUES.REPORT]: ["crystal", "report", "reporte", "rpt"],
};

const EXTENSION_HINTS = {
  sql: [
    "sql",
    "sp",
    "stored",
    "procedure",
    "procedimiento",
    "fn",
    "function",
    "funcion",
    "tabla",
    "table",
    "cursor",
    "index",
    "indice",
    "udf",
    "columna",
    "column",
    "campo",
    "field",
    "boolean",
    "booleano",
    "bool",
    "bit",
    "si_no",
    "sn",
  ],
  cs: [
    "cs",
    "c#",
    "clase",
    "metodo",
    "method",
    "controller",
    "controlador",
    "service",
    "servicio",
    "interface",
    "interfaz",
  ],
  js: ["js", "javascript"],
  ts: ["ts", "typescript"],
  cshtml: ["cshtml", "vista", "view", "razor page"],
  razor: ["razor", "blazor", "component", "componente"],
  rpt: ["rpt", "crystal", "report", "reporte"],
  png: ["png"],
  jpg: ["jpg"],
  jpeg: ["jpeg"],
  gif: ["gif"],
  svg: ["svg"],
  webp: ["webp"],
  json: ["json"],
  xml: ["xml"],
  yml: ["yml"],
  yaml: ["yaml"],
  config: ["config", "settings"],
  css: ["css"],
  scss: ["scss"],
};

const KNOWN_EXTENSIONS = [
  "sql",
  "cs",
  "js",
  "ts",
  "cshtml",
  "razor",
  "rpt",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "json",
  "xml",
  "yml",
  "yaml",
  "config",
  "css",
  "scss",
  "resx",
  "csproj",
  "sln",
  "md",
  "txt",
];

const HINT_KEYWORDS = {
  controller: ["controller", "controlador", "controllers"],
  service: ["service", "services", "servicio", "servicios"],
  interface: ["interface", "interfaces", "interfaz", "contrato"],
  blazor: ["blazor", "razor component", "componente razor", "component"],
  razorView: ["razor page", "cshtml", "vista", "view"],
  sqlTable: ["tabla", "table", "create table"],
  sqlColumn: [
    "columna",
    "column",
    "columnas",
    "columns",
    "campo",
    "campos",
    "field",
    "fields",
  ],
  sqlBoolean: [
    "sn",
    "si_no",
    "si/no",
    "sino",
    "boolean",
    "booleano",
    "bool",
    "bit",
    "flag",
    "bandera",
    "true",
    "false",
  ],
  sqlCursor: ["cursor", "cursores"],
  sqlIndex: ["index", "indice", "create index"],
  sqlFunction: [
    "funcion sql",
    "function sql",
    "udf",
    "scalar function",
    "table valued function",
  ],
  image: ["imagen", "image", "foto", "png", "jpg", "jpeg", "gif", "svg", "webp"],
};

function includesPhrase(text, phrase) {
  return text.includes(phrase);
}

function hasAnyKeyword(text, tokens, keywords) {
  return keywords.some((keyword) =>
    keyword.includes(" ")
      ? includesPhrase(text, keyword)
      : tokens.includes(keyword)
  );
}

function isLikelyBooleanColumnSearch(text, tokens) {
  const hasSnToken = tokens.some((token) => /^sn([a-z0-9_]+)?$/.test(token));
  const hasSiNoToken = tokens.some((token) => /^si_?no([a-z0-9_]+)?$/.test(token));
  const hasMinusOneAndZeroPattern =
    /(^|[^0-9])-1([^0-9]|$)/.test(text) && /(^|[^0-9])0([^0-9]|$)/.test(text);
  const hasBooleanKeyword = hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlBoolean);

  const hasSqlScope =
    tokens.includes("sql") ||
    hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.STORED_PROCEDURE]) ||
    hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlTable) ||
    hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlColumn);

  if (hasSnToken || hasSiNoToken || hasMinusOneAndZeroPattern) {
    return true;
  }

  return hasBooleanKeyword && hasSqlScope;
}

function detectByKeywords(text, tokens) {
  if (hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.COLUMN])) {
    return SEARCH_TYPE_VALUES.COLUMN;
  }

  if (isLikelyBooleanColumnSearch(text, tokens)) {
    return SEARCH_TYPE_VALUES.COLUMN;
  }

  if (
    hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.STORED_PROCEDURE])
  ) {
    return SEARCH_TYPE_VALUES.STORED_PROCEDURE;
  }

  if (hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.REPORT])) {
    return SEARCH_TYPE_VALUES.REPORT;
  }

  if (hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.VIEW])) {
    return SEARCH_TYPE_VALUES.VIEW;
  }

  if (hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.FUNCTION])) {
    return SEARCH_TYPE_VALUES.FUNCTION;
  }

  if (hasAnyKeyword(text, tokens, TYPE_KEYWORDS[SEARCH_TYPE_VALUES.FILE])) {
    return SEARCH_TYPE_VALUES.FILE;
  }

  return SEARCH_TYPE_VALUES.AUTO;
}

function detectExplicitExtension(tokens) {
  return KNOWN_EXTENSIONS.find((ext) => tokens.includes(ext)) || "";
}

function buildContextHints(text, tokens) {
  const isSqlFunctionByToken = tokens.some((token) => token.startsWith("fn_"));
  const hasMinusOneAndZeroPattern =
    /(^|[^0-9])-1([^0-9]|$)/.test(text) && /(^|[^0-9])0([^0-9]|$)/.test(text);

  return {
    isController: hasAnyKeyword(text, tokens, HINT_KEYWORDS.controller),
    isService: hasAnyKeyword(text, tokens, HINT_KEYWORDS.service),
    isInterface: hasAnyKeyword(text, tokens, HINT_KEYWORDS.interface),
    isBlazor: hasAnyKeyword(text, tokens, HINT_KEYWORDS.blazor),
    isRazorView: hasAnyKeyword(text, tokens, HINT_KEYWORDS.razorView),
    isSqlTable: hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlTable),
    isSqlColumn: hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlColumn),
    isSqlBoolean:
      hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlBoolean) || hasMinusOneAndZeroPattern,
    isSqlCursor: hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlCursor),
    isSqlIndex: hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlIndex),
    isSqlFunction:
      isSqlFunctionByToken || hasAnyKeyword(text, tokens, HINT_KEYWORDS.sqlFunction),
    isImage: hasAnyKeyword(text, tokens, HINT_KEYWORDS.image),
  };
}

function detectExtension(text, tokens, detectedType, contextHints) {
  const explicit = detectExplicitExtension(tokens);
  if (explicit) {
    return explicit;
  }

  const hasSqlObject =
    contextHints.isSqlTable ||
    contextHints.isSqlColumn ||
    contextHints.isSqlBoolean ||
    contextHints.isSqlCursor ||
    contextHints.isSqlIndex;

  if (hasSqlObject || contextHints.isSqlFunction) {
    return "sql";
  }

  if (detectedType === SEARCH_TYPE_VALUES.COLUMN) {
    return "sql";
  }

  if (detectedType === SEARCH_TYPE_VALUES.STORED_PROCEDURE) {
    return "sql";
  }

  if (detectedType === SEARCH_TYPE_VALUES.VIEW) {
    return contextHints.isBlazor ? "razor" : "cshtml";
  }

  if (detectedType === SEARCH_TYPE_VALUES.REPORT) {
    return "rpt";
  }

  if (detectedType === SEARCH_TYPE_VALUES.FILE) {
    if (contextHints.isController || contextHints.isService || contextHints.isInterface) {
      return "cs";
    }
    if (contextHints.isBlazor) {
      return "razor";
    }
    if (contextHints.isRazorView) {
      return "cshtml";
    }

    const imageExt = ["png", "jpg", "jpeg", "gif", "svg", "webp"].find((ext) =>
      hasAnyKeyword(text, tokens, EXTENSION_HINTS[ext])
    );
    if (imageExt) {
      return imageExt;
    }
  }

  if (detectedType === SEARCH_TYPE_VALUES.FUNCTION) {
    if (contextHints.isSqlFunction) {
      return "sql";
    }
    if (hasAnyKeyword(text, tokens, EXTENSION_HINTS.sql)) {
      return "sql";
    }
    if (hasAnyKeyword(text, tokens, EXTENSION_HINTS.cs)) {
      return "cs";
    }
    return "sql";
  }

  const orderedExt = [
    "cshtml",
    "razor",
    "rpt",
    "js",
    "ts",
    "cs",
    "sql",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
    "json",
    "xml",
    "yml",
    "yaml",
    "config",
    "css",
    "scss",
  ];

  const found = orderedExt.find((ext) => hasAnyKeyword(text, tokens, EXTENSION_HINTS[ext]));
  return found || "";
}

export function detectSearchIntent(inputText, selectedType = SEARCH_TYPE_VALUES.AUTO) {
  const raw = sanitizeUserInput(inputText || "");
  const normalizedInput = normalizeText(raw);
  const quotedText = extractQuotedText(raw);
  const withoutQuoted = stripQuotedSegments(normalizedInput);
  const allTokens = removeStopWords(tokenize(withoutQuoted));
  const coreTokens = stripKnownIntentWords(allTokens);
  const selectedManual = selectedType !== SEARCH_TYPE_VALUES.AUTO;

  const autoType = detectByKeywords(withoutQuoted, allTokens);
  const type = selectedManual ? selectedType : autoType;
  const contextHints = buildContextHints(withoutQuoted, allTokens);

  const prioritizedExt = detectExtension(withoutQuoted, allTokens, type, contextHints);
  const coreText = collapseSpaces(coreTokens.join(" "));
  const fallbackText = collapseSpaces(allTokens.join(" "));
  const bestText = coreText || fallbackText || quotedText;
  const nameToken = firstMeaningfulToken(coreTokens) || firstMeaningfulToken(allTokens);

  return {
    rawInput: raw,
    normalizedInput,
    selectedType,
    manualOverride: selectedManual,
    type,
    quotedText,
    prioritizedExt,
    allTokens,
    coreTokens,
    coreText,
    bestText,
    nameToken,
    contextHints,
  };
}



