# Rapido

Rapido is a React/Vite ride-request frontend backed by an Express API and MongoDB. The existing database and account models are retained. The current ride workflow stores a rider's pickup, destination, selected vehicle type, and request status; it does not yet provide geocoding, fare/time estimates, payment, captain assignment, or live tracking.

## Prerequisites

- Node.js 20.19+ or 22.12+ (required by the current Vite release)
- npm
- MongoDB, local or hosted

## Setup

Install dependencies in each app:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `DB_CONNECT` to the MongoDB database URI and replace `JWT_SECRET` with a long random secret in `backend/.env`. The example URI uses a local MongoDB database. Do not commit `.env`.

In a second terminal:

```powershell
cd frontend\frontend
npm install
Copy-Item .env.example .env
```

Set `VITE_API_BASE_URL` in `frontend/frontend/.env` if the API is not at `http://localhost:4000`. Set backend `FRONTEND_ORIGIN` to the frontend origin (normally `http://localhost:5173`); multiple origins may be comma-separated. `VITE_NOMINATIM_URL` can point to a compatible geocoding service; it defaults to OpenStreetMap Nominatim.

## Run

Start MongoDB, then run the backend and frontend in separate terminals:

```powershell
cd backend
npm start
```

```powershell
cd frontend\frontend
npm run dev
```

Open the Vite URL shown in the frontend terminal. The frontend uses the API URL from `VITE_API_BASE_URL`; it does not embed per-component localhost addresses.

## Test and build

```powershell
cd backend
npm test
```

```powershell
cd frontend\frontend
npm run lint
npm run build
```

The backend tests validate ride schema requirements and status/type constraints without requiring a live MongoDB. For end-to-end checks, configure a reachable MongoDB instance and run both servers.

## Maps and live vehicles

Pickup and destination fields open a map picker. A rider can search an address, choose a result, click directly on the map, or grant permission to use the device's current location. The selected label and GPS coordinates are saved with the ride. Maps and tiles use OpenStreetMap; address lookup uses Nominatim by default. Keep geocoding use modest and follow the selected provider's usage policy; set `VITE_NOMINATIM_URL` to a compatible service if deploying beyond a small project.

Captains must sign in, explicitly choose **Share live location**, and grant browser GPS permission. Their browser sends real coordinates while the page is active; riders see only nearby opted-in vehicles with a report received within the last 90 seconds. The nearby map refreshes every 10 seconds and searches within 5 km of the selected pickup. Stopping sharing, signing out, or a stale report removes a captain from rider results. Location sharing requires browser geolocation, which generally needs HTTPS outside localhost. Nearby pins indicate live captain positions only; they do not represent a driver assigned to a ride. The backend does not yet assign rides.

## API

All request and response bodies use JSON. Protected routes accept `Authorization: Bearer <token>` (the existing `token` cookie is also accepted). JWTs are returned by successful login/registration. Passwords are never returned.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/users/register` | No | Create rider account; body: `{ "fullname": { "firstname": "...", "lastname": "..." }, "email": "...", "password": "..." }` |
| `POST` | `/users/login` | No | Rider login; body: `{ "email": "...", "password": "..." }` |
| `GET` | `/users/profile` | Rider | Current rider profile |
| `POST` | `/users/logout` | Rider | Blacklist current token |
| `POST` | `/captains/register` | No | Captain account; same identity fields plus `vehicle: { "color": "...", "plate": "...", "capacity": 1, "vehicleType": "auto" }` |
| `POST` | `/captains/login` | No | Captain login; body: `{ "email": "...", "password": "..." }` |
| `GET` | `/captains/profile` | Captain | Current captain profile |
| `POST` | `/captains/location` | Captain | Update GPS location and opt in as active; body: `{ "latitude": 12.9, "longitude": 77.6 }` |
| `POST` | `/captains/location/stop` | Captain | Stop location sharing and clear current coordinates |
| `POST` | `/captains/logout` | Captain | Blacklist current token |
| `POST` | `/rides` | Rider | Persist ride; body: `{ "pickup": "...", "pickupLocation": { "latitude": 12.9, "longitude": 77.6 }, "destination": "...", "destinationLocation": { "latitude": 12.91, "longitude": 77.61 }, "vehicleType": "auto" }` |
| `GET` | `/rides` | Rider | List only this rider's rides, newest first |
| `GET` | `/rides/nearby?latitude=12.9&longitude=77.6&vehicleType=auto&radius=5000` | Rider | Find fresh, opted-in captain locations within at most 10 km; returns `{ "vehicles": [{ "color": "...", "vehicleType": "auto", "latitude": 12.9, "longitude": 77.6, "updatedAt": "..." }] }` |
| `GET` | `/rides/:id` | Ride owner | Fetch one ride belonging to the current rider |
| `POST` | `/rides/:id/cancel` | Ride owner | Cancel a pending ride; other statuses cannot be set by clients |
| `GET` | `/` | No | API health response `{ "name": "Rapido API", "status": "ok" }` |

Supported `vehicleType` values are `auto`, `motorcycle`, and `car`. Both ride locations require a selected map point and valid latitude/longitude. A newly saved ride returns `201` and `{ "ride": { "_id": "...", "pickup": "...", "pickupLocation": { "latitude": 12.9, "longitude": 77.6 }, "destination": "...", "destinationLocation": { "latitude": 12.91, "longitude": 77.61 }, "vehicleType": "...", "status": "pending", "createdAt": "..." } }`. Cancellation returns the updated `{ "ride": ... }`; rides can only transition from `pending` to `cancelled`. A request to cancel a non-pending ride returns `409`. Validation errors return `400`, unauthenticated requests `401`, and unknown resources `404`. Ride ownership is derived from the verified token, not a client-supplied user ID.

No fare, distance, ETA, payment, assigned driver, or confirmed status is returned because those services are not present in this project. The coordinates are the rider-selected map points, and captain locations are only the latest opt-in device GPS reports.
