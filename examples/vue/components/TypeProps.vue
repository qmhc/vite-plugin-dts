<script setup lang="ts">
type Props = {
  color: 'blue' | 'red' | 'purple',
  array?: { foo: number }[]
}

withDefaults(defineProps<Props>(), {
  color: 'blue',
  array: () => []
})
</script>

<template>
  <div>{{ color }}</div>
</template>
