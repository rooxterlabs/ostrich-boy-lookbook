import type { Category, EntryScene, EntryType, ItemGroup, LookbookEntry, Scene } from './lookbook'

export const categoryEntryType = (category?: Category): EntryType => category?.entryType ?? (/^characters?$/i.test(category?.name.trim() ?? '') ? 'character' : /^locations?$/i.test(category?.name.trim() ?? '') ? 'location' : 'general')

const presets: Record<EntryType, [string, string[]][]> = {
  character: [['Physical Description', ['physicalDescription']], ['Costume & Styling', ['costumeAndStyling']], ['Signature Props & Habits', ['signatureProps']]],
  location: [['Structure & Architecture', ['architecture']], ['Signage & Printed Material', ['signage']], ['Props & Dressing', ['associatedProps', 'setDressing']]],
  general: [],
}

export function normalizeEntry(entry: LookbookEntry, category?: Category, scenes: Scene[] = []) {
  const type = entry.type === 'general' ? categoryEntryType(category) : entry.type
  const groups: ItemGroup[] = presets[type].map(([name, keys], index) => ({
    id: `${entry.id}-group-${index}`, name,
    bullets: keys.flatMap((key) => (entry.fields[key] ?? '').split('\n').map((text) => text.trim()).filter(Boolean)).map((text, bullet) => ({ id: `${entry.id}-group-${index}-bullet-${bullet}`, text: text.replace(/^[•*-]\s+/, '') })),
  }))
  if (entry.itemGroups === undefined) entry.items.forEach((item) => {
    const name = item.category || 'Items'
    let group = groups.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())
    if (!group) { group = { id: `${entry.id}-legacy-${groups.length}`, name, bullets: [] }; groups.push(group) }
    group.bullets.push({ id: item.id, text: [item.name, item.notes].filter(Boolean).join(' — ') })
  })
  return {
    ...entry, type,
    subtext: entry.subtext ?? [entry.role, entry.age].filter(Boolean).join(' · '),
    itemGroups: entry.itemGroups ?? groups,
    sceneList: entry.sceneList ?? scenes.filter((scene) => entry.sceneIds.includes(scene.id)).map((scene): EntryScene => ({ id: scene.id, number: String(scene.number), title: scene.title, location: '', description: scene.notes, mood: '', symbolism: '', conflict: '', emotion: '' })),
  }
}

export function newEntry(title: string, category: Category, type = categoryEntryType(category)): LookbookEntry {
  return normalizeEntry({ id: crypto.randomUUID(), type, categoryIds: [category.id], title, role: '', age: '', description: '', fields: {}, notes: '', status: 'approved', sceneIds: [], linkedEntryIds: [], items: [], imageIds: [], archived: false, updatedAt: new Date().toISOString() }, category)
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (index < 0 || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
