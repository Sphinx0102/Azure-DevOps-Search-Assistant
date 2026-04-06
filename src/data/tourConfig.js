export const TOUR_STORAGE_KEY = "tourVersion";
export const CURRENT_TOUR_VERSION = "8";

export const TOUR_STEPS = [
  {
    target: '[data-tour="search-input"]',
    title: "Entrada principal",
    content: "Aca escribis lo que queres buscar.",
    skipBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="search-type"]',
    title: "Tipo de busqueda",
    content:
      "Tipos disponibles: Automatico, Error, Stored Procedure, Funcion, Archivo, Vista y Reporte. Funcion abarca SQL, JS y C#. Archivo abarca SQL, JS y C# (Controller, Service, Interfaz, etc.).",
    placement: "bottom",
  },
  {
    target: '[data-tour="generate-button"]',
    title: "Generar",
    content:
      "Genera una query optimizada con ayudas oficiales de Azure DevOps Search (ext:, file:, path:, filtros de codigo, OR/NEAR y comodines como *, **, ?).",
    placement: "bottom",
  },
  {
    target: '[data-tour="results-panel"]',
    title: "Resultados",
    content:
      "Aca aparecen las queries listas para copiar. Se muestra siempre la primera alternativa y podes desplegar u ocultar el resto para no llenar la pantalla.",
    placement: "top",
  },
  {
    target: '[data-tour="copy-query"]',
    title: "Copiar query",
    content: "Copias la query directamente con este boton.",
    placement: "left",
  },
];
