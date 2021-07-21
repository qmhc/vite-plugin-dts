<template>
  <div class="js-test">
    {{ count }}
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'JsTest',
  setup() {
    const count = ref(0)

    return { count }
  }
}
</script>
