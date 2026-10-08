<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "SChip", inheritAttrs: false })
//色相走 type（对齐全库 type-* class 约定）
const props = withDefaults(defineProps<{ type?: "default" | "warning"; clickable?: boolean }>(), { type: "default" })
const attrs = useAttrs()
</script>

<template>
  <span v-bind="attrs" :class="['s-chip', `type-${props.type}`, { clickable: props.clickable }]"><slot /></span>
</template>

<style scoped>
.s-chip { display: inline-flex; align-items: center; font-size: 12px; padding: 3px 10px; background: var(--sui-bg-soft); border: 1px solid var(--sui-border); border-radius: var(--sui-radius-pill); color: var(--sui-fg-muted); white-space: nowrap; transition: background var(--sui-transition), border-color var(--sui-transition); }
.s-chip.clickable { cursor: pointer; }
.s-chip.clickable:hover { background: var(--sui-bg-hover); border-color: var(--sui-border-strong); }
.s-chip.type-warning { background: var(--sui-warning-chip-bg); border-color: var(--sui-warning-soft); color: var(--sui-warning-fg); }
</style>
