// Tema oscuro para Chart.js (global). Importado una vez en main.js.
// - Ajusta los defaults (texto de ticks/leyendas y líneas de grid) según
//   data-coreui-theme y re-pinta los charts vivos al alternar el tema.
// - Exporta `isDark` para que las vistas con colores hardcodeados en options/
//   datasets los hagan reactivos: usar dentro de un computed
//   (p.ej. color: isDark.value ? '#E5E7EB' : '#0f172a').
import { ref } from 'vue'
import { Chart } from 'chart.js'

export const isDark = ref(false)

function apply() {
  isDark.value = document.documentElement.getAttribute('data-coreui-theme') === 'dark'
  // valores light = defaults de fábrica de Chart.js v4
  Chart.defaults.color = isDark.value ? '#A0A099' : '#666'
  Chart.defaults.borderColor = isDark.value ? '#2A2A22' : 'rgba(0,0,0,0.1)'
  Object.values(Chart.instances ?? {}).forEach(c => c.update('none'))
}

apply()
new MutationObserver(apply).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-coreui-theme'],
})
