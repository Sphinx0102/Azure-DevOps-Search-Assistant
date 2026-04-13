# Azure DevOps Search Builder

Aplicacion frontend para convertir intenciones en lenguaje natural a queries compatibles con Azure DevOps Code Search.

## Ejecutar

```bash
npm install
npm run dev
```

## Stack

- React
- JavaScript
- Vite
- Tailwind CSS

## Workflow de ramas y PR

### Ramas principales

- `Desarrollo`: rama principal de trabajo diario.
- `master`: rama de release/produccion.

### Flujo del equipo

1. Crear rama de trabajo desde `Desarrollo` (`feature/*`, `fix/*`, etc.).
2. Hacer commits y push de esa rama.
3. Abrir PR hacia `Desarrollo`.
4. Esperar revision/aprobacion y merge en `Desarrollo`.
5. Cuando se quiera publicar, abrir un unico PR `Desarrollo -> master`.

### Reglas clave

- No abrir PR de `feature/*` directo a `master`.
- `master` solo acepta PR desde `Desarrollo`.
- Activar borrado automatico de ramas al merge para evitar acumulacion.

### Comandos utiles

```bash
# Crear rama de trabajo desde Desarrollo
git switch Desarrollo
git pull
git switch -c feature/mi-cambio

# Subir rama nueva
git push -u origin feature/mi-cambio
```
