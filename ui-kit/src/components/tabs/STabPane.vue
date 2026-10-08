<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ name: "STabPane", inheritAttrs: false })
//displayDirective="destroy"：非激活时销毁 pane 内容（默认保活，仅 display:none）
const props = defineProps<{ name?: any; tab?: string | number; count?: string | number; active?: boolean; displayDirective?: string; tabId?: string; panelId?: string }>()
const attrs = useAttrs()
</script>

<template>
  <section v-bind="attrs" :id="panelId" role="tabpanel" :aria-labelledby="tabId"
    :class="['s-tab-pane', { active }]" :style="[attrs.style, active ? null : { display: 'none' }]">
    <slot v-if="props.displayDirective !== 'destroy' || active" />
  </section>
</template>

<style scoped>
.s-tab-pane { width: 100%; height: 100%; min-width: 0; min-height: 0; flex: 1; overflow: auto; }
</style>
