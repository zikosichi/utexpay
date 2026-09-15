import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const componentsDir = resolve(import.meta.dirname, '../src/components/featuregrid')
const source = readdirSync(componentsDir).filter((file) => file.endsWith('.tsx')).map((file) => readFileSync(resolve(componentsDir, file), 'utf8')).join('\n')
const referenced = [...new Set(source.match(/\/featuregrid\/[\w.-]+\.webp/g))]

test('every scene the feature grid references is a genuine WebP asset under 150 KB', () => {
  assert.ok(referenced.length >= 5, 'expected the tiles to reference their scene images')
  for (const url of referenced) {
    const path = resolve(import.meta.dirname, '../public', url.slice(1))
    assert.ok(existsSync(path), path)
    const bytes = readFileSync(path)
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', url)
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', url)
    assert.ok(bytes.length < 150_000, `${url} should remain below 150 KB`)
  }
})

test('the checkout tile ships both sizes of the pay scene', () => {
  for (const name of ['pay-scene-1100.webp', 'pay-scene-1978.webp']) assert.ok(referenced.includes(`/featuregrid/${name}`), name)
})
