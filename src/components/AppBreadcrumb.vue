<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbs = computed(() => {
  // Filtramos rutas que no tengan etiqueta (opcional) y mapeamos
  return route.matched
    .filter((routeRecord) => routeRecord.meta && routeRecord.meta.area) // Solo muestra rutas con titulo definido
    .map((routeRecord) => {
      return {
        active: routeRecord.path === route.path, // Si es la ruta actual
        name: routeRecord.meta.area || routeRecord.name, // Usa meta.title o el nombre técnico
        // Vue Router ya nos da la ruta completa en 'path' dentro de matched
        path: routeRecord.path, 
        // Verificamos si la ruta es redirigible (no es abstracta)
        redirect: routeRecord.redirect ? routeRecord.redirect : undefined
      }
    })
})
</script>

<template>
  <CBreadcrumb class="my-0 border-0 pb-2">
    <CBreadcrumbItem>
        <router-link to="/">
            <i class="fa-solid fa-house"></i>
        </router-link>
    </CBreadcrumbItem>

    <!-- <CBreadcrumbItem
      v-for="item in breadcrumbs"
      :key="item.path"
      :active="item.active"
    >
      <span v-if="item.active">
        {{ item.name }}
      </span>

      <router-link v-else :to="item.redirect || item.path">
        {{ item.name }}
      </router-link>
      
    </CBreadcrumbItem> -->
  </CBreadcrumb>
</template>

<style scoped>
/* Un poco de estilo para que se vea moderno */
.breadcrumb-item a {
    text-decoration: none;
    color: #636f83; /* Color grisáceo profesional */
}
.breadcrumb-item a:hover {
    color: #321fdb; /* Color primario al hover */
    text-decoration: underline;
}
.breadcrumb-item.active {
    font-weight: 600;
    color: #3c4b64;
}
</style>