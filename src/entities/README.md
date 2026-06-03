# entities/

El modelo de dominio del frontend. Una entity agrupa todo lo que define un
concepto de negocio reutilizable entre features y pages.

```
entities/
  enrollment/
    enrollment.store.js   store Pinia (estado + getters del dominio)
    enrollment.api.js     llamadas HTTP (usa shared/api)
    enrollment.types.js   shapes / tipos
    EnrollmentBadge.vue   UI atomica propia de la entity
  lead/
  token/
  customer/
```

Reglas:
- Una entity solo importa de `shared/`.
- Aqui vive el estado que hoy falta (sin stores de dominio -> prop drilling y
  refetch al navegar, segun la auditoria). Crear stores aqui es parte del valor.
- Dos entities no se importan entre si; si una pagina necesita ambas, las compone
  en `pages/` o `widgets/`.
