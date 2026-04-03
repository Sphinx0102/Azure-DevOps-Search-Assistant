import { useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import ProductTour from "../components/ProductTour";
import QueryResults from "../components/QueryResults";
import SearchForm from "../components/SearchForm";
import { SEARCH_TYPE_VALUES } from "../data/searchTypes";
import { useProductTour } from "../hooks/useProductTour";
import { copyToClipboard } from "../utils/clipboard";
import { generateQueries } from "../utils/queryGenerator";
import { MAX_INPUT_LENGTH, sanitizeUserDraft, sanitizeUserInput } from "../utils/text";

const EMPTY_RESULT = {
  mainQuery: "",
  alternativeQueries: [],
  explanation: "",
};

function SearchBuilderPage() {
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState(SEARCH_TYPE_VALUES.AUTO);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [copiedQuery, setCopiedQuery] = useState("");
  const [copyError, setCopyError] = useState("");

  const { run, tourKey, startTour, finishTour } = useProductTour();

  const canGenerate = useMemo(() => inputText.trim().length > 0, [inputText]);

  const handleInputChange = (rawValue) => {
    setInputText(sanitizeUserDraft(rawValue, MAX_INPUT_LENGTH));
  };

  const handleGenerate = () => {
    const safeInput = sanitizeUserInput(inputText, MAX_INPUT_LENGTH);
    if (!safeInput || !canGenerate) {
      return;
    }

    const generated = generateQueries(safeInput, selectedType);
    setInputText(safeInput);
    setResult(generated);
    setCopiedQuery("");
    setCopyError("");
  };

  const handleCopy = async (query) => {
    try {
      await copyToClipboard(query);
      setCopiedQuery(query);
      setCopyError("");
      window.setTimeout(() => setCopiedQuery(""), 1400);
    } catch (error) {
      setCopyError("No se pudo copiar en este navegador.");
    }
  };

  return (
    <main className="min-h-screen bg-page-pattern px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <AppHeader />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={startTour}
            className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-200 transition hover:border-primary-400/50 hover:bg-primary-500/20"
          >
            Ver tutorial
          </button>
        </div>

        <SearchForm
          inputText={inputText}
          selectedType={selectedType}
          onInputChange={handleInputChange}
          onTypeChange={setSelectedType}
          onGenerate={handleGenerate}
          maxLength={MAX_INPUT_LENGTH}
        />

        {copyError ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {copyError}
          </p>
        ) : null}

        <QueryResults result={result} onCopy={handleCopy} copiedQuery={copiedQuery} />
      </div>

      <ProductTour run={run} tourKey={tourKey} onTourEnd={finishTour} />
    </main>
  );
}

export default SearchBuilderPage;
