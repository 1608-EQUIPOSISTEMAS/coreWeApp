<template>
  <div class="ds-page pl-page">
    <header class="pl-head">
      <div>
        <nav class="pl-crumb" aria-label="Ruta"><span>Recursos humanos</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><template v-if="tab !== 'planilla'"><span>Planilla</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><b>{{ { huellero: 'Importar huellero', personal: 'Personal', asistencia: 'Asistencia' }[tab] }}</b></template><b v-else>Planilla</b></nav>
        <template v-if="tab === 'personal'">
          <h1 class="pl-title">Personal</h1>
          <p class="pl-sub">Sueldos vigentes, áreas y horarios de cada trabajador</p>
        </template>
        <template v-else-if="tab === 'huellero'">
          <h1 class="pl-title">Importar huellero</h1>
          <p class="pl-sub">Sube las marcaciones del mes para calcular asistencia y tardanzas</p>
        </template>
        <template v-else-if="tab === 'asistencia'">
          <h1 class="pl-title">Asistencia y tardanzas</h1>
          <p class="pl-sub">Marcaciones del huellero, tardanzas computadas e incidencias por justificar</p>
        </template>
        <template v-else>
          <h1 class="pl-title">Planilla de {{ soloMes }}</h1>
          <p class="pl-sub">Huellero, tardanzas y pago del mes · 1.ª quincena 40 % · fin de mes 60 % menos tardanzas</p>
        </template>
      </div>
      <div class="pl-head-actions">
        <span v-if="tab !== 'planilla' && asis" class="pl-estado" :class="asis.cerrado ? 'cerrado' : 'abierto'"><i class="pl-dot" aria-hidden="true"></i>{{ asis.cerrado ? 'Periodo cerrado' : 'Periodo abierto' }}</span>
        <span v-else-if="tab === 'planilla' && calc" class="pl-estado" :class="calc.cerrado ? 'cerrado' : 'abierto'"><i class="pl-dot" aria-hidden="true"></i>{{ calc.cerrado ? 'Periodo cerrado' : 'Periodo abierto' }}</span>
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
    <template v-if="tab === 'asistencia'">
      <section class="pl-kpis">
        <div class="pl-kpi">
          <div class="pl-kpi-top"><span>Minutos de tardanza del mes</span><span class="pl-kpi-ico bad"><i class="fa-solid fa-stopwatch" aria-hidden="true"></i></span></div>
          <div class="pl-kpi-val bad">{{ fmtNum(asisResumen.minutos) }} min</div>
          <div class="pl-kpi-foot">En <b class="bad">{{ asisResumen.tardanzas }}</b> {{ asisResumen.tardanzas === 1 ? 'tardanza' : 'tardanzas' }} sin justificar</div>
        </div>
        <div class="pl-kpi">
          <div class="pl-kpi-top"><span>Por justificar en la lista</span><span class="pl-kpi-ico"><i class="fa-regular fa-file-lines" aria-hidden="true"></i></span></div>
          <div class="pl-kpi-val">{{ asisResumen.tardanzas }}</div>
          <div class="pl-progress"><span :style="{ width: asisResumen.pctJust + '%' }"></span></div>
          <div class="pl-kpi-foot"><b class="okc">{{ asisResumen.justificadas }}</b> justificadas de {{ asisResumen.tardanzas + asisResumen.justificadas }} registros</div>
        </div>
        <div class="pl-kpi">
          <div class="pl-kpi-top"><span>Incidencias</span><span class="pl-kpi-ico warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span></div>
          <div class="pl-kpi-val">{{ asisResumen.sinSalida + asisResumen.sinFicha }}</div>
          <div class="pl-kpi-foot">
            <template v-if="asisResumen.sinSalida">{{ asisResumen.sinSalida }} marcación(es) sin salida</template>
            <template v-if="asisResumen.sinSalida && asisResumen.sinFicha"> · </template>
            <template v-if="asisResumen.sinFicha">{{ asisResumen.sinFicha }} sin ficha</template>
            <template v-if="!asisResumen.sinSalida && !asisResumen.sinFicha">Sin incidencias</template>
            <template v-else> · revisar con el área</template>
          </div>
        </div>
        <div class="pl-kpi destacado pl-regla">
          <div class="pl-kpi-top"><span>Regla de cómputo</span><i class="fa-solid fa-circle-info" aria-hidden="true"></i></div>
          <div class="pl-regla-bar"><span class="t1"></span><span class="t2"></span><span class="t3"></span></div>
          <div class="pl-regla-cols">
            <div><span>0 – 10:59</span><b>Tolerancia</b></div>
            <div><span>11 – 30</span><b>30 min</b></div>
            <div><span>31 a más</span><b>1 hora</b></div>
          </div>
          <div class="pl-kpi-foot">Justifica días con permiso, comisión o descanso médico.</div>
        </div>
      </section>

      <section class="pl-card pl-tabla">
        <header class="pl-tabla-head">
          <div>
            <h2 class="pl-tabla-title">Asistencia {{ nombreMes }}</h2>
            <p class="pl-tabla-sub">Agrupado por trabajador · ordenado por fecha</p>
          </div>
          <div class="pl-tabla-actions">
            <div class="pl-seg" role="tablist" aria-label="Filtro de asistencia">
              <button v-for="f in FILTROS_ASIS" :key="f.key" type="button" :class="{ activo: filtroAsis === f.key }" @click="filtroAsis = f.key">
                {{ f.label }} <span class="pl-seg-n">{{ asisConteo[f.key] }}</span>
              </button>
            </div>
            <div class="pl-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input v-model.trim="filtro" type="search" placeholder="Buscar trabajador o área" aria-label="Buscar" /></div>
          </div>
        </header>
        <div class="ds-table-scroll">
          <table class="pl-table pl-asis">
            <thead>
              <tr><th>Fecha</th><th>Ingreso → Entrada</th><th>Retraso</th><th>Salida</th><th>Jornada</th><th>Tardanza</th><th class="tr">Acción</th></tr>
            </thead>
            <tbody>
              <tr v-if="cargando"><td colspan="7" class="ds-empty">Cargando…</td></tr>
              <tr v-else-if="!asisGrupos.length"><td colspan="7" class="ds-empty">Sin marcaciones en el periodo. Importa el Excel del huellero.</td></tr>
              <template v-for="g in asisGrupos" :key="g.codigo">
                <tr class="pl-grupo">
                  <td colspan="6">
                    <div class="pl-who">
                      <span class="pl-avatar navy">{{ iniciales(g.nombre) }}</span>
                      <div>
                        <div class="cell-main">{{ g.nombre }}</div>
                        <div class="cell-sub mono">{{ g.codigo }} · ingreso {{ g.hora_ingreso }}</div>
                      </div>
                      <span v-if="g.area" class="pl-area">{{ g.area }}</span>
                      <span v-if="!g.en_ficha" class="pl-tag warn">sin ficha</span>
                    </div>
                  </td>
                  <td class="tr">
                    <div class="pl-tags">
                      <span v-if="g.tardanzas" class="pl-tag bad">{{ g.tardanzas }} {{ g.tardanzas === 1 ? 'tardanza' : 'tardanzas' }} · {{ g.minutos }} min</span>
                      <span v-if="g.sinSalida" class="pl-tag warn">{{ g.sinSalida }} sin salida</span>
                      <span v-if="g.justificadas" class="pl-tag ok">{{ g.justificadas }} {{ g.justificadas === 1 ? 'justificada' : 'justificadas' }}</span>
                    </div>
                  </td>
                </tr>
                <tr v-for="a in g.filas" :key="a.asistencia_id" :class="{ 'pl-incid': !a.salida }">
                  <td>
                    <div class="pl-fecha">
                      <span class="pl-fecha-box"><small>{{ dowCorto(a.fecha) }}</small><b>{{ a.fecha.slice(8, 10) }}</b></span>
                      <span class="cell-sub mono">{{ a.fecha.slice(8, 10) }}/{{ a.fecha.slice(5, 7) }}</span>
                    </div>
                  </td>
                  <td class="mono">
                    <span class="cell-sub">{{ hm(a.hora_ingreso) }}</span>
                    <i class="fa-solid fa-arrow-right pl-flecha" aria-hidden="true"></i>
                    <b :class="{ bad: retraso(a) > 0 && !a.justificado }">{{ a.entrada }}</b>
                  </td>
                  <td>
                    <div class="pl-retraso" :class="nivel(a)"><span></span><span></span><span></span></div>
                    <div class="cell-sub">{{ retraso(a) > 0 ? `+${retraso(a)} min tarde` : 'A tiempo' }}</div>
                  </td>
                  <td class="mono">
                    <template v-if="a.salida">{{ a.salida }}</template>
                    <span v-else class="pl-tag warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Sin salida</span>
                  </td>
                  <td class="mono">{{ jornada(a) }}</td>
                  <td>
                    <span v-if="a.justificado" class="pl-tag ok" :title="a.justificacion">Justificado</span>
                    <span v-else-if="a.minutos_tardanza" class="pl-tag bad">{{ a.minutos_tardanza >= 60 ? '1 hora' : a.minutos_tardanza + ' min' }}</span>
                    <span v-else class="pl-tag">—</span>
                  </td>
                  <td class="tr">
                    <button v-if="!asis?.cerrado && (a.minutos_tardanza || a.justificado)" class="pl-btn sm" type="button" @click="justificar(a)">
                      <i class="fa-regular" :class="a.justificado ? 'fa-circle-xmark' : 'fa-file-lines'" aria-hidden="true"></i> {{ a.justificado ? 'Quitar' : 'Justificar' }}
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <footer v-if="asistenciaFiltrada.length" class="pl-pag">
          <span>Mostrando {{ Math.min(limiteAsis, asistenciaFiltrada.length) }} de {{ asistenciaFiltrada.length }} registros</span>
          <button v-if="limiteAsis < asistenciaFiltrada.length" class="pl-btn" type="button" @click="limiteAsis += 30">Cargar más</button>
        </footer>
      </section>
    </template>

    <!-- ── Importar huellero ──────────────────────────────────────────── -->
    <template v-if="tab === 'huellero'">
      <div class="pl-imp-grid">
        <section class="pl-card pl-imp">
          <header class="pl-imp-head">
            <h2 class="pl-tabla-title">Importar marcaciones del huellero</h2>
            <p class="pl-tabla-sub">Sube el Excel tal como lo exporta el huellero.</p>
          </header>
          <div class="pl-imp-body">
            <ol class="pl-steps">
              <li v-for="(s, i) in PASOS_HUELLERO" :key="s" :class="{ hecho: pasoHuellero >= i + 1 }">
                <span class="pl-steps-bar"></span>
                <span class="pl-steps-n">{{ i + 1 }}</span> {{ s }}
              </li>
            </ol>

            <label class="pl-drop" :class="{ lleno: !!archivoHuellero, sobre: arrastrando }"
              @dragover.prevent="arrastrando = true" @dragleave="arrastrando = false" @drop.prevent="soltarHuellero">
              <input type="file" accept=".xlsx,.csv" class="dropzone-input" aria-label="Elegir archivo del huellero" @change="e => elegirHuellero(e.target.files?.[0])" />
              <span class="pl-drop-ico"><i class="fa-solid fa-fingerprint" aria-hidden="true"></i></span>
              <b>{{ archivoHuellero ? archivoHuellero.name : 'Arrastra el archivo aquí o haz clic para elegirlo' }}</b>
              <span class="cell-sub">{{ archivoHuellero ? `${(archivoHuellero.size / 1024).toFixed(0)} KB · haz clic para cambiarlo` : 'Exportación del huellero en .xlsx o .csv' }}</span>
              <span v-if="!archivoHuellero" class="pl-drop-ext"><span class="x">.xlsx</span><span>.csv</span></span>
            </label>

            <div class="pl-imp-foot">
              <span class="cell-sub"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Revisarás las marcaciones antes de guardarlas</span>
              <button class="pl-btn" :class="{ primario: archivoHuellero && !previaHuellero }" type="button" :disabled="!archivoHuellero || subiendo" @click="previsualizarHuellero">
                <i class="fa-regular fa-eye" aria-hidden="true"></i> {{ subiendo && !previaHuellero ? 'Leyendo…' : 'Vista previa' }}
              </button>
            </div>

            <div v-if="previaHuellero" class="pl-previa">
              <div class="pl-tags pl-tags-izq">
                <span class="pl-tag">{{ fechaDMY(previaHuellero.desde) }} → {{ fechaDMY(previaHuellero.hasta) }}</span>
                <span class="pl-tag">{{ previaHuellero.marcaciones }} marcaciones</span>
                <span class="pl-tag ok">{{ previaHuellero.dias }} días-trabajador</span>
                <span class="pl-tag">{{ previaHuellero.trabajadores }} trabajadores</span>
                <span v-if="previaHuellero.sin_salida" class="pl-tag warn">{{ previaHuellero.sin_salida }} sin salida</span>
                <span v-if="previaHuellero.total_errores" class="pl-tag bad">{{ previaHuellero.total_errores }} filas ilegibles</span>
              </div>
              <div v-if="previaHuellero.sin_ficha.length" class="ds-callout">
                <b>{{ previaHuellero.sin_ficha.length }} código(s) del huellero no están en el maestro de personal</b> (se guardan igual, pero no entran a la planilla hasta registrarlos):
                {{ previaHuellero.sin_ficha.map(s => `${s.codigo}${s.nombre ? ' ' + s.nombre : ''}`).join(' · ') }}
              </div>
              <div v-if="previaHuellero.errores?.length" class="err-list">
                {{ previaHuellero.errores.map(e => `Fila ${e.fila}: ${e.motivo}`).join(' · ') }}
              </div>
              <div v-if="previaHuellero.muestra?.length" class="ds-table-scroll">
                <table class="pl-table">
                  <thead><tr><th>Código</th><th>Nombre (huellero)</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th class="tr">Marcas</th></tr></thead>
                  <tbody>
                    <tr v-for="d in previaHuellero.muestra" :key="d.codigo + d.fecha">
                      <td class="mono">{{ d.codigo }}</td><td>{{ d.nombre || '—' }}</td><td class="mono">{{ diaCorto(d.fecha) }}</td>
                      <td class="mono">{{ d.entrada }}</td>
                      <td class="mono"><template v-if="d.salida">{{ d.salida }}</template><span v-else class="pl-tag warn">Sin salida</span></td>
                      <td class="tr">{{ d.marcas }}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="cell-sub">Primeras {{ previaHuellero.muestra.length }} de {{ previaHuellero.dias }} filas (una por trabajador y día).</p>
              </div>
              <div class="pl-imp-foot">
                <span></span>
                <button v-if="!previaHuellero.confirmado" class="pl-btn primario" type="button" :disabled="subiendo" @click="confirmarHuellero">
                  <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> {{ subiendo ? 'Guardando…' : `Guardar ${previaHuellero.dias} registro(s)` }}
                </button>
                <span v-else class="pl-tag ok"><i class="fa-solid fa-check" aria-hidden="true"></i> Importado</span>
              </div>
            </div>
          </div>
        </section>

        <aside class="pl-imp-side">
          <div class="pl-kpi destacado pl-como">
            <b class="pl-como-tit">Cómo se procesa</b>
            <div class="pl-como-item"><span class="ico in"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i></span><div><b>Primera marca = entrada</b><span>La más temprana del día cuenta como ingreso.</span></div></div>
            <div class="pl-como-item"><span class="ico out"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i></span><div><b>Última marca = salida</b><span>La más tardía del día cuenta como salida.</span></div></div>
            <div class="pl-como-item"><span class="ico"><i class="fa-solid fa-rotate" aria-hidden="true"></i></span><div><b>Reimportar reemplaza</b><span>Subir el mismo día otra vez lo sobrescribe, sin duplicar.</span></div></div>
          </div>

          <div class="pl-card pl-cob">
            <div class="pl-cob-head"><b>Cobertura de {{ soloMes }}</b><span v-if="coberturaRango" class="okc">{{ coberturaRango }}</span></div>
            <div class="pl-cob-cal">
              <span v-for="(d, i) in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="'dow' + i" class="dow">{{ d }}</span>
              <span v-for="(c, i) in cobertura" :key="i" :class="c ? c.estado : 'vacio'">{{ c?.dia }}</span>
            </div>
            <div class="pl-cob-leg"><span><i class="imp"></i>Importado</span><span><i class="fds"></i>Fin de semana</span><span><i class="pend"></i>Pendiente</span></div>
          </div>
        </aside>
      </div>

      <section class="pl-card">
        <header class="pl-tabla-head">
          <h2 class="pl-tabla-title">Últimas importaciones</h2>
          <span class="cell-sub">{{ cargasDelMes }} {{ cargasDelMes === 1 ? 'carga' : 'cargas' }} este mes</span>
        </header>
        <div class="ds-table-scroll">
          <table class="pl-table">
            <thead><tr><th>Archivo</th><th>Tipo</th><th>Fecha</th><th>Rango</th><th class="tr">Filas</th><th>Usuario</th></tr></thead>
            <tbody>
              <tr v-if="!importaciones.length"><td colspan="6" class="ds-empty">Aún no hay importaciones.</td></tr>
              <tr v-for="i in importaciones" :key="i.importacion_id">
                <td>
                  <div class="pl-who">
                    <span class="pl-file-ico" :class="{ per: i.tipo === 'PERSONAL' }"><i class="fa-solid" :class="i.tipo === 'PERSONAL' ? 'fa-user-group' : 'fa-fingerprint'" aria-hidden="true"></i></span>
                    <b>{{ i.archivo }}</b>
                  </div>
                </td>
                <td><span class="pl-area" :class="{ per: i.tipo === 'PERSONAL' }">{{ i.tipo }}</span></td>
                <td class="mono cell-sub">{{ fechaHora(i.created_at) }}</td>
                <td>
                  <template v-if="i.desde">
                    <span class="mono">{{ fechaDMY(i.desde) }} → {{ fechaDMY(i.hasta) }}</span>
                    <div class="pl-rango"><span :style="{ width: rangoPct(i) + '%' }"></span></div>
                  </template>
                  <span v-else class="cell-sub">No aplica</span>
                </td>
                <td class="tr"><b>{{ i.filas }}</b></td>
                <td>
                  <div v-if="i.usuario" class="pl-who"><span class="pl-avatar navy sm">{{ inicialesUsuario(i.usuario) }}</span>{{ i.usuario }}</div>
                  <span v-else class="cell-sub">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ── Personal ───────────────────────────────────────────────────── -->
    <template v-if="tab === 'personal'">
      <section class="pl-kpis pl-kpis-3">
        <div class="pl-kpi">
          <div class="pl-kpi-top"><span>Personal activo</span><span class="pl-kpi-ico"><i class="fa-solid fa-user-group" aria-hidden="true"></i></span></div>
          <div class="pl-kpi-val">{{ persResumen.activos }}<small class="pl-kpi-de"> / {{ personal.length }}</small></div>
          <div class="pl-progress"><span :style="{ width: persResumen.pctActivos + '%' }"></span></div>
        </div>
        <div class="pl-kpi destacado">
          <div class="pl-kpi-top"><span>Sueldo neto total (activos)</span><span class="pl-kpi-ico ok"><i class="fa-solid fa-money-bill" aria-hidden="true"></i></span></div>
          <div class="pl-kpi-val">{{ puedeVerSueldos ? soles(persResumen.sueldos) : '••••••' }}</div>
          <div class="pl-kpi-foot">{{ puedeVerSueldos ? `Vigente desde ${nombreMes}` : 'Solo lo ve el equipo de Talento' }}</div>
        </div>
        <div class="pl-kpi">
          <div class="pl-kpi-top"><span>Horarios</span><span class="pl-kpi-ico warn"><i class="fa-regular fa-clock" aria-hidden="true"></i></span></div>
          <div v-if="!persResumen.horarios.length" class="cell-sub">Sin personal activo.</div>
          <div v-for="h in persResumen.horarios" :key="h.rango" class="pl-horario"><b class="mono">{{ h.rango }}</b><span>{{ h.n }} {{ h.n === 1 ? 'persona' : 'personas' }}</span></div>
        </div>
      </section>

      <div v-if="puedeVerSueldos" class="pl-imp-grid pl-pers-grid">
        <section class="pl-card pl-imp">
          <header class="pl-imp-head pl-imp-head-acc">
            <div>
              <h2 class="pl-tabla-title">Cargar sueldos vigentes</h2>
              <p class="pl-tabla-sub">Valen desde {{ nombreMes }} hasta la próxima carga. Los meses anteriores no cambian.</p>
            </div>
            <button class="pl-btn" type="button" @click="svc.descargarPlantilla()">
              <i class="fa-solid fa-download okc" aria-hidden="true"></i> Descargar plantilla
            </button>
          </header>
          <div class="pl-imp-body">
            <label class="pl-drop pl-drop-row" :class="{ lleno: !!archivoPersonal, sobre: arrastrando }"
              @dragover.prevent="arrastrando = true" @dragleave="arrastrando = false" @drop.prevent="soltarPersonal">
              <input type="file" accept=".xlsx,.csv" class="dropzone-input" aria-label="Elegir archivo de personal" @change="e => elegirPersonal(e.target.files?.[0])" />
              <span class="pl-drop-ico verde"><i class="fa-solid fa-file-excel" aria-hidden="true"></i></span>
              <span class="pl-drop-txt">
                <b>{{ archivoPersonal ? archivoPersonal.name : 'Arrastra el Excel de personal o haz clic para elegirlo' }}</b>
                <span class="cell-sub">{{ archivoPersonal ? 'Haz clic para cambiarlo' : 'Usa la plantilla para no equivocarte de columnas' }}</span>
              </span>
            </label>
            <div class="pl-imp-foot">
              <div class="pl-cols">
                <span class="pl-cols-tit">Columnas</span>
                <span v-for="c in ['Código huellero', 'DNI', 'Nombre', 'Área']" :key="c" class="pl-tag">{{ c }}</span>
                <span class="pl-tag ok">Sueldo neto</span>
              </div>
              <div class="pl-tags">
                <button v-if="archivoPersonal && !previaPersonal" class="pl-btn primario" type="button" :disabled="subiendo" @click="previsualizarPersonal">
                  <i class="fa-regular fa-eye" aria-hidden="true"></i> {{ subiendo ? 'Leyendo…' : 'Vista previa' }}
                </button>
                <button v-if="previaPersonal && !previaPersonal.confirmado" class="pl-btn primario" type="button" :disabled="subiendo || !previaPersonal.total" @click="confirmarPersonal">
                  <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Guardar {{ previaPersonal.total }} trabajador(es)
                </button>
                <span v-if="previaPersonal?.confirmado" class="pl-tag ok"><i class="fa-solid fa-check" aria-hidden="true"></i> Guardado: {{ previaPersonal.total }} trabajador(es)</span>
              </div>
            </div>

            <div v-if="previaPersonal && !previaPersonal.confirmado" class="pl-previa">
              <div class="pl-tags pl-tags-izq">
                <span class="pl-tag ok">{{ previaPersonal.total }} fila(s) válidas</span>
                <span v-if="previaPersonal.errores.length" class="pl-tag bad">{{ previaPersonal.errores.length }} con error</span>
                <span class="cell-sub">Vista previa: todavía no se guardó nada. Vigentes desde {{ nombreMes }}.</span>
              </div>
              <div v-if="previaPersonal.errores.length" class="err-list">
                {{ previaPersonal.errores.map(e => `Fila ${e.fila}: ${e.motivo}`).join(' · ') }}
              </div>
              <div class="ds-table-scroll">
                <table class="pl-table">
                  <thead><tr><th>Código</th><th>Nombre</th><th>DNI</th><th>Área</th><th>Horario</th><th class="tr">Sueldo neto</th><th class="tr">Quincena 40 %</th><th class="tr">Fin de mes 60 %</th></tr></thead>
                  <tbody>
                    <tr v-for="p in previaPersonal.personal" :key="p.codigo">
                      <td class="mono">{{ p.codigo }}</td><td>{{ p.nombre }}</td><td class="mono">{{ p.dni || '—' }}</td><td>{{ p.area || '—' }}</td>
                      <td class="mono">{{ hm(p.hora_ingreso) }} – {{ hm(p.hora_salida) }}</td>
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

        <aside class="pl-card pl-reglas">
          <b class="pl-reglas-tit">Privacidad y reglas</b>
          <div class="pl-regla-item"><span class="ico"><i class="fa-solid fa-lock" aria-hidden="true"></i></span><div><b>Sueldo cifrado</b><span>Solo lo ve el equipo de Talento.</span></div></div>
          <div class="pl-regla-item"><span class="ico ok"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></span><div><b>El archivo no se guarda</b><span>Se lee y se descarta.</span></div></div>
          <div class="pl-regla-item"><span class="ico warn"><i class="fa-regular fa-clock" aria-hidden="true"></i></span><div><b>Horario por área</b><span>FICO y B2B 8:30; el resto 9:00. Se puede ajustar abajo.</span></div></div>
        </aside>
      </div>

      <section class="pl-card">
        <header class="pl-tabla-head">
          <h2 class="pl-tabla-title">Personal <span class="pl-seg-n">{{ personal.length }}</span></h2>
          <div class="pl-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input v-model.trim="filtro" type="search" placeholder="Buscar nombre, DNI o área" aria-label="Buscar" /></div>
        </header>
        <div class="ds-table-scroll">
          <table class="pl-table">
            <thead><tr><th>Trabajador</th><th>DNI</th><th>Área</th><th>Horario (ingreso → salida)</th><th class="tr">Sueldo neto</th><th>Activo</th></tr></thead>
            <tbody>
              <tr v-if="cargando"><td colspan="6" class="ds-empty">Cargando…</td></tr>
              <tr v-else-if="!personalFiltrado.length"><td colspan="6" class="ds-empty">Sin personal registrado.</td></tr>
              <tr v-for="p in personalFiltrado" :key="p.personal_id" :class="{ 'pl-inactivo': !p.activo }">
                <td>
                  <div class="pl-who">
                    <span class="pl-avatar">{{ iniciales(p.nombre) }}</span>
                    <div><div class="cell-main">{{ p.nombre }}</div><div class="cell-sub">Código {{ p.codigo }}</div></div>
                  </div>
                </td>
                <td class="mono cell-sub">{{ p.dni || '—' }}</td>
                <td><span v-if="p.area" class="pl-area">{{ p.area }}</span><span v-else class="cell-sub">—</span></td>
                <td>
                  <div class="pl-horas">
                    <input class="pl-hora-in" type="time" :value="hm(p.hora_ingreso)" :aria-label="`Ingreso ${p.nombre}`" @change="e => editar(p, { hora_ingreso: e.target.value })" />
                    <i class="fa-solid fa-arrow-right pl-flecha" aria-hidden="true"></i>
                    <input class="pl-hora-in" type="time" :value="hm(p.hora_salida)" :aria-label="`Salida ${p.nombre}`" @change="e => editar(p, { hora_salida: e.target.value })" />
                  </div>
                </td>
                <td class="tr mono"><b>{{ puedeVerSueldos ? soles(p.sueldo_neto) : (p.tiene_sueldo ? '••••••' : 'sin sueldo') }}</b></td>
                <td>
                  <label class="pl-switch">
                    <input type="checkbox" :checked="p.activo" :aria-label="`Activo ${p.nombre}`" @change="e => editar(p, { activo: e.target.checked })" />
                    <span></span>
                  </label>
                </td>
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
// ── Asistencia: filtros, agrupación por trabajador y cómputo visual ──
const FILTROS_ASIS = [
  { key: 'todas', label: 'Todas' },
  { key: 'tardanzas', label: 'Tardanzas' },
  { key: 'sinSalida', label: 'Sin salida' },
  { key: 'justificadas', label: 'Justificadas' }
]
const filtroAsis = ref('todas')
const limiteAsis = ref(30)
const PRED_ASIS = {
  todas: a => a.minutos_tardanza || a.justificado || !a.salida || !a.en_ficha,
  tardanzas: a => a.minutos_tardanza > 0,
  sinSalida: a => !a.salida,
  justificadas: a => a.justificado
}
const minDe = h => { const [hh, mm] = String(h || '').split(':').map(Number); return (hh || 0) * 60 + (mm || 0) }
const hm = h => String(h || '').slice(0, 5)
const retraso = a => Math.max(0, minDe(a.entrada) - minDe(a.hora_ingreso))
// Tramos de la regla: 0–10 tolerancia, 11–30 computa 30 min, 31+ computa 1 hora.
const nivel = a => { const r = retraso(a); return r <= 0 ? 'n0' : r <= 10 ? 'n1' : r <= 30 ? 'n2' : 'n3' }
const jornada = a => {
  if (!a.salida || !a.entrada) return '—'
  const m = minDe(a.salida) - minDe(a.entrada)
  return m > 0 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : '—'
}
const dowCorto = f => new Date(`${f}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase()

const asisBase = computed(() => (asis.value?.filas || []).filter(a => coincide(a.nombre, a.codigo, a.area)))
const asisConteo = computed(() => Object.fromEntries(FILTROS_ASIS.map(f => [f.key, asisBase.value.filter(PRED_ASIS[f.key]).length])))
const asistenciaFiltrada = computed(() => asisBase.value
  .filter(PRED_ASIS[filtroAsis.value])
  .sort((x, y) => x.nombre.localeCompare(y.nombre) || x.fecha.localeCompare(y.fecha)))
const asisGrupos = computed(() => {
  const grupos = new Map()
  for (const a of asistenciaFiltrada.value.slice(0, limiteAsis.value)) {
    if (!grupos.has(a.codigo)) grupos.set(a.codigo, { codigo: a.codigo, nombre: a.nombre, area: a.area, hora_ingreso: hm(a.hora_ingreso), en_ficha: a.en_ficha, filas: [] })
    grupos.get(a.codigo).filas.push(a)
  }
  // Los totales del encabezado cuentan todo el mes del trabajador, no solo lo visible.
  return [...grupos.values()].map(g => {
    const todas = asisBase.value.filter(a => a.codigo === g.codigo)
    return {
      ...g,
      tardanzas: todas.filter(a => a.minutos_tardanza).length,
      minutos: todas.reduce((s, a) => s + (a.minutos_tardanza || 0), 0),
      sinSalida: todas.filter(a => !a.salida).length,
      justificadas: todas.filter(a => a.justificado).length
    }
  })
})
const asisResumen = computed(() => {
  const filas = asis.value?.filas || []
  const tardanzas = filas.filter(a => a.minutos_tardanza).length
  const justificadas = filas.filter(a => a.justificado).length
  return {
    minutos: filas.reduce((s, a) => s + (a.minutos_tardanza || 0), 0),
    tardanzas,
    justificadas,
    pctJust: tardanzas + justificadas ? Math.round(justificadas / (tardanzas + justificadas) * 100) : 0,
    sinSalida: filas.filter(a => !a.salida).length,
    sinFicha: new Set(filas.filter(a => !a.en_ficha).map(a => a.codigo)).size
  }
})
watch([filtroAsis, filtro], () => { limiteAsis.value = 30 })

// ── Importar huellero ──
const PASOS_HUELLERO = ['Elegir archivo', 'Vista previa', 'Confirmar importación']
const arrastrando = ref(false)
const pasoHuellero = computed(() => previaHuellero.value?.confirmado ? 3 : previaHuellero.value ? 2 : 1)
function elegirHuellero (f) { archivoHuellero.value = f || null; previaHuellero.value = null }
function soltarHuellero (e) { arrastrando.value = false; elegirHuellero(e.dataTransfer?.files?.[0]) }
const isoDia = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fechaDMY = f => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '')
const huelleroDelMes = computed(() => {
  const { anio, mes } = anioMes.value
  const ini = `${anio}-${String(mes).padStart(2, '0')}-01`
  const fin = isoDia(new Date(anio, mes, 0))
  return importaciones.value.filter(i => i.tipo === 'HUELLERO' && i.desde && i.desde <= fin && i.hasta >= ini)
})
// Rejilla L–D del mes: verde si algún archivo del huellero cubre el día hábil.
const cobertura = computed(() => {
  const { anio, mes } = anioMes.value
  const dias = new Date(anio, mes, 0).getDate()
  const celdas = Array((new Date(anio, mes - 1, 1).getDay() + 6) % 7).fill(null)
  for (let dia = 1; dia <= dias; dia++) {
    const d = new Date(anio, mes - 1, dia)
    const iso = isoDia(d)
    const fds = d.getDay() === 0 || d.getDay() === 6
    const cubierto = huelleroDelMes.value.some(i => i.desde <= iso && i.hasta >= iso)
    celdas.push({ dia, estado: fds ? 'fds' : cubierto ? 'imp' : 'pend' })
  }
  return celdas
})
const coberturaRango = computed(() => {
  const dias = cobertura.value.filter(c => c?.estado === 'imp').map(c => String(c.dia).padStart(2, '0'))
  return dias.length ? `${dias[0]} → ${dias[dias.length - 1]}` : ''
})
const cargasDelMes = computed(() => {
  const { anio, mes } = anioMes.value
  return importaciones.value.filter(i => { const d = new Date(i.created_at); return d.getFullYear() === anio && d.getMonth() + 1 === mes }).length
})
const rangoPct = i => {
  const dias = (new Date(`${i.hasta}T12:00:00`) - new Date(`${i.desde}T12:00:00`)) / 864e5 + 1
  const mesDias = new Date(+i.desde.slice(0, 4), +i.desde.slice(5, 7), 0).getDate()
  return Math.min(100, Math.round(dias / mesDias * 100))
}
const inicialesUsuario = n => String(n).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()

// ── Personal ──
function elegirPersonal (f) { archivoPersonal.value = f || null; previaPersonal.value = null }
function soltarPersonal (e) { arrastrando.value = false; elegirPersonal(e.dataTransfer?.files?.[0]) }
const persResumen = computed(() => {
  const activos = personal.value.filter(p => p.activo)
  const horarios = new Map()
  for (const p of activos) {
    const rango = `${hm(p.hora_ingreso)} – ${hm(p.hora_salida)}`
    horarios.set(rango, (horarios.get(rango) || 0) + 1)
  }
  return {
    activos: activos.length,
    pctActivos: personal.value.length ? Math.round(activos.length / personal.value.length * 100) : 0,
    sueldos: activos.reduce((s, p) => s + (Number(p.sueldo_neto) || 0), 0),
    horarios: [...horarios].map(([rango, n]) => ({ rango, n })).sort((a, b) => a.rango.localeCompare(b.rango))
  }
})
const personalFiltrado = computed(() => personal.value.filter(p => coincide(p.nombre, p.codigo, p.area, p.dni)))

async function cargar () {
  cargando.value = true
  const { anio, mes } = anioMes.value
  try {
    if (tab.value === 'planilla' && puedeVerSueldos) calc.value = await svc.calculo(anio, mes)
    if (tab.value === 'asistencia') asis.value = await svc.asistencia(anio, mes)
    if (tab.value === 'huellero') [importaciones.value, asis.value] = await Promise.all([svc.importaciones(), svc.asistencia(anio, mes)])
    if (tab.value === 'personal') [personal.value, asis.value] = await Promise.all([svc.personal().then(r => r.personal), svc.asistencia(anio, mes)])
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

/* ── Asistencia y tardanzas ── */
.pl-kpi-ico.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.pl-regla { gap: 12px; }
.pl-regla-bar { display: flex; gap: 4px; }
.pl-regla-bar span, .pl-retraso span { flex: 1; height: 5px; border-radius: 99px; }
.pl-regla-bar .t1 { background: #f2c14e; } .pl-regla-bar .t2 { background: #e98b8b; } .pl-regla-bar .t3 { background: #e04848; }
.pl-regla-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pl-regla-cols span { display: block; font-size: 11.5px; color: rgba(255,255,255,.75); }
.pl-regla-cols b { font-size: 14px; }
.pl-seg { display: inline-flex; gap: 2px; padding: 4px; border-radius: 10px; background: var(--ds-soft-neutral); }
.pl-seg button { border: 0; background: none; padding: 7px 12px; border-radius: 8px; font-size: 13.5px; color: var(--ds-ink-2); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.pl-seg button.activo { background: var(--ds-surface); color: var(--ds-ink); font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.pl-seg-n { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 99px; background: var(--ds-border); color: var(--ds-ink-2); }
.pl-seg button.activo .pl-seg-n { background: var(--pl-navy); color: #fff; }
.pl-asis td { padding: 10px 12px; }
.pl-grupo > td { background: var(--ds-soft-neutral); padding: 12px; }
.pl-grupo .pl-who { gap: 12px; }
.pl-avatar.navy { background: var(--pl-navy); color: #fff; }
.pl-tags { display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.pl-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--ds-soft-neutral); color: var(--ds-ink-2); white-space: nowrap; }
.pl-tag.bad { background: var(--ds-soft-bad); color: var(--ds-bad); }
.pl-tag.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.pl-tag.ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.pl-fecha { display: flex; align-items: center; gap: 10px; }
.pl-fecha-box { display: inline-flex; flex-direction: column; align-items: center; width: 40px; padding: 3px 0; border: 1px solid var(--ds-border); border-radius: 8px; background: var(--ds-soft-neutral); line-height: 1.05; }
.pl-fecha-box small { font-size: 9.5px; font-weight: 600; color: var(--ds-ink-2); }
.pl-fecha-box b { font-size: 16px; color: var(--pl-navy); }
.pl-flecha { font-size: 10px; margin: 0 8px; color: var(--ds-ink-2); }
.pl-retraso { display: flex; gap: 3px; width: 150px; margin-bottom: 4px; }
.pl-retraso span { background: var(--ds-soft-neutral); }
.pl-retraso:is(.n1, .n2, .n3) span:nth-child(1) { background: #f2c14e; }
.pl-retraso:is(.n2, .n3) span:nth-child(2) { background: #e98b8b; }
.pl-retraso.n3 span:nth-child(3) { background: #e04848; }
.pl-incid > td { background: color-mix(in srgb, var(--ds-soft-warn) 45%, transparent); }
.pl-btn.sm { padding: 6px 12px; font-size: 13px; }

/* ── Personal ── */
.pl-kpis-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pl-kpi-de { font-size: 16px; font-weight: 600; color: var(--ds-ink-2); }
.pl-horario { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; }
.pl-horario span { font-size: 12.5px; color: var(--ds-ink-2); }
.pl-pers-grid { grid-template-columns: minmax(0, 1fr) 385px; align-items: stretch; }
.pl-imp-head-acc { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.pl-drop-row { flex-direction: row; justify-content: center; gap: 18px; text-align: left; padding: 36px 20px; }
.pl-drop-txt { display: flex; flex-direction: column; gap: 2px; }
.pl-drop-ico.verde { background: var(--pl-green); box-shadow: 0 6px 16px rgba(31, 138, 76, .25); margin: 0; width: 56px; height: 56px; font-size: 22px; }
.pl-cols { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pl-cols-tit { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); margin-right: 4px; }
.pl-cols .pl-tag { border-radius: 6px; }
.pl-reglas { margin-bottom: 0; padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.pl-reglas-tit { font-size: 15px; }
.pl-regla-item { display: flex; gap: 12px; align-items: flex-start; }
.pl-regla-item b { display: block; font-size: 14px; }
.pl-regla-item span:not(.ico) { font-size: 13px; color: var(--ds-ink-2); }
.pl-regla-item .ico { flex: none; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: var(--ds-soft-neutral); color: var(--pl-navy); font-size: 13px; }
.pl-regla-item .ico.ok { background: var(--ds-soft-ok); color: var(--pl-green); }
.pl-regla-item .ico.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.pl-horas { display: flex; align-items: center; }
.pl-hora-in { width: 112px; padding: 7px 10px; border: 1px solid var(--ds-border); border-radius: 8px; background: var(--ds-surface); color: var(--ds-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.pl-hora-in:focus { outline: 2px solid color-mix(in srgb, var(--pl-navy) 30%, transparent); border-color: var(--pl-navy); }
.pl-switch { position: relative; display: inline-block; width: 46px; height: 26px; margin: 0; cursor: pointer; }
.pl-switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.pl-switch span { position: absolute; inset: 0; border-radius: 99px; background: var(--ds-border); transition: background .15s; pointer-events: none; }
.pl-switch span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, .2); transition: transform .15s; }
.pl-switch input:checked + span { background: var(--pl-green); }
.pl-switch input:checked + span::after { transform: translateX(20px); }
.pl-switch input:focus-visible + span { outline: 2px solid var(--pl-navy); outline-offset: 2px; }
@media (max-width: 1100px) { .pl-kpis-3, .pl-pers-grid { grid-template-columns: 1fr; } }

/* ── Importar huellero ── */
.pl-imp-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; align-items: start; margin-bottom: 22px; }
.pl-imp { margin-bottom: 0; }
.pl-imp-head { padding: 20px 24px 16px; border-bottom: 1px solid var(--ds-border); }
.pl-imp-body { padding: 20px 24px 24px; }
.pl-steps { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0; margin: 0 0 18px; }
.pl-steps li { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13.5px; color: var(--ds-ink-2); }
.pl-steps-bar { flex-basis: 100%; height: 4px; border-radius: 99px; background: var(--ds-soft-neutral); margin-bottom: 8px; }
.pl-steps-n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700; background: var(--ds-soft-neutral); }
.pl-steps li.hecho { color: var(--ds-ink); font-weight: 600; }
.pl-steps li.hecho .pl-steps-bar, .pl-steps li.hecho .pl-steps-n { background: var(--pl-navy); color: #fff; }
.pl-drop { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 20px; border: 1.5px dashed var(--ds-border); border-radius: 12px; background: var(--ds-soft-neutral); cursor: pointer; text-align: center; margin: 0; }
.pl-drop.sobre, .pl-drop:hover { border-color: var(--pl-navy); }
.pl-drop.lleno { border-style: solid; }
.pl-drop b { font-size: 16px; color: var(--ds-ink); }
.pl-drop-ico { width: 64px; height: 64px; border-radius: 14px; display: grid; place-items: center; background: var(--pl-navy); color: #fff; font-size: 26px; box-shadow: 0 6px 16px rgba(23, 42, 92, .25); margin-bottom: 6px; }
.pl-drop-ext { display: flex; gap: 8px; }
.pl-drop-ext span { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px; background: var(--ds-soft-info, var(--ds-surface)); }
.pl-drop-ext span.x { background: var(--ds-soft-ok); color: var(--pl-green); }
.pl-imp-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.pl-tags-izq { justify-content: flex-start; }
.pl-imp-side { display: flex; flex-direction: column; gap: 22px; }
.pl-como { min-height: 0; gap: 14px; }
.pl-como-tit { font-size: 16px; }
.pl-como-item { display: flex; gap: 12px; align-items: flex-start; }
.pl-como-item b { display: block; font-size: 14px; }
.pl-como-item span:not(.ico) { font-size: 13px; color: rgba(255, 255, 255, .8); }
.pl-como-item .ico { flex: none; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: rgba(255, 255, 255, .12); color: #fff; }
.pl-como-item .ico.in { color: #7fe0a6; } .pl-como-item .ico.out { color: #f2c14e; }
.pl-cob { padding: 18px 20px; margin-bottom: 0; }
.pl-cob-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 15px; }
.pl-cob-head span { font-size: 13px; font-weight: 700; }
.pl-cob-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.pl-cob-cal span { height: 30px; border-radius: 6px; display: grid; place-items: center; font-size: 12.5px; font-weight: 700; }
.pl-cob-cal .dow { height: auto; font-size: 11px; font-weight: 600; color: var(--ds-ink-2); }
.pl-cob-cal .imp { background: var(--pl-green); color: #fff; }
.pl-cob-cal .fds { background: var(--ds-soft-ok); color: var(--pl-green); font-weight: 600; }
.pl-cob-cal .pend { background: var(--ds-soft-neutral); color: var(--ds-ink-2); font-weight: 600; }
.pl-cob-leg { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--ds-ink-2); margin-top: 14px; }
.pl-cob-leg i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
.pl-cob-leg .imp { background: var(--pl-green); } .pl-cob-leg .fds { background: var(--ds-soft-ok); } .pl-cob-leg .pend { background: var(--ds-soft-neutral); }
.pl-file-ico { flex: none; width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: var(--ds-soft-neutral); color: var(--pl-navy); }
.pl-file-ico.per, .pl-area.per { background: var(--ds-soft-ok); color: var(--pl-green); }
.pl-rango { height: 4px; width: 175px; border-radius: 99px; background: var(--ds-soft-neutral); margin-top: 6px; overflow: hidden; }
.pl-rango span { display: block; height: 100%; background: var(--pl-green); }
.pl-avatar.sm { width: 30px; height: 30px; font-size: 11px; }
@media (max-width: 1100px) { .pl-imp-grid { grid-template-columns: 1fr; } }

@media (max-width: 1100px) { .pl-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .pl-kpis, .pl-mini { grid-template-columns: 1fr; }
  .pl-search { min-width: 0; flex: 1; }
  .pl-detalle > td { padding: 16px; }
  .pl-cal { grid-template-columns: repeat(5, minmax(56px, 1fr)); overflow-x: auto; }
}
</style>
