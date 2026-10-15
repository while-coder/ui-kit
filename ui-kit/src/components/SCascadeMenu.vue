<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, type CSSProperties } from "vue"
import type { SelectOption } from "./SSelect.vue"

const props = defineProps<{
  show: boolean
  options: SelectOption[]
  rootStyle: CSSProperties
  label?: string
  id?: string
  rootClass?: string
  selected?: (option: SelectOption) => boolean
  multiple?: boolean
}>()
const emit = defineEmits<{ select: [option: SelectOption]; close: [restoreFocus: boolean] }>()
interface Branch { option: SelectOption; anchor: HTMLElement; style: CSSProperties }
const branches = shallowRef<Branch[]>([])
const root = shallowRef<HTMLElement | null>(null)
const elements = new Map<number, HTMLElement>()
const rootStyle = ref<CSSProperties>({})
const panels = computed(() => [
  { options: props.options, style: rootStyle.value },
  ...branches.value.map(branch => ({ options: branch.option.children ?? [], style: branch.style })),
])
let opener: HTMLElement | null = null
let hoverTimer: ReturnType<typeof setTimeout> | undefined
const EDGE = 8
const visible = (options: SelectOption[]) => options.filter(option => option.show !== false)
const contains = (target: Node) => [...elements.values()].some(element => element.contains(target))
const buttons = (level = 0) => Array.from(elements.get(level)?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])
function focusFirst(selected = false, level = 0) {
  const target = selected
    ? elements.get(level)?.querySelector<HTMLButtonElement>("button[aria-checked='true']:not(:disabled)") ?? buttons(level)[0]
    : buttons(level)[0]
  target?.focus({ preventScroll: true })
  target?.scrollIntoView({ block: "nearest" })
}
function setElement(level: number, element: any) {
  if (element) elements.set(level, element)
  else elements.delete(level)
  if (level === 0) root.value = element
}
function cancelHover() {
  clearTimeout(hoverTimer)
  hoverTimer = undefined
}
function panelScroll(level: number) {
  cancelHover()
  branches.value = branches.value.slice(0, level)
}
function panelLabel(level: number) {
  const label = level === 0 ? props.label : branches.value[level - 1]?.option.label
  return typeof label === "string" ? label : undefined
}
function close(restoreFocus = false) {
  cancelHover()
  branches.value = []
  emit("close", restoreFocus)
  if (restoreFocus) opener?.focus({ preventScroll: true })
}
async function positionRoot() {
  rootStyle.value = { ...props.rootStyle, visibility: "hidden" }
  await nextTick()
  const element = root.value
  if (!props.show || !element) return
  const x = parseFloat(String(props.rootStyle.left ?? 0))
  const y = parseFloat(String(props.rootStyle.top ?? 0))
  rootStyle.value = {
    ...props.rootStyle,
    left: `${Math.max(EDGE, Math.min(x, window.innerWidth - element.offsetWidth - EDGE))}px`,
    top: `${Math.max(EDGE, Math.min(y, window.innerHeight - element.offsetHeight - EDGE))}px`,
  }
}
async function expand(option: SelectOption, level: number, anchor: HTMLElement, focus = false) {
  cancelHover()
  if (option.disabled) return
  if (!option.children?.length) {
    branches.value = branches.value.slice(0, level)
    return
  }
  if (branches.value[level]?.option === option) {
    if (focus) focusFirst(false, level + 1)
    return
  }
  const branch: Branch = { option, anchor, style: { visibility: "hidden" } }
  branches.value = [...branches.value.slice(0, level), branch]
  await nextTick()
  const element = elements.get(level + 1)
  if (!element || branches.value[level] !== branch) return
  const rect = anchor.getBoundingClientRect()
  const parent = elements.get(level)?.getBoundingClientRect() ?? rect
  const width = element.offsetWidth
  const x = parent.right + width <= window.innerWidth - EDGE ? parent.right - 1 : parent.left - width + 1
  const style = {
    left: `${Math.max(EDGE, Math.min(x, window.innerWidth - width - EDGE))}px`,
    top: `${Math.max(EDGE, Math.min(rect.top - 5, window.innerHeight - element.offsetHeight - EDGE))}px`,
  }
  branches.value = branches.value.map((item, index) => index === level ? { ...branch, style } : item)
  if (focus) { await nextTick(); focusFirst(false, level + 1) }
}
function hover(option: SelectOption, level: number, event: PointerEvent) {
  if (event.pointerType === "touch") return
  cancelHover()
  const anchor = event.currentTarget as HTMLElement
  //给斜向移入已展开子菜单留时间，避免途经相邻行时立即切换。
  hoverTimer = setTimeout(() => void expand(option, level, anchor), 120)
}
function pick(option: SelectOption, level: number, event: MouseEvent) {
  cancelHover()
  if (option.disabled) return
  if (option.children?.length) void expand(option, level, event.currentTarget as HTMLElement, true)
  else emit("select", option)
}
function keydown(event: KeyboardEvent) {
  if (!props.show) return
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return }
  const active = document.activeElement as HTMLElement | null
  if (!active || (!contains(active) && active !== opener)) return
  if (event.key === "Tab") { close(true); return }
  const level = [...elements].find(([, element]) => element.contains(active))?.[0] ?? 0
  const items = buttons(level)
  const index = items.indexOf(active as HTMLButtonElement)
  const move = event.key === "ArrowDown" ? (index + 1) % items.length
    : event.key === "ArrowUp" ? (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length)
    : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1
  if (move >= 0 && items.length) {
    event.preventDefault()
    event.stopPropagation()
    cancelHover()
    branches.value = branches.value.slice(0, level)
    items[move]?.focus({ preventScroll: true })
    items[move]?.scrollIntoView({ block: "nearest" })
  } else if (event.key === "ArrowRight" && index >= 0) {
    event.preventDefault()
    event.stopPropagation()
    const optionIndex = Number(active.dataset.optionIndex)
    const option = visible(panels.value[level].options)[optionIndex]
    if (option) void expand(option, level, active, true)
  } else if (event.key === "ArrowLeft" && level > 0) {
    event.preventDefault()
    event.stopPropagation()
    const anchor = branches.value[level - 1]?.anchor
    cancelHover()
    branches.value = branches.value.slice(0, level - 1)
    anchor?.focus({ preventScroll: true })
  }
}
function outside(event: PointerEvent) {
  const target = event.target as Node
  if (!contains(target) && !opener?.contains(target)) close()
}
function viewportChange(event: Event) {
  if (event.target instanceof Node && contains(event.target)) return
  close()
}
function stopListening() {
  cancelHover()
  document.removeEventListener("pointerdown", outside)
  document.removeEventListener("keydown", keydown)
  window.removeEventListener("resize", viewportChange)
  window.removeEventListener("scroll", viewportChange, true)
}
watch(() => props.show, show => {
  stopListening()
  branches.value = []
  if (!show) return
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  void positionRoot()
  document.addEventListener("pointerdown", outside)
  document.addEventListener("keydown", keydown)
  window.addEventListener("resize", viewportChange)
  window.addEventListener("scroll", viewportChange, true)
}, { immediate: true })
watch(() => props.rootStyle, () => {
  if (!props.show) return
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body && !contains(active)) opener = active
  branches.value = []
  void positionRoot()
}, { deep: true })
watch(() => props.options, () => {
  branches.value = []
  if (props.show) void positionRoot()
}, { deep: true })
onBeforeUnmount(stopListening)
defineExpose({ root, contains, focusFirst })
</script>

<template>
  <Teleport to="body">
    <template v-if="show">
      <div v-for="(panel, level) in panels" :key="level" :ref="element => setElement(level, element)" :id="level === 0 ? id : undefined"
        class="s-cascade-menu" :class="level === 0 ? rootClass : undefined" role="menu" :aria-label="panelLabel(level)"
        :style="panel.style" @pointerenter="cancelHover" @scroll="panelScroll(level)">
        <template v-for="(option, index) in visible(panel.options)" :key="index">
          <div v-if="option.divider" class="s-cascade-divider" role="separator" />
          <button v-else type="button" class="s-cascade-item"
            :class="{ expanded: branches[level]?.option === option, checked: selected?.(option), error: option.error }"
            :role="selected && !option.children?.length ? (multiple ? 'menuitemcheckbox' : 'menuitemradio') : 'menuitem'"
            :aria-checked="selected && !option.children?.length ? selected(option) : undefined"
            :aria-haspopup="option.children?.length ? 'menu' : undefined"
            :aria-expanded="option.children?.length ? branches[level]?.option === option : undefined"
            :data-option-index="index" :disabled="option.disabled"
            @pointerenter="hover(option, level, $event)" @click="pick(option, level, $event)">
            <svg v-if="selected" class="s-cascade-check" :class="{ hidden: !selected(option) }" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>
            <span class="s-cascade-label"><component v-if="typeof option.label === 'function'" :is="option.label" /><template v-else>{{ option.label }}</template></span>
            <svg v-if="option.children?.length" class="s-cascade-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5" /></svg>
          </button>
        </template>
      </div>
    </template>
  </Teleport>
</template>

<style scoped>
.s-cascade-menu { position: fixed; z-index: var(--sui-z-dropdown); min-width: 150px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); box-sizing: border-box; padding: 5px; overflow-y: auto; overscroll-behavior: contain; border: 1px solid var(--sui-border); border-radius: var(--sui-radius-md); background: var(--sui-bg); box-shadow: var(--sui-shadow-lg); color: var(--sui-fg); font: inherit; }
.s-cascade-item { display: flex; width: 100%; min-height: 32px; align-items: center; gap: 8px; padding: 5px 9px; border: 0; border-radius: var(--sui-radius-sm); background: transparent; color: var(--sui-fg-secondary); cursor: pointer; text-align: left; font: inherit; font-size: 12px; }
.s-cascade-item:hover:not(:disabled), .s-cascade-item:focus-visible, .s-cascade-item.expanded { background: var(--sui-bg-hover); color: var(--sui-fg); }
.s-cascade-item:focus-visible { outline: 1px solid var(--sui-primary); outline-offset: -1px; }
.s-cascade-item.checked { background: var(--sui-bg-active); }
.s-cascade-item.error { color: var(--sui-error); }
.s-cascade-item:disabled { opacity: .5; cursor: not-allowed; }
.s-cascade-label { flex: 1; overflow-wrap: anywhere; }
.s-cascade-arrow, .s-cascade-check { width: 14px; height: 14px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.s-cascade-check.hidden { visibility: hidden; }
.s-cascade-divider { height: 1px; margin: 4px 8px; background: var(--sui-border); }
@media (max-width: 640px) { .s-cascade-item { min-height: 36px; font-size: 13px; } }
</style>
