<template>
  <component
    :is="tag"
    class="both-scripts"
  >
    <slot></slot>
  </component>
</template>

<script lang="ts" setup>
import { defineProps, ref } from 'vue'

const props = defineProps({
  tag: {
    type: String,
    default: 'div'
  },
  count: {
    type: Number,
    default: 0
  }
})

const currentCount = ref(props.count)

const inc = () => {
  currentCount.value++
}

defineExpose({ inc })
</script>

<script lang="ts">
// do not use defineComponent

export default {
  name: 'BothScripts',
  customOptions: {}
}
</script>
