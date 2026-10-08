<script lang="ts">
import { defineComponent, Teleport, h, nextTick, onBeforeUnmount, ref, watch, type PropType } from "vue"
import type { SelectOption } from "./SSelect.vue"

export default defineComponent({
  name: "SDropdown",
  inheritAttrs: false,
  emits: ["select"],
  props: { show: Boolean, x: Number, y: Number, options: { type: Array as PropType<SelectOption[]>, default: () => [] }, onClickoutside: Function as PropType<() => void> },
  setup(props, { emit }) {
    const root = ref<HTMLElement | null>(null)
    const outside = (event: PointerEvent) => { if (props.show && root.value && !root.value.contains(event.target as Node)) props.onClickoutside?.() }
    //打开时记录触发元素，Esc 关闭后把焦点还回去（show 由父级控制，关闭走 onClickoutside 与点外部一致）
    let opener: HTMLElement | null = null
    const menuItems = () => Array.from(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
    const keydown = (event: KeyboardEvent) => {
      if (!props.show) return
      if (event.key === "Escape") {
        event.preventDefault()
        props.onClickoutside?.()
        opener?.focus()
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        //menu 内方向键在 menuitem 间移动焦点，循环 wrap；焦点还在 menu 外（触发器）时落首/末项
        const items = menuItems()
        if (!items.length) return
        const index = items.indexOf(document.activeElement as HTMLElement)
        const delta = event.key === "ArrowDown" ? 1 : -1
        const next = index < 0 ? (delta > 0 ? 0 : items.length - 1) : (index + delta + items.length) % items.length
        event.preventDefault()
        items[next]?.focus()
      }
    }
    watch(() => props.show, show => {
      if (show) {
        opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
        nextTick(() => document.addEventListener("pointerdown", outside))
        document.addEventListener("keydown", keydown)
      } else {
        document.removeEventListener("pointerdown", outside)
        document.removeEventListener("keydown", keydown)
      }
    }, { immediate: true })
    onBeforeUnmount(() => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", keydown)
    })
    const renderOptions = (options: SelectOption[]) => options.filter(option => option.show !== false).map(option => option.divider ? h("div", { class: "s-dropdown-divider", role: "separator" }) : option.children?.length ? h("div", { class: "s-dropdown-group" }, [h("div", { class: "s-dropdown-label" }, typeof option.label === "function" ? option.label() as any : (option.label ?? "")), h("div", { class: "s-dropdown-children" }, renderOptions(option.children))]) : h("button", { type: "button", role: "menuitem", class: "s-dropdown-item", disabled: option.disabled, onClick: () => emit("select", option.key ?? option.value) }, typeof option.label === "function" ? option.label() as any : (option.label ?? "")))
    return () => props.show ? h(Teleport, { to: "body" }, h("div", { ref: root, role: "menu", class: "s-dropdown", style: { left: `${props.x ?? 0}px`, top: `${props.y ?? 0}px` } }, renderOptions(props.options))) : null
  },
})
</script>

<style scoped>
.s-dropdown { position: fixed; z-index: var(--sui-z-dropdown); min-width: 150px; padding: 5px; border: 1px solid var(--sui-border); border-radius: var(--sui-radius-md); background: var(--sui-bg); box-shadow: var(--sui-shadow-lg); }
.s-dropdown-item { display: flex; width: 100%; padding: 7px 9px; border: 0; border-radius: 4px; background: transparent; color: var(--sui-fg-secondary); cursor: pointer; text-align: left; }
.s-dropdown-item:hover { background: var(--sui-bg-hover); }
.s-dropdown-label { padding: 5px 9px; color: var(--sui-fg-muted); font-size: 11px; }
.s-dropdown-children { padding-left: 4px; }
.s-dropdown-divider { height: 1px; margin: 4px 8px; background: var(--sui-border); }
</style>
