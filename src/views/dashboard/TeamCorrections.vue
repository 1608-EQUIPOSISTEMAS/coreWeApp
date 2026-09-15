<template>
  <section class="ds-panel">
    <header class="ds-panel-head">
      <div>
        <h3 class="ds-panel-title">Correcciones de ventas</h3>
        <p class="ds-panel-sub">
          Ventas que hubo que corregir después de registrarlas, del mes actual y el anterior,
          con quién la registró y quién la aprobó
        </p>
      </div>
    </header>

    <div class="ds-panel-body">
      <p v-if="!detalle.length" class="ds-empty">Sin correcciones en el período.</p>

      <template v-else>
        <h4 class="bloque">Por persona</h4>
        <div class="ds-table-scroll">
          <table class="ds-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Área</th>
                <th class="num">Registró y se corrigió</th>
                <th class="num">Aprobó y se corrigió</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in resumen.slice(0, RESUMEN_LIMITE)" :key="p.user_id">
                <td>
                  {{ p.name }}
                  <div class="palias">{{ p.alias }}</div>
                </td>
                <td><span class="ds-chip">{{ p.area }}</span></td>
                <td class="num cnum">{{ p.registradas || '—' }}</td>
                <td class="num cnum">{{ p.aprobadas || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="bloque">Detalle</h4>
        <div class="ds-table-scroll">
          <table class="ds-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Venta</th>
                <th>Qué cambió</th>
                <th>Origen del error</th>
                <th>Motivo</th>
                <th>Corrigió</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in detalleVisible" :key="c.audit_id">
                <td class="fecha">{{ c.fecha }}</td>
                <td>
                  <RouterLink class="venta" :to="`/fico/inscripciones/${c.enrollment_id}`">
                    #{{ c.enrollment_id }} · {{ c.alumno || 'sin alumno' }}
                  </RouterLink>
                  <div class="palias">{{ c.programa }}</div>
                </td>
                <td class="cambios">{{ c.cambios }}</td>
                <td>
                  <span class="ds-pill" :class="TONO_ORIGEN[c.origen]">{{ c.origen }}</span>
                  <div class="palias">
                    registró {{ c.registro?.alias ?? '—' }} · aprobó {{ c.aprobo?.alias ?? '—' }}
                  </div>
                </td>
                <td class="motivo">{{ c.motivo || '—' }}</td>
                <td>{{ c.corrigio }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          v-if="detalle.length > DETALLE_LIMITE"
          type="button"
          class="btn-exec btn-exec-outline btn-sm ver-mas"
          @click="verTodas = !verTodas"
        >
          {{ verTodas ? 'Ver solo las últimas' : `Ver las ${detalle.length} correcciones` }}
        </button>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

// Solo renderiza: el origen del error y los conteos por persona ya vienen
// resueltos del backend (dashboard.entity: buildCorrectionsReport).
const props = defineProps({
  correcciones: { type: Object, default: () => ({ resumen: [], detalle: [] }) }
})

const resumen = computed(() => props.correcciones?.resumen ?? [])
const detalle = computed(() => props.correcciones?.detalle ?? [])

// El panel muestra lo reciente; el historial completo se abre a pedido para
// que 70 correcciones no empujen todo lo demás fuera de la pantalla.
const RESUMEN_LIMITE = 5
const DETALLE_LIMITE = 10
const verTodas = ref(false)
const detalleVisible = computed(() => (verTodas.value ? detalle.value : detalle.value.slice(0, DETALLE_LIMITE)))

const TONO_ORIGEN = {
  'Registro del asesor': 'warn',
  'Registro de FICO': 'info'
}
</script>

<style scoped>
/* Panel, tabla, chip y pill: sistema de diseño (styles/design-system.css). */
.bloque { margin: 18px 0 8px; font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); }
.bloque:first-of-type { margin-top: 0; }
.palias { margin-top: 2px; font-size: 11.5px; font-weight: 400; color: var(--ds-muted); }
.cnum { font-weight: 700; color: var(--ds-heading); }
.fecha { white-space: nowrap; }
.ds-table td.fecha { font-weight: 400; color: var(--ds-muted); }
.venta { display: block; font-weight: 600; color: var(--ds-heading); text-decoration: none; }
.venta:hover, .venta:focus-visible { text-decoration: underline; }
.cambios { min-width: 220px; }
.motivo { min-width: 200px; max-width: 360px; }
.ver-mas { margin-top: 12px; }
</style>
