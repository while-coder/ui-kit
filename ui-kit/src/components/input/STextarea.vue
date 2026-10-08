<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "STextarea", inheritAttrs: false })
const props = withDefaults(defineProps<{
  value?: string | number | null
  /** 尺寸词表：small/medium/large 三档（默认 medium） */
  size?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  /** 校验失败红框 */
  invalid?: boolean
  rows?: number
  /** 缩放方向 */
  resize?: "none" | "vertical" | "horizontal" | "both"
}>(), { size: "medium", rows: 3, resize: "vertical" })
const emit = defineEmits<{
  "update:value": [value: string]
  change: [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
}>()
const attrs = useAttrs()

const onInput = (event: Event) => emit("update:value", (event.target as HTMLTextAreaElement).value)
const onChange = (event: Event) => emit("change", (event.target as HTMLTextAreaElement).value)
</script>

<template>
  <textarea v-bind="attrs" class="s-input s-textarea" :class="[`size-${props.size}`, { invalid: props.invalid }]"
    :style="{ resize: props.resize }" :value="props.value ?? ''" :placeholder="props.placeholder"
    :disabled="props.disabled" :readonly="props.readonly" :rows="props.rows"
    @input="onInput" @change="onChange" @blur="emit('blur', $event)" @focus="emit('focus', $event)"
    @keydown="emit('keydown', $event)" />
</template>

<style scoped>
.s-textarea { height: auto; line-height: 1.5; }
.s-textarea.size-small { min-height: 0; padding: 3px 8px; font-size: 12px; }
.s-textarea.size-large { padding: 8px 10px; font-size: 14px; }
.s-textarea.invalid { border-color: var(--sui-error); }
</style>
