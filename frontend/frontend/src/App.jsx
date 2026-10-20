import { useEffect, useRef, useState } from 'react'
import { api } from './services/api'
import LocationPicker from './components/LocationPicker'
import { MapView } from './components/MapView'
import { HeroIllustration, InformationSections, ServicesSection } from './components/HomeSections'
import './App.css'

const SESSION_KEY = 'rapido-session'

function displayName(profile, role) {
  const account = role === 'user' ? profile : profile?.captain
  const fullname = account?.fullname
  return [fullname?.firstname, fullname?.lastname].filter(Boolean).join(' ') || 'there'
}

function savedSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    if (session?.token && ['user', 'captain'].includes(session.role)) return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
  }
  return null
}

function App() {
  const [session, setSession] = useState(() => savedSession())
  const [checkingSession, setCheckingSession] = useState(() => Boolean(savedSession()))
  const [role, setRole] = useState('user')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('error')
  const [page, setPage] = useState('book')
  const [rides, setRides] = useState(null)
  const [rideError, setRideError] = useState('')
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [latestRide, setLatestRide] = useState(null)
  const [locationPickerFor, setLocationPickerFor] = useState(null)
  const [nearbyState, setNearbyState] = useState({ locationKey: null, vehicles: [], error: '' })
  const [isSharingLocation, setIsSharingLocation] = useState(false)
  const [locationSharePending, setLocationSharePending] = useState(false)
  const [locationShareError, setLocationShareError] = useState('')
  const captainWatchId = useRef(null)
  const lastLocationUpdate = useRef(0)
  const locationUpdateInFlight = useRef(false)
  const locationUpdateTask = useRef(Promise.resolve())
  const locationSharingGeneration = useRef(0)
  const [rideForm, setRideForm] = useState({
    pickup: '',
    pickupLocation: null,
    destination: '',
    destinationLocation: null,
    vehicleType: 'auto',
  })
  const nearbyLocation = rideForm.pickupLocation
  const nearbyLocationKey = nearbyLocation
    ? `${nearbyLocation.latitude}:${nearbyLocation.longitude}:${rideForm.vehicleType}`
    : null
  const nearbyVehicles = nearbyState.locationKey === nearbyLocationKey ? nearbyState.vehicles : []
  const nearbyError = nearbyState.locationKey === nearbyLocationKey ? nearbyState.error : ''

  useEffect(() => {
    const current = savedSession()
    if (!current) return

    api.profile(current.role, current.token)
      .then((result) => {
        const profile = current.role === 'captain' ? result.captain : result
        setSession({ ...current, profile })
      })
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem(SESSION_KEY)
          setSession(null)
        }
        setNotice(error.message)
        setNoticeType('error')
      })
      .finally(() => setCheckingSession(false))
  }, [])

  useEffect(() => {
    if (session?.role !== 'user' || page !== 'history') return

    let active = true
    api.getRides(session.token)
      .then(({ rides: results }) => {
        if (active) setRides(results)
      })
      .catch((error) => {
        if (active) setRideError(error.message)
      })

    return () => {
      active = false
    }
  }, [historyRefresh, page, session])

  useEffect(() => {
    const location = nearbyLocation
    if (
      session?.role !== 'user'
      || page !== 'book'
      || !location
    ) {
      return
    }

    let active = true
    const refreshVehicles = () => {
      api.getNearbyVehicles(session.token, location, rideForm.vehicleType)
        .then(({ vehicles }) => {
          if (active) {
            setNearbyState({ locationKey: nearbyLocationKey, vehicles, error: '' })
          }
        })
        .catch((error) => {
          if (active) setNearbyState({ locationKey: nearbyLocationKey, vehicles: [], error: error.message })
        })
    }

    refreshVehicles()
    const intervalId = window.setInterval(refreshVehicles, 10000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [nearbyLocation, nearbyLocationKey, page, rideForm.vehicleType, session])

  useEffect(() => () => {
    if (captainWatchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(captainWatchId.current)
    }
  }, [])

  function showNotice(message, type = 'error') {
    setNotice(message)
    setNoticeType(type)
  }

  async function handleAuth(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const formData = new FormData(event.currentTarget)
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
    }

    if (mode === 'register') {
      payload.fullname = {
        firstname: formData.get('firstname'),
        lastname: formData.get('lastname'),
      }
      if (role === 'captain') {
        payload.vehicle = {
          color: formData.get('color'),
          plate: formData.get('plate'),
          capacity: Number(formData.get('capacity')),
          vehicleType: formData.get('vehicleType'),
        }
      }
    }

    try {
      const result = mode === 'register'
        ? await api.register(role, payload)
        : await api.login(role, payload)
      const profile = role === 'user' ? result.user : result.captain
      const nextSession = { token: result.token, role, profile }
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setPage('book')
      setNotice('')
    } catch (error) {
      showNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    if (!session) return
    setBusy(true)
    if (captainWatchId.current !== null && navigator.geolocation) {
      locationSharingGeneration.current += 1
      navigator.geolocation.clearWatch(captainWatchId.current)
      captainWatchId.current = null
      setIsSharingLocation(false)
      setLocationSharePending(false)
    }
    try {
      if (session.role === 'captain') await locationUpdateTask.current
      await api.logout(session.role, session.token)
      localStorage.removeItem(SESSION_KEY)
      setSession(null)
      setPage('book')
      setRides(null)
      setLatestRide(null)
      showNotice('You have been signed out.', 'success')
    } catch (error) {
      showNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleBook(event) {
    event.preventDefault()
    if (busy) return
    if (!session) {
      setRole('user')
      setMode('login')
      setPage('auth')
      showNotice('Sign in or create an account to send your ride request.')
      return
    }
    setBusy(true)
    setNotice('')
    setLatestRide(null)
    try {
      const { ride } = await api.createRide(session.token, {
        pickup: rideForm.pickup,
        pickupLocation: rideForm.pickupLocation,
        destination: rideForm.destination,
        destinationLocation: rideForm.destinationLocation,
        vehicleType: rideForm.vehicleType,
      })
      setLatestRide(ride)
      showNotice('Your ride request was saved.', 'success')
    } catch (error) {
      showNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  function startLocationSharing() {
    if (!navigator.geolocation) {
      setLocationShareError('This browser does not provide GPS location services.')
      return
    }

    const generation = ++locationSharingGeneration.current
    lastLocationUpdate.current = 0
    setLocationSharePending(true)
    setLocationShareError('Waiting for your device location permission…')
    captainWatchId.current = navigator.geolocation.watchPosition(
      position => {
        if (
          generation !== locationSharingGeneration.current
          || locationUpdateInFlight.current
          || Date.now() - lastLocationUpdate.current < 10000
        ) return
        lastLocationUpdate.current = Date.now()
        locationUpdateInFlight.current = true
        locationUpdateTask.current = api.updateCaptainLocation(session.token, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }).then(() => {
          if (generation === locationSharingGeneration.current) {
            setIsSharingLocation(true)
            setLocationSharePending(false)
            setLocationShareError('')
          }
        }).catch(error => {
          if (generation === locationSharingGeneration.current) {
            if (captainWatchId.current !== null) {
              navigator.geolocation.clearWatch(captainWatchId.current)
              captainWatchId.current = null
            }
            setIsSharingLocation(false)
            setLocationSharePending(false)
            setLocationShareError(error.message)
          }
        }).finally(() => {
          locationUpdateInFlight.current = false
        })
      },
      error => {
        if (generation !== locationSharingGeneration.current) return
        locationSharingGeneration.current += 1
        if (captainWatchId.current !== null) {
          navigator.geolocation.clearWatch(captainWatchId.current)
          captainWatchId.current = null
        }
        setIsSharingLocation(false)
        setLocationSharePending(false)
        setLocationShareError(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access to share your position.'
          : 'Could not read your location. Check GPS settings and try again.')
        locationUpdateTask.current = locationUpdateTask.current.then(() => api.stopCaptainLocation(session.token)).catch(stopError => {
          setLocationShareError(previous => `${previous} Could not clear the server location: ${stopError.message}`)
        })
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
  }

  async function stopLocationSharing() {
    locationSharingGeneration.current += 1
    if (captainWatchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(captainWatchId.current)
      captainWatchId.current = null
    }
    setIsSharingLocation(false)
    setLocationSharePending(false)
    setLocationShareError('')
    try {
      await locationUpdateTask.current
      await api.stopCaptainLocation(session.token)
    } catch (error) {
      setLocationShareError(error.message)
    }
  }

  function selectLocation(field, location) {
    setLatestRide(null)
    setRideForm(current => ({
      ...current,
      [field]: location.label,
      [`${field}Location`]: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    }))
    setLocationPickerFor(null)
  }

  function startAnotherRide() {
    setLatestRide(null)
    setRideForm({
      pickup: '',
      pickupLocation: null,
      destination: '',
      destinationLocation: null,
      vehicleType: rideForm.vehicleType,
    })
    setNotice('')
  }

  function selectService(vehicleType) {
    setRideForm(current => ({ ...current, vehicleType }))
    setLatestRide(null)
    if (page === 'auth' || page === 'history') setPage('book')
    window.setTimeout(() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function scrollToBooking() {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleCancel(rideId) {
    if (!session || busy) return
    setBusy(true)
    setRideError('')
    try {
      const { ride } = await api.cancelRide(session.token, rideId)
      setRides((current) => current.map((item) => item._id === ride._id ? ride : item))
      if (latestRide?._id === ride._id) setLatestRide(ride)
    } catch (error) {
      setRideError(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (checkingSession) {
    return <main className="screen-center" aria-live="polite">Checking your session…</main>
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="RidePass home">
          <span className="brand-mark" aria-hidden="true">⚡</span>
          <span>RidePass</span>
        </a>
        {!session && page === 'auth' ? (
          <button className="button button-quiet" type="button" onClick={() => { setPage('book'); setNotice('') }}>
            Back to home
          </button>
        ) : ((!session && page !== 'auth') || (session?.role === 'user' && page === 'book')) && (
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#services">Services</a>
            <a href="#how-it-works">About</a>
            <a href="#safety">Safety</a>
            <a href="#contact">Contact</a>
          </nav>
        )}
        {session && (
          <div className="account-actions">
            <span className="account-role">{session.role === 'captain' ? 'Captain account' : 'Rider account'}</span>
            <span className="account-avatar" aria-hidden="true">{displayName(session.profile, session.role).charAt(0).toUpperCase()}</span>
            <span className="account-name">{displayName(session.profile, session.role)}</span>
            <button className="button button-quiet" type="button" onClick={handleLogout} disabled={busy}>
              Sign out
            </button>
          </div>
        )}
        {!session && page !== 'auth' && (
          <div className="guest-actions">
            <button className="button button-quiet" type="button" onClick={() => { setRole('user'); setMode('login'); setPage('auth') }}>
              Log in
            </button>
            <button className="button button-dark" type="button" onClick={() => { setRole('user'); setMode('register'); setPage('auth') }}>
              Sign up
            </button>
          </div>
        )}
      </header>

      <main className="page-content" id="home">
        {notice && (
          <div className={`notice notice-${noticeType}`} role={noticeType === 'error' ? 'alert' : 'status'}>
            {notice}
          </div>
        )}

        {!session && page === 'auth' ? (
          <section className="auth-layout">
            <div className="intro-panel">
              <p className="eyebrow">YOUR CITY, YOUR WAY</p>
              <h1>Move through<br />your day.</h1>
              <p className="intro-copy">Sign in to send a ride request, or create an account to start planning your trips.</p>
              <div className="route-art" aria-hidden="true">
                <span className="route-dot" />
                <span className="route-line" />
                <span className="route-pin">↗</span>
              </div>
            </div>
            <section className="auth-card" aria-labelledby="auth-heading">
              <div className="segmented" aria-label="Account type">
                <button className={role === 'user' ? 'selected' : ''} type="button" onClick={() => setRole('user')}>
                  Rider
                </button>
                <button className={role === 'captain' ? 'selected' : ''} type="button" onClick={() => setRole('captain')}>
                  Captain
                </button>
              </div>
              <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN RAPIDO'}</p>
              <h2 id="auth-heading">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
              <form className="form-stack" onSubmit={handleAuth}>
                {mode === 'register' && (
                  <>
                    <div className="field-row">
                      <label>
                        First name
                        <input name="firstname" autoComplete="given-name" minLength="3" required />
                      </label>
                      <label>
                        Last name <span className="optional">(optional)</span>
                        <input name="lastname" autoComplete="family-name" />
                      </label>
                    </div>
                    {role === 'captain' && (
                      <>
                        <div className="field-row">
                          <label>
                            Vehicle color
                            <input name="color" minLength="3" required />
                          </label>
                          <label>
                            Plate number
                            <input name="plate" minLength="3" required />
                          </label>
                        </div>
                        <div className="field-row">
                          <label>
                            Seats
                            <input name="capacity" type="number" min="1" step="1" defaultValue="1" required />
                          </label>
                          <label>
                            Vehicle type
                            <select name="vehicleType" defaultValue="auto">
                              <option value="auto">Auto</option>
                              <option value="motorcycle">Motorcycle</option>
                              <option value="car">Car</option>
                            </select>
                          </label>
                        </div>
                      </>
                    )}
                  </>
                )}
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <label>
                  Password
                  <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="6" required />
                </label>
                <button className="button button-primary button-wide" type="submit" disabled={busy}>
                  {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
              <p className="form-switch">
                {mode === 'login' ? 'New to RidePass?' : 'Already have an account?'}{' '}
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setNotice('') }}>
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </section>
          </section>
        ) : session?.role === 'captain' ? (
          <section className="welcome-panel">
            <p className="eyebrow">CAPTAIN ACCOUNT</p>
            <h1>Welcome, {displayName(session.profile, session.role)}.</h1>
            <p>Share your live location while you are online. Riders nearby can see your vehicle location on their map.</p>
            <div className="profile-card">
              <div><span>Email</span><strong>{session.profile.email}</strong></div>
              <div><span>Vehicle</span><strong>{session.profile.vehicle?.vehicleType || 'Not provided'}</strong></div>
              <div><span>Plate</span><strong>{session.profile.vehicle?.plate || 'Not provided'}</strong></div>
            </div>
            <section className="sharing-card">
              <div className={`sharing-indicator ${isSharingLocation ? 'sharing-on' : ''}`} />
              <div>
                <h2>{isSharingLocation ? 'You are sharing your location' : 'Location sharing is off'}</h2>
                <p>{isSharingLocation
                  ? 'Your latest GPS location is available to nearby riders while it stays fresh.'
                  : 'Your location is only shared after you start sharing and grant browser permission.'}</p>
              </div>
              <button
                className={`button ${isSharingLocation ? 'button-cancel' : 'button-primary'}`}
                type="button"
                onClick={isSharingLocation || locationSharePending ? stopLocationSharing : startLocationSharing}
              >
                {isSharingLocation ? 'Stop sharing' : locationSharePending ? 'Cancel sharing' : 'Share live location'}
              </button>
            </section>
            {locationShareError && <p className="location-share-error" role="status">{locationShareError}</p>}
          </section>
        ) : (
          <section className="rider-layout">
            {page === 'book' ? (
              <div className="landing-heading">
                <div className="landing-heading-copy">
                  <p className="eyebrow">CITY RIDES, MADE SIMPLE</p>
                  <h1>Your ride.<br /><span>Your way.</span></h1>
                  <p>{session
                    ? `Good to see you, ${displayName(session.profile, session.role)}. Where are you headed?`
                    : 'A convenient way to get where you’re going. Choose your locations and the ride that fits your day.'}</p>
                  <div className="trust-points">
                    <span><b aria-hidden="true">✓</b> Map-picked locations</span>
                    <span><b aria-hidden="true">✓</b> Ride request saved to your account</span>
                  </div>
                </div>
                {session && (
                  <nav className="page-tabs" aria-label="Rider pages">
                    <button className={page === 'book' ? 'active' : ''} type="button" onClick={() => setPage('book')}>Book a ride</button>
                    <button className={page === 'history' ? 'active' : ''} type="button" onClick={() => { setRides(null); setRideError(''); setPage('history') }}>Ride history</button>
                  </nav>
                )}
              </div>
            ) : (
              <div className="rider-heading">
                <div>
                  <p className="eyebrow">YOUR ACCOUNT</p>
                  <h1>Your ride history.</h1>
                  <p className="muted">Requests and their latest status, all in one place.</p>
                </div>
                <nav className="page-tabs" aria-label="Rider pages">
                  <button type="button" onClick={() => setPage('book')}>Book a ride</button>
                  <button className="active" type="button" onClick={() => { setRides(null); setRideError(''); setPage('history') }}>Ride history</button>
                </nav>
              </div>
            )}

            {page === 'book' ? (
              <div className="booking-layout">
                <section className="booking-card" id="book">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">PLAN A JOURNEY</p>
                      <h2>Where are you going?</h2>
                    </div>
                    <span className="secure-label"><span aria-hidden="true">●</span> <span className="secure-label-text">Ride request</span></span>
                  </div>
                  <form className="form-stack" onSubmit={handleBook}>
                    <div className="location-fields">
                      <label className="location-input-label">
                        <span className="location-label"><span className="location-symbol pickup-symbol" aria-hidden="true" />Pickup location</span>
                        <input
                          value={rideForm.pickup}
                          onClick={() => setLocationPickerFor('pickup')}
                          placeholder="Choose your pickup point"
                          title="Choose pickup location on map"
                          minLength="2"
                          maxLength="180"
                          readOnly
                          required
                        />
                        <button className="map-select-button" type="button" onClick={() => setLocationPickerFor('pickup')}>
                          <span aria-hidden="true">⌖</span> Select on map
                        </button>
                      </label>
                      <label className="location-input-label">
                        <span className="location-label"><span className="location-symbol destination-symbol" aria-hidden="true" />Drop-off location</span>
                        <input
                          value={rideForm.destination}
                          onClick={() => setLocationPickerFor('destination')}
                          placeholder="Where would you like to go?"
                          title="Choose destination on map"
                          minLength="2"
                          maxLength="180"
                          readOnly
                          required
                        />
                        <button className="map-select-button" type="button" onClick={() => setLocationPickerFor('destination')}>
                          <span aria-hidden="true">⌖</span> Select on map
                        </button>
                      </label>
                    </div>
                    <label className="pickup-time-label">
                      Pickup time
                      <select defaultValue="now" aria-describedby="schedule-note">
                        <option value="now">Ride now</option>
                        <option value="scheduled" disabled>Schedule a ride — coming soon</option>
                      </select>
                      <span className="schedule-note" id="schedule-note">Scheduled rides aren’t available yet.</span>
                    </label>
                    <fieldset className="ride-options">
                      <legend>Choose your ride</legend>
                      {[
                        { type: 'auto', label: 'Auto', icon: '◒', detail: 'Three-wheeler' },
                        { type: 'motorcycle', label: 'Bike', icon: '⌁', detail: 'Two-wheeler' },
                        { type: 'car', label: 'Cab', icon: '◓', detail: 'Four-wheeler' },
                      ].map((option) => (
                        <button
                          className={`ride-option ${rideForm.vehicleType === option.type ? 'selected' : ''}`}
                          key={option.type}
                          type="button"
                          aria-pressed={rideForm.vehicleType === option.type}
                          onClick={() => {
                            setLatestRide(null)
                            setRideForm({ ...rideForm, vehicleType: option.type })
                          }}
                        >
                          <span className={`ride-icon ride-icon-${option.type}`} aria-hidden="true">{option.icon}</span>
                          <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                        </button>
                      ))}
                    </fieldset>
                    <p className="fine-print">Live nearby vehicles are real captains who have opted in and shared a recent GPS location. A nearby vehicle is not a ride assignment.</p>
                    <button className="button button-primary button-wide" type="submit" disabled={busy || Boolean(latestRide)}>
                      {busy ? 'Sending request…' : latestRide ? 'Request sent' : session ? 'Request this ride' : 'Sign in to request'}
                      {!busy && !latestRide && <span aria-hidden="true">↗</span>}
                    </button>
                  </form>
                </section>
                {session ? <aside className="side-note live-vehicles-card">
                  <div className="live-card-heading">
                    <span className="note-icon" aria-hidden="true">⌖</span>
                    <div>
                      <h3>Live nearby vehicles</h3>
                      <p>{rideForm.pickupLocation
                        ? `${nearbyVehicles.length} captain${nearbyVehicles.length === 1 ? '' : 's'} sharing a recent location`
                        : 'Choose a pickup point to see nearby vehicles.'}</p>
                    </div>
                    <span className={`live-status-dot ${rideForm.pickupLocation ? 'is-live' : ''}`} aria-label={rideForm.pickupLocation ? 'Live map updates on' : 'Waiting for pickup'} />
                  </div>
                  {rideForm.pickupLocation ? (
                    <>
                      <MapView
                        mode="live"
                        point={rideForm.pickupLocation}
                        vehicles={nearbyVehicles}
                      />
                      {nearbyError
                        ? <p className="live-map-status error-text" role="status">{nearbyError}</p>
                        : <p className="live-map-status">Location updates refresh every 10 seconds. Map pins are opt-in captain GPS reports, not assigned drivers.</p>}
                    </>
                  ) : (
                    <div className="live-map-empty">Nearby live locations appear here after you select a pickup point.</div>
                  )}
                </aside> : <HeroIllustration />}
              </div>
            ) : (
              <section className="history-card">
                <div className="history-heading">
                  <div><p className="eyebrow">YOUR ACCOUNT</p><h2>Ride history</h2></div>
                  <button className="button button-quiet" type="button" onClick={() => { setRides(null); setRideError(''); setHistoryRefresh((count) => count + 1) }} disabled={rides === null}>Refresh list</button>
                </div>
                {rideError && <p className="notice notice-error" role="alert">{rideError}</p>}
                {rides === null ? <p className="muted">Loading your rides…</p> : rides.length === 0 ? (
                  <p className="empty-state">No saved rides yet. Your ride requests will appear here.</p>
                ) : (
                  <div className="ride-list">
                    {rides.map((ride) => (
                      <article className="ride-row" key={ride._id}>
                        <div className="ride-route">
                          <span className="route-dot" aria-hidden="true" />
                          <span><strong>{ride.pickup}</strong><small>{ride.destination}</small></span>
                        </div>
                        <div className="ride-meta">
                          <span className={`status status-${ride.status}`}>{ride.status}</span>
                          <span>{ride.vehicleType}</span>
                          <time dateTime={ride.createdAt}>{new Date(ride.createdAt).toLocaleString()}</time>
                        </div>
                        {ride.status === 'pending' && (
                          <button className="button button-cancel" type="button" disabled={busy} onClick={() => handleCancel(ride._id)}>
                            Cancel
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {latestRide && page === 'book' && (
              <section className="confirmation-card" aria-live="polite">
                <div className="confirmation-mark" aria-hidden="true">✓</div>
                <div>
                  <p className="eyebrow">REQUEST SAVED</p>
                  <h2>Ride request created</h2>
                  <p><strong>Booking ID:</strong> <span className="booking-id">{latestRide._id}</span></p>
                  <p><strong>Route:</strong> {latestRide.pickup} → {latestRide.destination}</p>
                  <p><strong>Ride:</strong> {latestRide.vehicleType} · <span className={`status status-${latestRide.status}`}>{latestRide.status}</span></p>
                  <button className="button button-quiet" type="button" onClick={startAnotherRide}>Start another request</button>
                </div>
              </section>
            )}
            {page === 'book' && (
              <>
                <ServicesSection onSelectService={selectService} />
                <InformationSections onBook={scrollToBooking} />
              </>
            )}
          </section>
        )}
      </main>
      {locationPickerFor && (
        <LocationPicker
          field={locationPickerFor}
          initialPoint={rideForm[`${locationPickerFor}Location`]
            ? { ...rideForm[`${locationPickerFor}Location`], label: rideForm[locationPickerFor] }
            : null}
          onClose={() => setLocationPickerFor(null)}
          onSelect={location => selectLocation(locationPickerFor, location)}
        />
      )}
      <footer className="footer">
        <a className="footer-brand" href="#home"><span className="footer-brand-icon" aria-hidden="true">⚡</span>RidePass</a>
        <span>Thoughtful rides for everyday city life.</span>
        {page === 'book' && (!session || session.role === 'user') && (
          <div className="footer-links"><a href="#services">Services</a><a href="#safety">Safety & privacy</a><a href="#contact">Contact</a></div>
        )}
        <small>Only services confirmed by the platform are shown as available.</small>
      </footer>
    </div>
  )
}

export default App
