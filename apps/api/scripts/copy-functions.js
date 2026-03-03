/**
 * After tsc compiles with rootDir='../../', the output lands at:
 *   dist/functions/apps/api/functions/index.js   (entry point)
 *   dist/functions/packages/...                  (shared packages)
 *
 * Firebase Cloud Functions expects the source directory to contain:
 *   index.js       (entry point)
 *   package.json   (dependencies)
 *   src/           (compiled NestJS modules)
 *   packages/      (compiled shared packages)
 *
 * This script flattens the deep path into the expected structure
 * and copies package.json so Firebase can install deps.
 */
const { cpSync, copyFileSync, rmSync } = require('fs')
const path = require('path')

const distFunctions = path.resolve(__dirname, '../dist/functions')
const deepEntry = path.join(distFunctions, 'apps/api/functions')
const deepSrc = path.join(distFunctions, 'apps/api/src')

// Copy entry point files up to dist/functions/
cpSync(deepEntry, distFunctions, { recursive: true, force: true })

// Copy src alongside so relative imports from index.js resolve
cpSync(deepSrc, path.join(distFunctions, 'src'), { recursive: true, force: true })

// Copy package.json so Firebase can install production dependencies
copyFileSync(path.resolve(__dirname, '../package.json'), path.join(distFunctions, 'package.json'))

// Clean up the deep apps/ directory
rmSync(path.join(distFunctions, 'apps'), { recursive: true, force: true })

console.log('✓ functions build output flattened to dist/functions/')
