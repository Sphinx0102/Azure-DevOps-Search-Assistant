import { SEARCH_TYPE_VALUES } from "../data/searchTypes";
import { detectSearchIntent } from "./searchIntent";
import { collapseSpaces, sanitizeUserInput, uniqueStrings } from "./text";

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
  const exactMainQuery = withExt(quote(term), "sql");
  const createOrAlter = buildBooleanOrQuery("CREATE PROCEDURE", "ALTER PROCEDURE");

  const wildcardContainsByFile = filenameToken ? withFile("", `*${filenameToken}*.sql`) : "";
  const wildcardContainsWithSpScope =
    wildcardContainsByFile && createOrAlter
      ? `${wildcardContainsByFile} ${createOrAlter}`
      : "";

  const shouldPrioritizeWildcard = Boolean(filenameToken) && !intent.quotedText;

  const mainQuery = shouldPrioritizeWildcard
    ? wildcardContainsWithSpScope || wildcardContainsByFile || exactMainQuery
    : exactMainQuery;

  const alternatives = uniqueStrings([
    shouldPrioritizeWildcard ? exactMainQuery : wildcardContainsWithSpScope,
    shouldPrioritizeWildcard ? wildcardContainsByFile : "",
    filenameToken ? withFile("", `${filenameToken}*.sql`) : "",
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
    explanation: shouldPrioritizeWildcard
      ? "Se detecto una busqueda parcial de Stored Procedure y se priorizo *termino* con file: para encontrar coincidencias por fraccion antes de las variantes exactas."
      : "Se detecto una busqueda de Stored Procedure y se priorizaron filtros oficiales (ext:, file:, path:) con comodines y variantes CREATE/ALTER.",
  };
}

function buildColumnQueries(intent) {
  const term = resolveCoreTerm(intent);
  const filenameToken = sanitizeFilenameToken(intent.nameToken || term);
  const hints = intent.contextHints || {};

  const sqlObjectFilter = '("CREATE TABLE" OR "ALTER TABLE" OR "CREATE PROCEDURE" OR "ALTER PROCEDURE")';
  const tableFilter = '("CREATE TABLE" OR "ALTER TABLE")';
  const spFilter = '("CREATE PROCEDURE" OR "ALTER PROCEDURE")';
  const booleanFilter = '("BIT" OR "= -1" OR "= 0" OR "-1" OR "0" OR "TRUE" OR "FALSE")';

  const hasMinusOneAndZeroPattern =
    /(^|[^0-9])-1([^0-9]|$)/.test(intent.rawInput || "") &&
    /(^|[^0-9])0([^0-9]|$)/.test(intent.rawInput || "");

  const isBooleanPriority =
    hints.isSqlBoolean ||
    /^sn([a-z0-9_]+)?$/i.test(term) ||
    /^si_?no([a-z0-9_]+)?$/i.test(term) ||
    hasMinusOneAndZeroPattern;
  const objectFilter = isBooleanPriority ? `${sqlObjectFilter} ${booleanFilter}` : sqlObjectFilter;
  const mainQuery = withExt(`${quote(term)} ${objectFilter}`, "sql");

  const alternatives = uniqueStrings([
    isBooleanPriority ? withExt(`${quote(term)} ${spFilter} ${booleanFilter}`, "sql") : "",
    isBooleanPriority ? withExt(`${quote(term)} ${tableFilter} ${booleanFilter}`, "sql") : "",
    isBooleanPriority ? `${quote(term)} "BIT" "CREATE PROCEDURE" ext:sql` : "",
    isBooleanPriority ? `${quote(term)} "BIT" "CREATE TABLE" ext:sql` : "",
    term ? withExt(`${quote(term)} ${tableFilter}`, "sql") : "",
    term ? withExt(`${quote(term)} ${spFilter}`, "sql") : "",
    term ? `${quote(term)} "CREATE TABLE" ext:sql` : "",
    term ? `${quote(term)} "ALTER TABLE" ext:sql` : "",
    term ? `${quote(term)} "CREATE PROCEDURE" ext:sql` : "",
    term ? `${quote(term)} "ALTER PROCEDURE" ext:sql` : "",
    term ? `path:/Database/ ${withExt(`${quote(term)} ${objectFilter}`, "sql")}` : "",
    term ? `path:**/Database/** ${withExt(`${quote(term)} ${objectFilter}`, "sql")}` : "",
    term && filenameToken
      ? withFile(withExt(`${quote(term)} ${objectFilter}`, "sql"), `*${filenameToken}*.sql`)
      : "",
  ]);

  return {
    mainQuery,
    alternativeQueries: alternatives,
    explanation: isBooleanPriority
      ? "Se detecto una columna/flag tipo si-no y se priorizo busqueda SQL en tablas y stored procedures (CREATE/ALTER TABLE/PROCEDURE + BIT/-1/0/TRUE/FALSE)."
      : "Se detecto una columna y se limito la busqueda a tablas y stored procedures con filtros oficiales (CREATE/ALTER TABLE/PROCEDURE, ext:, file:, path:).",
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

  if (hints.isSqlColumn || hints.isSqlBoolean) {
    return buildColumnQueries(intent);
  }

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
    [SEARCH_TYPE_VALUES.COLUMN]: buildColumnQueries,
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





