import { describe, it, expect } from 'vitest'
import { useLeadFormatters } from '../useLeadFormatters'

describe('useLeadFormatters', () => {
  const f = useLeadFormatters()

  it('expone todos los formateadores sin throw al instanciar', () => {
    expect(typeof f.formatMoney).toBe('function')
    expect(typeof f.formatDuration).toBe('function')
    expect(typeof f.formatDate).toBe('function')
    expect(typeof f.formatDateTime).toBe('function')
    expect(typeof f.badgeForInterest).toBe('function')
    expect(typeof f.badgeForFollow).toBe('function')
    expect(typeof f.rowClassForStatus).toBe('function')
    expect(typeof f.badgeForInstallment).toBe('function')
    expect(typeof f.getFileIcon).toBe('function')
  })

  describe('formatMoney', () => {
    it('mapea alias y codigo de moneda al simbolo', () => {
      expect(f.formatMoney('we_currency_soles', 10)).toBe('S/ 10.00')
      expect(f.formatMoney('PEN', 10)).toBe('S/ 10.00')
      expect(f.formatMoney('we_currency_usd', 5.5)).toBe('$ 5.50')
      expect(f.formatMoney('USD', 5.5)).toBe('$ 5.50')
    })

    it('respeta el simbolo provisto y trata montos invalidos como 0', () => {
      expect(f.formatMoney('€', 'abc')).toBe('€ 0.00')
      expect(f.formatMoney('S/', null)).toBe('S/ 0.00')
    })
  })

  describe('formatDuration', () => {
    it('formatea segundos a mm:ss con padding', () => {
      expect(f.formatDuration(0)).toBe('00:00')
      expect(f.formatDuration(65)).toBe('01:05')
      expect(f.formatDuration(600)).toBe('10:00')
    })
  })

  describe('formatDate', () => {
    it('preserva dd/mm/yyyy y convierte ISO a dd/mm/yyyy', () => {
      expect(f.formatDate('09/05/2026')).toBe('09/05/2026')
      expect(f.formatDate('2026-05-09T05:00:00.000Z')).toBe('09/05/2026')
    })

    it('devuelve guion para valores vacios', () => {
      expect(f.formatDate('')).toBe('—')
      expect(f.formatDate(null)).toBe('—')
    })
  })

  describe('formatDateTime', () => {
    it('preserva dd/mm/yyyy hh:mm', () => {
      expect(f.formatDateTime('09/05/2026 14:30')).toBe('09/05/2026 14:30')
    })

    it('devuelve guion para vacio', () => {
      expect(f.formatDateTime(null)).toBe('—')
    })
  })

  describe('badges y clases por estado', () => {
    it('badgeForInterest', () => {
      expect(f.badgeForInterest('we_lead_interest_high')).toBe('pill-red')
      expect(f.badgeForInterest('desconocido')).toBe('pill-slate')
    })

    it('badgeForFollow', () => {
      expect(f.badgeForFollow('we_calling_answered')).toBe('pill-teal')
      expect(f.badgeForFollow('desconocido')).toBe('pill-slate')
    })

    it('rowClassForStatus', () => {
      expect(f.rowClassForStatus('we_lead_status_bought')).toBe('row-inscrito')
      expect(f.rowClassForStatus('we_lead_status_closed')).toBe('row-red')
      expect(f.rowClassForStatus('desconocido')).toBe('')
    })

    it('badgeForInstallment', () => {
      expect(f.badgeForInstallment('we_payment_status_paid')).toBe('pill-teal')
      expect(f.badgeForInstallment('we_payment_status_cancelled')).toBe('pill-red')
      expect(f.badgeForInstallment('desconocido')).toBe('pill-slate')
    })
  })

  describe('getFileIcon', () => {
    it('resuelve iconos por tipo', () => {
      expect(f.getFileIcon(null)).toBe('fa-file text-secondary')
      expect(f.getFileIcon('PAYMENT_RECEIPT')).toBe('fa-file-invoice-dollar text-primary')
      expect(f.getFileIcon('application/pdf')).toBe('fa-file-pdf text-danger')
      expect(f.getFileIcon('image/png')).toBe('fa-file-image text-success')
      expect(f.getFileIcon('text/xml')).toBe('fa-file-code text-info')
      expect(f.getFileIcon('archive.zip')).toBe('fa-file-zipper text-dark')
      expect(f.getFileIcon('otro')).toBe('fa-file-lines text-primary')
    })
  })
})
