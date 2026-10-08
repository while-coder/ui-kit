<script setup lang="ts">
import { computed, useAttrs, useSlots } from "vue"
import STextarea from "./STextarea.vue"

defineOptions({ name: "SInput", inheritAttrs: false })
const props = withDefaults(defineProps<{
  value?: string | number | null
  type?: string
  readonly?: boolean
  disabled?: boolean
  placeholder?: string
  clearable?: boolean
  autosize?: boolean | Record<string, unknown>
  /** 尺寸词表：small/medium/large 三档（显式默认 medium，即 shared.css 的 32px 基础档） */
  size?: string
  invalid?: boolean
}>(), { type: "text", size: "medium" })
const emit = defineEmits<{ "update:value": [value: any]; change: [value: any]; clear: [] }>()
const attrs = useAttrs()
const slots = useSlots()

//数字输入（type="number"）：空串发 null、其余转 Number，值语义与文本输入在这里分叉
const coerce = (raw: string) => props.type === "number" ? (raw === "" ? null : Number(raw)) : raw

const canClear = computed(() => props.clearable && props.value !== "" && props.value != null && !props.readonly && !props.disabled)
const rows = computed(() => (props.autosize as any)?.minRows ?? (attrs as any).rows ?? 4)
const onInput = (event: Event) => emit("update:value", coerce((event.target as HTMLInputElement).value))
const onChange = (event: Event) => emit("change", coerce((event.target as HTMLInputElement).value))
const clear = () => { emit("update:value", coerce("")); emit("change", coerce("")); emit("clear") }
</script>

<template>
  <span :class="['s-input-wrap', { 'has-suffix': Boolean(slots.suffix), 'has-clear': canClear }]">
    <!--textarea 分支内部复用 STextarea，避免两份 textarea 样式/行为各自演化；rows 由上方 rows 计算统一供值-->
    <STextarea v-if="type === 'textarea'" v-bind="attrs" :value="value ?? ''" :invalid="props.invalid"
      :disabled="disabled" :readonly="readonly" :placeholder="placeholder" :rows="rows" :size="size"
      @update:value="emit('update:value', $event)" @change="emit('change', $event)" />
    <input v-else v-bind="attrs" class="s-input" :class="[`size-${props.size}`, { invalid: props.invalid }]" :type="type" :value="value ?? ''" :readonly="readonly"
      :disabled="disabled" :placeholder="placeholder" @input="onInput" @change="onChange" />
    <button v-if="canClear" type="button" class="s-input-clear" aria-label="清空" @click="clear">×</button>
    <span v-if="slots.suffix" class="s-input-suffix"><slot name="suffix" /></span>
  </span>
</template>

<style scoped>
/* size 变体数值与 SSelect 对齐；medium 即 shared.css 的 32px 基础档 */
.s-input.size-small { min-height: 26px; padding: 2px 8px; font-size: 12px; }
.s-input.size-large { min-height: 38px; padding: 6px 10px; font-size: 14px; }
.s-input.invalid { border-color: var(--sui-danger); }
.s-input-clear { position: absolute; right: 7px; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--sui-fg-muted); cursor: pointer; }
.s-input-clear:hover { background: var(--sui-bg-hover); color: var(--sui-fg); }
.s-input-wrap.has-suffix .s-input-clear { right: 36px; }
</style>
