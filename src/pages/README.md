# pages/

Una pagina por ruta. Su trabajo es ensamblar widgets y features; debe quedar
delgada (idealmente layout + composicion, sin logica de negocio).

```
pages/
  fico/
    EnrollmentListPage.vue
    EnrollmentDetailPage.vue   destino de EnrollmentDetailModal.vue (80KB)
  comercial/
    LeadsPage.vue              destino de LeadsNew.vue (197KB)
```

Reglas:
- Una page puede importar de cualquier capa inferior (widgets, features,
  entities, shared).
- Migrar los god components (`LeadsNew.vue`, `EnrollmentDetailModal.vue`) consiste
  en mover su markup a widgets/features y dejar aqui el ensamblado. Fase 2-3.
