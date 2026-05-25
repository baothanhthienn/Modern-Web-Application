import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(npmCommand, ['run', 'server'], { stdio: 'inherit' }),
  spawn(npmCommand, ['run', 'dev'], { stdio: 'inherit' }),
]

let isStopping = false

function stopChildren(signal = 'SIGTERM') {
  if (isStopping) return
  isStopping = true

  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('[Development process failed to start]', error.message)
    stopChildren()
    process.exitCode = 1
  })

  child.on('exit', (code, signal) => {
    if (isStopping) return

    stopChildren()
    process.exitCode = signal ? 1 : (code ?? 1)
  })
}

process.once('SIGINT', () => {
  stopChildren('SIGINT')
})

process.once('SIGTERM', () => {
  stopChildren('SIGTERM')
})
