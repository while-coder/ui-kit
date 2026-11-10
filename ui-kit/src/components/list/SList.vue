<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, onMounted, ref, useAttrs, watch } from "vue"

defineOptions({ name: "SList", inheritAttrs: false })
const props = withDefaults(defineProps<{
  bordered?: boolean
  /** 在此容器顶部下拉，松手触发 refresh；容器本身须可滚动。 */
  pullToRefresh?: boolean
  refreshDisabled?: boolean
  /** 下拉阻尼后的触发距离，单位 px。 */
  refreshThreshold?: number
}>(), { refreshThreshold: 56 })
const emit = defineEmits<{
  /** 刷新完成（包括失败）后调用 done，结束加载状态。 */
  refresh: [done: () => void]
}>()
const attrs = useAttrs()
const element = ref<HTMLElement | null>(null)
const distance = ref(0)
const refreshing = ref(false)
const pulling = ref(false)
const threshold = computed(() => Math.max(24, props.refreshThreshold))
const ready = computed(() => distance.value >= threshold.value)
let startX = 0
let startY = 0
let tracking: "touch" | "mouse" | null = null
let suppressClickUntil = 0

function cancel() {
  tracking = null
  pulling.value = false
  distance.value = 0
}
function start(x: number, y: number, target: EventTarget | null, input: "touch" | "mouse") {
  cancel()
  if (!props.pullToRefresh || props.refreshDisabled || refreshing.value || !element.value || element.value.scrollTop > 0) return
  if (!(target instanceof Element) || target.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [data-no-pull-refresh]")) return
  if (input === "mouse" && target.closest("button, a")) return
  // A nested scroller owns gestures that begin inside it.
  for (let node = target; node !== element.value; node = node.parentElement!) {
    if (!node || node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return
  }
  startX = x
  startY = y
  tracking = input
}
function move(x: number, y: number, event: Event) {
  if (!tracking) return
  const dx = Math.abs(x - startX)
  const dy = y - startY
  if (!pulling.value) {
    if (Math.max(dx, Math.abs(dy)) < 8) return
    if (dy <= 0 || dx >= dy || (element.value?.scrollTop ?? 0) > 0) { cancel(); return }
    pulling.value = true
  }
  if (!event.cancelable) { cancel(); return }
  event.preventDefault()
  distance.value = Math.min(threshold.value + 28, Math.max(0, dy * 0.45))
}
function release() {
  if (!tracking) return
  const trigger = pulling.value && ready.value && !props.refreshDisabled
  if (pulling.value) suppressClickUntil = Date.now() + 400
  cancel()
  if (trigger) {
    refreshing.value = true
    emit("refresh", () => { refreshing.value = false })
  }
}
function touchStart(event: TouchEvent) {
  if (event.touches.length !== 1) { cancel(); return }
  const touch = event.touches[0]!
  start(touch.clientX, touch.clientY, event.target, "touch")
}
function touchMove(event: TouchEvent) {
  if (tracking !== "touch") return
  if (event.touches.length !== 1) { cancel(); return }
  const touch = event.touches[0]!
  move(touch.clientX, touch.clientY, event)
}
function mouseMove(event: MouseEvent) {
  if (tracking !== "mouse") return
  if (!(event.buttons & 1)) { cancel(); return }
  move(event.clientX, event.clientY, event)
}
function click(event: MouseEvent) {
  if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation() }
}
watch(() => [props.pullToRefresh, props.refreshDisabled], cancel)
onDeactivated(cancel)
onMounted(() => {
  window.addEventListener("mousemove", mouseMove, { passive: false })
  window.addEventListener("mouseup", release)
  window.addEventListener("blur", cancel)
})
onBeforeUnmount(() => {
  window.removeEventListener("mousemove", mouseMove)
  window.removeEventListener("mouseup", release)
  window.removeEventListener("blur", cancel)
})
defineExpose({ element })
</script>

<template>
  <div ref="element" v-bind="attrs" :class="['s-list', { bordered, 'pull-enabled': pullToRefresh, pulling }]"
    :aria-busy="refreshing || attrs['aria-busy'] === true || attrs['aria-busy'] === 'true' || undefined"
    @touchstart.capture="touchStart" @touchmove.capture="touchMove" @touchend.capture="release" @touchcancel.capture="cancel"
    @mousedown="($event.button === 0) && start($event.clientX, $event.clientY, $event.target, 'mouse')"
    @click.capture="click">
    <div v-if="pullToRefresh" class="s-list-refresh" :style="{ height: `${refreshing ? threshold : distance}px` }"
      role="status" aria-live="polite" aria-atomic="true">
      <template v-if="refreshing || pulling">
        <span v-if="refreshing" class="s-spinner" aria-hidden="true" />
        <span>{{ refreshing ? '正在刷新…' : ready ? '松开刷新' : '下拉刷新' }}</span>
      </template>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.s-list.bordered { border: 1px solid var(--sui-border); border-radius: var(--sui-radius-md); overflow: hidden; }
.s-list.pull-enabled { overflow-y: auto; overscroll-behavior-y: contain; }
.s-list.pulling { user-select: none; -webkit-user-select: none; cursor: grabbing; }
.s-list-refresh { display: flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; color: var(--sui-fg-muted); font-size: 12px; pointer-events: none; }
</style>
