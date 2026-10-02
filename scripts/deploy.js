import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const distDir = path.resolve('dist')
if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run npm run build first.')
  process.exit(1)
}

const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim()

const run = (cmd, cwd = distDir) => execSync(cmd, { cwd, stdio: 'inherit' })

try {
  run('git init -b gh-pages')
  run('git add -A')
  run('git commit -m "Deploy production build to GitHub Pages"')
  run(`git remote add origin ${remoteUrl}`)
  run('git push origin gh-pages --force')
} finally {
  const gitDir = path.join(distDir, '.git')
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true })
  }
}
console.log('Successfully deployed to gh-pages branch!')
