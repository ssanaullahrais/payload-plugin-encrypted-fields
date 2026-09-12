import { spawn } from 'child_process'
import { createServer } from 'net'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'

process.env.DATABASE_URL ||= 'file:./temp-payload-encrypted-fields-sqlite.db'
process.env.PAYLOAD_SECRET ||= 'payload-plugin-encrypted-fields-demo-secret'

const findAvailablePort = async (preferredPort: number) => {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port)
    })

    if (available) {
      return port
    }
  }

  throw new Error(`No available port found from ${preferredPort} to ${preferredPort + 19}`)
}

const run = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${npmCommand} ${args.join(' ')} failed with code ${code}`))
    })
  })

const openBrowser = (url: string) => {
  const command =
    process.platform === 'win32'
      ? 'cmd'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]

  const child = spawn(command, args, {
    detached: true,
    shell: false,
    stdio: 'ignore',
  })

  child.unref()
}

await run(['run', 'seed:demo'])

const port = await findAvailablePort(Number(process.env.PORT || 3001))
const url = `http://localhost:${port}`

console.log(`Demo starting at ${url}`)

const dev = spawn(npxCommand, ['next', 'dev', '-p', String(port)], {
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

const timer = setTimeout(() => openBrowser(url), 2500)

dev.on('exit', (code) => {
  clearTimeout(timer)
  process.exit(code ?? 0)
})

const stop = () => {
  clearTimeout(timer)
  dev.kill('SIGTERM')
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
