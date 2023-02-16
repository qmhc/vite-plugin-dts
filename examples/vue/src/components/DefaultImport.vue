<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'DefaultImport',
  props: {
    msg: {
      type: String,
      default: ''
    }
  },
  setup() {
    const count = ref(0)
    return {
      count
    }
  }
})
</script>

<template>
  <div class="default-import">
    {{ count }}
  </div>
</template>
