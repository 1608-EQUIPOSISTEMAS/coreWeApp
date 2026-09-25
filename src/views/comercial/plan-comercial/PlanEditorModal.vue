<template>
  <BaseModal :model-value="modelValue" :title="`Objetivos de ${monthName(month).toLowerCase()}`" size="xxl" @update:model-value="$emit('update:modelValue', $event)">
    <p v-if="error" class="ds-alert">{{ error }}</p>
    <div v-else-if="loading" class="ds-stack"><span v-for="n in 6" :key="n" class="ds-skel"></span></div>

    <template v-else-if="semanas.length">
      <p class="ds-help ayuda">
        Una fila por semana del mes. La semana que cruza el cambio de mes lleva en cada mes solo sus días.
        Puedes pegar un bloque copiado de Excel desde cualquier celda. Una celda vacía queda sin objetivo.
      </p>
      <div class="ds-table-scroll">
        <table class="editor" @paste="pegar">
          <thead>
            <tr class="grupos">
              <th colspan="2">Semana</th>
              <th colspan="2" class="sep">Equipo</th>
              <th :colspan="asesores.length + 1" class="sep">Vacantes por asesor</th>
            </tr>
            <tr>
              <th>Sem.</th><th>Días</th>
              <th class="sep">Vacantes</th><th>Ingresos S/</th>
              <th v-for="(a, i) in asesores" :key="a.user_id" :class="{ sep: i === 0 }" :title="a.nombre">{{ a.alias }}</th>
              <th class="sep">Suma</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(w, fila) in semanas" :key="w.date_start">
              <th scope="row">{{ w.week_label }}</th>
              <td class="dias">{{ periodOf(w) }}</td>
              <td v-for="(c, col) in COLUMNAS_EQUIPO" :key="c" :class="{ sep: col === 0 }">
                <input v-model="w[c]" class="ds-input" inputmode="decimal" :data-celda="`${fila}:${col}`" :aria-label="`${w.week_label} ${ETIQUETAS[c]}`" />
              </td>
              <td v-for="(a, i) in asesores" :key="a.user_id" :class="{ sep: i === 0 }">
                <input
                  v-model="w.asesores[a.user_id]"
                  class="ds-input"
                  inputmode="numeric"
                  :data-celda="`${fila}:${COLUMNAS_EQUIPO.length + i}`"
                  :aria-label="`${w.week_label} ${a.nombre}`"
                />
              </td>
              <td class="sep suma" :class="{ bad: descuadra(w) }" :title="descuadra(w) ? 'No coincide con el objetivo del equipo' : ''">
                {{ sumaAsesores(w) || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" @click="$emit('update:modelValue', false)">Cancelar</button>
      <button class="btn-exec btn-exec-primary" type="button" :disabled="saving || loading || !!error" @click="guardar">
        {{ saving ? 'Guardando…' : 'Guardar objetivos' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { monthName, periodOf } from '@/features/plan-comercial/planComercial'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  month: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const COLUMNAS_EQUIPO = ['obj_vacantes', 'obj_ingresos']
const ETIQUETAS = { obj_vacantes: 'vacantes del equipo', obj_ingresos: 'ingresos del equipo' }

const service = inject(ServiceKeys.PlanComercial)
const toast = useToast()
const semanas = ref([])
const asesores = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const aTexto = (v) => (v === null || v === undefined ? '' : String(v))

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    const plan = await service.plan(props.month)
    asesores.value = plan.asesores
    semanas.value = plan.weeks.map((w) => ({
      ...w,
      obj_vacantes: aTexto(w.obj_vacantes),
      obj_ingresos: aTexto(w.obj_ingresos),
      asesores: Object.fromEntries(plan.asesores.map((a) => [a.user_id, aTexto(w.asesores[a.user_id])]))
    }))
  } catch (err) {
    console.error('[PlanComercial] cargar plan', { month: props.month, err })
    error.value = err?.response?.data?.message || 'No se pudo abrir el plan del mes. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(() => [props.modelValue, props.month], ([abierto]) => { if (abierto) cargar() }, { immediate: true })

// Excel en es-PE copia "S/ 35,111.50": la coma es de miles y el punto decimal.
// Se queda solo con digitos y punto.
const aNumero = (texto) => String(texto).replace(/[^\d.]/g, '')

const sumaAsesores = (w) => Object.values(w.asesores).reduce((s, v) => s + (Number(v) || 0), 0)
const descuadra = (w) => w.obj_vacantes !== '' && sumaAsesores(w) > 0 && sumaAsesores(w) !== Number(w.obj_vacantes)

// Pegar un bloque de Excel: se reparte desde la celda donde esta el cursor,
// fila por fila y columna por columna, igual que en la hoja.
function pegar (event) {
  const origen = event.target?.dataset?.celda
  const texto = event.clipboardData?.getData('text/plain') ?? ''
  if (!origen || !/[\t\n]/.test(texto.trim())) return
  event.preventDefault()
  const [fila0, col0] = origen.split(':').map(Number)
  texto.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach((linea, df) => {
    const w = semanas.value[fila0 + df]
    if (!w) return
    linea.split('\t').forEach((valor, dc) => {
      const col = col0 + dc
      if (col < COLUMNAS_EQUIPO.length) w[COLUMNAS_EQUIPO[col]] = aNumero(valor)
      else if (asesores.value[col - COLUMNAS_EQUIPO.length]) w.asesores[asesores.value[col - COLUMNAS_EQUIPO.length].user_id] = aNumero(valor)
    })
  })
}

const valor = (v) => (v === '' ? null : Number(v))

async function guardar () {
  const invalida = semanas.value.find((w) =>
    [...COLUMNAS_EQUIPO.map((c) => w[c]), ...Object.values(w.asesores)].some((v) => v !== '' && !(Number(v) >= 0)))
  if (invalida) {
    toast.warning(`Revisa la ${invalida.week_label}: los objetivos son números de 0 para arriba.`)
    return
  }
  saving.value = true
  try {
    await service.guardarPlan(props.month, semanas.value.map((w) => ({
      date_start: w.date_start,
      obj_vacantes: valor(w.obj_vacantes),
      obj_ingresos: valor(w.obj_ingresos),
      asesores: Object.fromEntries(Object.entries(w.asesores).map(([id, v]) => [id, valor(v)]))
    })))
    toast.success(`Objetivos de ${monthName(props.month).toLowerCase()} guardados`)
    emit('saved')
    emit('update:modelValue', false)
  } catch (err) {
    console.error('[PlanComercial] guardar plan', { month: props.month, err })
    toast.error(err?.response?.data?.message || 'No se pudieron guardar los objetivos.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ayuda { margin: 0 0 12px; }
.editor { border-collapse: collapse; font-size: 12.5px; }
.editor th { padding: 0 6px 8px; font-size: 11px; font-weight: 600; color: var(--ds-muted); text-align: center; white-space: nowrap; }
.editor .grupos th { font-weight: 700; color: var(--ds-heading); }
.editor tbody th { padding: 4px 8px 4px 0; text-align: left; color: var(--ds-heading); }
.editor td { padding: 3px; }
.editor td.dias { padding-right: 10px; color: var(--ds-ink-2); white-space: nowrap; }
.editor .sep { border-left: 1px solid var(--ds-border); padding-left: 8px; }
.editor .ds-input { width: 84px; height: 32px; text-align: right; font-variant-numeric: tabular-nums; }
.editor .suma { min-width: 56px; text-align: right; font-weight: 700; color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }
.editor .suma.bad { color: var(--ds-bad-ink); }
</style>
