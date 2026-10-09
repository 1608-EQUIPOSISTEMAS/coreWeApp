<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Plan comercial{{ porLinea && linea === 'ONLINE' ? ' online' : '' }}</h1>
        <p class="ds-sub">{{ tabs.find((t) => t.id === tab).descripcion }}</p>
      </div>
      <div class="ds-head-actions">
        <div v-if="porLinea" class="ds-tabs" aria-label="Línea">
          <button v-for="l in LINES" :key="l.id" type="button" :aria-pressed="String(l.id === linea)" @click="ir({ linea: l.id })">
            {{ l.label }}
          </button>
        </div>
        <button v-if="puedeEditar && porLinea" class="btn-exec btn-exec-primary" type="button" @click="editando = true">
          <i class="fa-solid fa-bullseye" aria-hidden="true"></i> Cargar objetivos
        </button>
      </div>
    </header>

    <div class="barra">
      <div class="ds-tabs" role="tablist" aria-label="Reportes del plan comercial">
        <button
          v-for="t in tabs"
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
      <ObjetivosTab v-if="tab === 'objetivos'" :month="mes" :line="linea" :reload-key="recarga" @select-month="ir({ mes: $event })" />
      <AsesoresTab v-else-if="tab === 'asesores'" :month="mes" :line="linea" :today="hoy" :puede-editar="puedeEditar" :reload-key="recarga" />
      <VentasDiariasTab v-else-if="tab === 'ventas'" :month="mes" :line="linea" :today="hoy" :reload-key="recarga" />
      <ProductosTab v-else-if="tab === 'productos'" :month="mes" :reload-key="recarga" />
      <AnualTab v-else-if="tab === 'anual'" :month="mes" :reload-key="recarga" />
      <EstrategiasTab v-else-if="tab === 'estrategias'" :month="mes" :reload-key="recarga" />
      <RecompraTab v-else :month="mes" :reload-key="recarga" @select-month="ir({ mes: $event })" />
    </section>

    <PlanEditorModal v-if="puedeEditar" v-model="editando" :month="mes" :line="linea" @saved="recarga++" />
  </div>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { monthShort, LINES } from '@/features/plan-comercial/planComercial'
import ObjetivosTab from './plan-comercial/ObjetivosTab.vue'
import AsesoresTab from './plan-comercial/AsesoresTab.vue'
import VentasDiariasTab from './plan-comercial/VentasDiariasTab.vue'
import ProductosTab from './plan-comercial/ProductosTab.vue'
import AnualTab from './plan-comercial/AnualTab.vue'
import EstrategiasTab from './plan-comercial/EstrategiasTab.vue'
import RecompraTab from './plan-comercial/RecompraTab.vue'
import PlanEditorModal from './plan-comercial/PlanEditorModal.vue'

// `linea`: la pestaña existe en esa línea; sin `linea`, en las dos. `sinLinea`:
// mira a toda la empresa (Re-compra, Anual, Estrategias) y no se parte por línea.
const TABS = [
  { id: 'objetivos', nombre: 'Objetivos', descripcion: 'Vacantes e ingresos del equipo contra el objetivo, semana a semana y mes a mes.' },
  { id: 'asesores', nombre: 'Por asesor', descripcion: 'Cuánto lleva cada asesor de su objetivo del mes y en qué semana se quedó.' },
  { id: 'ventas', nombre: 'Ventas diarias', descripcion: 'Consultas, ventas y conversión de cada asesor, día por día.' },
  { id: 'productos', nombre: 'Productos', linea: 'ONLINE', descripcion: 'Ventas online de cada producto contra su objetivo, por canal y tipo de cliente.' },
  { id: 'estrategias', nombre: 'Estrategias', sinLinea: true, descripcion: 'Consultas y ventas de cada estrategia comercial en el mes, con sus programas.' },
  { id: 'anual', nombre: 'Anual', sinLinea: true, descripcion: 'Ventas mes a mes contra el año anterior y cuánto vendió cada asesor en el año.' },
  { id: 'recompra', nombre: 'Re-compra', sinLinea: true, descripcion: 'Qué parte de las ventas viene de clientes que ya habían comprado antes.' }
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

// Línea, pestaña y mes viven en la URL: el enlace que se comparte abre lo mismo.
const linea = computed(() => (LINES.some((l) => l.id === route.query.linea) ? route.query.linea : 'VIVO'))
const tabs = computed(() => TABS.filter((t) => !t.linea || t.linea === linea.value))
const tab = computed(() => (tabs.value.some((t) => t.id === route.query.tab) ? route.query.tab : 'objetivos'))
const porLinea = computed(() => !tabs.value.find((t) => t.id === tab.value).sinLinea)
const mes = computed(() => (meses.includes(route.query.mes) ? route.query.mes : mesActual))
const ir = (cambio) => router.replace({ query: { ...route.query, linea: linea.value, tab: tab.value, mes: mes.value, ...cambio } })

const editando = ref(false)
const recarga = ref(0)
</script>

<style scoped>
.barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
</style>
