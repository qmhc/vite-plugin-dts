import { useState } from 'react'

interface Props {
  count?: number
}

function HelloWorld(props: Props) {
  const [count, setCount] = useState(props.count || 0)

  return (
    <div className="hello-world">
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
    </div>
  )
}

export default HelloWorld
