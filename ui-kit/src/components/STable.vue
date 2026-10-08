<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "STable", inheritAttrs: false })
//尺寸词表：small/medium/large 三档（显式默认 medium；medium 即 shared.css 基础档）
const props = withDefaults(defineProps<{ bordered?: boolean; size?: string }>(), { size: "medium" })
const attrs = useAttrs()
</script>

<template>
  <div class="s-table-wrap">
    <table v-bind="attrs" :class="['s-table', `size-${props.size}`, { bordered }]">
      <slot />
    </table>
  </div>
</template>

<style scoped>
/* .s-table 基础样式在 shared.css（与 SDataTable 共用），这里放包裹层与 size 变体 */
.s-table-wrap { width: 100%; overflow: auto; }
.s-table.size-small { font-size: 12px; }
.s-table.size-small :deep(th), .s-table.size-small :deep(td) { padding: 5px 8px; }
.s-table.size-large { font-size: 14px; }
.s-table.size-large :deep(th), .s-table.size-large :deep(td) { padding: 9px 12px; }
</style>
