const chalk = require('chalk')

exports.logger = {
  ln: () => console.log(),
  warning: msg => {
    console.warn(`${chalk.bgYellow.black(' WARNING ')} ${chalk.yellow(msg)}`)
  },
  info: msg => {
    console.log(`${chalk.bgCyan.black(' INFO ')} ${chalk.cyan(msg)}`)
  },
  success: msg => {
    console.log(`${chalk.bgGreen.black(' SUCCESS ')} ${chalk.green(msg)}`)
  },
  error: msg => {
    console.error(`${chalk.bgRed.black(' ERROR ')} ${chalk.red(msg)}`)
  },
  warningText: msg => {
    console.warn(`${chalk.yellow(msg)}`)
  },
  infoText: msg => {
    console.log(`${chalk.cyan(msg)}`)
  },
  successText: msg => {
    console.log(`${chalk.green(msg)}`)
  },
  errorText: msg => {
    console.error(`${chalk.red(msg)}`)
  }
}
