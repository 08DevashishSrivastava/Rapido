# Backend

The backend setup, environment configuration, run/test commands, and API contract are documented in the [project README](../README.md).

The API is an Express application using MongoDB/Mongoose. Configure `DB_CONNECT`, `JWT_SECRET`, `PORT`, and `FRONTEND_ORIGIN` in `backend/.env` (see `.env.example`). The server connects to MongoDB before listening.

Ride requests are persisted in the `rides` collection and associated with the authenticated rider. Pickup and destination require map coordinates. Only the owner can read or cancel a ride; cancellation is limited to pending requests. Captains can opt in to share GPS coordinates through `POST /captains/location` and stop with `POST /captains/location/stop`. Riders can query recently reported active captains through `GET /rides/nearby`. Captains must keep the app open and grant browser location permission; stale locations are omitted after 90 seconds. Map tiles and geocoding use OpenStreetMap services by default. Fare estimates, payments, and ride assignment are not implemented.
