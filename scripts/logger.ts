import { bgYellow, bgCyan, bgGreen, bgRed, yellow, cyan, green, red } from 'kolorist'

type LogFn = () => void

export const logger = {
  ln: () => console.log(),
  withStartLn: (log: LogFn) => {
    logger.ln()
    log()
  },
  withEndLn: (log: LogFn) => {
    log()
    logger.ln()
  },
  withBothLn: (log: LogFn) => {
    logger.ln()
    log()
    logger.ln()
  },
  warning: (msg: string) => {
    console.warn(`${bgYellow(' WARNING ')} ${yellow(msg)}`)
  },
  info: (msg: string) => {
    console.log(`${bgCyan(' INFO ')} ${cyan(msg)}`)
  },
  success: (msg: string) => {
    console.log(`${bgGreen(' SUCCESS ')} ${green(msg)}`)
  },
  error: (msg: string) => {
    console.error(`${bgRed(' ERROR ')} ${red(msg)}`)
  },
  warningText: (msg: string) => {
    console.warn(`${yellow(msg)}`)
  },
  infoText: (msg: string) => {
    console.log(`${cyan(msg)}`)
  },
  successText: (msg: string) => {
    console.log(`${green(msg)}`)
  },
  errorText: (msg: string) => {
    console.error(`${red(msg)}`)
  }
}
