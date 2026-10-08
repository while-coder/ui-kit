<script setup lang="ts">
import { computed, useAttrs } from "vue"

defineOptions({ name: "STag", inheritAttrs: false })
//尺寸词表规范 small/medium；sm/md 为历史缩写归一（全库一条规则：sm→small、md→medium）
const props = withDefaults(defineProps<{ type?: string; size?: string; closable?: boolean; bordered?: boolean }>(), { type: "default", size: "medium", bordered: true })
const emit = defineEmits<{ close: [] }>()
const attrs = useAttrs()
const normalizedSize = computed(() => props.size === "sm" ? "small" : props.size === "md" ? "medium" : props.size)
</script>

<template>
  <span v-bind="attrs" :class="['s-tag', `type-${props.type}`, `size-${normalizedSize}`, { bordered: props.bordered }]">
    <slot />
    <button v-if="props.closable" type="button" class="s-tag-close" aria-label="移除" @click="emit('close')">×</button>
  </span>
</template>

<style scoped>
.s-tag { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 2px 8px; border-radius: var(--sui-radius-sm); background: var(--sui-bg-soft); color: var(--sui-fg-secondary); font-size: 12px; }
/* size 词表 medium(默认)/small：类名一直有生成，small 此前缺样式等于不生效 */
.s-tag.size-small { min-height: 20px; padding: 0 6px; font-size: 11px; }
.s-tag.bordered { border: 1px solid var(--sui-border); }
.s-tag.type-success { color: var(--sui-success); }
.s-tag.type-warning { color: var(--sui-warning); }
.s-tag.type-error { color: var(--sui-danger); }
.s-tag.type-info, .s-tag.type-primary { color: var(--sui-info); }
/* 状态图标冗余：状态不只靠色相区分（WCAG 1.4.1） */
.s-tag.type-warning::before { content: "⚠ "; font-size: 10px; }
.s-tag.type-error::before { content: "✕ "; font-size: 10px; font-weight: 700; }
.s-tag.type-success::before { content: "✓ "; font-size: 10px; font-weight: 700; }
.s-tag-close { border: 0; background: transparent; color: inherit; cursor: pointer; }
</style>
