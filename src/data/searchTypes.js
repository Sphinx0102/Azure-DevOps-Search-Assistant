export const SEARCH_TYPE_VALUES = {
  AUTO: "auto",
  ERROR: "error",
  STORED_PROCEDURE: "stored_procedure",
  FUNCTION: "function",
  FILE: "file",
  VIEW: "view",
  REPORT: "report",
};

export const SEARCH_TYPES = [
  { value: SEARCH_TYPE_VALUES.AUTO, label: "Automatico" },
  { value: SEARCH_TYPE_VALUES.ERROR, label: "Error" },
  { value: SEARCH_TYPE_VALUES.STORED_PROCEDURE, label: "Stored Procedure" },
  { value: SEARCH_TYPE_VALUES.FUNCTION, label: "Funcion" },
  { value: SEARCH_TYPE_VALUES.FILE, label: "Archivo" },
  { value: SEARCH_TYPE_VALUES.VIEW, label: "Vista" },
  { value: SEARCH_TYPE_VALUES.REPORT, label: "Reporte" },
];
