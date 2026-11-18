import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { zipSync } from 'fflate'

export async function folderEntries(directory, prefix = '') {
  const entries = {}
  async function visit(dir, relative) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const name = relative
        ? `${relative}/${item.name}`
        : item.name
      if (item.isDirectory())
        await visit(path.join(dir, item.name), name)
      else if (item.isFile())
        entries[prefix + name] = new Uint8Array(await readFile(path.join(dir, item.name)))
    }
  }
  await visit(directory, '')
  return entries
}
export async function archiveFolder(directory, prefix = '') {
  return zipSync(await folderEntries(directory, prefix), { level: 6 })
}
