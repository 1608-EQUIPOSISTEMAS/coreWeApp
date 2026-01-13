<template>
  <input
    ref="inputRef"
    type="text"
    class="form-control text-end fw-bold"
    :placeholder="placeholder"
  />
</template>

<script setup>
import { watch } from 'vue'
import { useCurrencyInput } from 'vue-currency-input'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  
  // Tu formulario envía un objeto completo (ej: { code: 'PEN', locale: 'es-PE', ... })
  currency: { 
    type: Object, 
    default: () => ({ code: 'PEN', locale: 'es-PE' }) 
  },
  
  placeholder: String,
  
  // Opciones extra si quisieras forzar algo
  options: Object
})

// Configuramos la librería usando los datos que vienen de tu "selectedCurrency"
const { inputRef, setOptions, setValue } = useCurrencyInput({
  currency: props.currency?.code || 'PEN',
  locale: props.currency?.locale || 'es-PE',
  hideCurrencySymbolOnFocus: false, 
  hideGroupingSeparatorOnFocus: false,
  precision: 2,
  valueRange: { min: 0 },
  autoDecimalMode: false, // ESTO es clave: false evita que "1" se convierta en "0.01" al escribir
  ...props.options
})

// OBSERVADOR 1: Si cambias de Soles a Dólares en el padre, actualizamos la librería
watch(
  () => props.currency,
  (newCurrency) => {
    setOptions({
      currency: newCurrency?.code || 'PEN',
      locale: newCurrency?.locale || 'es-PE',
      currencyDisplay: 'symbol', // Para que muestre S/. o $
      precision: 2
    })
  },
  { deep: true, immediate: true }
)

// OBSERVADOR 2: Si el valor cambia desde afuera (ej: carga de datos), actualizamos el input
watch(
  () => props.modelValue,
  (value) => {
    setValue(value)
  }
)
</script>

<style scoped>
/* Opcional: si quieres forzar alineación o estilos específicos */
input {
  font-variant-numeric: tabular-nums;
}
</style>