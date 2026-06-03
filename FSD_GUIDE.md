# Feature-Sliced Design — Guia del Frontend

Convencion de arquitectura del Frontend. Decision en
`../docs/architecture/ADR-001-modular-monolith-hexagonal.md` (el Backend usa
Modular Monolith Hexagonal; el Frontend su equivalente: Feature-Sliced Design).

## Capas (de mas estable a mas volatil)

```
src/
  app/        bootstrap, providers, router partido. Ensambla todo.
  pages/      una pagina = ensamblar widgets + features. Punto de entrada de ruta.
  widgets/    composiciones grandes reutilizables (tablas, kanban, sidebars).
  features/   acciones de usuario con estado propio (registrar, editar, agrupar).
  entities/   modelo de dominio: store Pinia + api + tipos + UI atomica.
  shared/     primitivas sin dominio: ui/, api/, lib/, config/.
```

## Regla de dependencia (unidireccional)

Una capa solo puede importar de capas **por debajo** de ella:

| Capa | Puede importar de |
|---|---|
| `app` | pages, widgets, features, entities, shared |
| `pages` | widgets, features, entities, shared |
| `widgets` | features, entities, shared |
| `features` | entities, shared |
| `entities` | shared |
| `shared` | (nada del proyecto) |

Nunca al reves. `shared/` jamas importa de `entities/`, `features/`, etc.
Dos slices de la misma capa no se importan entre si (dos features no se cruzan).

## Mapeo de la estructura actual -> destino

| Hoy | Destino FSD | Fase |
|---|---|---|
| `components/Base*.vue` (UI pura) | `shared/ui/` | 1-2 |
| `services/*.api.js` (axios) | `shared/api/` + `entities/<x>/<x>.api.js` | 2 |
| `stores/` (loader, sidebar, theme) | `app/` o `shared/` | 1 |
| `composables/useLeadForm.js` (71KB) | partir en `features/` | 3 |
| `views/fico/.../EnrollmentDetailModal.vue` (80KB) | `pages/fico/` + `features/` | 2 |
| `views/comercial/LeadsNew.vue` (197KB) | `pages/comercial/` + `widgets/` + `features/` | 3 |
| `router/index.js` (22KB) | `app/router/` partido por dominio | 1-2 |

## Enforcement (ACTIVO desde Fase 4)

`eslint-plugin-boundaries` ya esta cableado en `eslint.config.mjs` (flat config,
regla `boundaries/dependencies`). La regla de dependencia se valida en CI con
`npm run lint:arch` (scope: las capas FSD; verde hoy, 0 violaciones).

Durante la migracion, el mundo legacy (`views/`, `components/`, `composables/`,
`services/`, `stores/`, ...) esta clasificado como tipo `legacy`: las slices FSD
pueden apoyarse en el todavia, pero **no** se permiten imports hacia arriba ni
entre slices de la misma capa. A medida que cada dominio se mueve a su slice, su
codigo sale de `legacy`.

Config de referencia (sintaxis v6, ya aplicada):

```js
// .eslintrc boundaries
settings: {
  'boundaries/elements': [
    { type: 'app',      pattern: 'src/app/*' },
    { type: 'pages',    pattern: 'src/pages/*' },
    { type: 'widgets',  pattern: 'src/widgets/*' },
    { type: 'features', pattern: 'src/features/*' },
    { type: 'entities', pattern: 'src/entities/*' },
    { type: 'shared',   pattern: 'src/shared/*' }
  ]
},
rules: {
  'boundaries/element-types': ['error', {
    default: 'disallow',
    rules: [
      { from: 'app',      allow: ['pages','widgets','features','entities','shared'] },
      { from: 'pages',    allow: ['widgets','features','entities','shared'] },
      { from: 'widgets',  allow: ['features','entities','shared'] },
      { from: 'features', allow: ['entities','shared'] },
      { from: 'entities', allow: ['shared'] },
      { from: 'shared',   allow: ['shared'] }
    ]
  }]
}
```

Durante la migracion, `views/`, `components/`, `composables/` y `services/`
siguen existiendo. Se vacian a medida que cada dominio se mueve a su slice.
