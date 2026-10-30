<template>
  <div class="ds-page pl-page">
    <header class="pl-head">
      <div>
        <nav class="pl-crumb" aria-label="Ruta"><span>Recursos humanos</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><b>Planilla</b></nav>
        <h1 class="pl-title">Planilla de {{ soloMes }}</h1>
        <p class="pl-sub">Huellero, tardanzas y pago del mes · 1.ª quincena 40 % · fin de mes 60 % menos tardanzas</p>
      </div>
      <div class="pl-head-actions">
        <span v-if="calc" class="pl-estado" :class="calc.cerrado ? 'cerrado' : 'abierto'"><i class="pl-dot" aria-hidden="true"></i>{{ calc.cerrado ? 'Periodo cerrado' : 'Periodo abierto' }}</span>
        <div class="pl-mesnav">
          <button type="button" aria-label="Mes anterior" @click="moverMes(-1)"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
          <label class="pl-mesnav-label">
            <i class="fa-regular fa-calendar" aria-hidden="true"></i> {{ mesCapital }}
            <input v-model="periodo" type="month" class="pl-mes-input" aria-label="Periodo" />
          </label>
          <button type="button" aria-label="Mes siguiente" @click="moverMes(1)"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>
    </header>

    <div class="pl-tabs" role="tablist" aria-label="Secciones de planilla">
      <button v-for="t in tabsVisibles" :key="t.key" type="button" role="tab" :class="{ activo: tab === t.key }" :aria-selected="String(tab === t.key)" @click="tab = t.key">
        <i :class="t.icon" aria-hidden="true"></i> {{ t.label }}
      </button>
    </div>

    <!-- ── Planilla del mes ───────────────────────────────────────────── -->
    <template v-if="tab === 'planilla'">
      <div v-if="!puedeVerSueldos" class="ds-callout">
        Los montos de la planilla solo los ve el área de Talento.
      </div>
      <template v-else>
        <section v-if="calc" class="pl-kpis">
          <div class="pl-kpi">
            <div class="pl-kpi-top"><span>Trabajadores</span><span class="pl-kpi-ico"><i class="fa-solid fa-user-group" aria-hidden="true"></i></span></div>
            <div class="pl-kpi-val">{{ calc.totales.trabajadores }}</div>
            <div class="pl-kpi-foot">Sueldo neto total <b>{{ soles(totalNeto) }}</b></div>
          </div>
          <div class="pl-kpi">
            <div class="pl-kpi-top"><span>1.ª quincena</span><span class="pl-chip">40 %</span></div>
            <div class="pl-kpi-val">{{ soles(calc.totales.pago_quincena) }}</div>
            <div class="pl-progress"><span style="width: 40%"></span></div>
          </div>
          <div class="pl-kpi">
            <div class="pl-kpi-top"><span>Descuento por tardanzas</span><span class="pl-kpi-ico bad"><i class="fa-regular fa-clock" aria-hidden="true"></i></span></div>
            <div class="pl-kpi-val bad">– {{ soles(calc.totales.descuento_tardanza) }}</div>
            <div class="pl-kpi-foot"><b class="bad">{{ fmtNum(calc.totales.minutos_tardanza) }} min</b> acumulados en el mes</div>
          </div>
          <div class="pl-kpi destacado">
            <div class="pl-kpi-top"><span>A pagar fin de mes</span><span class="pl-kpi-ico ok"><i class="fa-solid fa-money-bill" aria-hidden="true"></i></span></div>
            <div class="pl-kpi-val">{{ soles(calc.totales.pago_fin_mes) }}</div>
            <div class="pl-kpi-foot">60 % ({{ soles(totalFinBruto) }}) – tardanzas</div>
          </div>
        </section>

        <section v-if="calc && totalNeto" class="pl-card pl-dist">
          <div class="pl-dist-head"><b>Distribución del costo del mes</b><span>Total <b>{{ soles(totalNeto) }}</b></span></div>
          <div class="pl-dist-bar">
            <span class="q" :style="{ flexGrow: calc.totales.pago_quincena }"></span>
            <span class="f" :style="{ flexGrow: calc.totales.pago_fin_mes }"></span>
            <span v-if="calc.totales.descuento_tardanza" class="d" :style="{ flexGrow: calc.totales.descuento_tardanza }"></span>
          </div>
          <div class="pl-dist-leg">
            <span><i class="q"></i>1.ª quincena <b>{{ soles(calc.totales.pago_quincena) }}</b></span>
            <span><i class="f"></i>Fin de mes neto <b>{{ soles(calc.totales.pago_fin_mes) }}</b></span>
            <span><i class="d"></i>Descontado por tardanzas <b class="bad">{{ soles(calc.totales.descuento_tardanza) }}</b></span>
          </div>
        </section>

        <section class="pl-card pl-tabla">
          <header class="pl-tabla-head">
            <div>
              <h2 class="pl-tabla-title">
                Planilla {{ nombreMes }}
                <span v-if="calc?.cerrado" class="pl-badge ok"><i class="fa-solid fa-lock" aria-hidden="true"></i> Cerrada</span>
                <span v-else class="pl-badge warn">Abierta</span>
              </h2>
              <p class="pl-tabla-sub">
                <template v-if="calc?.cerrado">Congelada por {{ calc.cierre.cerrado_por || '—' }} el {{ fechaHora(calc.cierre.cerrado_at) }} · </template>
                <i class="fa-solid fa-circle-info" aria-hidden="true"></i> Valor del minuto = sueldo neto ÷ 30 días ÷ 8 h ÷ 60
              </p>
            </div>
            <div class="pl-tabla-actions">
              <div class="pl-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input v-model.trim="filtro" type="search" placeholder="Buscar nombre, código o área" aria-label="Buscar" /></div>
              <button class="pl-btn" type="button" :disabled="!calc || exportando" @click="exportar">
                <i class="fa-solid fa-file-excel" aria-hidden="true"></i> {{ exportando ? 'Exportando…' : 'Exportar Excel' }}
              </button>
              <button v-if="calc && !calc.cerrado" class="pl-btn primario" type="button" @click="cerrar">
                <i class="fa-solid fa-lock" aria-hidden="true"></i> Cerrar periodo
              </button>
              <button v-else-if="calc" class="pl-btn" type="button" @click="reabrir">
                <i class="fa-solid fa-lock-open" aria-hidden="true"></i> Reabrir
              </button>
            </div>
          </header>
          <div class="ds-table-scroll">
            <table class="pl-table">
              <thead>
                <tr>
                  <th class="pl-col-caret"></th><th>Trabajador</th><th>Área</th><th class="tr">Sueldo neto</th><th class="tr">Quincena</th>
                  <th class="tr">Fin de mes</th><th>Tardanzas</th><th class="tr">Descuento</th><th class="tr">A pagar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cargando"><td colspan="9" class="ds-empty">Calculando…</td></tr>
                <tr v-else-if="!trabajadoresFiltrados.length"><td colspan="9" class="ds-empty">Sin personal. Importa el maestro de personal en la pestaña "Personal".</td></tr>
                <template v-for="t in trabajadoresPagina" :key="t.codigo">
                  <tr class="pl-fila" :class="{ abierta: abierto === t.codigo }" @click="abierto = abierto === t.codigo ? null : t.codigo">
                    <td class="pl-col-caret"><span class="pl-caret"><i class="fa-solid" :class="abierto === t.codigo ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i></span></td>
                    <td>
                      <div class="pl-who">
                        <span class="pl-avatar">{{ iniciales(t.nombre) }}</span>
                        <div>
                          <div class="cell-main">{{ t.nombre }}</div>
                          <div class="cell-sub mono">{{ t.codigo }} · ingreso {{ t.hora_ingreso }}</div>
                        </div>
                      </div>
                    </td>
                    <td><span v-if="t.area" class="pl-area">{{ t.area }}</span><span v-else class="cell-sub">—</span></td>
                    <td class="tr mono">{{ t.sin_sueldo ? 'sin sueldo' : soles(t.sueldo_neto) }}</td>
                    <td class="tr mono">{{ soles(t.pago_quincena) }}</td>
                    <td class="tr mono">{{ soles(t.pago_fin_mes_bruto) }}</td>
                    <td>
                      <template v-if="t.tardanzas">
                        <div class="pl-tard"><b>{{ t.tardanzas }} {{ t.tardanzas === 1 ? 'tardanza' : 'tardanzas' }}</b> · {{ t.minutos_tardanza }} min</div>
                        <div class="pl-tard-bar"><span :style="{ width: barraTardanza(t) }"></span></div>
                      </template>
                      <span v-else class="cell-sub">{{ t.dias_asistidos ? 'Sin tardanzas' : 'Sin marcas' }}</span>
                    </td>
                    <td class="tr mono pl-desc">{{ t.descuento_tardanza ? '– ' + soles(t.descuento_tardanza) : '—' }}</td>
                    <td class="tr"><span class="pl-pagar">{{ soles(t.pago_fin_mes) }}</span></td>
                  </tr>
                  <tr v-if="abierto === t.codigo" class="pl-detalle">
                    <td colspan="9">
                      <div class="pl-mini">
                        <div><span>Tardanzas</span><b class="bad">{{ t.tardanzas }} {{ t.tardanzas === 1 ? 'tardanza' : 'tardanzas' }}</b></div>
                        <div><span>Minutos descontados</span><b>{{ t.minutos_tardanza }} min</b></div>
                        <div><span>Valor del minuto</span><b>{{ t.sueldo_neto ? 'S/ ' + (t.sueldo_neto / 14400).toFixed(4) : '—' }}</b></div>
                        <div><span>Descuento</span><b class="bad">{{ t.descuento_tardanza ? '– ' + soles(t.descuento_tardanza) : soles(0) }}</b></div>
                      </div>
                      <div class="pl-cal-head">
                        <b>Marcaciones de entrada · {{ soloMes }}</b>
                        <div class="pl-leyenda"><span><i class="ok"></i>Puntual</span><span><i class="warn"></i>Dentro de tolerancia</span><span><i class="bad"></i>Tardanza con descuento</span><span><i class="just"></i>Justificado</span></div>
                      </div>
                      <div v-if="!t.detalle.length" class="cell-sub">Sin marcaciones en el periodo.</div>
                      <div v-else class="pl-cal">
                        <div v-for="d in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']" :key="d" class="pl-cal-dow">{{ d }}</div>
                        <template v-for="(c, i) in calendario(t)" :key="i">
                          <div v-if="!c" class="pl-cal-vacio"></div>
                          <div v-else class="pl-dia" :class="c.estado" :title="c.justificacion || ''">
                            <div class="pl-dia-top"><span>{{ c.dm }}</span><i aria-hidden="true"></i></div>
                            <div class="pl-dia-hora">{{ c.entrada || '—' }}</div>
                            <div v-if="c.estado === 'bad'" class="pl-dia-desc">{{ c.minutos }}′ · –{{ c.descuento.toFixed(2) }}</div>
                            <div v-else-if="c.estado === 'just'" class="pl-dia-desc">justificado</div>
                          </div>
                        </template>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
              <tfoot v-if="calc && trabajadoresFiltrados.length">
                <tr>
                  <td></td>
                  <td colspan="2"><b>Total planilla</b> <span class="cell-sub">· {{ calc.totales.trabajadores }} trabajadores</span></td>
                  <td class="tr mono"><b>{{ soles(totalNeto) }}</b></td>
                  <td class="tr mono"><b>{{ soles(calc.totales.pago_quincena) }}</b></td>
                  <td class="tr mono"><b>{{ soles(totalFinBruto) }}</b></td>
                  <td class="bad"><b>{{ fmtNum(calc.totales.minutos_tardanza) }} min</b></td>
                  <td class="tr mono bad"><b>– {{ soles(calc.totales.descuento_tardanza) }}</b></td>
                  <td class="tr mono okc"><b>{{ soles(calc.totales.pago_fin_mes) }}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <footer v-if="trabajadoresFiltrados.length" class="pl-pag">
            <span>Mostrando {{ trabajadoresPagina.length }} de {{ trabajadoresFiltrados.length }} trabajadores</span>
            <div v-if="paginas > 1" class="pl-pag-btns">
              <button v-for="p in paginas" :key="p" type="button" :class="{ activo: pagina === p }" @click="pagina = p">{{ p }}</button>
            </div>
          </footer>
        </section>
      </template>
    </template>

    <!-- ── Asistencia y tardanzas ─────────────────────────────────────── -->
    <section v-if="tab === 'asistencia'" class="ds-panel">
      <header class="ds-panel-head">
        <div>
          <h2 class="ds-panel-title">Asistencia {{ nombreMes }}</h2>
          <p class="ds-panel-sub">Tolerancia hasta el minuto 10:59. Del 11 al 30 se computa 30 min; desde el 31, 1 hora. Justifica los días con permiso, comisión o descanso médico.</p>
        </div>
        <div class="ds-panel-actions">
          <label class="pl-check"><input v-model="soloTardanzas" type="checkbox" /> Solo tardanzas e incidencias</label>
          <input v-model.trim="filtro" type="search" class="ds-input" placeholder="Buscar" aria-label="Buscar" />
        </div>
      </header>
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--densa">
          <thead>
            <tr><th>Fecha</th><th>Trabajador</th><th class="tc">Ingreso</th><th class="tc">Entrada</th><th class="tc">Salida</th><th class="tc">Tardanza</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-if="cargando"><td colspan="7" class="ds-empty">Cargando…</td></tr>
            <tr v-else-if="!asistenciaFiltrada.length"><td colspan="7" class="ds-empty">Sin marcaciones en el periodo. Importa el Excel del huellero.</td></tr>
            <tr v-for="a in asistenciaFiltrada" :key="a.asistencia_id">
              <td class="mono">{{ diaCorto(a.fecha) }}</td>
              <td>
                <div class="cell-main">{{ a.nombre }} <span v-if="!a.en_ficha" class="ds-pill warn">sin ficha</span></div>
                <div class="cell-sub mono">{{ a.codigo }}{{ a.area ? ' · ' + a.area : '' }}</div>
              </td>
              <td class="tc mono">{{ a.hora_ingreso }}</td>
              <td class="tc mono">{{ a.entrada }}</td>
              <td class="tc mono">{{ a.salida || '' }}<span v-if="!a.salida" class="ds-pill warn">sin salida</span></td>
              <td class="tc">
                <span v-if="a.justificado" class="ds-pill ok" :title="a.justificacion">Justificado</span>
                <span v-else-if="a.minutos_tardanza" class="ds-pill bad">{{ a.minutos_tardanza }} min</span>
                <span v-else class="cell-sub">—</span>
              </td>
              <td class="tr">
                <button v-if="!asis?.cerrado && (a.minutos_tardanza || a.justificado)" class="btn-exec btn-exec-outline btn-sm" type="button" @click="justificar(a)">
                  {{ a.justificado ? 'Quitar' : 'Justificar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── Importar huellero ──────────────────────────────────────────── -->
    <template v-if="tab === 'huellero'">
      <section class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">Importar marcaciones del huellero</h2>
            <p class="ds-panel-sub">Sube el Excel tal como lo exporta el huellero (.xlsx o .csv). Se toma la primera marca del día como entrada y la última como salida. Reimportar el mismo día lo reemplaza, sin duplicar.</p>
          </div>
        </header>
        <div class="ds-panel-body">
          <label class="dropzone" :class="{ 'dropzone-has': !!archivoHuellero }">
            <input type="file" accept=".xlsx,.csv" class="dropzone-input" aria-label="Elegir archivo del huellero" @change="e => { archivoHuellero = e.target.files?.[0] || null; previaHuellero = null }" />
            <i class="fa-solid fa-fingerprint dropzone-icon" aria-hidden="true"></i>
            <span class="dropzone-text">{{ archivoHuellero ? archivoHuellero.name : 'Haz clic para elegir el archivo del huellero' }}</span>
          </label>
          <div class="card-actions">
            <button class="btn-exec btn-exec-primary" type="button" :disabled="!archivoHuellero || subiendo" @click="previsualizarHuellero">
              {{ subiendo ? 'Leyendo…' : 'Vista previa' }}
            </button>
          </div>

          <div v-if="previaHuellero" class="pl-previa">
            <div class="summary-chips">
              <span class="ds-pill">{{ previaHuellero.desde }} → {{ previaHuellero.hasta }}</span>
              <span class="ds-pill">{{ previaHuellero.marcaciones }} marcaciones</span>
              <span class="ds-pill ok">{{ previaHuellero.dias }} días-trabajador</span>
              <span class="ds-pill">{{ previaHuellero.trabajadores }} trabajadores</span>
              <span v-if="previaHuellero.sin_salida" class="ds-pill warn">{{ previaHuellero.sin_salida }} sin salida</span>
              <span v-if="previaHuellero.total_errores" class="ds-pill bad">{{ previaHuellero.total_errores }} filas ilegibles</span>
            </div>
            <div v-if="previaHuellero.sin_ficha.length" class="ds-callout">
              <b>{{ previaHuellero.sin_ficha.length }} código(s) del huellero no están en el maestro de personal</b> (se guardan igual, pero no entran a la planilla hasta registrarlos):
              {{ previaHuellero.sin_ficha.map(s => `${s.codigo}${s.nombre ? ' ' + s.nombre : ''}`).join(' · ') }}
            </div>
            <div v-if="previaHuellero.errores?.length" class="err-list">
              {{ previaHuellero.errores.map(e => `Fila ${e.fila}: ${e.motivo}`).join(' · ') }}
            </div>
            <div v-if="previaHuellero.muestra?.length" class="ds-table-scroll">
              <table class="ds-table ds-table--densa">
                <thead><tr><th>Código</th><th>Nombre (huellero)</th><th>Fecha</th><th class="tc">Entrada</th><th class="tc">Salida</th><th class="tc">Marcas</th></tr></thead>
                <tbody>
                  <tr v-for="d in previaHuellero.muestra" :key="d.codigo + d.fecha">
                    <td class="mono">{{ d.codigo }}</td><td>{{ d.nombre || '—' }}</td><td class="mono">{{ diaCorto(d.fecha) }}</td>
                    <td class="tc mono">{{ d.entrada }}</td>
                    <td class="tc mono">{{ d.salida || '' }}<span v-if="!d.salida" class="ds-pill warn">sin salida</span></td>
                    <td class="tc">{{ d.marcas }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="cell-sub">Primeras {{ previaHuellero.muestra.length }} de {{ previaHuellero.dias }} filas (una por trabajador y día).</p>
            </div>
            <div v-if="!previaHuellero.confirmado" class="card-actions">
              <button class="btn-exec btn-exec-primary" type="button" :disabled="subiendo" @click="confirmarHuellero">
                <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Guardar {{ previaHuellero.dias }} registro(s)
              </button>
            </div>
            <div v-else class="ds-pill ok">Importado.</div>
          </div>
        </div>
      </section>

      <section class="ds-panel">
        <header class="ds-panel-head"><h2 class="ds-panel-title">Últimas importaciones</h2></header>
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--densa">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Archivo</th><th>Rango</th><th class="tr">Filas</th><th>Usuario</th></tr></thead>
            <tbody>
              <tr v-if="!importaciones.length"><td colspan="6" class="ds-empty">Aún no hay importaciones.</td></tr>
              <tr v-for="i in importaciones" :key="i.importacion_id">
                <td class="mono">{{ fechaHora(i.created_at) }}</td><td>{{ i.tipo }}</td><td>{{ i.archivo }}</td>
                <td class="mono">{{ i.desde ? `${i.desde} → ${i.hasta}` : '—' }}</td><td class="tr">{{ i.filas }}</td><td>{{ i.usuario || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ── Personal ───────────────────────────────────────────────────── -->
    <template v-if="tab === 'personal'">
      <section v-if="puedeVerSueldos" class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">Cargar sueldos vigentes desde {{ nombreMes }}</h2>
            <p class="ds-panel-sub">Se carga a inicio de mes. Los sueldos valen desde el mes elegido arriba hasta la próxima carga; los meses anteriores no cambian. El sueldo se guarda cifrado y solo lo ve Talento. El archivo no se almacena: se lee y se descarta. El horario se asigna por área (FICO y B2B 8:30; el resto 9:00) y se puede ajustar abajo.</p>
          </div>
          <div class="ds-panel-actions">
            <button class="btn-exec btn-exec-outline" type="button" @click="svc.descargarPlantilla()">
              <i class="fa-solid fa-download" aria-hidden="true"></i> Plantilla
            </button>
          </div>
        </header>
        <div class="ds-panel-body">
          <label class="dropzone" :class="{ 'dropzone-has': !!archivoPersonal }">
            <input type="file" accept=".xlsx,.csv" class="dropzone-input" aria-label="Elegir archivo de personal" @change="e => { archivoPersonal = e.target.files?.[0] || null; previaPersonal = null }" />
            <i class="fa-solid fa-file-excel dropzone-icon" aria-hidden="true"></i>
            <span class="dropzone-text">{{ archivoPersonal ? archivoPersonal.name : 'Columnas: Código huellero, DNI, Nombre, Área, Sueldo neto' }}</span>
          </label>
          <div class="card-actions">
            <button class="btn-exec btn-exec-primary" type="button" :disabled="!archivoPersonal || subiendo" @click="previsualizarPersonal">Vista previa</button>
            <button v-if="previaPersonal && !previaPersonal.confirmado" class="btn-exec btn-exec-primary" type="button" :disabled="subiendo || !previaPersonal.total" @click="confirmarPersonal">
              Guardar {{ previaPersonal.total }} trabajador(es)
            </button>
            <span v-if="previaPersonal?.confirmado" class="ds-pill ok">Guardado: {{ previaPersonal.total }} trabajador(es).</span>
          </div>

          <div v-if="previaPersonal && !previaPersonal.confirmado" class="pl-previa">
            <div class="summary-chips">
              <span class="ds-pill ok">{{ previaPersonal.total }} fila(s) válidas</span>
              <span v-if="previaPersonal.errores.length" class="ds-pill bad">{{ previaPersonal.errores.length }} con error</span>
              <span class="cell-sub">Vista previa: todavía no se guardó nada. Vigentes desde {{ nombreMes }}.</span>
            </div>
            <div v-if="previaPersonal.errores.length" class="err-list">
              {{ previaPersonal.errores.map(e => `Fila ${e.fila}: ${e.motivo}`).join(' · ') }}
            </div>
            <div class="ds-table-scroll">
              <table class="ds-table ds-table--densa">
                <thead><tr><th>Código</th><th>Nombre</th><th>DNI</th><th>Área</th><th class="tc">Horario</th><th class="tr">Sueldo neto</th><th class="tr">Quincena 40 %</th><th class="tr">Fin de mes 60 %</th></tr></thead>
                <tbody>
                  <tr v-for="p in previaPersonal.personal" :key="p.codigo">
                    <td class="mono">{{ p.codigo }}</td><td>{{ p.nombre }}</td><td class="mono">{{ p.dni || '—' }}</td><td>{{ p.area || '—' }}</td>
                    <td class="tc mono">{{ p.hora_ingreso }} – {{ p.hora_salida }}</td>
                    <td class="tr mono">{{ soles(p.sueldo_neto) }}</td>
                    <td class="tr mono">{{ soles(p.sueldo_neto * 0.4) }}</td>
                    <td class="tr mono">{{ soles(p.sueldo_neto * 0.6) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="ds-panel">
        <header class="ds-panel-head">
          <h2 class="ds-panel-title">Personal ({{ personal.length }})</h2>
          <input v-model.trim="filtro" type="search" class="ds-input" placeholder="Buscar" aria-label="Buscar" />
        </header>
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--densa">
            <thead><tr><th>Código</th><th>Nombre</th><th>DNI</th><th>Área</th><th class="tc">Ingreso</th><th class="tc">Salida</th><th class="tr">Sueldo neto</th><th class="tc">Activo</th></tr></thead>
            <tbody>
              <tr v-if="!personalFiltrado.length"><td colspan="8" class="ds-empty">Sin personal registrado.</td></tr>
              <tr v-for="p in personalFiltrado" :key="p.personal_id" :class="{ 'pl-inactivo': !p.activo }">
                <td class="mono">{{ p.codigo }}</td><td>{{ p.nombre }}</td><td class="mono">{{ p.dni || '—' }}</td><td>{{ p.area || '—' }}</td>
                <td class="tc"><input class="ds-input pl-hora" type="time" :value="p.hora_ingreso" @change="e => editar(p, { hora_ingreso: e.target.value })" /></td>
                <td class="tc"><input class="ds-input pl-hora" type="time" :value="p.hora_salida" @change="e => editar(p, { hora_salida: e.target.value })" /></td>
                <td class="tr mono">{{ puedeVerSueldos ? soles(p.sueldo_neto) : (p.tiene_sueldo ? '••••••' : 'sin sueldo') }}</td>
                <td class="tc"><input type="checkbox" :checked="p.activo" :aria-label="`Activo ${p.nombre}`" @change="e => editar(p, { activo: e.target.checked })" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import Swal from 'sweetalert2'
import { ServiceKeys } from '@/services'

const svc = inject(ServiceKeys.Planilla)
const toast = useToast()

const roles = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').roles || [] } catch { return [] } })()
// Solo una pista para la UI: quien decide es el backend (responde 403 sin TALENTO).
const puedeVerSueldos = roles.includes('TALENTO')

const TABS = [
  { key: 'planilla', label: 'Planilla del mes', icon: 'fa-solid fa-table-list' },
  { key: 'asistencia', label: 'Asistencia y tardanzas', icon: 'fa-regular fa-clock' },
  { key: 'huellero', label: 'Importar huellero', icon: 'fa-solid fa-download' },
  { key: 'personal', label: 'Personal', icon: 'fa-solid fa-user-group' }
]
const tabsVisibles = TABS
const tab = ref(puedeVerSueldos ? 'planilla' : 'asistencia')

const hoy = new Date()
const periodo = ref(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`)
const anioMes = computed(() => { const [a, m] = periodo.value.split('-').map(Number); return { anio: a, mes: m } })
const nombreMes = computed(() => new Date(anioMes.value.anio, anioMes.value.mes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }))

const soloMes = computed(() => new Date(anioMes.value.anio, anioMes.value.mes - 1, 1).toLocaleDateString('es-PE', { month: 'long' }))
const mesCapital = computed(() => { const m = nombreMes.value.replace(' de ', ' '); return m.charAt(0).toUpperCase() + m.slice(1) })
function moverMes (delta) {
  const d = new Date(anioMes.value.anio, anioMes.value.mes - 1 + delta, 1)
  periodo.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const cargando = ref(false)
const filtro = ref('')
const calc = ref(null)
const asis = ref(null)
const personal = ref([])
const importaciones = ref([])
const abierto = ref(null)
const soloTardanzas = ref(true)
const exportando = ref(false)
const subiendo = ref(false)
const archivoHuellero = ref(null)
const previaHuellero = ref(null)
const archivoPersonal = ref(null)
const previaPersonal = ref(null)

const fmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const soles = n => (n === null || n === undefined ? '—' : fmt.format(n))
const fechaHora = d => (d ? new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const diaCorto = f => new Date(`${f}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit' })
const errMsg = (e, def) => e?.response?.data?.message || e?.response?.data?.error || def

const coincide = (...campos) => {
  const q = filtro.value.toLowerCase()
  return !q || campos.some(c => String(c || '').toLowerCase().includes(q))
}
const trabajadoresFiltrados = computed(() => (calc.value?.trabajadores || []).filter(t => coincide(t.nombre, t.codigo, t.area)))
const POR_PAGINA = 8
const pagina = ref(1)
const paginas = computed(() => Math.max(1, Math.ceil(trabajadoresFiltrados.value.length / POR_PAGINA)))
const trabajadoresPagina = computed(() => trabajadoresFiltrados.value.slice((pagina.value - 1) * POR_PAGINA, pagina.value * POR_PAGINA))
watch(filtro, () => { pagina.value = 1 })

const totalNeto = computed(() => (calc.value?.trabajadores || []).reduce((s, t) => s + (Number(t.sueldo_neto) || 0), 0))
const totalFinBruto = computed(() => (calc.value?.trabajadores || []).reduce((s, t) => s + (Number(t.pago_fin_mes_bruto) || 0), 0))
const maxMinutos = computed(() => Math.max(1, ...(calc.value?.trabajadores || []).map(t => t.minutos_tardanza || 0)))
const barraTardanza = t => `${Math.round((t.minutos_tardanza || 0) / maxMinutos.value * 100)}%`
const fmtNum = n => new Intl.NumberFormat('es-PE').format(n || 0)
const iniciales = n => {
  const [ap, nom] = String(n || '').split(',').map(x => x.trim())
  return ((nom ? nom[0] : '') + (ap ? ap[0] : '')).toUpperCase() || '?'
}

// Rejilla L–V del mes: una celda por día hábil, con huecos antes del primer día hábil.
function calendario (t) {
  const porFecha = Object.fromEntries((t.detalle || []).map(d => [d.fecha, d]))
  const { anio, mes } = anioMes.value
  const dias = new Date(anio, mes, 0).getDate()
  const celdas = []
  for (let dia = 1; dia <= dias; dia++) {
    const dow = new Date(anio, mes - 1, dia).getDay()
    if (dow === 0 || dow === 6) continue
    if (!celdas.length) for (let k = 1; k < dow; k++) celdas.push(null)
    const iso = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const dm = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
    const m = porFecha[iso]
    if (!m) { celdas.push({ dm, estado: 'vacio' }); continue }
    const entrada = m.entrada?.slice(0, 5)
    let estado = 'ok'
    if (m.justificado) estado = 'just'
    else if (m.minutos_tardanza) estado = 'bad'
    else if (entrada && t.hora_ingreso && entrada > String(t.hora_ingreso).slice(0, 5)) estado = 'warn'
    celdas.push({ dm, entrada, estado, minutos: m.minutos_tardanza, descuento: Number(m.descuento) || 0, justificacion: m.justificacion })
  }
  return celdas
}
const asistenciaFiltrada = computed(() => (asis.value?.filas || [])
  .filter(a => !soloTardanzas.value || a.minutos_tardanza || a.justificado || !a.salida || !a.en_ficha)
  .filter(a => coincide(a.nombre, a.codigo, a.area)))
const personalFiltrado = computed(() => personal.value.filter(p => coincide(p.nombre, p.codigo, p.area, p.dni)))

async function cargar () {
  cargando.value = true
  const { anio, mes } = anioMes.value
  try {
    if (tab.value === 'planilla' && puedeVerSueldos) calc.value = await svc.calculo(anio, mes)
    if (tab.value === 'asistencia') asis.value = await svc.asistencia(anio, mes)
    if (tab.value === 'huellero') importaciones.value = await svc.importaciones()
    if (tab.value === 'personal') personal.value = (await svc.personal()).personal
  } catch (e) {
    toast.error(errMsg(e, 'No se pudo cargar la información.'))
  } finally {
    cargando.value = false
  }
}

watch([tab, periodo], () => { filtro.value = ''; pagina.value = 1; abierto.value = null; cargar() })
onMounted(cargar)

async function exportar () {
  exportando.value = true
  try { await svc.exportar(anioMes.value.anio, anioMes.value.mes) } catch (e) { toast.error('No se pudo exportar.') } finally { exportando.value = false }
}

async function cerrar () {
  const ok = await Swal.fire({ title: `¿Cerrar la planilla de ${nombreMes.value}?`, text: 'No se podrán reimportar marcaciones ni justificar días de este mes hasta reabrirla.', icon: 'question', showCancelButton: true, confirmButtonText: 'Cerrar periodo', cancelButtonText: 'Cancelar' })
  if (!ok.isConfirmed) return
  try { await svc.cerrar(anioMes.value.anio, anioMes.value.mes); toast.success('Periodo cerrado.'); cargar() } catch (e) { toast.error(errMsg(e, 'No se pudo cerrar.')) }
}

async function reabrir () {
  const ok = await Swal.fire({ title: '¿Reabrir el periodo?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Reabrir', cancelButtonText: 'Cancelar' })
  if (!ok.isConfirmed) return
  try { await svc.reabrir(anioMes.value.anio, anioMes.value.mes); toast.success('Periodo reabierto.'); cargar() } catch (e) { toast.error(errMsg(e, 'No se pudo reabrir.')) }
}

async function justificar (a) {
  let motivo = null
  if (!a.justificado) {
    const r = await Swal.fire({
      title: `Justificar ${a.nombre}`,
      text: `${diaCorto(a.fecha)} · entrada ${a.entrada}`,
      input: 'select',
      inputOptions: { Permiso: 'Permiso', Comisión: 'Comisión de servicio', 'Descanso médico': 'Descanso médico', 'Falla del huellero': 'Falla del huellero', Otro: 'Otro' },
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      confirmButtonText: 'Justificar',
      cancelButtonText: 'Cancelar',
      inputValidator: v => (!v ? 'Elige un motivo' : null)
    })
    if (!r.isConfirmed) return
    motivo = r.value
  }
  try {
    await svc.justificar(a.asistencia_id, !a.justificado, motivo)
    toast.success(a.justificado ? 'Justificación quitada.' : 'Día justificado.')
    cargar()
  } catch (e) { toast.error(errMsg(e, 'No se pudo justificar.')) }
}

async function previsualizarHuellero () {
  subiendo.value = true
  try { previaHuellero.value = await svc.importarHuellero(archivoHuellero.value, false) } catch (e) { toast.error(errMsg(e, 'No se pudo leer el archivo.')) } finally { subiendo.value = false }
}

async function confirmarHuellero () {
  subiendo.value = true
  try {
    previaHuellero.value = await svc.importarHuellero(archivoHuellero.value, true)
    toast.success(`Se guardaron ${previaHuellero.value.dias} registro(s).`)
    importaciones.value = await svc.importaciones()
  } catch (e) { toast.error(errMsg(e, 'No se pudo importar.')) } finally { subiendo.value = false }
}

async function previsualizarPersonal () {
  subiendo.value = true
  try { previaPersonal.value = await svc.importarPersonal(archivoPersonal.value, anioMes.value, false) } catch (e) { toast.error(errMsg(e, 'No se pudo leer el archivo.')) } finally { subiendo.value = false }
}

async function confirmarPersonal () {
  subiendo.value = true
  try {
    previaPersonal.value = await svc.importarPersonal(archivoPersonal.value, anioMes.value, true)
    toast.success(`Se guardaron ${previaPersonal.value.total} trabajador(es).`)
    archivoPersonal.value = null
    cargar()
  } catch (e) { toast.error(errMsg(e, 'No se pudo guardar.')) } finally { subiendo.value = false }
}

async function editar (p, cambios) {
  try { await svc.actualizarPersonal(p.personal_id, cambios); Object.assign(p, cambios); toast.success('Actualizado.') } catch (e) { toast.error(errMsg(e, 'No se pudo actualizar.')) }
}
</script>

<style scoped>
.pl-mes { width: 170px; }
.ds-panel { margin-bottom: 16px; }
.ds-panel-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.tr { text-align: right; }
.tc { text-align: center; }
.mono { font-variant-numeric: tabular-nums; }
.cell-main { font-weight: 600; }
.cell-sub { font-size: 12px; color: var(--ds-ink-2); }
.pl-check { display: flex; gap: 6px; align-items: center; font-size: 13px; white-space: nowrap; }
.pl-hora { width: 110px; padding: 2px 6px; }
.pl-inactivo { opacity: 0.5; }
.pl-previa { margin-top: 14px; display: grid; gap: 10px; }
.summary-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.card-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.err-list { color: var(--ds-bad); font-size: 12.5px; }
.btn-sm { padding: 3px 10px; font-size: 12px; }
.dropzone { display: flex; align-items: center; gap: 12px; padding: 20px; border: 1.5px dashed var(--ds-line, #ccc); border-radius: 10px; cursor: pointer; }
.dropzone-has { border-style: solid; }
.dropzone-input { display: none; }
.dropzone-icon { font-size: 24px; color: var(--ds-accent); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
/* ── Rediseño planilla ── */
.pl-page { --pl-navy: #172a5c; --pl-green: #1f8a4c; }
.pl-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.pl-crumb { display: flex; gap: 8px; align-items: center; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ds-ink-2); }
.pl-crumb i { font-size: 8px; }
.pl-crumb b { color: var(--ds-ink); font-weight: 600; }
.pl-title { font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: var(--pl-navy); margin: 6px 0 2px; text-transform: none; }
.pl-sub { margin: 0; font-size: 13px; color: var(--ds-ink-2); }
.pl-head-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.pl-estado { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; }
.pl-estado.abierto { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.pl-estado.cerrado { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.pl-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pl-mesnav { display: flex; align-items: stretch; border: 1px solid var(--ds-border); border-radius: 10px; background: var(--ds-surface); overflow: hidden; }
.pl-mesnav button { border: 0; background: none; padding: 0 14px; color: var(--ds-ink); cursor: pointer; }
.pl-mesnav button:hover { background: var(--ds-soft-neutral); }
.pl-mesnav-label { position: relative; display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-weight: 600; font-size: 14px; border-left: 1px solid var(--ds-border); border-right: 1px solid var(--ds-border); cursor: pointer; margin: 0; }
.pl-mes-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.pl-mes-input::-webkit-calendar-picker-indicator { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; }

.pl-tabs { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 5px; background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 12px; margin-bottom: 22px; }
.pl-tabs button { display: inline-flex; align-items: center; gap: 8px; border: 0; background: none; padding: 9px 16px; border-radius: 8px; font-size: 14px; color: var(--ds-ink); cursor: pointer; }
.pl-tabs button:hover { background: var(--ds-soft-neutral); }
.pl-tabs button.activo { background: var(--pl-navy); color: #fff; font-weight: 700; }

.pl-card { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 14px; margin-bottom: 22px; }
.pl-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
.pl-kpi { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; min-height: 150px; }
.pl-kpi-top { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--ds-ink-2); }
.pl-kpi-ico { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: var(--ds-soft-neutral); color: var(--ds-ink); }
.pl-kpi-ico.bad { background: var(--ds-soft-bad); color: var(--ds-bad); }
.pl-kpi-ico.ok { background: var(--pl-green); color: #fff; }
.pl-chip { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--ds-soft-neutral); }
.pl-kpi-val { font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: var(--pl-navy); font-variant-numeric: tabular-nums; }
.pl-kpi-val.bad { color: var(--ds-bad); }
.pl-kpi-foot { font-size: 12.5px; color: var(--ds-ink-2); margin-top: auto; }
.pl-kpi-foot b { color: var(--ds-ink); }
.pl-progress { height: 5px; border-radius: 99px; background: var(--ds-soft-neutral); margin-top: auto; overflow: hidden; }
.pl-progress span { display: block; height: 100%; background: var(--pl-navy); border-radius: 99px; }
.pl-kpi.destacado { background: var(--pl-navy); border-color: var(--pl-navy); color: #fff; }
.pl-kpi.destacado .pl-kpi-top, .pl-kpi.destacado .pl-kpi-foot { color: rgba(255,255,255,.8); }
.pl-kpi.destacado .pl-kpi-top span:first-child { font-weight: 600; color: #fff; }
.pl-kpi.destacado .pl-kpi-val { color: #fff; }

.pl-dist { padding: 18px 24px; }
.pl-dist-head { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; }
.pl-dist-head span { color: var(--ds-ink-2); font-size: 13px; }
.pl-dist-head span b { color: var(--ds-ink); }
.pl-dist-bar { display: flex; gap: 2px; height: 12px; border-radius: 99px; overflow: hidden; }
.pl-dist-bar span { flex-basis: 0; min-width: 4px; }
.q { background: var(--pl-navy); } .f { background: var(--pl-green); } .d { background: var(--ds-bad); }
.pl-dist-leg { display: flex; flex-wrap: wrap; gap: 24px; font-size: 13px; color: var(--ds-ink-2); margin-top: 12px; }
.pl-dist-leg i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 8px; }
.pl-dist-leg b { color: var(--ds-ink); margin-left: 6px; }

.pl-tabla-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 20px 24px 16px; }
.pl-tabla-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: var(--pl-navy); margin: 0; text-transform: none; }
.pl-tabla-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--ds-ink-2); }
.pl-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.pl-badge.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.pl-badge.ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.pl-tabla-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.pl-search { display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 1px solid var(--ds-border); border-radius: 10px; background: var(--ds-surface-2, var(--ds-surface)); color: var(--ds-ink-2); min-width: 260px; }
.pl-search input { border: 0; background: none; outline: none; padding: 10px 0; flex: 1; font-size: 14px; color: var(--ds-ink); }
.pl-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--ds-border); background: var(--ds-surface); color: var(--ds-ink); font-weight: 600; font-size: 14px; cursor: pointer; }
.pl-btn:disabled { opacity: .5; cursor: default; }
.pl-btn .fa-file-excel { color: var(--pl-green); }
.pl-btn.primario { background: var(--pl-navy); border-color: var(--pl-navy); color: #fff; }

.pl-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.pl-table th { text-align: left; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); padding: 14px 12px; background: var(--ds-soft-neutral); border-top: 1px solid var(--ds-border); border-bottom: 1px solid var(--ds-border); white-space: nowrap; }
.pl-table td { padding: 14px 12px; border-bottom: 1px solid var(--ds-border); vertical-align: middle; }
.pl-table th:last-child, .pl-table td:last-child { padding-right: 24px; }
.pl-col-caret { width: 44px; padding-left: 12px !important; }
.pl-fila { cursor: pointer; }
.pl-fila:hover { background: var(--ds-soft-neutral); }
.pl-caret { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; font-size: 11px; color: var(--ds-ink-2); }
.pl-fila.abierta .pl-caret { background: var(--ds-soft-neutral); color: var(--ds-ink); }
.pl-who { display: flex; align-items: center; gap: 12px; }
.pl-avatar { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 12.5px; font-weight: 700; background: var(--ds-soft-neutral); color: var(--pl-navy); }
.pl-area { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; background: var(--ds-soft-neutral); white-space: nowrap; }
.pl-tard { font-size: 13px; color: var(--ds-ink-2); white-space: nowrap; }
.pl-tard b { color: var(--ds-bad); font-weight: 600; }
.pl-tard-bar { height: 4px; width: 110px; border-radius: 99px; background: var(--ds-soft-bad); margin-top: 6px; overflow: hidden; }
.pl-tard-bar span { display: block; height: 100%; background: var(--ds-bad); border-radius: 99px; }
.pl-desc { color: var(--ds-bad); }
.pl-pagar { display: inline-block; padding: 5px 12px; border-radius: 6px; background: var(--ds-soft-ok); color: var(--pl-green); font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pl-table tfoot td { background: var(--ds-soft-neutral); padding: 18px 12px; border-bottom: 0; }
.bad { color: var(--ds-bad); } .okc { color: var(--pl-green); }

.pl-detalle > td { background: var(--ds-soft-neutral); padding: 20px 24px 24px 68px; }
.pl-mini { display: grid; grid-template-columns: repeat(4, minmax(0, 180px)); gap: 12px; margin-bottom: 22px; }
.pl-mini div { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.pl-mini span { font-size: 12px; color: var(--ds-ink-2); }
.pl-mini b { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pl-cal-head { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 14px; margin-bottom: 10px; }
.pl-leyenda { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--ds-ink-2); }
.pl-leyenda i, .pl-dia-top i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }
i.ok, .pl-dia.ok .pl-dia-top i { background: var(--pl-green); }
i.warn, .pl-dia.warn .pl-dia-top i { background: var(--ds-warn); }
i.bad, .pl-dia.bad .pl-dia-top i { background: var(--ds-bad); }
i.just, .pl-dia.just .pl-dia-top i { background: var(--ds-accent); }
.pl-cal { display: grid; grid-template-columns: repeat(5, minmax(0, 190px)); gap: 8px; }
.pl-cal-dow { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--ds-ink-2); padding: 0 4px; }
.pl-dia { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 8px; padding: 8px 10px; min-height: 56px; position: relative; }
.pl-dia-top { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }
.pl-dia-top i { margin: 0; }
.pl-dia-hora { font-size: 15px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
.pl-dia-desc { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: var(--ds-bad); }
.pl-dia.warn { background: var(--ds-soft-warn); }
.pl-dia.bad { background: var(--ds-soft-bad); border-color: color-mix(in srgb, var(--ds-bad) 30%, transparent); }
.pl-dia.bad .pl-dia-hora { color: var(--ds-bad); }
.pl-dia.just { background: var(--ds-soft-info); }
.pl-dia.just .pl-dia-desc { color: var(--ds-ink-2); }
.pl-dia.vacio { opacity: .45; }

.pl-pag { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; font-size: 13px; color: var(--ds-ink-2); }
.pl-pag-btns { display: flex; gap: 6px; }
.pl-pag-btns button { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--ds-border); background: var(--ds-surface); font-weight: 600; cursor: pointer; color: var(--ds-ink); }
.pl-pag-btns button.activo { background: var(--pl-navy); border-color: var(--pl-navy); color: #fff; }

@media (max-width: 1100px) { .pl-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .pl-kpis, .pl-mini { grid-template-columns: 1fr; }
  .pl-search { min-width: 0; flex: 1; }
  .pl-detalle > td { padding: 16px; }
  .pl-cal { grid-template-columns: repeat(5, minmax(56px, 1fr)); overflow-x: auto; }
}
</style>
