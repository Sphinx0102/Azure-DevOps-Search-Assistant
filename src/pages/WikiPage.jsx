const WIKI_ITEMS = [
  {
    symbol: "*",
    title: "Comodin de varios caracteres",
    description: "Busca por una fraccion del texto cuando no sabes el nombre completo.",
    example: "file:*facturacion*.sql",
  },
  {
    symbol: "?",
    title: "Comodin de un caracter",
    description: "Reemplaza exactamente un caracter en una posicion puntual.",
    example: "file:sp_factura_202?.sql",
  },
  {
    symbol: '""',
    title: "Frase exacta",
    description: "Encuentra el texto exacto respetando el orden de palabras.",
    example: '"CREATE PROCEDURE"',
  },
  {
    symbol: "ext:",
    title: "Filtro por extension",
    description: "Limita la busqueda a un tipo de archivo.",
    example: 'ext:sql "CREATE TABLE"',
  },
  {
    symbol: "file:",
    title: "Filtro por nombre de archivo",
    description: "Filtra por patron del nombre del archivo.",
    example: "file:*si_no*.sql",
  },
  {
    symbol: "path:",
    title: "Filtro por carpeta",
    description: "Busca solo dentro de una ruta o estructura de carpetas.",
    example: "path:**/Database/** ext:sql",
  },
  {
    symbol: "OR",
    title: "Alternativas",
    description: "Devuelve resultados que cumplan una opcion u otra.",
    example: '"CREATE TABLE" OR "ALTER TABLE"',
  },
  {
    symbol: "AND",
    title: "Condiciones conjuntas",
    description: "Exige que se cumplan todas las condiciones (tambien aplica por espacio).",
    example: 'ext:sql "facturacion" "CREATE PROCEDURE"',
  },
  {
    symbol: "NOT",
    title: "Exclusion",
    description: "Quita resultados que no queres incluir.",
    example: 'ext:sql "facturacion" NOT file:*old*',
  },
  {
    symbol: "NEAR",
    title: "Proximidad",
    description: "Busca dos terminos que aparezcan cercanos entre si.",
    example: '"si_no" NEAR "BIT"',
  },
  {
    symbol: "proj: / repo: / branch:",
    title: "Scope por proyecto, repo y rama",
    description: "Acota el alcance para reducir ruido en organizaciones grandes.",
    example: "proj:MiProyecto repo:MiRepo branch:develop ext:sql",
  },
];

function WikiCard({ symbol, title, description, example }) {
  return (
    <article className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
      <p className="mb-2 inline-flex rounded-md border border-primary-500/30 bg-primary-500/10 px-2 py-1 text-xs font-bold text-primary-200">
        {symbol}
      </p>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
      <code className="mt-3 block overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
        {example}
      </code>
    </article>
  );
}

function WikiPage({ navigate }) {
  return (
    <main className="min-h-screen bg-page-pattern px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="space-y-3">
          <p className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
            Guia Rapida
          </p>
          <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
            Wiki de Atajos Azure DevOps Search
          </h1>
          <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
            Esta wiki resume los atajos mas utiles del buscador de Azure DevOps para armar consultas mas precisas.
            Cada bloque incluye una explicacion corta y un ejemplo listo para usar.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate?.("/")}
            className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-200 transition hover:border-primary-400/50 hover:bg-primary-500/20"
          >
            Volver al buscador
          </button>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          {WIKI_ITEMS.map((item) => (
            <WikiCard
              key={item.title}
              symbol={item.symbol}
              title={item.title}
              description={item.description}
              example={item.example}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

export default WikiPage;
