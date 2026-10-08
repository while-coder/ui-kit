<script setup lang="ts">
import { computed, useAttrs } from "vue"

defineOptions({ name: "STable", inheritAttrs: false })
//尺寸词表规范 small/medium；xs/sm/md 为历史缩写归一（全库一条规则：xs/sm→small、md→medium）
const props = defineProps<{ bordered?: boolean; size?: string }>()
const attrs = useAttrs()
const normalizedSize = computed(() => {
  const raw = props.size ?? "medium"
  return raw === "xs" || raw === "sm" ? "small" : raw === "md" ? "medium" : raw
})
</script>

<template>
  <div class="s-table-wrap">
    <table v-bind="attrs" :class="['s-table', `size-${normalizedSize}`, { bordered }]">
      <slot />
    </table>
  </div>
</template>

<style scoped>
/* .s-table 基础样式在 shared.css（与 SDataTable 共用），这里放包裹层与 size 变体 */
.s-table-wrap { width: 100%; overflow: auto; }
.s-table.size-small { font-size: 12px; }
.s-table.size-small :deep(th), .s-table.size-small :deep(td) { padding: 5px 8px; }
</style>
