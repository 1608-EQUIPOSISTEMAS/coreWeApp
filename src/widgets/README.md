# widgets/

Composiciones grandes y reutilizables que combinan varias features y entities
en un bloque de UI con sentido propio.

```
widgets/
  EnrollmentTable/
  LeadKanban/
  FicoSidebar/
  reports/
```

Reglas:
- Un widget importa de `features/`, `entities/` y `shared/`.
- Si un bloque solo se usa en una pagina y no se reutiliza, puede vivir dentro de
  esa `page/`; se promueve a widget cuando se comparte.
