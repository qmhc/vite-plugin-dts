<template>
  <div class="js-test">
    {{ count }}
  </div>
</template>

<script>
// 尽管在使用 js 语法
// 如果仍想要获得正确的类型推导
// 依然需要使用 defineComponent 定义组件
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'JsTest',
  setup() {
    const count = ref(0)

    return { count }
  }
})
</script>
