<script lang="ts">
import { ref, defineComponent } from 'vue'

const Component = defineComponent({
  name: 'NoDirectExport',
  props: {
    foo: {
      type: String,
      default: ''
    }
  },
  setup() {
    const baz = ref(0)

    return { baz }
  }
})

export default Component
</script>

<template>
  <div></div>
</template>
