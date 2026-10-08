<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "SAlert", inheritAttrs: false })
//showIcon：状态图标冗余（WCAG 1.4.1：状态不能仅靠颜色传达）；默认关闭保持旧视觉
const props = withDefaults(defineProps<{ type?: string; title?: string; bordered?: boolean; showIcon?: boolean }>(), { type: "info", bordered: true })
const attrs = useAttrs()
</script>

<template>
  <div v-bind="attrs" :role="props.type === 'error' ? 'alert' : 'status'" :class="['s-alert', `type-${props.type}`, { bordered: props.bordered, 'show-icon': props.showIcon }]">
    <strong v-if="props.title" class="s-alert-title">{{ props.title }}</strong>
    <div class="s-alert-content"><slot /></div>
  </div>
</template>

<style scoped>
.s-alert { padding: 10px 12px; border-radius: var(--sui-radius-md); background: var(--sui-bg-soft); color: var(--sui-fg-secondary); font-size: 13px; line-height: 1.55; }
.s-alert.bordered { border: 1px solid var(--sui-border); }
.s-alert.type-error { border-color: color-mix(in srgb, var(--sui-error) 45%, transparent); color: var(--sui-error); }
.s-alert.type-warning { border-color: color-mix(in srgb, var(--sui-warning) 45%, transparent); }
.s-alert.type-info { border-color: color-mix(in srgb, var(--sui-info) 45%, transparent); }
/* 状态图标冗余：让状态不只靠色相区分（视觉层面；读屏语义由 role=alert/status 承担） */
.s-alert.show-icon.type-error::before { content: "✕"; margin-right: 6px; font-weight: 700; }
.s-alert.show-icon.type-warning::before { content: "⚠"; margin-right: 6px; }
.s-alert.show-icon.type-success::before { content: "✓"; margin-right: 6px; font-weight: 700; }
.s-alert.show-icon.type-info::before { content: "ⓘ"; margin-right: 6px; }
.s-alert-title { display: block; margin-bottom: 4px; }
</style>
