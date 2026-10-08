<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "SFormItem", inheritAttrs: false })
const props = defineProps<{
  label?: string
  /** 底部辅助说明（error 存在时不显示） */
  hint?: string
  /** 底部错误文案（优先于 hint） */
  error?: string
  required?: boolean
  /** 行内模式：flex:1 且最小宽度，用于表单行多列排布 */
  inline?: boolean
}>()
const attrs = useAttrs()

//label 与控件的可访问性关联：控件在任意 slot 里无法拿 id 做 for，
//退而用 role=group + aria-labelledby/aria-required 让读屏把整组与标签、必填态一起播报；
//点击 label 时把焦点送进控件区（鼠标可用性与原生 label[for] 对齐）
let seq = 0
const labelId = `s-form-item-label-${++seq}`
function focusControl(event: MouseEvent) {
  //控件是任意 slot 内容，点 label 时手动把焦点送进控件区第一个可聚焦元素（对齐原生 label[for] 行为）
  const item = (event.currentTarget as HTMLElement).parentElement
  const control = item?.querySelector<HTMLElement>(".s-form-control")
  const target = control?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])")
  target?.focus()
}
</script>

<template>
  <div v-bind="attrs" :class="['s-form-item', { inline: props.inline }]"
    role="group" :aria-labelledby="props.label || $slots.label ? labelId : undefined"
    :aria-required="props.required || undefined">
    <label v-if="props.label || $slots.label" :id="labelId" class="s-form-label" @click="focusControl">
      <slot name="label">{{ props.label }}</slot>
      <span v-if="props.required" class="s-form-req" aria-hidden="true">*</span>
    </label>
    <span class="s-form-control">
      <slot />
      <span v-if="props.error" class="s-form-error" role="alert">{{ props.error }}</span>
      <span v-else-if="props.hint || $slots.hint" class="s-form-hint"><slot name="hint">{{ props.hint }}</slot></span>
    </span>
  </div>
</template>

<style scoped>
.s-form-item { display: grid; gap: 6px; color: var(--sui-fg-secondary); font-size: 13px; }
.s-form-item.inline { flex: 1 1 0; min-width: 200px; }
.s-form-label { font-weight: 500; }
.s-form-req { margin-left: 2px; color: var(--sui-danger); }
.s-form-control { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.s-form-hint { color: var(--sui-fg-disabled); font-size: 11px; }
.s-form-error { color: var(--sui-danger); font-size: 11px; }
</style>
