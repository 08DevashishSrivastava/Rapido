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
    "password": "<bcrypt-hash>",
    "__v": 0
  }
}
```

This example reflects the current controller response: it returns the created user document, which includes the hashed password because the controller does not remove it. The password is hashed, not plaintext, but the hash is sensitive and should not be sent to clients. Remove `password` from the user object before returning it from the controller.

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

The checked-in `routes/user.routes.js` is currently empty, so this endpoint is documented as the intended registration contract but is not currently exposed by the backend.
