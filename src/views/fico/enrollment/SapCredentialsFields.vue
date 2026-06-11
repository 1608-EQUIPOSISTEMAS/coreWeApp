<template>
  <div class="sapc">
    <div class="sapc-head">
      <i class="fa-solid fa-server"></i>
      <div>
        <strong>Acceso al servidor SAP</strong>
        <p>Escribe el usuario y la contraseña que se enviarán al alumno. Son obligatorios para este curso SAP online.</p>
      </div>
    </div>
    <div class="sapc-grid">
      <div class="sapc-field">
        <label>Usuario SAP <span class="sapc-req">*</span></label>
        <input
          v-model="username"
          type="text"
          class="sapc-input"
          placeholder="Ej. SAP_4001"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="sapc-field">
        <label>Contraseña SAP <span class="sapc-req">*</span></label>
        <input
          v-model="password"
          type="text"
          class="sapc-input"
          placeholder="Contraseña del servidor"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
// Campos de credenciales SAP reutilizables. Usa defineModel (Vue 3.4+) para
// enlazar usuario/contrasena por v-model:username / v-model:password desde
// cualquier padre, sin emitir eventos manuales.
const username = defineModel('username', { type: String, default: '' })
const password = defineModel('password', { type: String, default: '' })
</script>

<style scoped>
.sapc {
  border: 1px solid #BAE6FD;
  background: #F0F9FF;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}
.sapc-head { display: flex; align-items: flex-start; gap: 10px; }
.sapc-head i { color: #0369A1; font-size: 15px; margin-top: 2px; flex-shrink: 0; }
.sapc-head strong { display: block; font-size: 13px; color: #0c4a6e; }
.sapc-head p { margin: 2px 0 0; font-size: 11.5px; color: #475569; line-height: 1.4; }
.sapc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sapc-field { display: flex; flex-direction: column; gap: 5px; }
.sapc-field label {
  font-size: 11px; font-weight: 600; color: #475569;
  text-transform: uppercase; letter-spacing: .04em;
}
.sapc-req { color: #DC2626; }
.sapc-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #BAE6FD;
  border-radius: 8px;
  font-size: 13px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: #0c4a6e;
  background: #fff;
  outline: none;
  transition: all .15s ease;
}
.sapc-input:focus { border-color: #0284C7; box-shadow: 0 0 0 3px rgba(2,132,199,.1); }
.sapc-input::placeholder { color: #94A3B8; font-family: inherit; }

@media (max-width: 640px) {
  .sapc-grid { grid-template-columns: 1fr; }
}

[data-coreui-theme="dark"] .sapc {
  background: rgba(2,132,199,0.12);
  border-color: rgba(2,132,199,0.4);
}
[data-coreui-theme="dark"] .sapc-head strong { color: #7DD3FC; }
[data-coreui-theme="dark"] .sapc-head p { color: #A0A099; }
[data-coreui-theme="dark"] .sapc-field label { color: #A0A099; }
[data-coreui-theme="dark"] .sapc-input {
  background: #14140F;
  border-color: rgba(2,132,199,0.4);
  color: #7DD3FC;
}
</style>
