# User Management System

This document provides an overview of the user management system, including the data model, user roles, and API endpoints.

## User Data Model

The user data is stored in two tables: `users` and `users_info`.

### `users` Table

This table stores the primary authentication and identification information for users.

| Column | Type | Description |
|---|---|---|
| `id` | `VARCHAR` | Unique identifier for the user. |
| `email` | `VARCHAR` | User's email address (used for login and communication). |
| `password` | `VARCHAR` | Hashed password for the user. |
| `username` | `VARCHAR` | Unique username for the user. |
| `roles` | `VARCHAR` | Comma-separated list of roles assigned to the user (e.g., 'user,admin'). |
| `emailVerified` | `BOOLEAN` | Flag indicating if the user's email address has been verified. |
| `verificationToken` | `VARCHAR` | Token used for email verification. |
| `tokenExpiration` | `TIMESTAMPTZ` | Expiration date for the verification token. |
| `google_id` | `VARCHAR` | User's Google ID for Google authentication. |
| `facebook_id` | `VARCHAR` | User's Facebook ID for Facebook authentication. |
| `profile_image` | `VARCHAR` | Filename of the user's profile image. |
| `firstname` | `VARCHAR` | User's first name. |
| `lastname` | `VARCHAR` | User's last name. |
| `mobile` | `VARCHAR` | User's mobile number. |
| `district_id` | `INT` | Foreign key to the `district` table. |
| `taluka_id` | `INT` | Foreign key to the `taluka` table. |
| `village_id` | `INT` | Foreign key to the `village` table. |
| `created_at` | `TIMESTAMPTZ` | Timestamp of when the user was created. |

### `users_info` Table

This table stores additional information about the user.

| Column | Type | Description |
|---|---|---|
| `id` | `INT` | Foreign key to the `users` table. |
| `pass_key` | `VARCHAR` | Hashed password. |
| `role_id` | `INT` | Foreign key to the `roles` table. |
| `number` | `VARCHAR` | User's phone number. |
| `firstname` | `VARCHAR` | User's first name. |
| `lastname` | `VARCHAR` | User's last name. |
| `middlename` | `VARCHAR` | User's middle name. |
| `number_verified` | `BOOLEAN` | Flag indicating if the user's phone number has been verified. |
| `image` | `VARCHAR` | Filename of the user's image. |
| `created_at` | `TIMESTAMPTZ` | Timestamp of when the user info was created. |

## User Roles

The system uses a role-based access control system. The following roles are defined:

*   **`user`**: The default role for all registered users.
*   **`admin`**: Has access to user management features, such as listing and deleting users.
*   **`master`**: Has the highest level of access, including all admin privileges.

## API Endpoints

### Authentication

*   **`POST /register`**: Registers a new user.
    *   **Request Body**: `{"username": "testuser", "email": "test@example.com", "password": "password123", "roles": "user"}`
    *   **Response**: `{"success": true, "message": "Registration successful! ..."}`

*   **`POST /login`**: Logs in a user.
    *   **Request Body**: `{"username": "testuser", "password": "password123"}`
    *   **Response**: `{"token": "...", "id": "...", ...}`

*   **`POST /google-auth`**: Authenticates a user with Google.
    *   **Request Body**: `{"idToken": "..."}`
    *   **Response**: `{"token": "...", "id": "...", ...}`

*   **`POST /facebook-auth`**: Authenticates a user with Facebook.
    *   **Request Body**: `{"accessToken": "..."}`
    *   **Response**: `{"token": "...", "id": "...", ...}`

### User Management

*   **`GET /users`**: Retrieves a list of all users.
    *   **Requires Role**: `admin` or `master`
    *   **Response**: `{"success": true, "users": [...]}`

*   **`PUT /users/:userid`**: Updates a user's information.
    *   **Requires Role**: `admin` or `master` (for updating roles), or the user themselves.
    *   **Request Body**: `{"firstname": "John", "lastname": "Doe", ...}`
    *   **Response**: `{"success": true, "message": "User updated successfully", "user": ...}`

*   **`DELETE /users/:userid`**: Deletes a user.
    *   **Requires Role**: `admin` or `master`
    *   **Response**: `{"success": true, "message": "User deleted successfully"}`

### Profile & Verification

*   **`GET /profile-image/:username`**: Retrieves a user's profile image.

*   **`GET /verify-email`**: Verifies a user's email address.
    *   **Query Parameters**: `token`, `email`

*   **`POST /resend-verification`**: Resends the email verification link.
    *   **Request Body**: `{"email": "test@example.com"}`

*   **`POST /request-password-reset`**: Sends a password reset email.
    *   **Request Body**: `{"email": "test@example.com"}`

*   **`POST /reset-password`**: Resets a user's password.
    *   **Request Body**: `{"token": "...", "email": "test@example.com", "password": "newpassword"}`

### Utility

*   **`POST /check-username`**: Checks if a username is already taken.
    *   **Request Body**: `{"username": "testuser"}`
    *   **Response**: `{"isTaken": true}`

*   **`POST /check-email`**: Checks if an email is already taken.
    *   **Request Body**: `{"email": "test@example.com"}`
    *   **Response**: `{"isTaken": true}`
