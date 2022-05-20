<template>
  <h1>{{ labelMsg }}</h1>
  <slot :scope="count"></slot>
  <button @click="count++">
    count is: {{ count }}
  </button>
  <p>
    Edit
    <code>components/HelloWorld.vue</code> to test hot module replacement.
  </p>
</template>

<script lang="ts">
import { ref, computed, defineComponent } from 'vue'

export default defineComponent({
  name: 'HelloWorld',
  props: {
    msg: {
      required: true,
      type: String,
      validator: (value: string) => value.length > 0
    }
  },
  setup(props) {
    const count = ref(0)
    const labelMsg = computed(() => `message: ${props.msg}`)

    return { count, labelMsg }
  }
})
</script>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
