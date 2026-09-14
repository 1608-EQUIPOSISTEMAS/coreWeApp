<template>
  <div class="card">
    <div class="c-title">Correcciones de ventas</div>
    <div class="c-sub">
      Ventas que hubo que corregir después de registrarlas · mes actual y anterior ·
      quién la registró y quién la aprobó
    </div>

    <div v-if="!detalle.length" class="vacio">Sin correcciones en el período.</div>

    <template v-else>
      <div class="bloque">Por persona</div>
      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Área</th>
              <th>Registró y se corrigió</th>
              <th>Aprobó y se corrigió</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in resumen.slice(0, RESUMEN_LIMITE)" :key="p.user_id">
              <td>
                <div class="pname">{{ p.name }}</div>
                <div class="palias">{{ p.alias }}</div>
              </td>
              <td><span class="chip">{{ p.area }}</span></td>
              <td class="cnum">{{ p.registradas || '—' }}</td>
              <td class="cnum">{{ p.aprobadas || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bloque">Detalle</div>
      <div class="tabla-scroll">
        <table class="tabla">
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
              <td class="nd nowrap">{{ c.fecha }}</td>
              <td>
                <RouterLink class="pname venta" :to="`/fico/inscripciones/${c.enrollment_id}`">
                  #{{ c.enrollment_id }} · {{ c.alumno || 'sin alumno' }}
                </RouterLink>
                <div class="palias">{{ c.programa }}</div>
              </td>
              <td class="cambios">{{ c.cambios }}</td>
              <td>
                <span class="origen" :class="claseOrigen(c.origen)">{{ c.origen }}</span>
                <div class="palias">
                  registró {{ c.registro?.alias ?? '—' }} · aprobó {{ c.aprobo?.alias ?? '—' }}
                </div>
              </td>
              <td class="motivo">{{ c.motivo || '—' }}</td>
              <td class="nd">{{ c.corrigio }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button
        v-if="detalle.length > DETALLE_LIMITE"
        type="button"
        class="ver-mas"
        @click="verTodas = !verTodas"
      >
        {{ verTodas ? 'Ver solo las últimas' : `Ver las ${detalle.length} correcciones` }}
      </button>
    </template>
  </div>
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

const claseOrigen = (origen) => ({
  'Registro del asesor': 'asesor',
  'Registro de FICO': 'fico'
}[origen] ?? 'otro')
</script>

<style scoped>
/* Los colores salen de las variables --td-* que define .team-dash (se heredan).
   Las clases de tarjeta y tabla se repiten a propósito: el style scoped del
   padre no alcanza a este componente. */
.card { background: var(--td-card); border: 1px solid var(--td-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 22px; }
.c-title { font-size: 16px; font-weight: 700; color: var(--td-navy); }
.c-sub { font-size: 12.5px; color: var(--td-muted); margin: 4px 0 16px; }
.vacio { font-size: 13px; color: var(--td-muted); padding: 14px 0; }
.bloque { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--td-ink2); margin: 18px 0 8px; }

.tabla-scroll { overflow-x: auto; }
.tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
.tabla th { text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--td-muted); padding: 0 12px 10px 0; white-space: nowrap; }
.tabla td { padding: 10px 12px 10px 0; border-top: 1px solid var(--td-border); vertical-align: top; }
.pname { font-weight: 600; color: var(--td-navy); }
.venta { display: block; text-decoration: none; }
.venta:hover, .venta:focus-visible { text-decoration: underline; }
.ver-mas { margin-top: 12px; padding: 7px 14px; border: 1px solid var(--td-border); border-radius: 8px; background: transparent; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--td-ink2); cursor: pointer; }
.ver-mas:hover, .ver-mas:focus-visible { color: var(--td-navy); }
.palias { font-size: 11.5px; color: var(--td-muted); margin-top: 2px; }
.cnum { font-weight: 700; color: var(--td-navy); }
.nd { color: var(--td-muted); font-size: 12.5px; }
.nowrap { white-space: nowrap; }
.chip { font-size: 12px; font-weight: 600; color: var(--td-ink2); background: #eef2fb; padding: 2px 9px; border-radius: 999px; }
.cambios { min-width: 220px; color: var(--td-ink2); }
.motivo { min-width: 200px; max-width: 360px; color: var(--td-ink2); }

.origen { font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px; white-space: nowrap; }
.origen.asesor { background: #fff4e5; color: #b4610e; }
.origen.fico { background: #eef2fb; color: var(--td-navy); }
.origen.otro { background: #f1f5f9; color: var(--td-ink2); }

[data-coreui-theme="dark"] .chip,
[data-coreui-theme="dark"] .origen.fico { background: rgba(143, 170, 220, 0.12); color: #C9C9C1; }
[data-coreui-theme="dark"] .origen.asesor { background: rgba(233, 184, 114, 0.14); color: #E9B872; }
[data-coreui-theme="dark"] .origen.otro { background: #24241E; color: #A0A099; }
</style>
