# To-Do List API

REST API for a weekly to-do list app. Users can create, edit, delete and search tasks, mark them as completed or in progress, and see open and completed counts grouped by week (Monday to Sunday).

**Live API:** `https://<your-service>.onrender.com`
**Health check:** `https://<your-service>.onrender.com/api/health`
**Frontend repo:** `<link to frontend repo>`
**Frontend live app:** `<link to Netlify site>`

> The API is hosted on a free Render instance, which sleeps when idle. The first request after a quiet period can take around 30 seconds. Open the health check URL once to wake it up.

## Tech stack

- Node.js (ES modules)
- Express 5
- MongoDB Atlas with Mongoose
- `cors` and `dotenv`

No other runtime dependencies. Validation, error handling and query logic are written in plain code so they are easy to read and review.

## Features

- Create, read, update and delete tasks
- Title and date and time are mandatory. Description and priority (`low`, `medium`, `high`) are optional
- Status is either `in_progress` or `completed`
- Filter tasks by date range and status
- Keyword search across title and description (case-insensitive, partial match)
- Weekly summary of open and completed task counts, with weeks starting on Monday in the user's timezone
- Consistent JSON error responses with correct HTTP status codes

## Project structure

```
server/
  src/
    server.js                 # loads env, connects to MongoDB, starts the server
    app.js                    # Express app, middleware and routes
    config/db.js              # MongoDB connection
    models/Task.js            # Mongoose schema
    controllers/taskController.js
    routes/taskRoutes.js
    middleware/errorHandler.js
  docs/
    todo-app-api.postman_collection.json
  .env.example
```

Requests flow through `routes`, then `controllers`, then the `model`. Errors from any step reach one central error handler.

## Getting started

**Prerequisites:** Node.js 18 or newer, and a MongoDB 5.0+ database (a free MongoDB Atlas cluster works).

```bash
git clone <this-repo-url>
cd <repo-folder>
npm install
cp .env.example .env     # then fill in the values
npm run dev
```

The server starts on `http://localhost:5000`.

### Environment variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the server listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/todo-app` |
| `CLIENT_URL` | Frontend origin allowed by CORS, with no trailing slash | `http://localhost:5173` |

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm start` | Start in production mode |

## API reference

Base path: `/api/tasks`. All request and response bodies are JSON.

| Method | Endpoint | Description | Success |
|---|---|---|---|
| GET | `/api/health` | Health check | 200 |
| GET | `/api/tasks` | List tasks. Supports `from`, `to`, `q` and `status` query params | 200 |
| GET | `/api/tasks/:id` | Get one task | 200 |
| POST | `/api/tasks` | Create a task | 201 |
| PATCH | `/api/tasks/:id` | Update any field, including `status` | 200 |
| DELETE | `/api/tasks/:id` | Delete a task | 204 |
| GET | `/api/tasks/summary/weekly?tz=` | Weekly open and completed counts | 200 |

### Query parameters for `GET /api/tasks`

| Param | Description |
|---|---|
| `from` | ISO date. Includes tasks due at or after this time |
| `to` | ISO date. Includes tasks due strictly before this time |
| `q` | Keyword searched in title and description |
| `status` | `in_progress` or `completed` |

Results are sorted by `dueAt` ascending. To get one week of tasks, send that week's Monday 00:00 as `from` and the next Monday 00:00 as `to`.

### Create a task

`POST /api/tasks`

```json
{
  "title": "Finish wireframe",
  "description": "Home screen",
  "dueAt": "2026-11-14T10:00:00.000Z",
  "priority": "high"
}
```

Response `201`:

```json
{
  "_id": "6af6b2a0a4508cc95433e8b7",
  "title": "Finish wireframe",
  "description": "Home screen",
  "dueAt": "2026-11-14T10:00:00.000Z",
  "priority": "high",
  "status": "in_progress",
  "completedAt": null,
  "createdAt": "2026-11-13T06:48:00.354Z",
  "updatedAt": "2026-11-13T06:48:00.354Z"
}
```

Only `title` and `dueAt` are required. If `description` and `priority` are omitted, they default to an empty string and `medium`. A new task always starts as `in_progress`, even if `status` is sent.

### Update a task

`PATCH /api/tasks/:id` accepts any of `title`, `description`, `dueAt`, `priority` and `status`. Send only the fields that changed.

```json
{ "status": "completed" }
```

When `status` changes, `completedAt` is set to the current time for `completed`, and cleared to `null` for `in_progress`.

### Weekly summary

`GET /api/tasks/summary/weekly?tz=Asia/Kolkata`

```json
[
  { "weekStart": "2026-11-15T18:30:00.000Z", "open": 1, "completed": 0 },
  { "weekStart": "2026-11-08T18:30:00.000Z", "open": 3, "completed": 1 }
]
```

`weekStart` is Monday 00:00 in the given timezone, returned as a UTC timestamp. In the example above, `2026-11-08T18:30:00.000Z` is Monday 9 November 00:00 in India. Weeks are sorted newest first. Weeks with no tasks are not returned. `tz` is an IANA timezone name and defaults to `UTC`.

### Errors

All errors use the same shape:

```json
{ "message": "Title is required" }
```

| Status | When |
|---|---|
| 400 | Validation failed, invalid id, invalid timezone or malformed JSON body |
| 404 | Task or route not found |
| 500 | Unexpected server error. Details are logged on the server and not exposed to the client |

## Data model

A single `Task` collection:

| Field | Type | Rules |
|---|---|---|
| `title` | String | Required, trimmed, max 120 characters |
| `description` | String | Optional, trimmed, max 1000 characters, defaults to `''` |
| `dueAt` | Date | Required. Holds both date and time |
| `priority` | String | `low`, `medium` or `high`. Defaults to `medium` |
| `status` | String | `in_progress` or `completed`. Defaults to `in_progress` |
| `completedAt` | Date | `null` until completed |
| `createdAt`, `updatedAt` | Date | Added by Mongoose timestamps |

An index on `dueAt` supports the date-range and weekly queries.

## Design decisions

**Weeks are not stored.** A week is a grouping of tasks by date, so saving it would duplicate data and create sync problems when a due date changes. The weekly summary is computed with one MongoDB aggregation (`$dateTrunc` with `startOfWeek: 'monday'`). This needs MongoDB 5.0 or newer.

**Timezone-aware weeks.** The client sends its timezone with the summary request, so a task due Sunday 23:30 in India lands in the correct week instead of being grouped by UTC.

**Express 5, so no try/catch in controllers.** Express 5 forwards errors and rejected promises from async handlers to the error middleware automatically. Controllers stay short and a single error handler in `middleware/errorHandler.js` formats every failure. With Express 4, each handler would need a try/catch or a wrapper function.

**Central error handling.** Mongoose validation errors, invalid ObjectIds and malformed JSON are converted to `400`. Unknown routes return `404`. Anything unexpected returns a generic `500`.

**Schema is the source of truth for validation.** Required fields, lengths and enums live in the Mongoose schema, and updates use `runValidators: true`, so creating and editing follow the same rules.

**`PATCH` for updates.** One endpoint handles editing fields and changing status, and clients send only what changed.

**Field whitelisting.** Create and update read only the allowed fields from the request body. Clients cannot overwrite `_id`, `createdAt` or `completedAt`, and cannot create a task that is already completed.

**Safe search.** The search keyword is escaped before it is used in a regular expression, so characters like `(` or `.*` are matched literally and cannot break the query. Regex search supports partial words (`wire` finds `Wireframe`), which a MongoDB text index does not.

**Past due dates are allowed.** Users may log overdue tasks or tasks they already finished. If needed, past dates can be restricted in the client.

## Testing

A Postman collection with 60+ requests and automated assertions is included at `docs/todo-app-api.postman_collection.json`.

1. Import the file into Postman.
2. Set the `baseUrl` collection variable if your server is not on `http://localhost:5000`.
3. Run the whole collection with the Collection Runner, in order.

It covers create, read, update, delete, search and filters, validation errors, the weekly summary (including a Sunday 23:30 vs Monday 00:30 timezone boundary) and status transitions. Every test record is tagged `PMTEST` and deleted at the end of the run.

## Deployment

The API runs on Render with MongoDB Atlas.

1. Create a Render web service from this repo. Build command `npm install`, start command `npm start`.
2. Set `MONGO_URI` and `CLIENT_URL` in the environment settings. `PORT` is set by Render.
3. In Atlas, allow network access from Render (`0.0.0.0/0` for this project).

## Known limitations and future improvements

- No authentication. Tasks are shared by everyone using the API
- No pagination on `GET /api/tasks`. Weekly queries keep result sizes small
- Search uses a regex scan. For larger data, use a text index or Atlas Search
- No automated unit or integration tests beyond the Postman collection
- Possible additions: JWT auth with per-user tasks, pagination, rate limiting and request logging

## Author

`Shubham Yadav` | `shubhamyadav81197@gmail.com`