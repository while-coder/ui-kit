<script lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, reactive, ref, unref, watch, type CSSProperties, type PropType, type Ref } from "vue"
import type { SelectOption } from "./SSelect.vue"

export interface DataTableColumn {
  title?: string
  key?: string
  width?: number
  /** 列宽下限（px），拖拽与双击自适应都不会小于该值；默认 72。 */
  minWidth?: number
  /** 列宽上限（px），拖拽与双击自适应都不会超过该值。 */
  maxWidth?: number
  resizable?: boolean
  align?: "left" | "center" | "right"
  ellipsis?: boolean
  render?: (row: any, index: number) => unknown
  sorter?: (left: any, right: any) => number
  filterOptions?: SelectOption[] | Ref<SelectOption[]>
  filter?: (value: unknown, row: any) => boolean
}

function valueAt(row: any, path?: string): unknown {
  if (!path) return ""
  return path.split(".").reduce((value, key) => value?.[key], row)
}

const px = (value: string | number | undefined, fallback = 8) =>
  typeof value === "number" ? `${value}px` : (value ?? `${fallback}px`)

export default defineComponent({
  name: "SDataTable",
  inheritAttrs: false,
  props: {
    columns: { type: Array as PropType<any[]>, default: () => [] },
    data: { type: Array as PropType<any[]>, default: () => [] },
    rowProps: Function as PropType<(row: any) => Record<string, unknown>>,
    maxHeight: [String, Number],
    minHeight: [String, Number],
    //表格本身的宽高约束：外层负责滚动，宽列场景不能只给滚动容器设最小宽度。
    tableStyle: Object as PropType<CSSProperties | undefined>,
    expandable: { type: Boolean, default: false },
    expandedKeys: { type: Array as PropType<(string | number)[]>, default: undefined },
    defaultExpandedKeys: { type: Array as PropType<(string | number)[]>, default: () => [] },
    rowKey: { type: [String, Function] as PropType<string | ((row: any, index: number) => string | number)>, default: undefined },
    renderExpand: { type: Function as PropType<(row: any, index: number) => unknown>, default: undefined },
    //选择：传入 selectedKeys 即受控；shift 范围与 ctrl/cmd 多选由组件处理
    selectable: { type: Boolean, default: false },
    selectionMode: { type: String as PropType<"single" | "multiple">, default: "multiple" },
    selectedKeys: { type: Array as PropType<(string | number)[]>, default: undefined },
    //多选时是否渲染勾选列；关闭后仍可用 ctrl/cmd 点击与 shift 范围选择
    showSelectionColumn: { type: Boolean, default: true },
    showSelectAll: { type: Boolean, default: true },
    emptyText: { type: String, default: "暂无数据" },
    //列宽拖拽：开启后所有列都可拖拽，单列可用 resizable: false 单独关闭
    resizable: { type: Boolean, default: false },
    //懒加载：显示遮罩并阻断交互，避免请求返回前误点到旧数据
    loading: { type: Boolean, default: false },
    loadingText: { type: String, default: "" },
  },
  emits: ["update:expandedKeys", "expand", "update:selectedKeys", "selectionChange", "sortChange"],
  setup(props, { attrs, emit }) {
    const sortKey = ref("")
    const sortDirection = ref<1 | -1>(1)
    const filters = reactive<Record<string, unknown>>({})
    const columnWidths = reactive<Record<string, number>>({})
    const rows = computed(() => {
      let result = [...props.data]
      for (const column of props.columns) {
        const key = column.key ?? ""
        if (column.filter && filters[key] !== undefined && filters[key] !== "") result = result.filter(row => column.filter?.(filters[key], row))
      }
      const column = props.columns.find(item => item.key === sortKey.value)
      if (column?.sorter) result.sort((left, right) => sortDirection.value * column.sorter!(left, right))
      return result
    })

    const isControlled = computed(() => props.expandedKeys !== undefined)
    const internalExpanded = ref<Set<string | number>>(new Set(props.defaultExpandedKeys ?? []))
    const expandedSet = computed(() => isControlled.value ? new Set(props.expandedKeys) : internalExpanded.value)
    watch(() => props.expandedKeys, value => { if (value !== undefined) internalExpanded.value = new Set(value) })

    function getRowKey(row: any, index: number): string | number {
      const rk = props.rowKey
      if (typeof rk === "function") return rk(row, index)
      if (typeof rk === "string") return row[rk] ?? row.key ?? row.uuid ?? index
      return row.key ?? row.uuid ?? index
    }
    function isExpanded(key: string | number): boolean { return expandedSet.value.has(key) }
    function toggleExpand(row: any, key: string | number): void {
      const next = new Set(expandedSet.value)
      const willExpand = !next.has(key)
      if (willExpand) next.add(key)
      else next.delete(key)
      if (!isControlled.value) internalExpanded.value = next
      emit("update:expandedKeys", Array.from(next))
      emit("expand", row, willExpand)
    }

    //多选且允许时才显示勾选列；单选只靠行高亮，避免一排 radio 按钮显得局促
    const hasSelectionColumn = computed(() => props.selectable && props.selectionMode === "multiple" && props.showSelectionColumn)
    const totalCols = computed(() => props.columns.length + (props.expandable ? 1 : 0) + (hasSelectionColumn.value ? 1 : 0))
    //选择状态：内部集合始终是最新值，selectedKeys 只作为外部同步源。
    //若直接读 props，受控方在 emit 后到重渲染前的这段时间里仍是旧值，连续点击会丢掉前一次选择。
    const internalSelected = ref<Set<string | number>>(new Set(props.selectedKeys ?? []))
    const selectedSet = computed<Set<string | number>>(() => internalSelected.value)
    const sameKeys = (set: Set<string | number>, keys: readonly (string | number)[]): boolean =>
      set.size === keys.length && keys.every(key => set.has(key))
    watch(() => props.selectedKeys, value => {
      if (value !== undefined && !sameKeys(internalSelected.value, value)) internalSelected.value = new Set(value)
    })
    //shift 范围的起点：只在普通点击与 ctrl/cmd 点击时更新
    const anchorIndex = ref<number | null>(null)
    const isSelected = (key: string | number): boolean => selectedSet.value.has(key)
    const allSelected = computed(() => rows.value.length > 0 && rows.value.every((row, index) => isSelected(getRowKey(row, index))))
    const someSelected = computed(() => rows.value.some((row, index) => isSelected(getRowKey(row, index))))
    function commitSelection(next: Set<string | number>): void {
      internalSelected.value = next
      const keys = Array.from(next)
      emit("update:selectedKeys", keys)
      emit("selectionChange", keys, rows.value.filter((row, index) => next.has(getRowKey(row, index))))
    }
    function selectRow(row: any, index: number, event: MouseEvent): void {
      const key = getRowKey(row, index)
      if (props.selectionMode === "single") {
        if (!isSelected(key) || selectedSet.value.size > 1) commitSelection(new Set([key]))
        anchorIndex.value = index
        return
      }
      const additive = event.ctrlKey || event.metaKey
      if (event.shiftKey && anchorIndex.value !== null) {
        //shift 范围：不按 ctrl 时替换选择，按住 ctrl/cmd 时在已有选择上追加，和多数文件管理器一致
        const next = additive ? new Set(selectedSet.value) : new Set<string | number>()
        const start = Math.min(anchorIndex.value, index)
        const end = Math.max(anchorIndex.value, index)
        for (let i = start; i <= end; i++) next.add(getRowKey(rows.value[i], i))
        commitSelection(next)
        return
      }
      const next = new Set(selectedSet.value)
      if (additive) {
        if (next.has(key)) next.delete(key)
        else next.add(key)
      } else {
        next.clear()
        next.add(key)
      }
      anchorIndex.value = index
      commitSelection(next)
    }
    function toggleRowSelection(row: any, index: number, checked: boolean): void {
      const key = getRowKey(row, index)
      if (props.selectionMode === "single") {
        commitSelection(checked ? new Set([key]) : new Set())
      } else {
        const next = new Set(selectedSet.value)
        if (checked) next.add(key)
        else next.delete(key)
        commitSelection(next)
      }
      anchorIndex.value = index
    }
    function toggleAll(checked: boolean): void {
      commitSelection(checked ? new Set(rows.value.map((row, index) => getRowKey(row, index))) : new Set())
    }

    const columnKey = (column: DataTableColumn, index: number) => String(column.key ?? index)
    //表格级 resizable 默认全开；列上的 resizable: false 可单独退出
    const isResizable = (column: DataTableColumn): boolean => props.resizable ? column.resizable !== false : column.resizable === true
    //开启表头拖拽时最后一列不设宽度，交给浏览器吸收剩余空间；否则所有列都固定后又会触发宽度分摊
    const columnWidth = (column: DataTableColumn, index: number) =>
      index === props.columns.length - 1 && props.columns.some(isResizable) ? undefined : (columnWidths[columnKey(column, index)] ?? column.width)
    //最后一列没有右邻居可借宽度，也不提供拖拽柄
    const showResizeHandle = (column: DataTableColumn, index: number): boolean =>
      isResizable(column) && index < props.columns.length - 1
    //拖动开始时把除最后一列外的实际宽度固定住：表格是 width:100% 的固定布局，
//若保留多个自适应列，浏览器会把宽度差重新分摊，鼠标与分隔线就会脱节。
    //最后一列始终自适应，用来吸收其它列宽度的增减，所以不写入固定宽度。
    const snapshotColumnWidths = (table: HTMLTableElement | null) => {
      const cells = Array.from(table?.querySelectorAll<HTMLElement>("thead tr > th") ?? [])
        .filter(cell => !cell.classList.contains("s-table-select-th") && !cell.classList.contains("s-table-expand-th"))
      cells.forEach((cell, index) => {
        const column: DataTableColumn | undefined = props.columns[index]
        if (!column) return
        const key = columnKey(column, index)
        if (index === props.columns.length - 1) {
          delete columnWidths[key]
          return
        }
        //每次拖动都重新读取当前渲染宽度：容器尺寸变化后旧的记录会与视觉不一致，直接沿用会跳一下
        const width = Math.round(cell.getBoundingClientRect().width)
        if (width > 0) columnWidths[key] = width
      })
    }
    //列宽的可调范围：同时受列自身 minWidth/maxWidth 与容器剩余空间约束。
    //除最后一列外，最大值要给最后一列留出最小宽度，否则它会被挤成 0。
    const columnBounds = (handle: HTMLElement, column: DataTableColumn, index: number) => {
      const min = column.minWidth ?? 72
      const declaredMax = column.maxWidth ?? Number.POSITIVE_INFINITY
      if (index >= props.columns.length - 1) return { min, max: Math.max(min, declaredMax) }
      const table = handle.closest("table") as HTMLTableElement | null
      const scroller = handle.closest(".s-data-table-scroll") as HTMLElement | null
      const available = scroller?.clientWidth ?? Math.round(table?.getBoundingClientRect().width ?? 0)
      const othersWidth = props.columns.reduce((total, item, i) => {
        if (i === index || i === props.columns.length - 1) return total
        return total + (columnWidths[columnKey(item, i)] ?? item.width ?? item.minWidth ?? 120)
      }, 0)
      const lastMin = props.columns[props.columns.length - 1]?.minWidth ?? 72
      const fitMax = available > 0 ? available - othersWidth - lastMin : Number.POSITIVE_INFINITY
      //maxWidth 比可用空间还小、或用最小值已经超出容器时，至少允许最小值，避免拖不动
      return { min, max: Math.max(min, Math.min(declaredMax, fitMax)) }
    }
    //列宽拖拽的活动清理句柄：pointercancel/组件卸载都会走到，避免监听残留后鼠标移动继续改列宽
    let activeResizeCleanup: (() => void) | null = null
    const StartResize = (event: PointerEvent, column: DataTableColumn, index: number) => {
      if (index >= props.columns.length - 1) return
      //不能在这里 preventDefault：它会抑制随后的鼠标兼容事件，双击分隔线就收不到 dblclick
      event.stopPropagation()
      //上一次拖动没收到 pointerup（例如在窗口外松开）时监听会残留，先清掉再开始新的拖动
      activeResizeCleanup?.()
      const handle = event.currentTarget as HTMLElement
      const table = handle.closest("table") as HTMLTableElement | null
      const header = handle.parentElement
      const key = columnKey(column, index)
      //以按下时的实际渲染宽度为基准：容器尺寸变化后缓存值可能已经过期
      const startWidth = Math.round(header?.getBoundingClientRect().width ?? column.width ?? 120)
      const startX = event.clientX
      const pointerId = event.pointerId
      let dragging = false
      let bounds = { min: column.minWidth ?? 72, max: Number.POSITIVE_INFINITY }
      //只调整当前列：其余列宽度不动，最后一列自适应吸收差值，分隔线就会严格跟随鼠标
      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return
        const distance = Math.round(moveEvent.clientX - startX)
        if (!dragging) {
          //单击（没有真正移动）不改动任何列宽；超过阈值才进入拖动，并在此刻固定其余列，
          //否则表格的固定布局会把宽度差重新分摊，鼠标和分隔线就会脱节
          if (Math.abs(distance) < 3) return
          snapshotColumnWidths(table)
          bounds = columnBounds(handle, column, index)
          dragging = true
        }
        columnWidths[key] = Math.max(bounds.min, Math.min(bounds.max, startWidth + distance))
      }
      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return
        cleanup()
      }
      const cleanup = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        window.removeEventListener("pointercancel", onUp)
        try { handle.releasePointerCapture(pointerId) } catch { /* 指针可能已释放 */ }
        activeResizeCleanup = null
      }
      activeResizeCleanup = cleanup
      //捕获指针：拖出窗口再松开也能收到 pointerup，否则监听会残留并继续跟着鼠标改宽度
      try { handle.setPointerCapture(pointerId) } catch { /* 不支持时退回普通监听 */ }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      window.addEventListener("pointercancel", onUp)
    }
    //双击分隔线：按内容宽度自动适应，结果仍夹在 minWidth/maxWidth 之间
    const AutoFitColumn = (event: MouseEvent, column: DataTableColumn, index: number) => {
      event.preventDefault()
      event.stopPropagation()
      const handle = event.currentTarget as HTMLElement
      const table = handle.closest("table") as HTMLTableElement | null
      const header = handle.parentElement as HTMLElement | null
      if (!table || !header) return
      snapshotColumnWidths(table)
      //临时切成内容自适应布局，量出这一列的自然宽度后立刻还原：
      //整个过程在同一帧内完成，不会出现可见的闪烁
      const previousLayout = table.style.tableLayout
      const previousTableWidth = table.style.width
      const previousWidth = header.style.width
      let natural = 0
      try {
        header.style.width = "auto"
        table.style.tableLayout = "auto"
        table.style.width = "max-content"
        natural = Math.round(header.getBoundingClientRect().width)
      } finally {
        table.style.tableLayout = previousLayout
        table.style.width = previousTableWidth
        header.style.width = previousWidth
      }
      const bounds = columnBounds(handle, column, index)
      columnWidths[columnKey(column, index)] = Math.max(bounds.min, Math.min(bounds.max, natural || bounds.min))
    }
    onBeforeUnmount(() => activeResizeCleanup?.())

    return () => h("div", { ...attrs, class: ["s-data-table", attrs.class], "aria-busy": props.loading ? "true" : undefined, style: [{ maxHeight: props.maxHeight == null ? undefined : px(props.maxHeight as any), minHeight: props.minHeight == null ? undefined : px(props.minHeight as any) }, attrs.style] }, [
      h("div", { class: "s-data-table-scroll" }, h("table", { class: ["s-table", { resizable: props.columns.some(isResizable) }], style: props.tableStyle }, [
      h("thead", h("tr", [
        ...(hasSelectionColumn.value ? [h("th", { class: "s-table-select-th" }, props.showSelectAll ? h("input", {
          type: "checkbox",
          class: "s-table-select",
          checked: allSelected.value,
          ref: (element: any) => { if (element) element.indeterminate = someSelected.value && !allSelected.value },
          "aria-label": "全选",
          onChange: (event: Event) => toggleAll((event.target as HTMLInputElement).checked),
        }) : undefined)] : []),
        ...(props.expandable ? [h("th", { class: "s-table-expand-th" })] : []),
        ...props.columns.map((column, index) => h("th", { "aria-sort": sortKey.value === column.key ? (sortDirection.value === 1 ? "ascending" : "descending") : column.sorter ? "none" : undefined, style: { width: columnWidth(column, index) == null ? undefined : px(columnWidth(column, index)), minWidth: column.minWidth == null ? undefined : px(column.minWidth), textAlign: column.align } }, [
          h("div", { class: "s-table-heading" }, [column.sorter ? h("button", { type: "button", class: ["s-table-sort", { active: sortKey.value === column.key }], title: String(column.title ?? ""), onClick: () => { if (sortKey.value === column.key) sortDirection.value = sortDirection.value === 1 ? -1 : 1; else { sortKey.value = column.key ?? ""; sortDirection.value = 1 } emit("sortChange", { key: sortKey.value, direction: sortDirection.value }) } }, `${column.title ?? ""}${sortKey.value === column.key ? (sortDirection.value === 1 ? " ↑" : " ↓") : ""}`) : h("span", { title: String(column.title ?? "") }, column.title ?? ""),
            unref(column.filterOptions)?.length ? h("select", { class: "s-table-filter", value: filters[column.key ?? ""] ?? "", "aria-label": `筛选${column.title ?? ""}`, onChange: (event: Event) => { filters[column.key ?? ""] = (event.target as HTMLSelectElement).value } }, [h("option", { value: "" }, "全部"), ...unref(column.filterOptions).map((option: SelectOption) => h("option", { value: option.value }, typeof option.label === "string" ? option.label : String(option.value ?? "")))]) : null
          ]),
          showResizeHandle(column, index) ? h("span", { class: "s-table-resize", role: "separator", tabindex: 0, title: "拖动调整列宽，双击按内容自动适应", "aria-label": `调整${column.title ?? ""}列宽`, onPointerdown: (event: PointerEvent) => StartResize(event, column, index), onDblclick: (event: MouseEvent) => AutoFitColumn(event, column, index) }) : null
        ]))
      ])),
      h("tbody", rows.value.length ? rows.value.flatMap((row, index) => {
        const key = getRowKey(row, index)
        const expanded = props.expandable && isExpanded(key)
        const selected = props.selectable && isSelected(key)
        const rowAttrs = props.rowProps?.(row) ?? {}
        const rowOnClick = rowAttrs.onClick as ((event: MouseEvent) => void) | undefined
        //data-row-key 供使用方定位行元素（如框选）：不暴露 ref 也能拿到稳定的行标识
        const mainRow = h("tr", {
          ...rowAttrs,
          key,
          "data-row-key": key,
          "aria-selected": props.selectable ? selected : undefined,
          class: [rowAttrs.class, {
            "s-table-row--expandable": props.expandable,
            "s-table-row--selectable": props.selectable,
            "s-table-row--expanded": expanded,
            "s-table-row--selected": selected,
          }],
          onClick: (event: MouseEvent) => {
            rowOnClick?.(event)
            if (event.defaultPrevented) return
            if ((event.target as HTMLElement).closest("button, input, select, textarea, a")) return
            if (props.selectable) selectRow(row, index, event)
            else if (props.expandable) toggleExpand(row, key)
          },
        }, [
          ...(hasSelectionColumn.value ? [h("td", {
            class: "s-table-select-cell",
            //整格可点：点在 14px 复选框之外也不会落到「整行替换选择」上
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              toggleRowSelection(row, index, !selected)
            },
            //双击勾选列不应触发行自己的双击行为（如进入目录）
            onDblclick: (event: MouseEvent) => event.stopPropagation(),
          }, h("input", {
            type: "checkbox",
            class: "s-table-select",
            checked: selected,
            tabindex: -1,
            "aria-label": "选择行",
            onClick: (event: MouseEvent) => event.stopPropagation(),
            onChange: (event: Event) => toggleRowSelection(row, index, (event.target as HTMLInputElement).checked),
          }))] : []),
          ...(props.expandable ? [h("td", { class: "s-table-expand-cell" }, h("button", {
            type: "button",
            class: "s-table-expand-button",
            "aria-label": expanded ? "收起详情" : "展开详情",
            "aria-expanded": expanded,
            onClick: (event: MouseEvent) => { event.stopPropagation(); toggleExpand(row, key) },
          }, h("span", { class: "s-table-expand-icon", "aria-hidden": "true" }, expanded ? "▼" : "▶")))] : []),
          ...props.columns.map(column => h("td", { class: { "s-table-cell--ellipsis": column.ellipsis }, style: { textAlign: column.align } }, column.render ? column.render(row, index) as any : String(valueAt(row, column.key) ?? "")))
        ])
        if (!props.expandable || !expanded) return [mainRow]
        const expandRow = h("tr", { class: "s-table-expanded-row", key: `${key}__expand` }, [
          ...(hasSelectionColumn.value ? [h("td", { class: "s-table-expanded-spacer", "aria-hidden": "true" })] : []),
          h("td", { class: "s-table-expanded-spacer", "aria-hidden": "true" }),
          h("td", { colspan: props.columns.length, class: "s-table-expanded-cell" }, props.renderExpand?.(row, index) as any),
        ])
        return [mainRow, expandRow]
      }) : h("tr", h("td", { colspan: totalCols.value || 1 }, h("div", { class: "s-empty" }, props.emptyText))))
      ])),
      props.loading ? h("div", { class: "s-data-table-mask", role: "status" }, [
        h("span", { class: "s-spinner large", "aria-hidden": "true" }),
        props.loadingText ? h("span", null, props.loadingText) : null,
      ]) : null,
    ])
  },
})
</script>

<style scoped>
/* .s-table 基础样式在 style.css（与 STable 共用） */
.s-data-table { position: relative; width: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.s-data-table-scroll { flex: 1; min-height: 0; overflow: auto; }
.s-data-table-mask { position: absolute; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; background: color-mix(in srgb, var(--sui-bg) 72%, transparent); color: var(--sui-primary); cursor: progress; }
.s-table.resizable { table-layout: fixed; }
.s-table-heading { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 5px; }
.s-table th:has(.s-table-resize) { position: sticky; user-select: none; }
.s-table-resize { position: absolute; top: 0; right: -4px; bottom: 0; z-index: 2; width: 8px; cursor: col-resize; touch-action: none; }
.s-table th:last-child .s-table-resize { right: 0; }
.s-table-resize::after { position: absolute; top: 9px; bottom: 9px; left: 3px; width: 2px; border-radius: 2px; background: color-mix(in srgb, var(--sui-primary) 72%, transparent); content: ""; }
.s-table-resize:hover::after, .s-table-resize:focus-visible::after { top: 5px; bottom: 5px; left: 2px; width: 4px; background: var(--sui-primary); box-shadow: 0 0 8px color-mix(in srgb, var(--sui-primary) 55%, transparent); }
.s-table-resize:focus-visible { outline: 0; }
.s-table-heading > span, .s-table-sort { min-width: 0; min-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-table-sort { width: 100%; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; font-weight: 600; text-align: left; }
.s-table-sort.active { color: var(--sui-primary); }
.s-table-filter { width: 100%; min-width: 56px; max-width: 100%; height: 26px; padding: 2px 6px; border: 1px solid var(--sui-border-strong); border-radius: var(--sui-radius-sm); background: var(--sui-bg); color: var(--sui-fg); cursor: pointer; font-size: 12px; }
.s-table-cell--ellipsis { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-table-expand-th { width: 32px; padding: 8px 4px; }
.s-table-expand-cell { width: 32px; padding: 6px 4px; text-align: center; user-select: none; }
.s-table-expand-button { display: inline-grid; width: 24px; height: 24px; padding: 0; place-items: center; border: 0; border-radius: var(--sui-radius-sm); background: transparent; color: var(--sui-fg-muted); cursor: pointer; }
.s-table-expand-button:hover { background: var(--sui-bg-hover); color: var(--sui-fg); }
.s-table-expand-button:focus-visible { outline: 2px solid var(--sui-primary); outline-offset: 1px; }
.s-table-expand-icon { display: inline-block; font-size: 10px; line-height: 1; }
.s-table-row--expandable { cursor: pointer; }
.s-table-select-th, .s-table-select-cell { width: 34px; padding: 8px 4px; text-align: center; user-select: none; }
.s-table-select-cell { cursor: pointer; }
.s-table-select { width: 14px; height: 14px; margin: 0; accent-color: var(--sui-primary); cursor: pointer; vertical-align: middle; }
.s-table-row--selectable { cursor: pointer; }
/* 选中态需要压过 shared.css 的 tr:hover 规则 */
.s-table-row--selected td, .s-table-row--selected:hover td { background: var(--sui-bg-active); }
.s-table-row--expanded > td { background: var(--sui-bg-soft); }
.s-table-expanded-row > td { background: var(--sui-bg-soft); border-bottom: 1px solid var(--sui-border); }
.s-table-expanded-spacer { width: 32px; padding: 0; }
.s-table-expanded-cell { padding: 8px 12px; }
</style>
