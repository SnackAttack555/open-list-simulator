// Drive the ballot in headless Chrome over CDP: click a candidate, click Vote, report any
// runtime error. Catches what the ?v=&n= deep links can't: the real ballot -> results transition.
// Usage: node scripts/click-through.mjs [url]   (needs a running dev server; uses Google Chrome
// from /Applications, or set CHROME to another Chrome/Chromium binary)
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const port = 9333
const url = process.argv[2] ?? 'http://localhost:5181/'
const chrome =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const proc = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=/tmp/five-seats-cdp',
    'about:blank',
  ],
  { stdio: 'ignore' },
)
// Wait for the debug port (a cold Chrome can take a few seconds to open it).
let targets
for (let tries = 0; ; tries += 1) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    break
  } catch (err) {
    if (tries > 40) throw err
    await sleep(250)
  }
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const errors = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result)
  if (msg.method === 'Runtime.exceptionThrown')
    errors.push(
      msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text,
    )
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error')
    errors.push(
      'console.error: ' + msg.params.args.map((a) => a.value ?? a.description).join(' '),
    )
}
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))
    .result?.value

await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url })
await sleep(2500)
console.log(
  'ballot radios:',
  await evaluate(`document.querySelectorAll('[role=radio]').length`),
)
await evaluate(`document.querySelectorAll('[role=radio]')[6].click()`)
await sleep(300)
console.log('button:', await evaluate(`document.querySelector('.btn').textContent`))
await evaluate(`document.querySelector('.btn').click()`)
await sleep(2500)
console.log('after vote, sections:', await evaluate(`document.querySelectorAll('.sec').length`))
console.log('root chars:', await evaluate(`document.getElementById('root').innerHTML.length`))
console.log('button:', await evaluate(`document.querySelector('.btn')?.textContent`))
console.log('errors:', errors.length ? errors.join('\n---\n') : 'none')
ws.close()
proc.kill()
process.exit(errors.length ? 1 : 0)
