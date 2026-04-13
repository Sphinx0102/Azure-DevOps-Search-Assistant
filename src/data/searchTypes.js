export const SEARCH_TYPE_VALUES = {
  AUTO: "auto",
  COLUMN: "column",
  STORED_PROCEDURE: "stored_procedure",
  FUNCTION: "function",
  FILE: "file",
  VIEW: "view",
  REPORT: "report",
};

export const SEARCH_TYPES = [
  { value: SEARCH_TYPE_VALUES.AUTO, label: "Automatico" },
  { value: SEARCH_TYPE_VALUES.COLUMN, label: "Columna (Tabla/SP)" },
  { value: SEARCH_TYPE_VALUES.STORED_PROCEDURE, label: "Stored Procedure" },
  { value: SEARCH_TYPE_VALUES.FUNCTION, label: "Funcion" },
  { value: SEARCH_TYPE_VALUES.FILE, label: "Archivo" },
  { value: SEARCH_TYPE_VALUES.VIEW, label: "Vista" },
  { value: SEARCH_TYPE_VALUES.REPORT, label: "Reporte" },
];
