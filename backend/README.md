# Backend API

## Register a user

Creates a user account and returns an authentication token.

### Endpoint

```http
POST /users/register
Content-Type: application/json
```

The app mounts the user router at `/users`; the registration route is `/register` within that router. Therefore, the effective path is `/users/register` (not `/user/register`).

### Request body

Send a JSON object with the following fields:

| Field | Required | Constraints |
| --- | --- | --- |
| `fullname.firstname` | Yes | At least 3 characters |
| `fullname.lastname` | No | If provided, at least 3 characters |
| `email` | Yes | Must be a valid email address; must be unique |
| `password` | Yes | At least 6 characters |

Example:

```json
{
  "fullname": {
    "firstname": "Alex",
    "lastname": "Morgan"
  },
  "email": "alex.morgan@example.com",
  "password": "strong-password"
}
```

`fullname.lastname` is optional. The password is hashed before it is stored.

### Responses

#### `201 Created`

Registration succeeded. The response contains the authentication token and the created user:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "67123456789abcdef0123456",
    "fullname": {
      "firstname": "Alex",
      "lastname": "Morgan"
    },
    "email": "alex.morgan@example.com",
    "__v": 0
  }
}
```

The response does not include the password.

#### `400 Bad Request`

The request failed validation. The response contains an `errors` array describing each invalid field. For example, submitting an invalid email returns:

```json
{
  "errors": [
    {
      "type": "field",
      "value": "not-an-email",
      "msg": "Invalid Email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### Implementation status

The registration route is implemented in `routes/user.routes.js` and is exposed at `/users/register`.

## Log in a user

Authenticates an existing user using their email and password. On success, returns an authentication token and the user's profile.

### Endpoint

```http
POST /users/login
Content-Type: application/json
```

The app mounts the user router at `/users`; the login route is `/login` within that router. Therefore, the effective path is `/users/login` (not `/user/login`).

### Request body

Both fields are required:

| Field | Required | Constraints |
| --- | --- | --- |
| `email` | Yes | Must be a valid email address |
| `password` | Yes | At least 6 characters |

Example:

```json
{
  "email": "alex.morgan@example.com",
  "password": "strong-password"
}
```

### Responses

#### `200 OK`

The credentials are valid. The response contains a JWT and the user's profile; the password is not returned:

```json
{
  "token": "<jwt-token>",
  "user": {
    "_id": "67123456789abcdef0123456",
    "fullname": {
      "firstname": "Alex",
      "lastname": "Morgan"
    },
    "email": "alex.morgan@example.com",
    "__v": 0
  }
}
```

#### `400 Bad Request`

The email or password is missing or does not satisfy validation. For example, an invalid email returns:

```json
{
  "errors": [
    {
      "type": "field",
      "value": "not-an-email",
      "msg": "Invalid Email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### `401 Unauthorized`

The email is not registered or the password does not match:

```json
{
  "message": "Invalid email or password"
}
```

The same message is used for either case so the response does not reveal whether an email is registered.

## Get the authenticated user's profile

Returns the profile belonging to the authenticated user.

### Endpoint

```http
GET /users/profile
Authorization: Bearer <jwt-token>
```

The token can also be sent in a `token` cookie. The endpoint requires a valid, unexpired token that has not been blacklisted.

### Request

No request body is required.

### Responses

#### `200 OK`

The authenticated user's profile is returned. The password is excluded:

```json
{
  "_id": "67123456789abcdef0123456",
  "fullname": {
    "firstname": "Alex",
    "lastname": "Morgan"
  },
  "email": "alex.morgan@example.com",
  "__v": 0
}
```

#### `401 Unauthorized`

The token is missing, invalid, expired, or blacklisted:

```json
{
  "message": "Unauthorized"
}
```

## Log out a user

Invalidates the current JWT by adding it to the token blacklist and clears the `token` cookie.

### Endpoint

```http
POST /users/logout
Authorization: Bearer <jwt-token>
```

The token can also be sent in a `token` cookie. The endpoint requires a valid, unexpired token that has not already been blacklisted. No request body is required.

### Responses

#### `200 OK`

Logout succeeded:

```json
{
  "message": "Logged out"
}
```

The blacklist record expires automatically after 24 hours.

#### `401 Unauthorized`

The token is missing, invalid, expired, or already blacklisted:

```json
{
  "message": "Unauthorized"
}
```

## Captain routes

### Register a captain

Creates a captain account with vehicle details and returns an authentication token.

#### Endpoint

```http
POST /captains/register
Content-Type: application/json
```

The app mounts captain routes at `/captains`.

#### Request body

| Field | Required | Constraints |
| --- | --- | --- |
| `fullname.firstname` | Yes | At least 3 characters |
| `fullname.lastname` | No | If provided, at least 3 characters |
| `email` | Yes | Must be a valid, unique email address |
| `password` | Yes | At least 6 characters |
| `vehicle.color` | Yes | At least 3 characters |
| `vehicle.plate` | Yes | At least 3 characters |
| `vehicle.capacity` | Yes | Positive integer |
| `vehicle.vehicleType` | Yes | `car`, `motorcycle`, or `auto` |

Example:

```json
{
  "fullname": {
    "firstname": "Jordan",
    "lastname": "Lee"
  },
  "email": "jordan.lee@example.com",
  "password": "strong-password",
  "vehicle": {
    "color": "blue",
    "plate": "ABC123",
    "capacity": 4,
    "vehicleType": "car"
  }
}
```

#### Responses

##### `201 Created`

On successful registration, the endpoint returns a JWT and the created captain:

```json
{
  "token": "<jwt-token>",
  "captain": {
    "_id": "<captain-id>",
    "fullname": {
      "firstname": "Jordan",
      "lastname": "Lee"
    },
    "email": "jordan.lee@example.com",
    "password": "<bcrypt-hash>",
    "status": "inactive",
    "vehicle": {
      "color": "blue",
      "plate": "ABC123",
      "capacity": 4,
      "vehicleType": "car",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}
```

The token expires after 24 hours. The current controller returns the created captain document, which can include the hashed password. The hash is sensitive and should be removed from the response.

##### `400 Bad Request` — captain already exists

The email is already registered:

```json
{
  "message": "Captain already exist"
}
```

##### `400 Bad Request` — invalid request

Validation failures return an `errors` array. For example, an invalid email returns:

```json
{
  "errors": [
    {
      "type": "field",
      "value": "not-an-email",
      "msg": "Invalid Email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

##### `500 Internal Server Error` — model validation failure

The current route/controller does not pass `vehicle.latitude` or `vehicle.longitude` to the captain model, even though both are required by the schema. Consequently, captain creation can fail with a server error. The exact error response depends on the Express error handler; no application-specific JSON response is defined for this case.
