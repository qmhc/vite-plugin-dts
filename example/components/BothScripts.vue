<template>
	<component :is="tag" class="both-scripts">
		<slot></slot>
	</component>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
	name: 'BothScripts',
	customOptions: {}
})
</script>

<script lang="ts" setup>
import { defineProps } from 'vue'

const props = defineProps({
	tag: {
		type: String,
		default: 'div'
	}
})
</script>
