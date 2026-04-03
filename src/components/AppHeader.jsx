function AppHeader() {
  return (
    <header className="space-y-3">
      <p className="inline-flex rounded-full border border-primary-500/30 bg-primary-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-200">
        Azure DevOps Productivity Tool
      </p>
      <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
        Azure DevOps Search Builder
      </h1>
      <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
        Escribi una intencion en lenguaje natural y obtene consultas listas
        para pegar en Azure DevOps Code Search.
      </p>
    </header>
  );
}

export default AppHeader;
