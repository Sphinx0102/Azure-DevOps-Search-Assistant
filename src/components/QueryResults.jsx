import { useEffect, useState } from "react";

function QueryRow({ title, query, onCopy, copied, isPlaceholder = false }) {
  const canCopy = !isPlaceholder && Boolean(query);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h4>
        <button
          data-tour="copy-query"
          type="button"
          onClick={() => {
            if (canCopy) {
              onCopy(query);
            }
          }}
          disabled={!canCopy}
          className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-200 transition hover:border-primary-400/50 hover:bg-primary-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/40 disabled:text-slate-500"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <code className="block overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
        {query || "Aun no hay query generada"}
      </code>
    </div>
  );
}

function QueryResults({ result, onCopy, copiedQuery }) {
  const hasResult = Boolean(result && result.mainQuery);
  const alternativeQueries = hasResult ? result.alternativeQueries || [] : [];
  const firstAlternative = alternativeQueries[0] || "";
  const hiddenAlternatives = alternativeQueries.slice(1);
  const hasHiddenAlternatives = hiddenAlternatives.length > 0;

  const [showMoreAlternatives, setShowMoreAlternatives] = useState(false);

  useEffect(() => {
    setShowMoreAlternatives(false);
  }, [result?.mainQuery, result?.alternativeQueries?.length]);

  return (
    <section
      data-tour="results-panel"
      className="space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-panel backdrop-blur sm:p-6"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-100">Resultado</h2>
        <p className="text-sm text-slate-300">
          {hasResult
            ? result.explanation
            : "Cuando generes una busqueda, aca vas a ver la query principal y las alternativas."}
        </p>
      </div>

      <QueryRow
        title="Query principal"
        query={hasResult ? result.mainQuery : ""}
        onCopy={onCopy}
        copied={hasResult && copiedQuery === result.mainQuery}
        isPlaceholder={!hasResult}
      />

      {hasResult && alternativeQueries.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Queries alternativas
          </h3>

          <div className="space-y-3">
            <QueryRow
              key={`${firstAlternative}-0`}
              title="Alternativa 1"
              query={firstAlternative}
              onCopy={onCopy}
              copied={copiedQuery === firstAlternative}
            />

            {showMoreAlternatives
              ? hiddenAlternatives.map((query, index) => (
                  <QueryRow
                    key={`${query}-${index + 1}`}
                    title={`Alternativa ${index + 2}`}
                    query={query}
                    onCopy={onCopy}
                    copied={copiedQuery === query}
                  />
                ))
              : null}
          </div>

          {hasHiddenAlternatives ? (
            <button
              type="button"
              onClick={() => setShowMoreAlternatives((prev) => !prev)}
              className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-primary-400/50 hover:text-primary-200"
            >
              {showMoreAlternatives
                ? `Ocultar ${hiddenAlternatives.length} alternativas`
                : `Ver ${hiddenAlternatives.length} alternativas mas`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default QueryResults;
