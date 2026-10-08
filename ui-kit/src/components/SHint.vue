<script setup lang="ts">
defineOptions({ name: "SHint" })
//色相词表与全库一致：default/warning/error/info（历史 danger 别名已删，统一用 error）
const props = withDefaults(defineProps<{ type?: "default" | "warning" | "error" | "info" }>(), { type: "default" })
</script>

<template>
  <span :class="['s-hint', `type-${props.type}`]"><slot /></span>
</template>

<style scoped>
.s-hint { display: inline-block; font-size: 11px; color: var(--sui-fg-disabled); margin-top: 2px; }
.s-hint.type-warning { color: var(--sui-warning-fg); }
.s-hint.type-error { color: var(--sui-danger); }
.s-hint.type-info { color: var(--sui-info); }
/* 状态图标冗余：状态不只靠色相区分（WCAG 1.4.1） */
.s-hint.type-warning::before { content: "⚠ "; }
.s-hint.type-error::before { content: "✕ "; font-weight: 700; }
.s-hint.type-success::before { content: "✓ "; font-weight: 700; }
</style>
