import { SEARCH_TYPE_VALUES } from "../data/searchTypes";
import { detectSearchIntent } from "./searchIntent";
import {
  clipWords,
  collapseSpaces,
  firstMeaningfulToken,
  sanitizeUserInput,
  uniqueStrings,
} from "./text";

function escapeExactQueryContent(value = "") {
  return collapseSpaces(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function quote(value = "") {
  const clean = escapeExactQueryContent(value);
  if (!clean) {
    return "";
  }
  return `"${clean}"`;
}

function sanitizeExt(ext = "") {
  return collapseSpaces(ext).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function withExt(query = "", ext = "") {
  const cleanQuery = collapseSpaces(query);
  if (!cleanQuery) {
    return "";
  }

  const safeExt = sanitizeExt(ext);
  if (!safeExt) {
    return cleanQuery;
  }

  if (cleanQuery.toLowerCase().includes(`ext:${safeExt}`)) {
    return cleanQuery;
  }

  return `${cleanQuery} ext:${safeExt}`;
}

function sanitizeFilenameToken(value = "") {
  const clean = collapseSpaces(value);
  if (!clean) {
    return "";
  }

  const token = clean.split(" ")[0];
  return token.replace(/[^a-zA-Z0-9_.-]/g, "");
}

function capitalizeWord(value = "") {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function resolveCoreTerm(intent) {
  const fromQuoted = collapseSpaces(intent.quotedText);
  if (fromQuoted) {
    return fromQuoted;
  }

  const fromBest = collapseSpaces(intent.bestText);
  if (fromBest) {
    return fromBest;
  }

  return collapseSpaces(intent.rawInput);
}

function appendContextFileQueries(intent, term, filenameToken, alternatives = []) {
  const hints = intent.contextHints || {};
  const scoped = [...alternatives];

  if (hints.isController) {
    scoped.push("path:/Controllers/ ext:cs");
    if (filenameToken) {
      scoped.push(`filename:${filenameToken}Controller ext:cs`);
    }
    if (term) {
      scoped.push(`${term}Controller ext:cs`);
    }
  }

  if (hints.isService) {
    scoped.push("path:/Services/ ext:cs");
    if (filenameToken) {
      scoped.push(`filename:${filenameToken}Service ext:cs`);
    }
    if (term) {
      scoped.push(`${term}Service ext:cs`);
    }
  }

  if (hints.isInterface) {
    scoped.push("path:/Interfaces/ ext:cs");
    if (filenameToken) {
      scoped.push(`filename:I${capitalizeWord(filenameToken)} ext:cs`);
    }
  }

  if (hints.isBlazor) {
    scoped.push("path:/Components/ ext:razor");
    if (term) {
      scoped.push(withExt(quote(term), "razor"));
      scoped.push(withExt(term, "cs"));
    }
  }

  if (hints.isRazorView) {
    scoped.push("path:/Views/ ext:cshtml");
  }

  if (hints.isImage) {
    scoped.push("path:/wwwroot/");
    if (filenameToken) {
      scoped.push(`filename:${filenameToken}`);
    }
  }

  return scoped;
}

function buildStoredProcedureQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const mainQuery = withExt(quote(term), "sql");

  const alternatives = uniqueStrings([
    filenameToken ? `filename:${filenameToken} ext:sql` : "",
    '"CREATE PROCEDURE" ext:sql',
    '"ALTER PROCEDURE" ext:sql',
    term ? `${term} ext:sql` : "",
    term ? `${term} "CREATE PROCEDURE" ext:sql` : "",
    "path:/Database/ ext:sql",
  ]);

  return {
    mainQuery,
    alternativeQueries: alternatives,
    explanation:
      "Se detecto una busqueda de Stored Procedure y se priorizo SQL con variantes CREATE/ALTER y filename.",
  };
}

function buildFunctionQueries(intent) {
  const term = resolveCoreTerm(intent);
  const preferredExt = intent.prioritizedExt || "sql";
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const hints = intent.contextHints || {};

  const mainQuery = withExt(quote(term), preferredExt);
  const crossLanguageAlternatives = ["sql", "js", "cs"]
    .filter((ext) => ext !== preferredExt)
    .map((ext) => withExt(quote(term), ext));

  const alternatives = [
    filenameToken ? `filename:${filenameToken} ext:${preferredExt}` : "",
    withExt(term, preferredExt),
    ...crossLanguageAlternatives,
  ];

  if (preferredExt === "sql" || hints.isSqlFunction) {
    alternatives.push('"CREATE FUNCTION" ext:sql');
    alternatives.push('"ALTER FUNCTION" ext:sql');
    alternatives.push("path:/Database/ ext:sql");
  }

  if (preferredExt === "cs") {
    alternatives.push("path:/Services/ ext:cs");
  }

  return {
    mainQuery,
    alternativeQueries: uniqueStrings(alternatives),
    explanation:
      "Se detecto una funcion y se genero una busqueda exacta con alternativas en SQL, JS y C#.",
  };
}

function pickErrorKeyword(intent, phrase) {
  const priority = [
    "overflow",
    "nullreference",
    "nullreferenceexception",
    "exception",
    "timeout",
    "deadlock",
  ];

  const token = priority.find((item) => intent.allTokens.includes(item));
  if (token) {
    return token;
  }

  return (
    firstMeaningfulToken(intent.coreTokens.slice().reverse()) ||
    firstMeaningfulToken(phrase.split(" ").reverse()) ||
    "error"
  );
}

function extractExactErrorText(intent) {
  if (intent.quotedText) {
    return collapseSpaces(intent.quotedText);
  }

  return collapseSpaces(intent.rawInput);
}

function cleanDynamicSegment(segment = "") {
  return collapseSpaces(segment)
    .replace(/^[+"']+|[+"']+$/g, "")
    .replace(/\s+[+]\s*$/g, "")
    .trim();
}

function isUsefulDynamicSegment(segment = "") {
  if (!segment) {
    return false;
  }

  const words = segment.split(" ").filter(Boolean).length;
  const length = segment.length;

  if (words >= 3) {
    return true;
  }

  if (words >= 2 && length >= 12) {
    return true;
  }

  if (segment.includes(":") && length >= 7) {
    return true;
  }

  return length >= 18;
}

function getDynamicErrorSegments(literalError) {
  const numberPattern = /\b\d+\b/g;
  const staticSegments = [];
  let previousIndex = 0;
  let match;
  let numericCount = 0;

  while ((match = numberPattern.exec(literalError)) !== null) {
    numericCount += 1;
    const rawSegment = literalError.slice(previousIndex, match.index);
    const cleanSegment = cleanDynamicSegment(rawSegment);

    if (isUsefulDynamicSegment(cleanSegment)) {
      staticSegments.push(cleanSegment);
    }

    previousIndex = match.index + match[0].length;
  }

  const trailingSegment = cleanDynamicSegment(literalError.slice(previousIndex));
  if (isUsefulDynamicSegment(trailingSegment)) {
    staticSegments.push(trailingSegment);
  }

  return {
    segments: uniqueStrings(staticSegments),
    numericCount,
  };
}

function buildDynamicErrorAlternatives(segments = []) {
  if (!segments.length) {
    return [];
  }

  const anchors = segments.slice(0, 3);
  const alternatives = [];

  const firstAnchor = anchors[0];
  if (firstAnchor) {
    const firstExact = quote(firstAnchor);
    alternatives.push(firstExact);
    alternatives.push(withExt(firstExact, "cs"));
    alternatives.push(withExt(firstExact, "js"));
    alternatives.push(withExt(firstExact, "sql"));
  }

  if (anchors.length >= 2) {
    const anchoredQuery = anchors
      .slice(0, 2)
      .map((segment) => quote(segment))
      .join(" ");

    alternatives.push(anchoredQuery);
    alternatives.push(withExt(anchoredQuery, "cs"));
    alternatives.push(withExt(anchoredQuery, "js"));
    alternatives.push(withExt(anchoredQuery, "sql"));
  }

  if (anchors.length >= 3) {
    const threeAnchorQuery = anchors.map((segment) => quote(segment)).join(" ");
    alternatives.push(threeAnchorQuery);
    alternatives.push(withExt(threeAnchorQuery, "cs"));
  }

  anchors.forEach((segment) => {
    const exactSegment = quote(segment);
    alternatives.push(exactSegment);
    alternatives.push(withExt(exactSegment, "cs"));
  });

  return uniqueStrings(alternatives);
}

function buildErrorQueries(intent) {
  const literalError = extractExactErrorText(intent);
  const keyword = pickErrorKeyword(intent, literalError);
  const exactLiteralQuery = quote(literalError);
  const { segments, numericCount } = getDynamicErrorSegments(literalError);
  const dynamicAlternatives = buildDynamicErrorAlternatives(segments);

  const hasDynamicPattern = numericCount > 0 && segments.length > 0;
  const mainQuery = hasDynamicPattern ? quote(segments[0]) : exactLiteralQuery;

  const baseAlternatives = [
    exactLiteralQuery,
    withExt(exactLiteralQuery, "cs"),
    withExt(exactLiteralQuery, "sql"),
    withExt(exactLiteralQuery, "js"),
    `${keyword} ext:cs`,
    `${keyword} ext:sql`,
    collapseSpaces(literalError),
    literalError.split(" ").length > 4 ? quote(clipWords(literalError, 4)) : "",
  ];

  const orderedAlternatives = dynamicAlternatives.length
    ? [...dynamicAlternatives, ...baseAlternatives]
    : baseAlternatives;

  const alternatives = uniqueStrings(orderedAlternatives);

  return {
    mainQuery,
    alternativeQueries: alternatives,
    explanation:
      "Se detecto un error y se priorizo el segmento fijo mas estable para mensajes dinamicos con IDs. Tambien se mantuvo el mensaje completo y variantes por extension.",
  };
}

function buildFileQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const ext = intent.prioritizedExt;

  if (ext) {
    const alternatives = appendContextFileQueries(intent, term, filenameToken, [
      filenameToken ? `filename:${filenameToken} ext:${ext}` : "",
      withExt(quote(term), ext),
      filenameToken ? `filename:${filenameToken}` : "",
    ]);

    return {
      mainQuery: withExt(term, ext),
      alternativeQueries: uniqueStrings(alternatives),
      explanation:
        "Se detecto una busqueda de archivo y se priorizo extension, filename y rutas comunes de proyectos .NET.",
    };
  }

  const alternatives = appendContextFileQueries(intent, term, filenameToken, [
    quote(term),
    term,
  ]);

  return {
    mainQuery: filenameToken ? `filename:${filenameToken}` : term,
    alternativeQueries: uniqueStrings(alternatives),
    explanation:
      "Se detecto una busqueda de archivo y se priorizo filename con rutas tipicas de soluciones .NET.",
  };
}

function buildViewQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const ext = intent.prioritizedExt === "razor" ? "razor" : "cshtml";
  const pathHint = ext === "razor" ? "path:/Components/" : "path:/Views/";

  return {
    mainQuery: withExt(term, ext),
    alternativeQueries: uniqueStrings([
      filenameToken ? `filename:${filenameToken} ext:${ext}` : "",
      withExt(quote(term), ext),
      `${pathHint} ${withExt(term, ext)}`,
      ext === "razor" ? withExt(term, "cs") : "",
    ]),
    explanation:
      "Se detecto una vista y se priorizo Razor/CSHTML con variantes por nombre y path de componentes o vistas.",
  };
}

function buildReportQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);

  return {
    mainQuery: withExt(term, "rpt"),
    alternativeQueries: uniqueStrings([
      filenameToken ? `filename:${filenameToken} ext:rpt` : "",
      withExt(quote(term), "rpt"),
      withExt(term, "rpt"),
    ]),
    explanation:
      "Se detecto un reporte y se priorizo la extension .rpt para encontrar definiciones de Crystal Reports.",
  };
}

function buildAutomaticSqlObjectQueries(intent, term, filenameToken) {
  const hints = intent.contextHints || {};

  if (!hints.isSqlTable && !hints.isSqlIndex && !hints.isSqlCursor) {
    return null;
  }

  const alternatives = [
    filenameToken ? `filename:${filenameToken} ext:sql` : "",
    "path:/Database/ ext:sql",
  ];

  if (hints.isSqlTable) {
    alternatives.push('"CREATE TABLE" ext:sql');
    alternatives.push(term ? `${term} "CREATE TABLE" ext:sql` : "");
  }

  if (hints.isSqlIndex) {
    alternatives.push('"CREATE INDEX" ext:sql');
    alternatives.push(term ? `${term} "CREATE INDEX" ext:sql` : "");
  }

  if (hints.isSqlCursor) {
    alternatives.push('"CURSOR" ext:sql');
    alternatives.push(term ? `${term} "CURSOR" ext:sql` : "");
  }

  return {
    mainQuery: withExt(quote(term || "sql"), "sql"),
    alternativeQueries: uniqueStrings(alternatives),
    explanation:
      "Se detecto un objeto SQL (tabla/index/cursor) y se priorizo SQL exacto con patrones CREATE/CURSOR.",
  };
}

function buildAutomaticQueries(intent) {
  const term = resolveCoreTerm(intent);
  const ext = intent.prioritizedExt;
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const exact = intent.quotedText ? quote(intent.quotedText) : quote(term);

  const sqlObjectResult = buildAutomaticSqlObjectQueries(intent, term, filenameToken);
  if (sqlObjectResult) {
    return sqlObjectResult;
  }

  const contextualAlternatives = appendContextFileQueries(intent, term, filenameToken, [
    ext ? withExt(exact, ext) : "",
    filenameToken ? withExt(`filename:${filenameToken}`, ext) : "",
    ext ? withExt(term, ext) : term,
  ]);

  const mainQuery = ext ? withExt(intent.quotedText ? exact : term, ext) : exact;

  return {
    mainQuery,
    alternativeQueries: uniqueStrings(contextualAlternatives),
    explanation:
      "No hubo una intencion unica, asi que se genero una query general con extension detectada y variantes por filename/path.",
  };
}

export function generateQueries(inputText, selectedType = SEARCH_TYPE_VALUES.AUTO) {
  const sanitizedInput = sanitizeUserInput(inputText || "");
  const trimmed = collapseSpaces(sanitizedInput);

  if (!trimmed) {
    return {
      mainQuery: "",
      alternativeQueries: [],
      explanation: "",
      detectedType: SEARCH_TYPE_VALUES.AUTO,
    };
  }

  const intent = detectSearchIntent(trimmed, selectedType);

  const builders = {
    [SEARCH_TYPE_VALUES.STORED_PROCEDURE]: buildStoredProcedureQueries,
    [SEARCH_TYPE_VALUES.FUNCTION]: buildFunctionQueries,
    [SEARCH_TYPE_VALUES.ERROR]: buildErrorQueries,
    [SEARCH_TYPE_VALUES.FILE]: buildFileQueries,
    [SEARCH_TYPE_VALUES.VIEW]: buildViewQueries,
    [SEARCH_TYPE_VALUES.REPORT]: buildReportQueries,
    [SEARCH_TYPE_VALUES.AUTO]: buildAutomaticQueries,
  };

  const build = builders[intent.type] || buildAutomaticQueries;
  const result = build(intent);
  const mainQuery = collapseSpaces(result.mainQuery);

  const alternativeQueries = uniqueStrings(result.alternativeQueries).filter(
    (query) => query.toLowerCase() !== mainQuery.toLowerCase()
  );

  return {
    mainQuery,
    alternativeQueries,
    explanation: result.explanation,
    detectedType: intent.type,
    prioritizedExt: intent.prioritizedExt,
  };
}


