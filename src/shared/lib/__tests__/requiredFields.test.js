import { describe, it, expect } from 'vitest'
import { findMissingRequiredFields } from '../requiredFields.js'

// Regla: todo lo que el formulario pinta como obligatorio vacío bloquea el
// guardado. Si esto se rompe, se vuelve a poder registrar con campos en rojo.
function render (html) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.replaceChildren(root)
  return root
}
const labels = root => findMissingRequiredFields(root).map(field => field.label)

describe('findMissingRequiredFields', () => {
  it('reporta el input requerido vacío con su label', () => {
    const root = render(`
      <div><label>Nombre <span>*</span></label><input required></div>
      <div><label>URL</label><input></div>`)
    expect(labels(root)).toEqual(['Nombre'])
  })

  it('no reporta requeridos llenos, deshabilitados, readonly ni ocultos por v-show', () => {
    const root = render(`
      <label>A</label><input required value="x">
      <label>B</label><input required disabled>
      <label>C</label><input required readonly>
      <div style="display: none;"><label>D</label><textarea required></textarea></div>`)
    expect(labels(root)).toEqual([])
  })

  it('toma el label más cercano que precede al control dentro de una fila', () => {
    const root = render(`
      <div class="row">
        <div><label>Código</label><input required value="X1"></div>
        <div><label>Sesiones</label><input required></div>
      </div>`)
    expect(labels(root)).toEqual(['Sesiones'])
  })

  it('reporta los controles compuestos marcados una sola vez y en orden', () => {
    const root = render(`
      <div><label>Tipo</label><div class="searchselect-control has-error"><input required></div></div>
      <div><label>Fecha</label><div class="base-datepicker-wrapper has-error"><input required></div></div>
      <div><label>Modalidad</label><div class="searchselect-control has-success"><input></div></div>`)
    expect(labels(root)).toEqual(['Tipo', 'Fecha'])
  })

  it('sin label usa el placeholder del input interno del control compuesto', () => {
    const root = render(`<table><tr><td><div class="searchselect-control has-error"><input placeholder="Tipo..."></div></td></tr></table>`)
    expect(labels(root)).toEqual(['Tipo...'])
  })

  it('un select requerido en su opción vacía cuenta como faltante', () => {
    const root = render(`<label>Moneda</label><select required><option value="">--</option><option value="PEN">PEN</option></select>`)
    expect(labels(root)).toEqual(['Moneda'])
  })
})
