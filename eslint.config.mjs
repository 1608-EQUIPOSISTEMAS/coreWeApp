import eslintPluginVue from 'eslint-plugin-vue'
import boundaries from 'eslint-plugin-boundaries'
import globals from 'globals'

// Fase 4 — enforcement de la regla de dependencia Feature-Sliced Design.
// Ver Frontend/FSD_GUIDE.md y docs/architecture/ADR-001. Una capa solo importa
// de capas por debajo. El mundo legacy (views/components/composables/services/
// stores/...) se tolera como zona de migracion: las slices FSD pueden apoyarse
// en el todavia, pero no al reves entre slices ni hacia arriba.
export default [
  { ignores: ['dist/', 'eslint.config.mjs'] },
  ...eslintPluginVue.configs['flat/essential'],
  {
    files: ['src/**/*.{js,vue}'],
    plugins: { boundaries },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*' },
        { type: 'pages', pattern: 'src/pages/*' },
        { type: 'widgets', pattern: 'src/widgets/*' },
        { type: 'features', pattern: 'src/features/*' },
        { type: 'entities', pattern: 'src/entities/*' },
        { type: 'shared', pattern: 'src/shared/*' },
        {
          type: 'legacy',
          pattern: [
            'src/views/*',
            'src/components/*',
            'src/composables/*',
            'src/services/*',
            'src/stores/*',
            'src/layouts/*',
            'src/directives/*',
            'src/router/*',
            'src/mock/*',
          ],
        },
      ],
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'vue/multi-word-component-names': 'off',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: { type: 'app' }, allow: { to: { type: ['pages', 'widgets', 'features', 'entities', 'shared', 'legacy'] } } },
            { from: { type: 'pages' }, allow: { to: { type: ['widgets', 'features', 'entities', 'shared', 'legacy'] } } },
            { from: { type: 'widgets' }, allow: { to: { type: ['features', 'entities', 'shared', 'legacy'] } } },
            { from: { type: 'features' }, allow: { to: { type: ['entities', 'shared', 'legacy'] } } },
            { from: { type: 'entities' }, allow: { to: { type: ['shared', 'legacy'] } } },
            { from: { type: 'shared' }, allow: { to: { type: ['shared', 'legacy'] } } },
            { from: { type: 'legacy' }, allow: { to: { type: ['app', 'pages', 'widgets', 'features', 'entities', 'shared', 'legacy'] } } },
          ],
        },
      ],
    },
  },
]
