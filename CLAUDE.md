# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173, force-clears cache)
npm run build     # Production build → dist/
npm run preview   # Preview production build
npm run lint      # ESLint check
```

No test suite is configured.

## Architecture Overview

This is a **Vue 3 + Vite CRM application** built on CoreUI Free Admin Template. The app manages commercial leads, enrollments, products, customers, and reporting for an educational services business.

### Entry Point & Bootstrap

`src/main.js` uses an **async bootstrap pattern**:
1. Creates Pinia + Router
2. Preloads catalog data via `CatalogService.ensureLoaded()`
3. Provides all services via Vue's `provide/inject` with Symbol keys (`ServiceKeys`)
4. Registers `$hasRole(roles)` as a global property for role-based UI control
5. Registers the `v-restrict` directive for input filtering

### Service Layer (Dependency Injection)

All backend communication goes through `src/services/`. Services are injected app-wide at bootstrap via `ServiceKeys` symbols defined in `src/services/index.js`. In components, consume them with:

```js
const comercialService = inject(ServiceKeys.Comercial)
```

Available services: `Program`, `Comercial`, `Discount`, `Instructor`, `Edition`, `Customer`, `Auth`, `CorporateAgreement`, `Integration`, `Fico`, `Dashboard`, `Notification`.

`src/services/catalog.service.js` is injected separately as `'catalog'` — it preloads reference data (memberships, etc.) and caches it.

`src/services/api.js` is the base Axios instance used by all services.

### State Management (Pinia)

Three stores in `src/stores/`:
- `theme.js` — light/dark color mode preference
- `sidebar.js` — sidebar visibility/fold state
- `loader.js` — global loading overlay state (used via `LoadingOverlay` component always mounted in `App.vue`)

### Routing & Auth

`src/router/index.js` enforces authentication and role-based access via navigation guards. Routes have `meta.roles` arrays. The guard checks `localStorage` for the user object and its `roles` array.

Role values in use: `ADMIN`, `COMERCIAL`, `LIDER_COMERCIAL`, `FICO`, `PRODUCTO`, `GERENCIA`, `B2B`, `MARKETING`.

Public routes: `/pages/login`, `/pages/404`, `/pages/500`.

### Views Structure

`src/views/` is organized by domain module:
- `comercial/` — Leads list, lead form, discounts, and multiple report views
- `fico/` — Finance/enrollment management
- `producto/` — Programs, editions, instructors, pricing
- `customer/` — Customer management
- `b2b/` — Corporate agreements
- `marketing/`, `dashboard/`, `general/`, `reportes/`

### Key Patterns

**Component composition:** Views are large single-file components using `<script setup>`. Heavy use of CoreUI components (`CCard`, `CModal`, `CFormInput`, etc.) alongside custom components.

**Custom components** (in `src/components/`): `SearchSelect`, `DateTime12`, `BaseDatePicker`, `BaseModal`, `LoadingOverlay`, `AppHeader`, `AppSidebar`.

**`v-restrict` directive** (`src/directives/restrict.js`): Applied to inputs for real-time filtering (uppercase, numbers-only, max-length, trim). Usage: `v-restrict="'upper|max:50'"`.

**Toast notifications:** Use `vue-toastification`'s `useToast()` composable. Configured globally in `main.js` (top-right, 3500ms timeout).

**SSE real-time events:** `App.vue` listens for `crm:restrictions-updated` window events and redirects to the leads list with a reload.

### Path Aliases

```
@/ or @  →  src/
~        →  node_modules/
```

### Formatting

- No semicolons, single quotes, trailing commas, 2-space indent (see `.prettierrc.js`)
- LF line endings (`.editorconfig`)
- `vue/multi-word-component-names` rule is disabled

## Estado Actual del Proyecto

### Composables
- `src/composables/useLeadForm.js` — extrae toda la lógica del formulario de leads. Acepta `{ businessLine, acceptsCompany, fixedProgramType, requiresEdition, showInscription }`. Usado por `comercial/LeadsNew.vue`, `fundacion/LeadsNew.vue` y `b2b/LeadsNew.vue`.

### Módulos creados
- `src/views/fundacion/` — Leads y formulario para la línea de negocio Fundación. Rol: `FUNDACION`. `fixedProgramType: 'we_program_type_event'`, edición siempre requerida, sin botón INSCRIBIR.
- `src/views/b2b/` — Leads y formulario para la línea de negocio B2B. Rol: `B2B`. Categoría visible, T. Contacto acepta empresa, sin botón INSCRIBIR.

### Roles definidos en router
`ADMIN`, `COMERCIAL`, `LIDER_COMERCIAL`, `FICO`, `PRODUCTO`, `GERENCIA`, `B2B`, `MARKETING`, `FUNDACION` (nuevo, pendiente de crear en tabla de usuarios).

### Schema relevante (backend)
- `leads.cat_business_line_id` — filtra leads por línea de negocio en `comercialService.leadList()`
- `programs.cat_business_line_id` — catálogo `we_business_line`
- `enrollments.agreement_id`
- `b2b_contracts.cat_contract_type`

### Pendientes
- `src/views/producto/ProgramsForm.vue` — agregar campo `cat_business_line_id` al formulario de programas
- `src/views/producto/Editions.vue` — agregar filtro por línea de negocio
- Módulo B2B contratos IN HOUSE (nuevo módulo)
