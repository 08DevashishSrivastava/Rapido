import { useRef, useState } from 'react'
import { MapView } from './MapView'

const GEOCODING_BASE_URL = (
  import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
).replace(/\/+$/, '')

function coordinates(latitude, longitude, label = '') {
  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    label: label.slice(0, 180),
  }
}

async function geocode(path, signal) {
  let response
  try {
    response = await fetch(`${GEOCODING_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Address lookup was cancelled.')
    }
    throw new Error('Could not reach the address search service. Check your connection and try again.')
  }
  if (!response.ok) throw new Error('Address lookup is unavailable. You can still pin a location on the map.')
  return response.json()
}

function formatCoordinates(point) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
}

export default function LocationPicker({ field, initialPoint, onClose, onSelect }) {
  const [point, setPoint] = useState(initialPoint)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Search for a place or click the map to drop a pin.')
  const lookupSequence = useRef(0)

  async function handleChoose(latlng) {
    const sequence = ++lookupSequence.current
    const nextPoint = coordinates(latlng.lat, latlng.lng)
    setPoint(nextPoint)
    setResults([])
    setBusy(true)
    setStatus('Looking up the pinned address…')

    try {
      const result = await geocode(
        `/reverse?format=jsonv2&lat=${encodeURIComponent(nextPoint.latitude)}&lon=${encodeURIComponent(nextPoint.longitude)}`,
      )
      if (sequence !== lookupSequence.current) return
      const label = result.display_name || `Pinned location (${formatCoordinates(nextPoint)})`
      setPoint({ ...nextPoint, label })
      setSearch(label)
      setStatus('Location selected. Confirm to use it for your ride.')
    } catch {
      if (sequence !== lookupSequence.current) return
      const label = `Pinned location (${formatCoordinates(nextPoint)})`
      setPoint({ ...nextPoint, label })
      setSearch(label)
      setStatus('Address lookup failed. You can still use the pinned coordinates.')
    } finally {
      if (sequence === lookupSequence.current) setBusy(false)
    }
  }

  async function handleSearch(event) {
    event.preventDefault()
    if (!search.trim() || busy) return
    const sequence = ++lookupSequence.current
    setBusy(true)
    setResults([])
    setStatus('Searching places…')

    try {
      const places = await geocode(
        `/search?format=jsonv2&limit=5&q=${encodeURIComponent(search.trim())}`,
      )
      if (sequence !== lookupSequence.current) return
      setResults(places)
      setStatus(places.length ? 'Choose a result, or click the map to place a pin.' : 'No matching places. Try a different search.')
    } catch (error) {
      if (sequence === lookupSequence.current) setStatus(error.message)
    } finally {
      if (sequence === lookupSequence.current) setBusy(false)
    }
  }

  function chooseResult(place) {
    lookupSequence.current += 1
    setBusy(false)
    const nextPoint = coordinates(place.lat, place.lon, place.display_name)
    setPoint(nextPoint)
    setSearch(place.display_name)
    setResults([])
    setStatus('Location selected. Confirm to use it for your ride.')
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus('This browser does not provide location services.')
      return
    }

    setBusy(true)
    setStatus('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      position => {
        setSearch('')
        handleChoose({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      error => {
        setBusy(false)
        setStatus(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Search for a place or select one on the map.'
          : 'Could not get your location. Search for a place or select one on the map.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  }

  function confirmSelection() {
    if (!point?.label) return
    onSelect({
      label: point.label,
      latitude: point.latitude,
      longitude: point.longitude,
    })
  }

  return (
    <div className="map-dialog-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="map-dialog" role="dialog" aria-modal="true" aria-labelledby="map-dialog-title">
        <header className="map-dialog-header">
          <div>
            <p className="eyebrow">SELECT LOCATION</p>
            <h2 id="map-dialog-title">Choose your {field === 'pickup' ? 'pickup' : 'destination'}</h2>
          </div>
          <button className="map-close" type="button" onClick={onClose} aria-label="Close map">×</button>
        </header>
        <form className="map-search" onSubmit={handleSearch}>
          <label className="visually-hidden" htmlFor="map-place-search">Search for a place or address</label>
          <input
            id="map-place-search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search for a place or address"
            autoComplete="off"
            autoFocus
          />
          <button className="button button-primary" type="submit" disabled={busy || !search.trim()}>
            Search
          </button>
          <button className="button button-quiet" type="button" onClick={useMyLocation} disabled={busy}>
            Use my location
          </button>
        </form>
        {results.length > 0 && (
          <ul className="map-search-results" aria-label="Search results">
            {results.map(place => (
              <li key={place.place_id}>
                <button type="button" onClick={() => chooseResult(place)}>{place.display_name}</button>
              </li>
            ))}
          </ul>
        )}
        <p className="map-status" aria-live="polite">{status}</p>
        <MapView mode="picker" point={point} onChoose={handleChoose} />
        {point && <p className="map-selected-address">{point.label || formatCoordinates(point)}</p>}
        <footer className="map-dialog-footer">
          <span className="map-attribution">Map data © OpenStreetMap contributors</span>
          <div>
            <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="button" onClick={confirmSelection} disabled={!point?.label || busy}>
              Use this location
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
