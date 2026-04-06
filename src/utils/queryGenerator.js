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

function withFile(query = "", filePattern = "") {
  const cleanQuery = collapseSpaces(query);
  const cleanPattern = collapseSpaces(filePattern);

  if (!cleanPattern) {
    return cleanQuery;
  }

  return cleanQuery ? `${cleanQuery} file:${cleanPattern}` : `file:${cleanPattern}`;
}

function withPath(query = "", pathPattern = "") {
  const cleanQuery = collapseSpaces(query);
  const cleanPattern = collapseSpaces(pathPattern);

  if (!cleanPattern) {
    return cleanQuery;
  }

  return cleanQuery ? `${cleanQuery} path:${cleanPattern}` : `path:${cleanPattern}`;
}

function withScopedFilter(query = "", filterName = "", value = "") {
  const cleanQuery = collapseSpaces(query);
  const cleanFilter = collapseSpaces(filterName).toLowerCase();
  const cleanValue = sanitizeScopeValue(value);

  if (!cleanFilter || !cleanValue) {
    return cleanQuery;
  }

  const scopedFilter = `${cleanFilter}:${cleanValue}`;
  if (cleanQuery.toLowerCase().includes(scopedFilter.toLowerCase())) {
    return cleanQuery;
  }

  return cleanQuery ? `${cleanQuery} ${scopedFilter}` : scopedFilter;
}

function sanitizeScopeValue(value = "") {
  return collapseSpaces(value).replace(/[^a-zA-Z0-9_./-]/g, "");
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function extractScopeFilterValue(rawInput = "", labels = []) {
  const source = collapseSpaces(rawInput);
  if (!source || !labels.length) {
    return "";
  }

  for (const label of labels) {
    const escaped = escapeRegex(label);
    const pattern = new RegExp(
      `(?:^|\\s)${escaped}(?:\\s*[:=]\\s*|\\s+)([a-zA-Z0-9_./-]+)`,
      "i"
    );
    const match = source.match(pattern);
    if (match && match[1]) {
      return sanitizeScopeValue(match[1]);
    }
  }

  return "";
}

function buildScopeFilterAlternatives(intent, baseQuery = "") {
  const rawInput = intent?.rawInput || "";
  const project = extractScopeFilterValue(rawInput, ["proyecto", "project", "proj"]);
  const repo = extractScopeFilterValue(rawInput, ["repositorio", "repository", "repo"]);
  const release = extractScopeFilterValue(rawInput, [
    "release",
    "releases",
    "version",
    "versiones",
  ]);
  const branch = extractScopeFilterValue(rawInput, ["rama", "branch"]);

  const projectScoped = project ? withScopedFilter(baseQuery, "proj", project) : "";
  const repoScoped = repo ? withScopedFilter(baseQuery, "repo", repo) : "";

  const projectRepoScoped =
    project && repo
      ? withScopedFilter(withScopedFilter(baseQuery, "proj", project), "repo", repo)
      : "";

  const releasePathScoped = release ? withPath(baseQuery, "**/release*/**") : "";
  const releaseNameScoped = release ? withFile(baseQuery, `*${release}*`) : "";
  const releasePathByNameScoped = release
    ? withPath(baseQuery, `**/*${release}*/**`)
    : "";

  const projectRepoReleaseScoped =
    project && repo && release
      ? withFile(projectRepoScoped || baseQuery, `*${release}*`)
      : "";

  const branchScoped = branch ? withScopedFilter(baseQuery, "branch", branch) : "";
  const projectRepoBranchScoped =
    project && repo && branch
      ? withScopedFilter(projectRepoScoped || baseQuery, "branch", branch)
      : "";

  return uniqueStrings([
    projectScoped,
    repoScoped,
    projectRepoScoped,
    releasePathScoped,
    releaseNameScoped,
    releasePathByNameScoped,
    projectRepoReleaseScoped,
    branchScoped,
    projectRepoBranchScoped,
  ]);
}

function sanitizeFilenameToken(value = "") {
  const clean = collapseSpaces(value);
  if (!clean) {
    return "";
  }

  const token = clean.split(" ")[0];
  return token.replace(/[^a-zA-Z0-9_.-]/g, "");
}

function sanitizeCodeToken(value = "") {
  return sanitizeFilenameToken(value).replace(/[^a-zA-Z0-9_.]/g, "");
}

function capitalizeWord(value = "") {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function wildcardSuffix(value = "") {
  const token = sanitizeFilenameToken(value);
  if (!token || token.length < 2) {
    return "";
  }

  return `${token}*`;
}

function wildcardContains(value = "") {
  const token = sanitizeFilenameToken(value);
  if (!token || token.length < 3) {
    return "";
  }

  return `*${token}*`;
}

function wildcardSingleChar(value = "") {
  const token = sanitizeFilenameToken(value);
  if (!token || token.length < 3) {
    return "";
  }

  return `${token.slice(0, -1)}?`;
}

function quoteIfNeeded(value = "") {
  const clean = collapseSpaces(value);
  if (!clean) {
    return "";
  }

  return clean.includes(" ") ? quote(clean) : clean;
}

function buildBooleanOrQuery(left = "", right = "") {
  const leftPart = quoteIfNeeded(left);
  const rightPart = quoteIfNeeded(right);

  if (!leftPart || !rightPart) {
    return "";
  }

  return `(${leftPart} OR ${rightPart})`;
}

function buildProximityQuery(left = "", right = "") {
  const leftPart = quoteIfNeeded(left);
  const rightPart = quoteIfNeeded(right);

  if (!leftPart || !rightPart) {
    return "";
  }

  return `${leftPart} NEAR ${rightPart}`;
}

function buildOfficialFileAndPathAlternatives(term, filenameToken, ext = "") {
  const safeExt = sanitizeExt(ext);
  const termPrefix = wildcardSuffix(term);
  const tokenPrefix = wildcardSuffix(filenameToken);
  const tokenContains = wildcardContains(filenameToken);
  const tokenSingleChar = wildcardSingleChar(filenameToken);

  const tokenPathPattern = filenameToken ? `**/${filenameToken}*/**` : "";
  const filePathPattern =
    filenameToken && safeExt ? `**/${filenameToken}*.${safeExt}` : "";

  return uniqueStrings([
    tokenPrefix ? withFile("", tokenPrefix) : "",
    tokenContains ? withFile("", tokenContains) : "",
    tokenSingleChar ? withFile("", tokenSingleChar) : "",
    safeExt && tokenPrefix ? withFile("", `${tokenPrefix}.${safeExt}`) : "",
    safeExt && tokenContains ? withFile("", `${tokenContains}.${safeExt}`) : "",
    tokenPathPattern ? withPath("", tokenPathPattern) : "",
    filePathPattern ? withPath("", filePathPattern) : "",
    safeExt ? withPath("", `**/*.${safeExt}`) : "",
    safeExt && termPrefix ? withExt(termPrefix, safeExt) : "",
  ]);
}

function buildCodeTypeAlternatives(intent, term, ext = "") {
  const token = sanitizeCodeToken(intent.nameToken || term);
  const hints = intent.contextHints || {};
  const safeExt = sanitizeExt(ext);

  if (!token) {
    return [];
  }

  const isCSharpContext =
    safeExt === "cs" || hints.isController || hints.isService || hints.isInterface;
  const isGeneralCodeContext =
    isCSharpContext ||
    safeExt === "js" ||
    safeExt === "ts" ||
    safeExt === "razor" ||
    safeExt === "cshtml";

  if (!isGeneralCodeContext) {
    return [];
  }

  const interfaceToken = `I${capitalizeWord(token)}`;

  return uniqueStrings([
    `def:${token}`,
    `ref:${token}`,
    `comment:${token}`,
    `strlit:${token}`,
    isCSharpContext ? `method:${token}` : "",
    isCSharpContext ? `type:${token}` : "",
    isCSharpContext ? `class:${token}` : "",
    isCSharpContext ? `namespace:${token}` : "",
    isCSharpContext && hints.isInterface ? `interface:${interfaceToken}` : "",
    isCSharpContext && !hints.isInterface ? `interface:${token}` : "",
  ]);
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

function appendContextFileQueries(intent, term, filenameToken, ext = "", alternatives = []) {
  const hints = intent.contextHints || {};
  const scoped = [...alternatives];

  if (hints.isController) {
    scoped.push("path:/Controllers/ ext:cs");
    scoped.push("path:**/Controllers/**");
    if (filenameToken) {
      scoped.push(withFile("", `${filenameToken}Controller*`));
      scoped.push(withPath("", `**/${filenameToken}Controller*.cs`));
    }
    if (term) {
      scoped.push(withExt(`${sanitizeFilenameToken(term)}Controller*`, "cs"));
    }
  }

  if (hints.isService) {
    scoped.push("path:/Services/ ext:cs");
    scoped.push("path:**/Services/**");
    if (filenameToken) {
      scoped.push(withFile("", `${filenameToken}Service*`));
      scoped.push(withPath("", `**/${filenameToken}Service*.cs`));
    }
    if (term) {
      scoped.push(withExt(`${sanitizeFilenameToken(term)}Service*`, "cs"));
    }
  }

  if (hints.isInterface) {
    scoped.push("path:/Interfaces/ ext:cs");
    scoped.push("path:**/Interfaces/**");
    if (filenameToken) {
      const interfaceToken = `I${capitalizeWord(filenameToken)}`;
      scoped.push(withFile("", `${interfaceToken}*`));
      scoped.push(withPath("", `**/${interfaceToken}*.cs`));
    }
  }

  if (hints.isBlazor) {
    scoped.push("path:/Components/ ext:razor");
    scoped.push("path:**/Components/**");
    if (term) {
      scoped.push(withExt(quote(term), "razor"));
      scoped.push(withExt(term, "cs"));
    }
  }

  if (hints.isRazorView) {
    scoped.push("path:/Views/ ext:cshtml");
    scoped.push("path:**/Views/**");
  }

  if (hints.isImage) {
    scoped.push("path:/wwwroot/");
    scoped.push("path:**/wwwroot/**");
    if (filenameToken) {
      scoped.push(withFile("", `${filenameToken}*`));
    }
  }

  scoped.push(...buildOfficialFileAndPathAlternatives(term, filenameToken, ext));
  scoped.push(...buildCodeTypeAlternatives(intent, term, ext));

  return uniqueStrings(scoped);
}

function buildStoredProcedureQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const mainQuery = withExt(quote(term), "sql");
  const createOrAlter = buildBooleanOrQuery("CREATE PROCEDURE", "ALTER PROCEDURE");

  const alternatives = uniqueStrings([
    filenameToken ? withFile("", `${filenameToken}*.sql`) : "",
    filenameToken ? withFile("", `*${filenameToken}*.sql`) : "",
    '"CREATE PROCEDURE" ext:sql',
    '"ALTER PROCEDURE" ext:sql',
    createOrAlter ? withExt(createOrAlter, "sql") : "",
    term ? `${quote(term)} "CREATE PROCEDURE" ext:sql` : "",
    term ? `${quote(term)} "ALTER PROCEDURE" ext:sql` : "",
    term ? `${term} ext:sql` : "",
    "path:/Database/ ext:sql",
    "path:**/Database/**",
    withPath("", "**/Database/**/*.sql"),
    ...buildOfficialFileAndPathAlternatives(term, filenameToken, "sql"),
  ]);

  return {
    mainQuery,
    alternativeQueries: alternatives,
    explanation:
      "Se detecto una busqueda de Stored Procedure y se priorizaron filtros oficiales (ext:, file:, path:) con comodines y variantes CREATE/ALTER.",
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
    filenameToken
      ? withFile("", `${filenameToken}*.${sanitizeExt(preferredExt) || preferredExt}`)
      : "",
    filenameToken
      ? withFile("", `*${filenameToken}*.${sanitizeExt(preferredExt) || preferredExt}`)
      : "",
    withExt(term, preferredExt),
    ...crossLanguageAlternatives,
    ...buildOfficialFileAndPathAlternatives(term, filenameToken, preferredExt),
    ...buildCodeTypeAlternatives(intent, term, preferredExt),
  ];

  if (preferredExt === "sql" || hints.isSqlFunction) {
    const createOrAlter = buildBooleanOrQuery("CREATE FUNCTION", "ALTER FUNCTION");
    alternatives.push('"CREATE FUNCTION" ext:sql');
    alternatives.push('"ALTER FUNCTION" ext:sql');
    alternatives.push(createOrAlter ? withExt(createOrAlter, "sql") : "");
    alternatives.push("path:/Database/ ext:sql");
    alternatives.push("path:**/Database/**");
    alternatives.push(withPath("", "**/Database/**/*.sql"));
  }

  if (preferredExt === "cs") {
    alternatives.push("path:/Services/ ext:cs");
    alternatives.push("path:**/Services/**");
  }

  return {
    mainQuery,
    alternativeQueries: appendContextFileQueries(
      intent,
      term,
      filenameToken,
      preferredExt,
      alternatives
    ),
    explanation:
      "Se detecto una funcion y se generaron variantes oficiales para Azure DevOps Search con ext:, file:, path:, code-type filters y comodines.",
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

function pickNearTokens(intent, literalError) {
  const fromIntent = (intent.coreTokens || []).map((token) =>
    sanitizeCodeToken(String(token || "").toLowerCase())
  );

  const fromText = collapseSpaces(literalError)
    .split(/[^a-zA-Z0-9_]+/)
    .map((token) => sanitizeCodeToken(token.toLowerCase()))
    .filter((token) => token.length >= 3);

  return uniqueStrings([...fromIntent, ...fromText]).slice(0, 2);
}

function buildErrorQueries(intent) {
  const literalError = extractExactErrorText(intent);
  const keyword = sanitizeCodeToken(pickErrorKeyword(intent, literalError).toLowerCase()) || "error";
  const exactLiteralQuery = quote(literalError);
  const { segments, numericCount } = getDynamicErrorSegments(literalError);
  const dynamicAlternatives = buildDynamicErrorAlternatives(segments);
  const [nearLeft, nearRight] = pickNearTokens(intent, literalError);
  const nearQuery = buildProximityQuery(nearLeft, nearRight);
  const errorOrException = buildBooleanOrQuery(keyword, "exception");

  const hasDynamicPattern = numericCount > 0 && segments.length > 0;
  const mainQuery = hasDynamicPattern ? quote(segments[0]) : exactLiteralQuery;

  const baseAlternatives = [
    exactLiteralQuery,
    withExt(exactLiteralQuery, "cs"),
    withExt(exactLiteralQuery, "sql"),
    withExt(exactLiteralQuery, "js"),
    `${keyword} ext:cs`,
    `${keyword} ext:sql`,
    nearQuery,
    nearQuery ? withExt(nearQuery, "cs") : "",
    nearQuery ? withExt(nearQuery, "sql") : "",
    errorOrException ? withExt(errorOrException, "cs") : "",
    errorOrException ? withExt(errorOrException, "sql") : "",
    `strlit:${keyword}`,
    `comment:${keyword}`,
    withFile("", `*${keyword}*`),
    withPath("", `**/*${keyword}*`),
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
      "Se detecto un error y se priorizaron segmentos estables para mensajes dinamicos, sumando ayudas oficiales como NEAR, OR, strlit:, comment:, ext:, file: y path: con comodines.",
  };
}

function buildFileQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const ext = intent.prioritizedExt;
  const safeExt = sanitizeExt(ext);

  if (ext) {
    const alternatives = appendContextFileQueries(intent, term, filenameToken, ext, [
      filenameToken && safeExt ? withFile("", `${filenameToken}*.${safeExt}`) : "",
      filenameToken && safeExt ? withFile("", `*${filenameToken}*.${safeExt}`) : "",
      withExt(quote(term), ext),
      withExt(term, ext),
      ...buildCodeTypeAlternatives(intent, term, ext),
    ]);

    return {
      mainQuery: withExt(quote(term), ext),
      alternativeQueries: uniqueStrings(alternatives),
      explanation:
        "Se detecto una busqueda de archivo y se priorizaron filtros oficiales ext:, file:, path: con comodines * y **, mas filtros de tipo de codigo cuando aplican.",
    };
  }

  const alternatives = appendContextFileQueries(intent, term, filenameToken, "", [
    quote(term),
    term,
    filenameToken ? withFile("", `${filenameToken}*`) : "",
    filenameToken ? withFile("", `*${filenameToken}*`) : "",
  ]);

  return {
    mainQuery: filenameToken ? withFile("", `${filenameToken}*`) : term,
    alternativeQueries: uniqueStrings(alternatives),
    explanation:
      "Se detecto una busqueda de archivo y se priorizo file:/path: con comodines para ampliar cobertura sin perder contexto.",
  };
}

function buildViewQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const ext = intent.prioritizedExt === "razor" ? "razor" : "cshtml";
  const safeExt = sanitizeExt(ext);
  const pathHint = ext === "razor" ? "path:/Components/" : "path:/Views/";
  const pathWildcard = ext === "razor" ? "path:**/Components/**" : "path:**/Views/**";

  return {
    mainQuery: withExt(quote(term), ext),
    alternativeQueries: uniqueStrings([
      filenameToken && safeExt ? withFile("", `${filenameToken}*.${safeExt}`) : "",
      filenameToken && safeExt ? withPath("", `**/${filenameToken}*.${safeExt}`) : "",
      withExt(quote(term), ext),
      `${pathHint} ${withExt(term, ext)}`,
      pathWildcard,
      ext === "razor" ? withExt(term, "cs") : "",
      ...buildOfficialFileAndPathAlternatives(term, filenameToken, ext),
      ...buildCodeTypeAlternatives(intent, term, ext),
    ]),
    explanation:
      "Se detecto una vista y se priorizo Razor/CSHTML con filtros oficiales file:/path:, comodines y alternativas de codigo relacionadas.",
  };
}

function buildReportQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);

  return {
    mainQuery: withExt(quote(term), "rpt"),
    alternativeQueries: uniqueStrings([
      filenameToken ? withFile("", `${filenameToken}*.rpt`) : "",
      filenameToken ? withFile("", `*${filenameToken}*.rpt`) : "",
      filenameToken ? withPath("", `**/${filenameToken}*.rpt`) : "",
      withPath("", "**/*.rpt"),
      withExt(quote(term), "rpt"),
      withExt(term, "rpt"),
      ...buildOfficialFileAndPathAlternatives(term, filenameToken, "rpt"),
    ]),
    explanation:
      "Se detecto un reporte y se priorizaron filtros oficiales para .rpt con file:, path: y comodines.",
  };
}

function buildAutomaticSqlObjectQueries(intent, term, filenameToken) {
  const hints = intent.contextHints || {};

  if (!hints.isSqlTable && !hints.isSqlIndex && !hints.isSqlCursor) {
    return null;
  }

  const alternatives = [
    filenameToken ? withFile("", `${filenameToken}*.sql`) : "",
    filenameToken ? withFile("", `*${filenameToken}*.sql`) : "",
    "path:/Database/ ext:sql",
    "path:**/Database/**",
    withPath("", "**/Database/**/*.sql"),
    ...buildOfficialFileAndPathAlternatives(term, filenameToken, "sql"),
  ];

  if (hints.isSqlTable) {
    const createOrAlterTable = buildBooleanOrQuery("CREATE TABLE", "ALTER TABLE");
    alternatives.push('"CREATE TABLE" ext:sql');
    alternatives.push(createOrAlterTable ? withExt(createOrAlterTable, "sql") : "");
    alternatives.push(term ? `${quote(term)} "CREATE TABLE" ext:sql` : "");
  }

  if (hints.isSqlIndex) {
    const createOrDropIndex = buildBooleanOrQuery("CREATE INDEX", "DROP INDEX");
    alternatives.push('"CREATE INDEX" ext:sql');
    alternatives.push(createOrDropIndex ? withExt(createOrDropIndex, "sql") : "");
    alternatives.push(term ? `${quote(term)} "CREATE INDEX" ext:sql` : "");
  }

  if (hints.isSqlCursor) {
    alternatives.push('"CURSOR" ext:sql');
    alternatives.push(term ? `${quote(term)} "CURSOR" ext:sql` : "");
  }

  return {
    mainQuery: withExt(quote(term || "sql"), "sql"),
    alternativeQueries: uniqueStrings(alternatives),
    explanation:
      "Se detecto un objeto SQL (tabla/index/cursor) y se priorizaron patrones oficiales de Azure DevOps Search con ext:, file:, path: y operadores OR.",
  };
}

function buildAutomaticQueries(intent) {
  const term = resolveCoreTerm(intent);
  const ext = intent.prioritizedExt;
  const safeExt = sanitizeExt(ext);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const exact = intent.quotedText ? quote(intent.quotedText) : quote(term);

  const sqlObjectResult = buildAutomaticSqlObjectQueries(intent, term, filenameToken);
  if (sqlObjectResult) {
    return sqlObjectResult;
  }

  const contextualAlternatives = appendContextFileQueries(intent, term, filenameToken, ext, [
    ext ? withExt(exact, ext) : exact,
    filenameToken && safeExt ? withFile("", `${filenameToken}*.${safeExt}`) : "",
    filenameToken ? withFile("", `${filenameToken}*`) : "",
    filenameToken && safeExt ? withPath("", `**/${filenameToken}*.${safeExt}`) : "",
    ext ? withExt(term, ext) : term,
  ]);

  const mainQuery = ext ? withExt(intent.quotedText ? exact : term, ext) : exact;

  return {
    mainQuery,
    alternativeQueries: uniqueStrings([
      ...contextualAlternatives,
      ...buildOfficialFileAndPathAlternatives(term, filenameToken, ext),
      ...buildCodeTypeAlternatives(intent, term, ext),
    ]),
    explanation:
      "No hubo una intencion unica, asi que se genero una query general con ayudas oficiales: ext:, file:, path:, comodines (*, **, ?) y filtros de codigo cuando aplican.",
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

  const scopeAlternatives = buildScopeFilterAlternatives(intent, mainQuery);

  const alternativeQueries = uniqueStrings([
    ...(result.alternativeQueries || []),
    ...scopeAlternatives,
  ]).filter((query) => query.toLowerCase() !== mainQuery.toLowerCase());

  return {
    mainQuery,
    alternativeQueries,
    explanation: result.explanation,
    detectedType: intent.type,
    prioritizedExt: intent.prioritizedExt,
  };
}

