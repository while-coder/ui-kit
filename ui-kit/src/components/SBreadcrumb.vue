<script lang="ts">
export interface BreadcrumbItem {
  /** 选中时抛出的稳定标识 */
  key: string | number
  label: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from "vue"

defineOptions({ name: "SBreadcrumb", inheritAttrs: false })
const props = withDefaults(defineProps<{
  items?: BreadcrumbItem[]
  /** 分隔符，仅作视觉呈现，不进入无障碍树 */
  separator?: string
  /** 最多渲染的节点数（含折叠项）；小于 3 时不做折叠 */
  maxItems?: number
}>(), { items: () => [], separator: "/", maxItems: 0 })

const emit = defineEmits<{ select: [key: string | number] }>()
const attrs = useAttrs()

type Row =
  | { type: "item"; item: BreadcrumbItem; index: number }
  | { type: "ellipsis"; hidden: BreadcrumbItem[] }

//固定策略：保留首项与末尾若干项，中间折叠；参数只是渲染数量，不改变层级语义
const rows = computed<Row[]>(() => {
  const items = props.items
  const max = props.maxItems
  if (!max || max < 3 || items.length <= max) {
    return items.map((item, index) => ({ type: "item" as const, item, index }))
  }
  const tail = max - 2
  const rest = items.slice(items.length - tail)
  return [
    { type: "item", item: items[0], index: 0 },
    { type: "ellipsis", hidden: items.slice(1, items.length - tail) },
    ...rest.map((item, offset) => ({ type: "item" as const, item, index: items.length - tail + offset })),
  ]
})
</script>

<template>
  <nav v-bind="attrs" class="s-breadcrumb" aria-label="面包屑">
    <ol class="s-breadcrumb-list">
      <li
        v-for="(row, position) in rows"
        :key="row.type === 'item' ? row.item.key : 'ellipsis'"
        class="s-breadcrumb-item"
      >
        <span
          v-if="position > 0"
          class="s-breadcrumb-sep"
          aria-hidden="true"
        >{{ separator }}</span>
        <span
          v-if="row.type === 'ellipsis'"
          class="s-breadcrumb-ellipsis"
          :title="row.hidden.map(item => item.label).join(separator)"
          aria-hidden="true"
        >…</span>
        <button
          v-else
          type="button"
          class="s-breadcrumb-link"
          :class="{ current: row.index === items.length - 1 }"
          :disabled="row.item.disabled"
          :aria-current="row.index === items.length - 1 ? 'page' : undefined"
          :title="row.item.label"
          @click="emit('select', row.item.key)"
        >
          <slot
            name="item"
            :item="row.item"
            :index="row.index"
          >{{ row.item.label }}</slot>
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.s-breadcrumb { min-width: 0; color: var(--sui-fg-secondary); font-size: 13px; }
.s-breadcrumb-list { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 0; padding: 0; list-style: none; }
.s-breadcrumb-item { display: inline-flex; min-width: 0; align-items: center; }
.s-breadcrumb-sep { padding: 0 2px; color: var(--sui-fg-disabled); user-select: none; }
.s-breadcrumb-link { max-width: 220px; padding: 2px 4px; overflow: hidden; border: 0; border-radius: var(--sui-radius-sm); background: transparent; color: inherit; cursor: pointer; font: inherit; text-overflow: ellipsis; white-space: nowrap; }
.s-breadcrumb-link:hover:not(:disabled) { background: var(--sui-bg-hover); color: var(--sui-primary); }
.s-breadcrumb-link:focus-visible { outline: 2px solid var(--sui-primary); outline-offset: -2px; }
.s-breadcrumb-link:disabled { cursor: default; opacity: 0.55; }
.s-breadcrumb-link.current { color: var(--sui-fg); font-weight: 600; }
.s-breadcrumb-ellipsis { padding: 2px 4px; color: var(--sui-fg-muted); cursor: default; user-select: none; }
</style>