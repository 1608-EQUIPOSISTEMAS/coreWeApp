# features/

Acciones de usuario con estado propio: un caso de uso interactivo concreto.
Cada feature es autocontenida (su formulario, su composable, su validacion).

```
features/
  register-enrollment/
    RegisterEnrollmentForm.vue
    useRegisterEnrollment.js
  edit-installment-amount/
  reschedule-installments/
  apply-discount/
  group-tokens/
```

Reglas:
- Una feature importa de `entities/` y `shared/`, nunca de otra feature.
- Aqui se descomponen los god composables (p.ej. `useLeadForm.js` de 71KB se
  parte en varias features de Comercial). Ver mapeo en `../../FSD_GUIDE.md`.
