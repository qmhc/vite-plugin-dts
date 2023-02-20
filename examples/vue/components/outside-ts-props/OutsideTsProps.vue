<script setup lang="ts">
import type { BaseProps } from './props'

type Props = {
  title: BaseProps['title'],
  msg?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Title',
  msg: undefined
})
</script>

<template>
  <div class="outside-props">
    {{ title }}
  </div>
</template>
