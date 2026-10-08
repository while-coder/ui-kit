<script lang="ts">
import { defineComponent, Fragment, h, nextTick, ref, watch, type VNode } from "vue"

function flattenVNodes(nodes: VNode[] = []): VNode[] {
  const result: VNode[] = []
  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) result.push(...flattenVNodes(node.children as VNode[]))
    else if (typeof node.type !== "symbol") result.push(node)
  }
  return result
}

let tabsId = 0

export default defineComponent({
  name: "STabs",
  inheritAttrs: false,
  emits: ["update:value"],
  props: { value: null, type: String, placement: String },
  setup(props, { attrs, emit, slots }) {
    const id = `s-tabs-${++tabsId}`
    const internal = ref<unknown>(props.value)
    watch(() => props.value, value => { if (value !== undefined) internal.value = value })
    return () => {
      const nodes = flattenVNodes(slots.default?.() as VNode[] ?? [])
      const items = nodes.filter(node => ["STabPane", "STab"].includes((node.type as any)?.name))
      if (internal.value == null && items.length) internal.value = items[0].props?.name
      const active = props.value !== undefined ? props.value : internal.value
      const choose = (value: unknown) => { internal.value = value; emit("update:value", value) }
      //roving tabindex：只有入口 tab（激活项；无匹配时退第一个）可 Tab 进入，其余 -1
      const activeIndex = items.findIndex(node => node.props?.name === active)
      const tabbable = activeIndex >= 0 ? activeIndex : 0
      const focusTab = (index: number) => nextTick(() => document.getElementById(`${id}-tab-${index}`)?.focus())
      const tabs = items.map((node, index) => {
        const nodeSlots = node.children as Record<string, () => unknown> | null
        const selected = node.props?.name === active
        return h("div", {
          id: `${id}-tab-${index}`,
          role: "tab",
          tabindex: index === tabbable ? 0 : -1,
          "aria-selected": selected,
          "aria-controls": (node.type as any)?.name === "STabPane" ? `${id}-panel-${index}` : undefined,
          class: ["s-tab-button", { active: selected }],
          onClick: () => choose(node.props?.name),
          onKeydown: (event: KeyboardEvent) => {
            //事件源自 tab 内子元素时交给它自己处理
            if (event.target !== event.currentTarget) return
            //自动激活模式：方向键/Home/End 移动焦点的同时切换激活，循环 wrap
            const count = items.length
            let target = -1
            if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % count
            else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index - 1 + count) % count
            else if (event.key === "Home") target = 0
            else if (event.key === "End") target = count - 1
            else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(node.props?.name); return }
            else return
            event.preventDefault()
            choose(items[target]?.props?.name)
            focusTab(target)
          },
        }, [
          nodeSlots?.tab?.() ?? node.props?.tab ?? node.props?.name,
          //count 徽标：原 SNavTab 的能力，并入后由 STab/STabPane 的 count prop 提供
          node.props?.count !== undefined && node.props?.count !== ""
            ? h("span", { class: ["s-tab-count", { active: selected }] }, String(node.props.count))
            : null,
        ])
      })
      const panes = items.flatMap((node, index) => (node.type as any)?.name === "STabPane"
        ? [h(node.type as any, { ...node.props, key: node.key ?? undefined, active: node.props?.name === active, tabId: `${id}-tab-${index}`, panelId: `${id}-panel-${index}` }, node.children as any)]
        : [])
      return h("div", { ...attrs, class: ["s-tabs", `type-${props.type ?? "line"}`, `placement-${props.placement ?? "top"}`, attrs.class] }, [h("div", { class: "s-tab-list", role: "tablist" }, tabs), h("div", { class: "s-tab-content" }, panes)])
    }
  },
})
</script>

<style scoped>
.s-tabs { display: flex; min-width: 0; min-height: 0; flex-direction: column; }
.s-tab-list { display: flex; min-height: 36px; flex: 0 0 auto; overflow-x: auto; border-bottom: 1px solid var(--sui-border); }
.s-tab-button { display: flex; flex: 0 0 auto; align-items: center; gap: 4px; padding: 8px 12px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--sui-fg-muted); cursor: pointer; white-space: nowrap; }
.s-tab-button:hover { background: var(--sui-bg-hover); color: var(--sui-fg); }
.s-tab-button.active { border-bottom-color: var(--sui-primary); color: var(--sui-primary); }
.s-tab-count { padding: 0 5px; border-radius: var(--sui-radius-pill); background: var(--sui-bg-soft); color: var(--sui-fg-muted); font-size: 11px; font-weight: 600; }
.s-tab-count.active { background: var(--sui-primary); color: var(--sui-on-primary); }
.s-tab-content { display: flex; min-width: 0; min-height: 0; flex: 1; flex-direction: column; overflow: hidden; }
.s-tabs.type-card > .s-tab-list .s-tab-button { border: 1px solid var(--sui-border); border-bottom: 0; border-radius: 6px 6px 0 0; }
.s-tabs.type-card > .s-tab-list .s-tab-button.active { border-color: var(--sui-border-strong); background: var(--sui-bg-soft); box-shadow: inset 0 2px 0 var(--sui-primary); }
.s-tabs.placement-left { flex-direction: row; }
.s-tabs.placement-left > .s-tab-list { width: 110px; flex-direction: column; border-right: 1px solid var(--sui-border); border-bottom: 0; }
.s-tabs.placement-left > .s-tab-list .s-tab-button { border-right: 2px solid transparent; border-bottom: 0; text-align: left; }
.s-tabs.placement-left > .s-tab-list .s-tab-button.active { border-right-color: var(--sui-primary); }
.s-tabs.placement-left > .s-tab-content { overflow: hidden; }
@media (max-width: 720px) {
  .s-tabs.placement-left { flex-direction: column; }
  .s-tabs.placement-left > .s-tab-list { width: auto; flex-direction: row; border-right: 0; border-bottom: 1px solid var(--sui-border); }
}
</style>
