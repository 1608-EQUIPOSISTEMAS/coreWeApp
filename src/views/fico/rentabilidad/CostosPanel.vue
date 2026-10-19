<template>
  <div class="ds-row ds-row--mitad">
    <!-- Tarifas por docente -->
    <article class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">¿Cuánto cobra cada docente por hora?</h3>
        <span class="ds-panel-hint">{{ sinTarifa }} de {{ tarifas.length }} sin tarifa</span>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll costos-scroll">
          <table class="ds-table ds-table--densa">
            <thead>
              <tr>
                <th scope="col">Docente</th>
                <th scope="col" class="num">Ediciones {{ year }}</th>
                <th scope="col" class="num">Tarifa S/ por hora</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="loading">
                <tr v-for="n in 6" :key="n"><td colspan="3"><span class="ds-skel"></span></td></tr>
              </template>
              <tr v-else-if="!tarifas.length">
                <td colspan="3" class="ds-empty ds-empty--lista">Ningún docente dicta ediciones en {{ year }}.</td>
              </tr>
              <template v-else>
              <tr v-for="t in tarifas" :key="t.instructor_id" :class="{ falta: t.tarifa === null }">
                <td>{{ t.docente }}</td>
                <td class="num">{{ t.ediciones }}</td>
                <td class="num">
                  <input
                    v-model="drafts[t.instructor_id]"
                    class="ds-input rate"
                    type="number" min="0" step="0.5" inputmode="decimal"
                    :disabled="!canEdit || savingRate === t.instructor_id"
                    :aria-label="`Tarifa por hora de ${t.docente}`"
                    placeholder="—"
                    @change="saveRate(t)"
                  />
                </td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <footer class="ds-panel-foot">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>Se guarda al salir de la casilla. Vacía = sin tarifa. Primero los que faltan y los que más dictan.</span>
      </footer>
    </article>

    <!-- Publicidad por mes y unidad -->
    <article class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">¿Cuánto se gastó en publicidad cada mes?</h3>
        <button v-if="canEdit" class="btn-exec btn-exec-primary btn-sm" type="button" :disabled="savingMkt || loading" @click="saveMarketing">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> {{ savingMkt ? 'Guardando…' : 'Guardar publicidad' }}
        </button>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--densa">
            <thead>
              <tr>
                <th scope="col">Mes {{ year }}</th>
                <th v-for="l in LINES" :key="l.key" scope="col" class="num">{{ l.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in grid" :key="m.month">
                <td>{{ m.label }}</td>
                <td v-for="l in LINES" :key="l.key" class="num">
                  <input
                    v-model.number="m.values[l.key]"
                    class="ds-input money"
                    type="number" min="0" step="0.01" inputmode="decimal"
                    :disabled="!canEdit"
                    :aria-label="`Publicidad ${l.label} ${m.label} ${year}`"
                    placeholder="—"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <footer class="ds-panel-foot">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>Monto del banco de 2.1.12 × % de Marketing por unidad (el reporte de Gastos de contabilidad), en soles.</span>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, getCurrentInstance } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { LINES, marketingGrid, marketingRowsToSave } from '@/features/fico-rentabilidad/rentabilidad.js'

const props = defineProps({ year: { type: Number, required: true } })

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()
const $hasRole = getCurrentInstance()?.appContext?.config?.globalProperties?.$hasRole || (() => false)
// Gerencia ve los costos; solo el lider de FICO los carga.
const canEdit = computed(() => $hasRole(['ADMIN', 'LIDER_FICO']))

const loading = ref(false)
const tarifas = ref([])
const drafts = ref({})
const grid = ref(marketingGrid([]))
const savingRate = ref(null)
const savingMkt = ref(false)

const sinTarifa = computed(() => tarifas.value.filter(t => t.tarifa === null).length)

async function load () {
  loading.value = true
  try {
    const data = await ficoService.costosRentabilidad(props.year)
    tarifas.value = data.tarifas
    drafts.value = Object.fromEntries(data.tarifas.map(t => [t.instructor_id, t.tarifa]))
    grid.value = marketingGrid(data.publicidad)
  } catch (err) {
    console.error('Error cargando los costos de rentabilidad:', err)
    toast.error('No se pudieron cargar los costos')
  } finally {
    loading.value = false
  }
}
watch(() => props.year, load, { immediate: true })

async function saveRate (t) {
  const raw = drafts.value[t.instructor_id]
  const rate = raw === '' || raw === null || raw === undefined ? null : Number(raw)
  if (rate === t.tarifa) return
  savingRate.value = t.instructor_id
  try {
    await ficoService.guardarTarifaDocente(t.instructor_id, rate)
    t.tarifa = rate
    toast.success(rate === null ? `Tarifa de ${t.docente} quitada` : `Tarifa de ${t.docente} guardada`)
  } catch (err) {
    console.error('Error guardando la tarifa:', err)
    drafts.value[t.instructor_id] = t.tarifa
    toast.error(err?.response?.data?.message || 'No se pudo guardar la tarifa')
  } finally {
    savingRate.value = null
  }
}

async function saveMarketing () {
  savingMkt.value = true
  try {
    const { saved } = await ficoService.guardarPublicidad(props.year, marketingRowsToSave(grid.value))
    toast.success(`Publicidad guardada (${saved} montos)`)
  } catch (err) {
    console.error('Error guardando la publicidad:', err)
    toast.error(err?.response?.data?.message || 'No se pudo guardar la publicidad')
  } finally {
    savingMkt.value = false
  }
}
</script>

<style scoped>
.costos-scroll { max-height: 520px; overflow-y: auto; }
.rate { width: 96px; margin-left: auto; text-align: right; }
.money { width: 104px; margin-left: auto; text-align: right; }
/* Docente sin tarifa: su costo no entra al margen. */
tr.falta > td:first-child { box-shadow: inset 3px 0 0 var(--ds-warn); }
</style>
