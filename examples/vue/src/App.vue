<script lang="ts">
import HelloWorld from '@/components/HelloWorld.vue'

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',
  components: {
    HelloWorld,
  },
})
</script>

<template>
  <HelloWorld msg="Hello Vue 3 + TypeScript + Vite"></HelloWorld>
</template>
