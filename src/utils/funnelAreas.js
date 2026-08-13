export const SIN_LINEA = 'SIN LÍNEA'

// Las areas del reporte, en el orden de la hoja (no alfabetico). Espeja
// FUNNEL_GROUPS del Backend: la hoja tiene ademas MEMBRESIAS, B2B y ACAD, que
// v_gerencia_funnel todavia no clasifica.
export const AREAS = ['MARKETING', 'WEB', 'COMERCIAL', 'OTROS']

/**
 * Desglose de UN curso por área: lo que la hoja pone como ~80 columnas al lado
 * de cada fila, vuelto vertical. Siempre devuelve las 4 áreas —incluso vacías—
 * para que las columnas del reporte cuadren entre cursos.
 *
 * `canales` es la lista plana del DTO: el Backend ya omite las celdas sin meta
 * ni movimiento, así que un área sin momentos es un área que no aportó nada.
 */
export function desglosarPorArea (canales = []) {
  return AREAS.map(area => {
    const momentos = canales.filter(c => c.grupo === area)
    return {
      area,
      momentos,
      consultas: sumar(momentos, 'consultas'),
      ventas: sumar(momentos, 'ventas'),
      meta_consultas: sumar(momentos, 'meta_consultas'),
      meta_ventas: sumar(momentos, 'meta_ventas')
    }
  })
}

const sumar = (filas, campo) => filas.reduce((total, f) => total + f[campo], 0)

/**
 * Agrupa las ediciones del embudo por LÍNEA (BI, SAP, EXCEL…) y calcula cuánto
 * aportó cada una a la venta del mes. Ojo con el vocabulario de la hoja: la
 * línea es la familia del curso; el "área" es el canal (ver AREAS más abajo).
 *
 * `ventasMes` se recibe en vez de derivarse de `ediciones` porque el aporte se
 * mide siempre contra el mes entero: si el reporte está filtrado por una línea,
 * derivarlo dejaría a esa línea en 100% y el dato perdería sentido.
 */
export function agruparPorLinea (ediciones, ventasMes) {
  const porArea = new Map()

  for (const e of ediciones) {
    const linea = e.linea || SIN_LINEA
    const area = porArea.get(linea) ||
      { linea, ediciones: 0, consultas: 0, ventas: 0, meta_consultas: 0, meta_ventas: 0 }
    area.ediciones += 1
    area.consultas += e.consultas
    area.ventas += e.ventas
    area.meta_consultas += e.meta_consultas
    area.meta_ventas += e.meta_ventas
    porArea.set(linea, area)
  }

  return [...porArea.values()]
    .map(area => ({
      ...area,
      conversion_pct: pctUnDecimal(area.ventas, area.consultas),
      aporte_pct: pctUnDecimal(area.ventas, ventasMes) ?? 0
    }))
    .sort((a, b) => b.ventas - a.ventas)
}

// Sin denominador no hay porcentaje: null, nunca 0% (0% se lee como "no vendió").
const pctUnDecimal = (parte, total) =>
  (total > 0 ? Math.round((parte / total) * 1000) / 10 : null)
