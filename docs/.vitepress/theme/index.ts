import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { getFluxDefaultStyles } from 'fluxmark'
import FluxExample from './components/playground/FluxExample.vue'
import PlaygroundWorkspace from './components/playground/PlaygroundWorkspace.vue'
import './components/playground/playground.css'
import './custom.css'

if (typeof document !== 'undefined' && document.getElementById('fluxmark-default-styles') === null) {
  const style = document.createElement('style')
  style.id = 'fluxmark-default-styles'
  style.textContent = getFluxDefaultStyles()
  document.head.appendChild(style)
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.component('PlaygroundWorkspace', PlaygroundWorkspace)
    app.component('FluxExample', FluxExample)
  },
}
