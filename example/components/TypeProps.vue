<script setup lang="ts">
type Props = {
  color: 'blue' | 'red' | 'purple'
}

const props = defineProps<Props>()
</script>

<template>
  <div>{{ color }}</div>
</template>