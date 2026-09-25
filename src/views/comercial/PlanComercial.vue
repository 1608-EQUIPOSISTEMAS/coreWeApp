<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Plan comercial</h1>
        <p class="ds-sub">{{ TABS.find((t) => t.id === tab).descripcion }}</p>
      </div>
      <div class="ds-head-actions">
        <button v-if="puedeEditar" class="btn-exec btn-exec-primary" type="button" @click="editando = true">
          <i class="fa-solid fa-bullseye" aria-hidden="true"></i> Cargar objetivos
        </button>
      </div>
    </header>

    <div class="barra">
      <div class="ds-tabs" role="tablist" aria-label="Reportes del plan comercial">
        <button
          v-for="t in TABS"
          :id="`tab-${t.id}`"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="String(t.id === tab)"
          aria-controls="plan-panel"
          @click="ir({ tab: t.id })"
        >
          {{ t.nombre }}
        </button>
      </div>
      <div class="ds-tabs" aria-label="Mes">
        <button
          v-for="m in meses"
          :key="m"
          type="button"
          :aria-pressed="String(m === mes)"
          @click="ir({ mes: m })"
        >
          {{ monthShort(m) }}
        </button>
      </div>
    </div>

    <section id="plan-panel" role="tabpanel" :aria-labelledby="`tab-${tab}`">
      <ObjetivosTab v-if="tab === 'objetivos'" :month="mes" :reload-key="recarga" @select-month="ir({ mes: $event })" />
      <AsesoresTab v-else-if="tab === 'asesores'" :month="mes" :today="hoy" :puede-editar="puedeEditar" :reload-key="recarga" />
      <VentasDiariasTab v-else :month="mes" :today="hoy" :reload-key="recarga" />
    </section>

    <PlanEditorModal v-if="puedeEditar" v-model="editando" :month="mes" @saved="recarga++" />
  </div>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { monthShort } from '@/features/plan-comercial/planComercial'
import ObjetivosTab from './plan-comercial/ObjetivosTab.vue'
import AsesoresTab from './plan-comercial/AsesoresTab.vue'
import VentasDiariasTab from './plan-comercial/VentasDiariasTab.vue'
import PlanEditorModal from './plan-comercial/PlanEditorModal.vue'

const TABS = [
  { id: 'objetivos', nombre: 'Objetivos', descripcion: 'Vacantes e ingresos del equipo contra el objetivo, semana a semana y mes a mes.' },
  { id: 'asesores', nombre: 'Por asesor', descripcion: 'Cuánto lleva cada asesor de su objetivo del mes y en qué semana se quedó.' },
  { id: 'ventas', nombre: 'Ventas diarias', descripcion: 'Consultas, ventas y conversión de cada asesor, día por día.' }
]

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const puedeEditar = proxy.$hasRole(['ADMIN', 'GERENCIA', 'LIDER_COMERCIAL'])

const pad = (n) => String(n).padStart(2, '0')
const ahora = new Date()
const hoy = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`
const mesActual = `${hoy.slice(0, 7)}-01`

// Los meses del año hasta el siguiente: el líder carga el plan antes de que
// empiece el mes. ponytail: sin selector de año; agregarlo cuando haga falta
// mirar el año anterior.
const meses = Array.from({ length: Math.min(12, ahora.getMonth() + 2) }, (_, i) => `${ahora.getFullYear()}-${pad(i + 1)}-01`)

// Pestaña y mes viven en la URL: el enlace que se comparte abre lo mismo.
const tab = computed(() => (TABS.some((t) => t.id === route.query.tab) ? route.query.tab : 'objetivos'))
const mes = computed(() => (meses.includes(route.query.mes) ? route.query.mes : mesActual))
const ir = (cambio) => router.replace({ query: { ...route.query, tab: tab.value, mes: mes.value, ...cambio } })

const editando = ref(false)
const recarga = ref(0)
</script>

<style scoped>
.barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
</style>
