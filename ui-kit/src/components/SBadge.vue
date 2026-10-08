<script setup lang="ts">
import { computed } from "vue"

defineOptions({ name: "SBadge" })
//色相走 type（对齐全库 type-* class 约定）；variant 为历史别名。
//size 规范词表 small/medium（xs/sm 为历史值归一），全库一条规则：xs/sm→small、md→medium
const props = defineProps<{
  type?: "neutral" | "info" | "warning" | "success" | "error" | "accent" | "tool"
  /** @deprecated 请用 type（色相放 variant 与全库 type-* 约定冲突） */
  variant?: "neutral" | "info" | "warning" | "success" | "accent" | "tool"
  size?: string
  pill?: boolean
}>()
const normalizedType = computed(() => props.type ?? props.variant ?? "neutral")
const normalizedSize = computed(() => {
  const raw = props.size ?? "small"
  return raw === "xs" || raw === "sm" ? "small" : raw === "md" ? "medium" : raw
})
const cls = computed(() => ["s-badge", `type-${normalizedType.value}`, `size-${normalizedSize.value}`, { pill: props.pill }])
</script>

<template>
  <span :class="cls"><slot /></span>
</template>

<style scoped>
.s-badge { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; border-radius: var(--sui-radius-sm); padding: 0 6px; line-height: 1.6; white-space: nowrap; }
.s-badge.size-small { font-size: 11px; min-width: 18px; }
.s-badge.size-medium { font-size: 12px; padding: 1px 8px; }
.s-badge.pill { border-radius: var(--sui-radius-pill); }
.s-badge.type-neutral { background: var(--sui-bg-soft); color: var(--sui-fg-muted); }
.s-badge.type-info { background: var(--sui-info-soft); color: var(--sui-on-info-soft); }
.s-badge.type-warning { background: var(--sui-warning-soft); color: var(--sui-on-warning-soft); }
.s-badge.type-success { background: var(--sui-success-soft); color: var(--sui-on-success-soft); }
.s-badge.type-error { background: var(--sui-danger-soft); color: var(--sui-on-danger-soft); }
/* 状态图标冗余：状态不只靠色相区分（WCAG 1.4.1） */
.s-badge.type-warning::before { content: "⚠ "; font-size: 9px; }
.s-badge.type-error::before { content: "✕ "; font-size: 9px; font-weight: 700; }
.s-badge.type-success::before { content: "✓ "; font-size: 9px; font-weight: 700; }
.s-badge.type-accent { background: color-mix(in srgb, var(--sui-primary) 16%, transparent); color: var(--sui-primary); }
.s-badge.type-tool { background: var(--sui-tool-bg); color: var(--sui-on-tool-bg); }
</style>
