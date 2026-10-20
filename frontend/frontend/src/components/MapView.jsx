import { useEffect, useRef } from 'react'
import L from 'leaflet'

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

function pointIcon() {
  return L.divIcon({
    className: 'location-marker-wrap',
    html: '<span class="location-marker"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function vehicleIcon(vehicleType) {
  const label = vehicleType === 'motorcycle' ? 'B' : vehicleType === 'auto' ? 'A' : 'C'
  return L.divIcon({
    className: 'vehicle-marker-wrap',
    html: `<span class="vehicle-marker">${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function vehiclePopup(vehicle) {
  const content = document.createElement('span')
  content.textContent = `${vehicle.color} ${vehicle.vehicleType}`
  return content
}

export function MapView({ mode, point, vehicles = [], onChoose }) {
  const pointLatitude = point?.latitude
  const pointLongitude = point?.longitude
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const pointMarkerRef = useRef(null)
  const vehicleLayerRef = useRef(null)
  const onChooseRef = useRef(onChoose)
  const initialPointRef = useRef(point)

  useEffect(() => {
    onChooseRef.current = onChoose
  }, [onChoose])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: initialPointRef.current
        ? [initialPointRef.current.latitude, initialPointRef.current.longitude]
        : [20, 0],
      zoom: initialPointRef.current ? 14 : 2,
      scrollWheelZoom: true,
    })
    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    if (mode === 'picker') {
      map.on('click', event => onChooseRef.current?.(event.latlng))
    }

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      pointMarkerRef.current = null
      vehicleLayerRef.current = null
    }
  }, [mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || pointLatitude === undefined || pointLongitude === undefined) return

    const location = [pointLatitude, pointLongitude]
    map.flyTo(location, Math.max(map.getZoom(), 14), { duration: 0.5 })
    if (mode === 'picker') {
      if (pointMarkerRef.current) {
        pointMarkerRef.current.setLatLng(location)
      } else {
        pointMarkerRef.current = L.marker(location, { icon: pointIcon() }).addTo(map)
      }
    }
  }, [mode, pointLatitude, pointLongitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (vehicleLayerRef.current) vehicleLayerRef.current.remove()
    const layer = L.layerGroup()
    vehicles.forEach(vehicle => {
      L.marker(
        [vehicle.latitude, vehicle.longitude],
        { icon: vehicleIcon(vehicle.vehicleType) },
      ).bindPopup(vehiclePopup(vehicle)).addTo(layer)
    })
    vehicleLayerRef.current = layer.addTo(map)
  }, [vehicles])

  return <div className={`map-canvas map-canvas-${mode}`} ref={containerRef} aria-label={mode === 'picker' ? 'Map location picker' : 'Live vehicle locations'} />
}
