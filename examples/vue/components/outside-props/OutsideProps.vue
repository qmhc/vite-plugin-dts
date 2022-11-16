<template>
  <div class="outside-props">
    {{ props.title }}
  </div>
</template>

<script setup lang="ts">
import { Props } from './props'

const props = defineProps(Props)
</script>
