# shared/

Primitivas reutilizables sin conocimiento del dominio. No importa de ninguna
otra capa del proyecto.

```
shared/
  ui/      componentes base (BaseModal, BaseDatePicker, MultiSelect, ...)
  api/     instancia axios + interceptores + factory de endpoints
  lib/     utilidades puras (date, currency, validators)
  config/  lectura de env y constantes globales
```

Reglas:
- Nada aqui menciona "lead", "enrollment", "token" ni otro concepto de negocio.
- Si un componente sabe de un dominio, va en `entities/` o `features/`, no aqui.
