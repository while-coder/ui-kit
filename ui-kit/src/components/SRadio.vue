<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "SRadio", inheritAttrs: false })
//语义与 SCheckbox 对齐：value = 选项自身取值，checked = 是否选中。
//旧版 value 兼任"组选中值"、自身值放 labelValue 的颠倒设计已废弃（全库无使用方，直接修正）
const props = defineProps<{ value?: any; checked?: boolean; label?: string; name?: string; disabled?: boolean }>()
const emit = defineEmits<{ "update:checked": [checked: boolean]; change: [checked: boolean] }>()
const attrs = useAttrs()

const update = () => {
  emit("update:checked", true)
  emit("change", true)
}
</script>

<template>
  <label v-bind="attrs" :class="['s-radio', { disabled: props.disabled }]">
    <input type="radio" :name="props.name" :value="props.value" :checked="props.checked" :disabled="props.disabled" @change="update" />
    <span v-if="props.label || $slots.default" class="s-radio-label"><slot>{{ props.label }}</slot></span>
  </label>
</template>

<style scoped>
.s-radio { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; font-size: 13px; color: var(--sui-fg); }
.s-radio input[type="radio"] { margin: 0; flex-shrink: 0; width: 14px; height: 14px; cursor: pointer; accent-color: var(--sui-primary); }
.s-radio.disabled { opacity: .5; cursor: not-allowed; }
.s-radio.disabled input { cursor: not-allowed; }
</style>