import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(webRoot, '..')
const generatedDir = join(webRoot, 'src', 'generated')
const examplesDir = join(webRoot, 'public', 'examples')

const build = spawnSync('moon', ['build', 'web_bridge_js', '--target', 'js', '--release'], {
  cwd: repoRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32',
})

if (build.status !== 0) {
  process.stderr.write(build.stdout ?? '')
  process.stderr.write(build.stderr ?? '')
  process.exit(build.status ?? 1)
}

await mkdir(generatedDir, { recursive: true })
await copyFile(
  join(repoRoot, '_build', 'js', 'release', 'build', 'web_bridge_js', 'web_bridge_js.js'),
  join(generatedDir, 'moonbit_bridge.js'),
)

await mkdir(examplesDir, { recursive: true })
const exampleFiles = (await readdir(join(repoRoot, 'examples'))).filter((name) =>
  name.endsWith('.json'),
)
await Promise.all(
  exampleFiles.map((name) =>
    copyFile(join(repoRoot, 'examples', name), join(examplesDir, name)),
  ),
)

process.stdout.write(`MoonBit bridge ready (${exampleFiles.length} example maps).\n`)
