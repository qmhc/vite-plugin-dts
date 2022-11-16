export const jsTest = 'jsTest'

export const addOne = x => parseFloat(x) + 1

export function add(...args) {
  return args.reduce((total, num) => total + num, 0)
}
