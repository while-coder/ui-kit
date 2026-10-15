<script setup lang="ts">
import { computed } from "vue"
import SCascadeMenu from "./SCascadeMenu.vue"
import type { SelectOption } from "./SSelect.vue"

defineOptions({ name: "SDropdown", inheritAttrs: false })
const props = withDefaults(defineProps<{
  show?: boolean
  x?: number
  y?: number
  options?: SelectOption[]
  onClickoutside?: () => void
}>(), { options: () => [] })
const emit = defineEmits<{ select: [key: any] }>()
const rootStyle = computed(() => ({ left: `${props.x ?? 0}px`, top: `${props.y ?? 0}px` }))
</script>

<template>
  <SCascadeMenu :show="!!show" :options="options" :root-style="rootStyle" root-class="s-dropdown"
    @close="props.onClickoutside?.()" @select="option => emit('select', option.key ?? option.value)" />
</template>
