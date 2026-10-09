<script setup lang="ts">
import { computed } from "vue"

defineOptions({ name: "SBadge" })
//色相走 type（对齐全库 type-* class 约定）；尺寸词表：small/medium/large 三档（显式默认 medium）
const props = withDefaults(defineProps<{
  type?: "neutral" | "info" | "warning" | "success" | "error" | "accent" | "tool"
  /** 兼容别名（原 sbot 侧词表）：variant 即 type（type 优先） */
  variant?: "neutral" | "info" | "warning" | "success" | "error" | "accent" | "tool"
  size?: string
  pill?: boolean
}>(), { size: "medium" })
//type/variant 二选一（type 优先）；尺寸词表唯一 small/medium/large，缩写（xs/sm）已废除，不在源侧归一
const normalizedType = computed(() => props.type ?? props.variant ?? "neutral")
const cls = computed(() => ["s-badge", `type-${normalizedType.value}`, `size-${props.size}`, { pill: props.pill }])
</script>

<template>
  <span :class="cls"><slot /></span>
</template>

<style scoped>
.s-badge { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; border-radius: var(--sui-radius-sm); padding: 0 6px; line-height: 1.6; white-space: nowrap; }
.s-badge.size-small { font-size: 11px; min-width: 18px; }
.s-badge.size-medium { font-size: 12px; padding: 1px 8px; }
.s-badge.size-large { font-size: 13px; padding: 2px 10px; }
.s-badge.pill { border-radius: var(--sui-radius-pill); }
.s-badge.type-neutral { background: var(--sui-bg-soft); color: var(--sui-fg-muted); }
.s-badge.type-info { background: var(--sui-info-soft); color: var(--sui-on-info-soft); }
.s-badge.type-warning { background: var(--sui-warning-soft); color: var(--sui-on-warning-soft); }
.s-badge.type-success { background: var(--sui-success-soft); color: var(--sui-on-success-soft); }
.s-badge.type-error { background: var(--sui-error-soft); color: var(--sui-on-error-soft); }
/* 状态图标冗余：状态不只靠色相区分（WCAG 1.4.1） */
.s-badge.type-warning::before { content: "⚠ "; font-size: 9px; }
.s-badge.type-error::before { content: "✕ "; font-size: 9px; font-weight: 700; }
.s-badge.type-success::before { content: "✓ "; font-size: 9px; font-weight: 700; }
.s-badge.type-accent { background: color-mix(in srgb, var(--sui-primary) 16%, transparent); color: var(--sui-primary); }
.s-badge.type-tool { background: var(--sui-tool-bg); color: var(--sui-on-tool-bg); }
</style>
