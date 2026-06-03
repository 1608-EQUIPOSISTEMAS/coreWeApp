# app/

Bootstrap de la aplicacion: providers, configuracion global y el router partido
por dominio. Es la unica capa que ensambla todas las demas.

```
app/
  router/
    index.js            createRouter + registro de los grupos de rutas
    guards.js           guards de navegacion (auth, roles)
    routes/
      fico.routes.js
      comercial.routes.js
      ...
```

Destino de migracion del actual `src/router/index.js` (22KB en un archivo).
Ver `../../FSD_GUIDE.md`.
