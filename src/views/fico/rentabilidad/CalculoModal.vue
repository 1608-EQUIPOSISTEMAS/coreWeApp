<template>
  <BaseModal :model-value="modelValue" title="¿De dónde sale la rentabilidad?" size="lg" @update:model-value="emit('update:modelValue', $event)">
    <div class="calc">
      <p v-if="kpis" class="formula" role="math" :aria-label="`Margen igual a ingreso menos costo docente menos publicidad`">
        <span><small>Ingreso vendido</small>{{ formatValue(kpis.ingreso, 'soles') }}</span>
        <b aria-hidden="true">−</b>
        <span><small>Costo docente</small>{{ formatValue(kpis.docente, 'soles') }}</span>
        <b aria-hidden="true">−</b>
        <span><small>Publicidad</small>{{ formatValue(kpis.publicidad, 'soles') }}</span>
        <b aria-hidden="true">=</b>
        <span class="result" :class="kpis.margen_tone"><small>Margen</small>{{ formatValue(kpis.margen, 'soles') }}</span>
      </p>

      <section>
        <h4><i class="fa-solid fa-sack-dollar" aria-hidden="true"></i> Ingreso vendido</h4>
        <p>
          El monto total de cada venta aprobada por FICO, contada en su <b>F. PAGO</b> (la misma fecha de la hoja FICO
          y del Informe de Finanzas). Una venta es la inscripción principal: el destino de una RP o de un CC no es una
          venta nueva, y las becas (monto 0) no suman. Dólares a S/ 3.75.
        </p>
        <p>
          La <b>línea</b> sale de la venta: lo vendido por convenio es <b>B2B</b> y lo de Fundación es <b>Fundación</b>,
          aunque el programa sea En Vivo. El resto toma la línea de negocio del programa (Producto).
        </p>
      </section>

      <section>
        <h4><i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i> Costo docente</h4>
        <p>
          Por cada edición que <b>empieza</b> en el periodo:
          <code>sesiones de la versión × horas por sesión (del horario, ej. 7–10 PM = 3 h) × tarifa por hora del docente</code>.
          La tarifa la carga FICO en la pestaña <b>Costos</b>; sin tarifa la edición no suma costo y se avisa arriba.
        </p>
        <p>
          El costo se reparte <b>por alumno</b> entre los programas que se vendieron: si en el aula de un curso hay 3
          alumnos de un diplomado y 1 que compró el curso suelto, el diplomado carga 3/4 del costo. Así un paquete
          paga lo que cuestan sus cursos. Un aula sin alumnos la carga su propio programa.
        </p>
      </section>

      <section>
        <h4><i class="fa-solid fa-bullhorn" aria-hidden="true"></i> Publicidad</h4>
        <p>
          El gasto de marketing del mes de cada unidad (En Vivo, Online, B2B, Fundación), cargado por FICO en
          <b>Costos</b> con el mismo corte de contabilidad (2.1.12 por unidad). Se reparte entre los programas de esa
          unidad según su parte de las ventas del mes: quien vende el 20 % de En Vivo carga el 20 % de su publicidad.
        </p>
      </section>

      <p class="ds-callout warn">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <span>
          <b>Qué no incluye:</b> comisiones de asesores, plataforma (Odoo, Teams), pasarelas de pago, IGV ni gastos fijos
          (planilla administrativa, local). Es un <b>margen de contribución</b>: dice qué programa paga sus costos
          directos, no la utilidad de la empresa.
        </span>
      </p>
      <p class="ds-callout info">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>
          El ingreso cuenta en el mes de la venta y el costo en el mes en que empieza la edición. Un diplomado que se
          vende en julio y dicta sus cursos hasta diciembre se lee mejor en la vista <b>Año</b>. Por eso la rentabilidad
          no se mide por día: un día se muestra como su mes.
        </span>
      </p>
    </div>
    <template #footer>
      <button class="btn-exec btn-exec-primary" type="button" @click="emit('update:modelValue', false)">Entendido</button>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/BaseModal.vue'
import { formatValue } from '@/shared/lib/formatValue.js'

defineProps({
  modelValue: { type: Boolean, default: false },
  // KPIs del periodo en pantalla, para mostrar la cuenta con números reales.
  kpis: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.calc { display: flex; flex-direction: column; gap: 14px; font-size: 13px; color: var(--ds-ink); line-height: 1.55; }
.calc h4 { margin: 0 0 4px; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }
.calc h4 i { width: 18px; color: var(--ds-accent); }
.calc p { margin: 0 0 6px; }
.calc code { font-family: var(--ds-font-mono); font-size: 12px; color: var(--ds-heading); background: var(--ds-surface-2); padding: 1px 5px; border-radius: var(--ds-radius-control); }
.formula { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; padding: 12px 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.formula span { display: flex; flex-direction: column; font-size: 18px; font-weight: 800; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.formula small { font-size: 11px; font-weight: 600; color: var(--ds-muted); }
.formula b { font-size: 18px; color: var(--ds-muted); }
.formula .result.ok { color: var(--ds-ok-ink); }
.formula .result.bad { color: var(--ds-bad-ink); }
</style>
