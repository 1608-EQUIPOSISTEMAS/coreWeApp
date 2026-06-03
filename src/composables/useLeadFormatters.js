// Formateadores puros del tablero de leads. Sin estado ni efectos: cada funcion
// recibe sus argumentos y devuelve una cadena/clase, apta para usarse en plantillas
// y para testearse de forma aislada. Logica extraida de views/comercial/Leads.vue.
export function useLeadFormatters () {

  const formatMoney = (symbolOrAlias, amount) => {
    let symbol = symbolOrAlias
    if (symbolOrAlias === 'we_currency_soles' || symbolOrAlias === 'PEN') symbol = 'S/'
    if (symbolOrAlias === 'we_currency_usd' || symbolOrAlias === 'USD') symbol = '$'
    const val = Number(amount) || 0
    return `${symbol} ${val.toFixed(2)}`
  }

  // Formato monetario con separador de miles (es-PE, 2 decimales). Usado en el
  // resumen de transaccion. Distinto de formatMoney (toFixed sin miles).
  const fmt2 = (val) => (Number(val) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Formateo TZ-safe para cadenas calendario (DATE de BD). Captura primero
  // YYYY-MM-DD aunque venga embebido en un ISO con hora y formatea por
  // componentes para evitar que toLocaleDateString corra el dia cuando el
  // server Node corre en UTC y el navegador en Lima.
  const formatDate = (v) => {
    if (!v) return '—'
    const s = String(v)
    const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m1) return `${m1[1]}/${m1[2]}/${m1[3]}`
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`
    const d = new Date(v)
    return isNaN(d) ? '—' : d.toLocaleDateString('es-PE')
  }

  const formatDateTime = (v) => {
    if (!v) return '—'
    const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/)
    if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}`
    const m2 = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`
    const d = new Date(v)
    if (!isNaN(d)) return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    return String(v)
  }

  const badgeForInterest = (s) => {
    const map = { 'we_lead_interest_high': 'pill-red', 'we_lead_interest_medium': 'pill-amber', 'we_lead_interest_low': 'pill-slate' }
    return map[s] || 'pill-slate'
  }

  const badgeForFollow = (s) => {
    const map = { 'we_calling_pending': 'pill-slate', 'we_calling_answered': 'pill-teal', 'we_calling_no_answer': 'pill-red' }
    return map[s] || 'pill-slate'
  }

  const rowClassForStatus = (s) => {
    const map = {
      'we_lead_status_interesado': 'row-blue',
      'we_lead_status_bought': 'row-inscrito',
      'we_lead_status_will_pay': 'row-emerald',
      'we_lead_status_proximo': 'row-yellow',
      'we_lead_status_indiferente': 'row-gray',
      'we_lead_status_closed': 'row-red',
      'we_lead_status_desestimado': 'row-red'
    }
    return map[s] || ''
  }

  const badgeForInstallment = (alias) => {
    const map = {
      'we_payment_status_paid': 'pill-teal',
      'we_payment_status_pending': 'pill-amber',
      'we_payment_status_draft': 'pill-slate',
      'we_payment_status_cancelled': 'pill-red'
    }
    return map[alias] || 'pill-slate'
  }

  const getFileIcon = (type) => {
    if (!type) return 'fa-file text-secondary'
    const t = type.toLowerCase()
    if (t.includes('payment_receipt')) return 'fa-file-invoice-dollar text-primary'
    if (t.includes('pdf')) return 'fa-file-pdf text-danger'
    if (t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('jpeg')) return 'fa-file-image text-success'
    if (t.includes('legacy')) return 'fa-file-contract text-warning'
    if (t.includes('xml')) return 'fa-file-code text-info'
    if (t.includes('zip') || t.includes('rar')) return 'fa-file-zipper text-dark'
    return 'fa-file-lines text-primary'
  }

  return {
    formatMoney,
    fmt2,
    formatDuration,
    formatDate,
    formatDateTime,
    badgeForInterest,
    badgeForFollow,
    rowClassForStatus,
    badgeForInstallment,
    getFileIcon
  }
}
