<template>
  <section class="ds-panel">
    <div class="ds-table-scroll">
      <table class="ds-table ds-table--lista ds-table--densa emt">
        <thead>
          <tr>
            <th class="num" style="width:44px">N°</th>
            <th style="width:90px">F. pago</th>
            <th>Alumno / contacto</th>
            <th style="width:90px">Línea de negocio</th>
            <th style="width:110px">Tipo programa</th>
            <th style="width:100px">Línea de producto</th>
            <th>Curso</th>
            <th class="tc" style="width:90px">Tipo de pago</th>
            <th class="tc" style="width:64px">Moneda</th>
            <th class="num" style="width:100px">Monto</th>
            <th style="width:110px">Medio de pago</th>
            <th style="width:120px">Entidad empresa</th>
            <th style="width:110px">Entidad financiera</th>
            <th style="width:110px">N° operación</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'sk-' + n">
              <td :colspan="COLUMNS"><span class="ds-skel"></span></td>
            </tr>
          </template>
          <tr v-else-if="!movements.length">
            <td :colspan="COLUMNS" class="ds-empty ds-empty--lista">
              No hay pagos con fecha en este rango. Prueba con otro día de F. pago.
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(m, i) in movements"
              :key="m.payment_id"
              class="link"
              tabindex="0"
              title="Abrir la inscripción"
              @click="openDetail(m)"
              @keydown.enter.self="openDetail(m)"
            >
              <td class="num is-muted">{{ i + 1 }}</td>
              <td class="emt-date">{{ fmt.formatDate(m.paid_on) }}</td>
              <td>
                <div class="emt-main emt-clip emt-alumno" :title="m.student_full_name">{{ m.student_full_name }}</div>
                <div class="emt-sub emt-clip emt-alumno">{{ m.phone || '—' }} · {{ m.email || 'sin correo' }}</div>
              </td>
              <td>{{ m.business_line || '—' }}</td>
              <td>{{ m.program_type || '—' }}</td>
              <td>{{ m.product_line || '—' }}</td>
              <td>
                <div class="emt-main emt-clip emt-curso" :title="m.program_name">{{ m.program_name || '—' }}</div>
                <div class="emt-sub">{{ m.version_code }}</div>
              </td>
              <td class="tc"><span class="ds-pill" :class="MOVEMENT_TONE[m.movement_type]">{{ m.movement_type }}</span></td>
              <td class="tc">{{ m.currency }}</td>
              <td class="num mono emt-strong">{{ currencyPrefix(m.currency) }} {{ fmt.formatMoney(m.amount) }}</td>
              <td>{{ m.payment_method || '—' }}</td>
              <td><div class="emt-clip emt-entidad" :title="m.business_entity">{{ m.business_entity || '—' }}</div></td>
              <td>{{ m.bank_name || '—' }}</td>
              <td class="mono">{{ m.transaction_code || '—' }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot v-if="!isLoading && movements.length">
          <tr v-for="(amount, currency) in totals" :key="currency" class="emt-total">
            <td :colspan="9">Total cobrado {{ currency }}</td>
            <td class="num mono">{{ currencyPrefix(currency) }} {{ fmt.formatMoney(amount) }}</td>
            <td :colspan="4"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

// Movimientos de caja del rango F. pago: un pago por fila con las columnas de
// la hoja "Ingresos operativos", para cuadrar el dia contra el banco. Los datos
// y los totales vienen de useEnrollmentList; aqui solo se pintan.
defineProps({
  movements: { type: Array, default: () => [] },
  totals: { type: Object, default: () => ({}) },
  isLoading: { type: Boolean, default: false }
})

const COLUMNS = 14
const MOVEMENT_TONE = { PT: '', PP: 'info', CUOTA: 'ok', ADICIONAL: 'warn' }

const router = useRouter()
const fmt = useEnrollmentFormatters()

const currencyPrefix = currency => currency === 'USD' ? '$' : 'S/.'

function openDetail (m) {
  router.push({ name: 'enrollmentDetail', params: { id: m.enrollment_id } })
}
</script>

<style scoped>
/* Tabla, pills, vacío y skeleton salen de ds-* (design-system.css). Aquí solo
   recortes de texto y la fila de total. */
.tc { text-align: center; }
.emt-main { font-weight: 600; color: var(--ds-ink); line-height: 1.35; }
.emt-sub { margin-top: 1px; font-size: 11px; color: var(--ds-muted); }
.emt-date { font-size: 11.5px; white-space: nowrap; }
.emt-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.emt-alumno { max-width: 220px; }
.emt-curso { max-width: 200px; }
.emt-entidad { max-width: 120px; }
.mono { font-family: var(--ds-font-mono); font-size: 11.5px; }
.emt-strong { font-weight: 700; color: var(--ds-ink); }
.is-muted { color: var(--ds-muted); }
.emt-total td { font-weight: 700; color: var(--ds-ink); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border); }
</style>
