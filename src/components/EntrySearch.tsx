import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { LookbookEntry } from '../models/lookbook'

interface EntrySearchProps {
  entries: Pick<LookbookEntry, 'id' | 'title'>[]
  onEntry: (id: string) => void
}

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

export function EntrySearch({ entries, onEntry }: EntrySearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const suggestions = useMemo(() => {
    const search = normalizeName(query)
    if (!search) return []
    return entries.flatMap((entry) => {
      const name = normalizeName(entry.title)
      const index = name.startsWith(search) ? 0 : name.indexOf(` ${search}`)
      if (index < 0) return []
      // Chris Larson sorts under Larson; Montage Gillingham Location under Location.
      return [{ entry, matchingName: name.slice(index === 0 ? 0 : index + 1) }]
    }).sort((a, b) => a.matchingName.localeCompare(b.matchingName, 'en', { sensitivity: 'base' })
      || a.entry.title.localeCompare(b.entry.title, 'en', { sensitivity: 'base' }))
      .map(({ entry }) => entry)
  }, [entries, query])
  const expanded = isOpen && suggestions.length > 0
  const activeSuggestion = expanded ? suggestions[activeIndex] : undefined

  useEffect(() => {
    if (!isOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [isOpen])

  useEffect(() => {
    if (activeSuggestion) document.getElementById(`${listId}-${activeSuggestion.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeSuggestion, listId])

  const selectEntry = (id: string) => {
    setQuery('')
    setIsOpen(false)
    setActiveIndex(-1)
    onEntry(id)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    } else if (event.key === 'Tab') {
      setIsOpen(false)
      setActiveIndex(-1)
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(!expanded || !activeSuggestion
        ? direction === 1 ? 0 : suggestions.length - 1
        : (activeIndex + direction + suggestions.length) % suggestions.length)
      setIsOpen(true)
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault()
      selectEntry((activeSuggestion ?? suggestions[0]).id)
    }
  }

  return (
    <div className="entry-search" ref={searchRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false)
    }}>
      <div className="entry-search-field">
        <input
          type="search"
          role="combobox"
          aria-label="Search entry names"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={activeSuggestion ? `${listId}-${activeSuggestion.id}` : undefined}
          placeholder="Search entries…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(Boolean(event.target.value.trim())); setActiveIndex(-1) }}
          onFocus={() => { setIsOpen(Boolean(query.trim())); setActiveIndex(-1) }}
          onKeyDown={handleKeyDown}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 4.5 4.5" />
        </svg>
      </div>
      {expanded && <ul className="entry-search-suggestions" id={listId} role="listbox" aria-label="Entry name suggestions">
        {suggestions.map((entry, index) => <li key={entry.id} role="none">
          <button
            type="button"
            role="option"
            id={`${listId}-${entry.id}`}
            aria-selected={index === activeIndex}
            className={`entry-search-option${index === activeIndex ? ' is-active' : ''}`}
            tabIndex={-1}
            onPointerDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => selectEntry(entry.id)}
          >{entry.title}</button>
        </li>)}
      </ul>}
    </div>
  )
}
