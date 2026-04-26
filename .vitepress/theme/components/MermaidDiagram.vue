<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  code: string
}>()

const source = computed(() => decodeURIComponent(props.code))
const svg = ref('')
const error = ref('')
const scale = ref(1)
const expanded = ref(false)
let renderGeneration = 0

const diagramStyle = computed(() => ({
  width: `${scale.value * 100}%`,
  minWidth: `${Math.round(520 * scale.value)}px`
}))

function zoomOut() {
  scale.value = Math.max(0.75, Number((scale.value - 0.25).toFixed(2)))
}

function zoomIn() {
  scale.value = Math.min(2.5, Number((scale.value + 0.25).toFixed(2)))
}

function resetZoom() {
  scale.value = 1
}

function closeExpanded() {
  expanded.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeExpanded()
  }
}

async function renderDiagram() {
  const generation = ++renderGeneration
  svg.value = ''
  error.value = ''

  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      htmlLabels: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        primaryColor: '#eff6ff',
        primaryTextColor: '#172033',
        primaryBorderColor: '#60a5fa',
        secondaryColor: '#ecfeff',
        secondaryTextColor: '#172033',
        secondaryBorderColor: '#22d3ee',
        tertiaryColor: '#f8fafc',
        tertiaryTextColor: '#172033',
        tertiaryBorderColor: '#cbd5e1',
        lineColor: '#64748b',
        noteBkgColor: '#fefce8',
        noteTextColor: '#172033',
        noteBorderColor: '#eab308'
      }
    })

    const id = `mermaid-${generation}-${Math.random().toString(36).slice(2)}`
    const rendered = await mermaid.render(id, source.value)
    if (generation === renderGeneration) {
      svg.value = rendered.svg
    }
  } catch (err) {
    if (generation === renderGeneration) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  renderDiagram()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
watch(source, renderDiagram)
</script>

<template>
  <figure class="mermaid-diagram">
    <div v-if="svg" class="mermaid-diagram__toolbar" aria-label="Diagram controls">
      <button type="button" class="mermaid-diagram__button" aria-label="Zoom out" @click="zoomOut">
        -
      </button>
      <button type="button" class="mermaid-diagram__button" aria-label="Reset zoom" @click="resetZoom">
        1:1
      </button>
      <button type="button" class="mermaid-diagram__button" aria-label="Zoom in" @click="zoomIn">
        +
      </button>
      <button
        type="button"
        class="mermaid-diagram__button"
        aria-label="Open fullscreen diagram"
        @click="expanded = true"
      >
        Fullscreen
      </button>
    </div>
    <div v-if="svg && !expanded" class="mermaid-diagram__viewport">
      <div class="mermaid-diagram__svg" :style="diagramStyle" v-html="svg"></div>
    </div>
    <pre v-else-if="error" class="mermaid-diagram__error">{{ error }}</pre>
    <Teleport to="body">
      <div v-if="expanded" class="mermaid-diagram__overlay" @click.self="closeExpanded">
        <div class="mermaid-diagram__panel" role="dialog" aria-modal="true" aria-label="Fullscreen diagram">
          <div class="mermaid-diagram__toolbar mermaid-diagram__toolbar--overlay">
            <button type="button" class="mermaid-diagram__button" aria-label="Zoom out" @click="zoomOut">
              -
            </button>
            <button type="button" class="mermaid-diagram__button" aria-label="Reset zoom" @click="resetZoom">
              1:1
            </button>
            <button type="button" class="mermaid-diagram__button" aria-label="Zoom in" @click="zoomIn">
              +
            </button>
            <button type="button" class="mermaid-diagram__button" aria-label="Close fullscreen diagram" @click="closeExpanded">
              Close
            </button>
          </div>
          <div class="mermaid-diagram__viewport mermaid-diagram__viewport--overlay">
            <div class="mermaid-diagram__svg" :style="diagramStyle" v-html="svg"></div>
          </div>
        </div>
      </div>
    </Teleport>
  </figure>
</template>
