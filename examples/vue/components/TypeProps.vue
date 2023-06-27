<script setup lang="ts">
type Props = {
  color: 'blue' | 'red' | 'purple',
  array?: { foo: number }[]
}

withDefaults(defineProps<Props>(), {
  color: 'blue',
  array: () => []
})

interface Events {
  (e: 'cellClick', evt: string): void,
  (e: 'dragSelectUpdate', values: number[]): void,
  (e: 'headerClick', column: unknown): void
}

defineEmits<Events>()
</script>

<template>
  <div>{{ color }}</div>
</template>
