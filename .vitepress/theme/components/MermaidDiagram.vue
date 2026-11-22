<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  code: string
}>()

const source = computed(() => decodeURIComponent(props.code))
const svg = ref('')
const error = ref('')
const scale = ref(1)
const expanded = ref(false)
const dialog = ref<HTMLDialogElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const intrinsicWidth = ref(0)
let renderGeneration = 0
const minimumDiagramWidth = 520

const diagramStyle = computed(() => ({
  width: `${scale.value * 100}%`,
  maxWidth: intrinsicWidth.value ? `${intrinsicWidth.value * scale.value}px` : undefined,
  minWidth: `${Math.round(Math.min(intrinsicWidth.value || minimumDiagramWidth, minimumDiagramWidth) * scale.value)}px`
}))

function extractIntrinsicWidth(svgMarkup: string) {
  const viewBox = svgMarkup.match(/\bviewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)/i)
  return viewBox ? Number(viewBox[1]) : 0
}

function captureViewportCenter() {
  const currentViewport = viewport.value
  if (!currentViewport) {
    return null
  }

  return {
    x: (currentViewport.scrollLeft + currentViewport.clientWidth / 2) / Math.max(currentViewport.scrollWidth, 1),
    y: (currentViewport.scrollTop + currentViewport.clientHeight / 2) / Math.max(currentViewport.scrollHeight, 1)
  }
}

async function restoreViewportCenter(center: { x: number; y: number } | null = { x: 0.5, y: 0.5 }) {
  await nextTick()

  const currentViewport = viewport.value
  if (!currentViewport || !center) {
    return
  }

  const maxLeft = Math.max(currentViewport.scrollWidth - currentViewport.clientWidth, 0)
  const maxTop = Math.max(currentViewport.scrollHeight - currentViewport.clientHeight, 0)

  currentViewport.scrollLeft = Math.min(
    maxLeft,
    Math.max(0, center.x * currentViewport.scrollWidth - currentViewport.clientWidth / 2)
  )
  currentViewport.scrollTop = Math.min(
    maxTop,
    Math.max(0, center.y * currentViewport.scrollHeight - currentViewport.clientHeight / 2)
  )
}

function setScale(nextScale: number) {
  const center = captureViewportCenter()
  scale.value = nextScale
  void restoreViewportCenter(center)
}

function zoomOut() {
  setScale(Math.max(0.75, Number((scale.value - 0.25).toFixed(2))))
}

function zoomIn() {
  setScale(Math.min(2.5, Number((scale.value + 0.25).toFixed(2))))
}

function resetZoom() {
  setScale(1)
}

async function openExpanded() {
  expanded.value = true
  await nextTick()
  dialog.value?.showModal()
  await restoreViewportCenter()
}

function closeExpanded() {
  dialog.value?.close()
  expanded.value = false
  void restoreViewportCenter()
}

function wrapDialogFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = dialog.value?.querySelectorAll('button:not(:disabled)')
  if (!buttons?.length) return

  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  const boundary = event.shiftKey ? first : last
  if (document.activeElement === boundary) {
    event.preventDefault()
    const next = event.shiftKey ? last : first
    next.focus()
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
      layout: 'dagre',
      look: 'classic',
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
      intrinsicWidth.value = extractIntrinsicWidth(rendered.svg)
      svg.value = rendered.svg
      void restoreViewportCenter()
    }
  } catch (err) {
    if (generation === renderGeneration) {
      intrinsicWidth.value = 0
      error.value = err instanceof Error ? err.message : String(err)
    }
  }
}

onMounted(renderDiagram)
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
        @click="openExpanded"
      >
        Fullscreen
      </button>
    </div>
    <div v-if="svg && !expanded" ref="viewport" class="mermaid-diagram__viewport">
      <div class="mermaid-diagram__svg" :style="diagramStyle" v-html="svg"></div>
    </div>
    <pre v-else-if="error" class="mermaid-diagram__error">{{ error }}</pre>
    <Teleport to="body">
      <dialog
        v-if="expanded"
        ref="dialog"
        class="mermaid-diagram__overlay"
        aria-label="Fullscreen diagram"
        @cancel.prevent="closeExpanded"
        @click.self="closeExpanded"
        @keydown="wrapDialogFocus"
      >
        <div class="mermaid-diagram__panel">
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
          <div ref="viewport" class="mermaid-diagram__viewport mermaid-diagram__viewport--overlay">
            <div class="mermaid-diagram__svg" :style="diagramStyle" v-html="svg"></div>
          </div>
        </div>
      </dialog>
    </Teleport>
  </figure>
</template>
