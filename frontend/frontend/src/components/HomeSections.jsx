const services = [
  {
    title: 'Bike taxi',
    description: 'A nimble way to get across town.',
    icon: 'bike',
    vehicleType: 'motorcycle',
    action: 'Choose bike',
  },
  {
    title: 'Auto rickshaw',
    description: 'Everyday city rides, made simple.',
    icon: 'auto',
    vehicleType: 'auto',
    action: 'Choose auto',
  },
  {
    title: 'Cab',
    description: 'A little more room for your journey.',
    icon: 'cab',
    vehicleType: 'car',
    action: 'Choose cab',
  },
  {
    title: 'Parcel delivery',
    description: 'Send something across the city.',
    icon: 'parcel',
    action: 'Coming soon',
  },
  {
    title: 'Travel & stay',
    description: 'Plan a longer escape in one place.',
    icon: 'travel',
    action: 'Coming soon',
  },
  {
    title: 'Metro ticket',
    description: 'Connect your ride with the rail.',
    icon: 'metro',
    action: 'Coming soon',
  },
]

function ServiceArt({ type }) {
  if (type === 'bike') {
    return (
      <svg viewBox="0 0 140 90" aria-hidden="true">
        <circle cx="38" cy="66" r="15" />
        <circle cx="104" cy="66" r="15" />
        <path d="m38 66 19-27 20 27H38l13-17h24l12-19h17l10 19" />
        <path d="M54 31h15m20-9h15m-29 0h16" />
      </svg>
    )
  }
  if (type === 'auto') {
    return (
      <svg viewBox="0 0 140 90" aria-hidden="true">
        <circle cx="40" cy="69" r="12" />
        <circle cx="101" cy="69" r="12" />
        <path d="M25 64V43l12-7 10-18h37l17 18 15 7v21H25Z" />
        <path d="M51 25h28l12 16H42l9-16Zm-5 25h42" />
      </svg>
    )
  }
  if (type === 'cab') {
    return (
      <svg viewBox="0 0 140 90" aria-hidden="true">
        <circle cx="38" cy="68" r="12" />
        <circle cx="103" cy="68" r="12" />
        <path d="m22 62 8-20q2-6 9-8l13-15h37l18 18 12 5 5 20v7H22v-7Z" />
        <path d="M57 25h27l15 15H44l13-15Z" />
      </svg>
    )
  }
  if (type === 'parcel') {
    return (
      <svg viewBox="0 0 140 90" aria-hidden="true">
        <path d="m34 29 36-17 37 17v39L70 86 34 68V29Z" />
        <path d="m34 29 36 18 37-18M70 47v39m-17-46 37-18" />
      </svg>
    )
  }
  if (type === 'travel') {
    return (
      <svg viewBox="0 0 140 90" aria-hidden="true">
        <path d="M30 70h82M48 70q20-14 4-54m-4 20Q29 28 27 15q18 2 21 21Zm7-11q5-15 22-18 0 17-20 26Zm-5 8q-16-8-30 0 9 16 30 10Z" />
        <path d="M78 47h22l5 23H76l2-23Zm5 0v-6a6 6 0 0 1 12 0v6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 140 90" aria-hidden="true">
      <path d="M24 68V28q0-8 8-8h76q8 0 8 8v40H24Z" />
      <path d="M32 29h76v24H32zM44 29v24m26-24v24m26-24v24M19 68h102" />
      <circle cx="43" cy="68" r="5" />
      <circle cx="98" cy="68" r="5" />
    </svg>
  )
}

export function HeroIllustration() {
  return (
    <div className="hero-art-card" role="img" aria-label="Illustration of a city ride">
      <div className="hero-art-sun" />
      <div className="hero-art-label"><span /> A little closer, every day</div>
      <div className="hero-city city-back">
        <i /><i /><i /><i /><i />
      </div>
      <div className="hero-road">
        <span className="hero-route-line" />
        <div className="hero-car">
          <span className="hero-car-window" />
          <span className="hero-car-wheel wheel-one" />
          <span className="hero-car-wheel wheel-two" />
        </div>
      </div>
      <div className="hero-art-caption">
        <span className="hero-caption-icon">↗</span>
        <span><strong>Simple booking.</strong><small>Reliable journeys.</small></span>
      </div>
    </div>
  )
}

export function ServicesSection({ onSelectService }) {
  return (
    <section className="home-section services-section" id="services" aria-labelledby="services-title">
      <div className="section-intro">
        <div>
          <p className="eyebrow">MOVE YOUR WAY</p>
          <h2 id="services-title">One city. Many ways to go.</h2>
        </div>
        <p>Pick the ride that fits your day. More ways to move are on the way.</p>
      </div>
      <div className="service-grid">
        {services.map(service => (
          <article className={`service-card ${service.vehicleType ? 'service-available' : 'service-coming'}`} key={service.title}>
            <div className={`service-art service-art-${service.icon}`}>
              <ServiceArt type={service.icon} />
            </div>
            <div className="service-copy">
              <span className="service-status">{service.vehicleType ? 'Available' : 'Coming soon'}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <button
                type="button"
                className="service-action"
                disabled={!service.vehicleType}
                onClick={() => onSelectService(service.vehicleType)}
              >
                {service.action} {service.vehicleType && <span aria-hidden="true">↗</span>}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function InformationSections({ onBook }) {
  return (
    <>
      <section className="home-section how-section" id="how-it-works" aria-labelledby="how-title">
        <div className="section-intro">
          <div>
            <p className="eyebrow">THREE EASY STEPS</p>
            <h2 id="how-title">From here to there.</h2>
          </div>
          <p>No guesswork. Choose your places, pick a ride, and send your request.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-symbol">⌖</span><h3>Enter locations</h3><p>Search for a place or drop a pin on the map.</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-symbol">↗</span><h3>Choose your ride</h3><p>Select an available ride type for your trip.</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-symbol">✓</span><h3>Confirm your request</h3><p>Your request is saved to your account with its current status.</p></article>
        </div>
      </section>

      <section className="home-section benefits-section" id="safety" aria-labelledby="benefits-title">
        <div className="benefits-heading">
          <p className="eyebrow">MADE FOR YOUR EVERYDAY</p>
          <h2 id="benefits-title">A little more ease<br />in every journey.</h2>
          <p>Useful details, thoughtful choices, and the control to plan your ride your way.</p>
          <button type="button" className="text-link" onClick={onBook}>Plan a ride <span aria-hidden="true">↗</span></button>
        </div>
        <div className="benefits-list">
          <article><span className="benefit-icon">◎</span><div><h3>Choose what you share</h3><p>Captains opt in to sharing their live location. Nearby map pins are location reports, not ride assignments.</p></div></article>
          <article><span className="benefit-icon">↗</span><div><h3>Know what’s confirmed</h3><p>See the request status returned by the service. No made-up fares or arrival times.</p></div></article>
          <article><span className="benefit-icon">⌖</span><div><h3>Your route, your choice</h3><p>Pick your pickup and destination with address search, map pins, or your device location.</p></div></article>
        </div>
      </section>

      <section className="promo-banner" id="contact">
        <div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Make your next move a simple one.</h2><p>Choose your pickup and destination to get started.</p></div>
        <button type="button" className="button button-dark" onClick={onBook}>Book a ride <span aria-hidden="true">↗</span></button>
      </section>
    </>
  )
}
