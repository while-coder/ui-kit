<script lang="ts">
export interface SelectOption {
  /** divider 项不需要 label */
  label?: string | (() => unknown)
  value?: unknown
  key?: string | number
  disabled?: boolean
  show?: boolean
  /** 子菜单；父节点只展开，叶子项才触发选择。 */
  children?: SelectOption[]
  /** 分隔线项：不渲染成按钮，只画一条水平细线（用于把管理类动作和可选项隔开） */
  divider?: boolean
  /** 危险动作项：SDropdown 渲染为 error 色（删除/关闭等破坏性操作），与全库 error 色相词表一致 */
  error?: boolean
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, watch } from "vue"
import SCascadeMenu from "./SCascadeMenu.vue"

defineOptions({ name: "SSelect", inheritAttrs: false })
const props = withDefaults(defineProps<{
  value?: any
  options?: SelectOption[]
  multiple?: boolean
  /** 配合 multiple：单选菜单，值仍以数组回写，兼容原有调用。 */
  single?: boolean
  compact?: boolean
  singleLine?: boolean
  maxTagCount?: number
  placement?: "bottom" | "top"
  /** 菜单宽度；默认跟随触发器，最小 150px，并限制在视口内。 */
  menuWidth?: number
  disabled?: boolean
  placeholder?: string
  clearable?: boolean
  size?: string
  invalid?: boolean
}>(), { options: () => [], size: "medium" })
const emit = defineEmits<{ "update:value": [value: any]; change: [value: any]; select: [value: any] }>()
const attrs = useAttrs()
const rootAttrs = () => {
  return props.multiple ? attrs : { class: attrs.class, style: attrs.style }
}
const triggerAttrs = () => {
  if (props.multiple) return Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("aria-") || key === "title"))
  const result = { ...attrs }
  for (const key of ["class", "style", "name", "required"]) delete result[key]
  return result
}
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const cascadeMenu = ref<InstanceType<typeof SCascadeMenu> | null>(null)
const menuElement = () => menu.value ?? cascadeMenu.value?.root
const menuContains = (target: Node) => menu.value?.contains(target) || cascadeMenu.value?.contains(target)
const open = ref(false)
const menuId = `s-select-${useId()}`
const menuStyle = ref<Record<string, string>>({ visibility: "hidden" })
const multi = computed(() => props.multiple && !props.single)
const required = computed(() => attrs.required != null && attrs.required !== false)
const optionValue = (option: SelectOption): any => option.value ?? option.key ?? ""
const optionLabel = (option: SelectOption) => typeof option.label === "function" ? String(optionValue(option)) : (option.label ?? "")
const options = computed(() => props.options.filter(option => option.show !== false && !option.divider))
const cascading = computed(() => options.value.some(option => option.children?.length))
function collectLeaves(items: SelectOption[], disabled = false): SelectOption[] {
  return items.filter(option => option.show !== false && !option.divider).flatMap(option => {
    const unavailable = disabled || option.disabled
    return option.children?.length ? collectLeaves(option.children, unavailable)
      : [{ ...option, disabled: unavailable }]
  })
}
const leafOptions = computed(() => collectLeaves(options.value))
const selectedValues = computed(() => {
  if (!props.multiple) return props.value == null || props.value === "" ? [] : [props.value]
  if (Array.isArray(props.value)) return props.value
  if (typeof props.value === "string") return props.value.split(",").map(value => value.trim()).filter(Boolean)
  return props.value == null || props.value === "" ? [] : [props.value]
})
const isSelected = (option: SelectOption) => selectedValues.value.some(value => String(value) === String(optionValue(option)))
const selectedOptions = computed(() => leafOptions.value.filter(isSelected))
const visibleSelectedOptions = computed(() => {
  const limit = props.maxTagCount
  return limit == null || !Number.isFinite(limit)
    ? selectedOptions.value
    : selectedOptions.value.slice(0, Math.max(0, Math.floor(limit)))
})
const hiddenSelectedCount = computed(() => selectedOptions.value.length - visibleSelectedOptions.value.length)
const canClear = computed(() => props.clearable && selectedValues.value.length > 0 && !props.disabled)
const selectedLabel = computed(() => selectedOptions.value.map(optionLabel).join(", ") || (props.placeholder ?? "请选择"))

function update(value: any) {
  emit("update:value", value)
  emit("change", value)
}
function closeMenu(restoreFocus = false) {
  open.value = false
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}
function clearSelection() {
  update(props.multiple ? [] : undefined)
  closeMenu(true)
}
function pick(option: SelectOption) {
  if (props.disabled || option.disabled) return
  const value = optionValue(option)
  if (multi.value) {
    const next = selectedValues.value.filter(item => String(item) !== String(value))
    if (!isSelected(option)) next.push(value)
    update(next)
  } else {
    closeMenu(true)
    if (!isSelected(option)) update(props.multiple ? [value] : value)
  }
  // select 每次点选都触发，便于“自定义区间”等已选项再次打开编辑器。
  emit("select", value)
}

// 固定定位 + Teleport：菜单脱离表单/弹窗滚动容器，始终锚定触发器。
function positionMenu() {
  const rect = trigger.value?.getBoundingClientRect()
  const element = menuElement()
  if (!rect || !element) return
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
    closeMenu()
    return
  }
  const edge = 8
  const gap = 6
  const width = Math.min(props.menuWidth ?? Math.max(150, rect.width), window.innerWidth - edge * 2)
  const below = Math.max(0, window.innerHeight - rect.bottom - gap - edge)
  const above = Math.max(0, rect.top - gap - edge)
  const height = Math.min(320, element.scrollHeight + element.offsetHeight - element.clientHeight)
  const up = props.placement === "top"
    ? above >= height || above >= below
    : below < height && above > below
  const maxHeight = Math.min(320, up ? above : below)
  const top = up ? Math.max(edge, rect.top - gap - Math.min(height, maxHeight)) : rect.bottom + gap
  const left = Math.max(edge, Math.min(rect.left, window.innerWidth - width - edge))
  menuStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px`, maxHeight: `${maxHeight}px` }
}
const menuButtons = () => Array.from(menu.value?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])
async function showMenu() {
  if (props.disabled || open.value) return
  menuStyle.value = { visibility: "hidden" }
  open.value = true
  await nextTick()
  if (!open.value) return
  positionMenu()
  await nextTick()
  if (!open.value) return
  if (cascadeMenu.value) { cascadeMenu.value.focusFirst(true); return }
  const selected = menu.value?.querySelector<HTMLButtonElement>("button[aria-selected='true']:not(:disabled)")
  const target = selected ?? menuButtons()[0]
  target?.focus({ preventScroll: true })
  target?.scrollIntoView({ block: "nearest" })
}
function toggleMenu() {
  if (open.value) closeMenu(true)
  else void showMenu()
}
function triggerKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault()
    event.stopPropagation()
    void showMenu()
  }
}
function menuKeydown(event: KeyboardEvent) {
  if (event.key === "Tab") {
    // 把焦点还给触发器，默认 Tab 继续走表单顺序，弹窗也可继续圈围焦点。
    closeMenu(true)
    return
  }
  event.stopPropagation()
  if (event.key === "Escape") {
    event.preventDefault()
    closeMenu(true)
    return
  }
  const buttons = menuButtons()
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const index = event.key === "ArrowDown" ? Math.min(buttons.length - 1, current + 1)
    : event.key === "ArrowUp" ? Math.max(0, current - 1)
    : event.key === "Home" ? 0
    : event.key === "End" ? buttons.length - 1 : -1
  if (index < 0) return
  event.preventDefault()
  buttons[index]?.focus({ preventScroll: true })
  buttons[index]?.scrollIntoView({ block: "nearest" })
}
function outside(event: PointerEvent) {
  const target = event.target as Node
  if (!root.value?.contains(target) && !menuContains(target)) closeMenu()
}
function viewportChange(event: Event) {
  if (event.target instanceof Node && menuContains(event.target)) return
  positionMenu()
}
let observer: ResizeObserver | undefined
function stopListening() {
  document.removeEventListener("pointerdown", outside)
  window.removeEventListener("resize", viewportChange)
  window.removeEventListener("scroll", viewportChange, true)
  observer?.disconnect()
  observer = undefined
}
watch(open, async value => {
  stopListening()
  if (!value) return
  document.addEventListener("pointerdown", outside)
  window.addEventListener("resize", viewportChange)
  window.addEventListener("scroll", viewportChange, true)
  await nextTick()
  if (open.value && trigger.value && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(positionMenu)
    observer.observe(trigger.value)
    const element = menuElement()
    if (element) observer.observe(element)
  }
})
watch(() => props.disabled, disabled => { if (disabled) closeMenu() })
watch(() => props.options, async () => { if (open.value) { await nextTick(); positionMenu() } }, { deep: true })
onBeforeUnmount(stopListening)
</script>

<template>
  <div v-bind="rootAttrs()" ref="root" :class="[multiple ? 's-multi-select' : 's-single-select', { compact, single, 'single-line': singleLine, clearable: canClear }]">
    <button v-bind="triggerAttrs()" ref="trigger" type="button" class="s-select"
      :class="[multiple ? 's-multi-select-trigger' : 's-single-select-trigger', `size-${size}`, { invalid }]"
      :disabled="disabled" :aria-haspopup="cascading ? 'menu' : 'listbox'" :aria-expanded="open" :aria-controls="open ? menuId : undefined"
      :aria-invalid="invalid || undefined" @click="toggleMenu" @keydown="triggerKeydown">
      <span class="s-multi-select-value" :title="selectedLabel">
        <template v-if="!multi">
          <span v-if="selectedOptions.length" class="s-multi-select-single-value">{{ selectedLabel }}</span>
          <span v-else class="s-multi-select-placeholder">{{ placeholder ?? "请选择" }}</span>
        </template>
        <template v-else-if="selectedOptions.length">
          <span v-for="option in visibleSelectedOptions" :key="String(optionValue(option))" class="s-multi-select-chip">{{ optionLabel(option) }}</span>
          <span v-if="hiddenSelectedCount" class="s-multi-select-count">+{{ hiddenSelectedCount }}</span>
        </template>
        <span v-else class="s-multi-select-placeholder">{{ placeholder ?? "请选择" }}</span>
      </span>
      <svg :class="['s-multi-select-arrow', { open }]" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
    </button>
    <button v-if="canClear" type="button" class="s-multi-select-clear" title="清除选择" aria-label="清除选择" :disabled="disabled"
      @click.stop="clearSelection" @keydown.stop>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
    </button>
    <!-- 保留 name / required 的原生表单提交与约束校验；交互入口只有自绘触发器。 -->
    <select v-if="attrs.name != null || required" class="s-select-native" tabindex="-1" aria-hidden="true"
      :name="attrs.name as string" :required="required" :disabled="disabled" :multiple="multiple"
      :value="multiple ? selectedValues : value ?? ''" @focus="trigger?.focus({ preventScroll: true })">
      <option v-if="!multiple" value="" disabled>{{ placeholder ?? "请选择" }}</option>
      <option v-for="option in leafOptions" :key="String(optionValue(option))" :value="optionValue(option)" :disabled="option.disabled">{{ optionLabel(option) }}</option>
    </select>
    <SCascadeMenu v-if="open && cascading" :id="menuId" ref="cascadeMenu" :show="open"
      :options="options" :root-style="menuStyle" :selected="isSelected" :multiple="!!multi"
      :label="(attrs['aria-label'] as string) || selectedLabel" @select="pick" @close="closeMenu" />
    <Teleport to="body">
      <div v-if="open && !cascading" :id="menuId" ref="menu" class="s-select-menu" role="listbox" :aria-multiselectable="multi || undefined"
        :aria-label="(attrs['aria-label'] as string) || selectedLabel" :style="menuStyle" @keydown="menuKeydown">
        <div v-if="!options.length" class="s-multi-select-empty">—</div>
        <button v-for="(option, index) in options" :key="index" type="button" role="option" class="s-select-option"
          :class="{ checked: isSelected(option) }" :disabled="option.disabled" :aria-selected="isSelected(option)" @click="pick(option)">
          <svg class="s-select-check" :class="{ hidden: !isSelected(option) }" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>
          <span>{{ optionLabel(option) }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.s-select.invalid { border-color: var(--sui-error); }
.s-single-select, .s-multi-select { position: relative; width: 100%; min-width: 0; }
.s-single-select-trigger, .s-multi-select-trigger { display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; text-align: left; }
.s-select.size-small { min-height: 26px; padding: 3px 6px 3px 8px; font-size: 12px; }
.s-select.size-large { min-height: 38px; padding: 5px 8px 5px 10px; font-size: 14px; }
.s-multi-select.compact .s-multi-select-trigger { min-height: 26px; padding: 3px 6px 3px 8px; }
.s-multi-select-value { display: flex; flex: 1; min-width: 0; flex-wrap: wrap; gap: 4px; }
.s-single-select .s-multi-select-value, .s-multi-select.single .s-multi-select-value { flex-wrap: nowrap; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-multi-select-chip { padding: 1px 7px; border-radius: var(--sui-radius-pill); background: var(--sui-primary); color: var(--sui-on-primary); font-size: 12px; white-space: nowrap; }
.s-multi-select.compact .s-multi-select-chip { padding: 0 6px; font-size: 11px; }
.s-multi-select-single-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-multi-select-placeholder { color: var(--sui-fg-disabled); font-size: inherit; line-height: 1.6; }
.s-multi-select-arrow { width: 14px; height: 14px; flex: 0 0 auto; fill: none; stroke: var(--sui-fg-muted); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; transition: transform var(--sui-transition); }
.s-multi-select-arrow.open { transform: rotate(180deg); }
.s-multi-select.single-line .s-multi-select-value { flex-wrap: nowrap; align-items: center; overflow: hidden; }
.s-multi-select.single-line .s-multi-select-chip { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.s-multi-select-count { flex-shrink: 0; padding: 1px 5px; border-radius: 4px; background: color-mix(in srgb, var(--sui-primary) 14%, transparent); color: var(--sui-primary); font-size: 11px; line-height: 16px; }
.clearable .s-multi-select-value { margin-right: 22px; }
.s-multi-select-clear { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 22px; height: 22px; padding: 3px; border: 0; border-radius: 4px; background: transparent; color: var(--sui-fg-muted); cursor: pointer; }
.s-multi-select-clear:hover { color: var(--sui-fg); background: var(--sui-bg-hover); }
.s-multi-select-clear:focus-visible { outline: 2px solid var(--sui-primary); outline-offset: 1px; }
.s-multi-select-clear svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
.s-select-native { position: absolute; width: 1px; height: 1px; padding: 0; opacity: 0; pointer-events: none; }
.s-select-menu { position: fixed; z-index: var(--sui-z-dropdown); display: grid; gap: 2px; padding: 5px; overflow-y: auto; overscroll-behavior: contain; box-sizing: border-box; border: 1px solid var(--sui-border); border-radius: var(--sui-radius-md); background: var(--sui-bg); box-shadow: var(--sui-shadow-lg); color: var(--sui-fg); font: inherit; }
.s-select-option { display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; gap: 0; min-height: 34px; padding: 5px 9px; border: 0; border-radius: var(--sui-radius-sm); color: var(--sui-fg-secondary); background: transparent; text-align: left; cursor: pointer; font: inherit; font-size: 12px; }
.s-select-option:hover, .s-select-option:focus-visible { color: var(--sui-fg); background: var(--sui-bg-hover); outline: 0; }
.s-select-option.checked { color: var(--sui-fg); background: var(--sui-bg-active); }
.s-select-option:disabled { cursor: not-allowed; opacity: .5; }
.s-select-option > span { min-width: 0; overflow-wrap: anywhere; }
.s-select-check { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.s-select-check.hidden { visibility: hidden; }
.s-multi-select-empty { padding: 8px 12px; color: var(--sui-fg-disabled); font-size: 13px; }
@media (max-width: 640px) {
  .s-select-option { min-height: 36px; font-size: 13px; }
}
</style>
