<script setup lang="ts">
type Props = {
  color: 'blue' | 'red' | 'purple'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<Props>()
</script>

<template>
  <div>{{ color }}</div>
</template>
