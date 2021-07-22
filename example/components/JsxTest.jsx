// 尽管在使用 jsx 语法
// 如果仍想要获得正确的类型推导
// 依然需要使用 defineComponent 定义组件
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TsxTest',
  props: {
    msg: {
      type: String,
      default: ''
    }
  },
  setup(props, { slots }) {
    return () => (
      <div class='tsx-test'>
        {props.msg}
        {slots.default?.() ?? null}
      </div>
    )
  }
})
