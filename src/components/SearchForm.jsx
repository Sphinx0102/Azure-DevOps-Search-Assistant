import { SEARCH_TYPES } from "../data/searchTypes";

function SearchForm({
  inputText,
  selectedType,
  onInputChange,
  onTypeChange,
  onGenerate,
  maxLength,
}) {
  const isDisabled = !inputText.trim();

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-panel backdrop-blur sm:p-6">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">
            Que queres buscar
          </span>
          <textarea
            data-tour="search-input"
            value={inputText}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Escribi que queres buscar..."
            rows={4}
            maxLength={maxLength}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-primary-400 focus:bg-slate-900 focus:ring-4 focus:ring-primary-500/20"
          />
          <p className="mt-2 text-xs text-slate-400">
            {inputText.length}/{maxLength} caracteres
          </p>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-2 block text-sm font-semibold text-slate-200">
              Tipo de busqueda
            </span>
            <select
              data-tour="search-type"
              value={selectedType}
              onChange={(event) => onTypeChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20"
            >
              {SEARCH_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            data-tour="generate-button"
            type="button"
            onClick={onGenerate}
            disabled={isDisabled}
            className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            Generar busqueda
          </button>
        </div>
      </div>
    </section>
  );
}

export default SearchForm;
