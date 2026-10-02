# E-Diary

E-Diary is a Node.js, Express, EJS, and MySQL diary application for personal contacts, appointments, schedules, tasks, reminders, meeting invitations, and peer-to-peer diary sharing.

## Run with Docker

1. Copy `.env.example` to `.env`. Set non-empty `DB_PASSWORD` and `DB_ROOT_PASSWORD` values and a long random `SESSION_SECRET`; configure SMTP values to send real invitation and reminder emails. Keep `.env` private.
2. Run `docker compose up --build` from this directory.
3. Open http://localhost:3000.

Compose starts MySQL, creates the schema, and seeds the two demo accounts. The demo seed password for both users is `password123`:

- Alex Morgan: `alex@ediary.test`
- Sam Taylor: `sam@ediary.test`

Alex has shared his diary with Sam using **Free/Busy only**. The seed also creates sample contact, appointment, schedule, and task records, plus a pending invitation from Alex to Sam. Sam's shared view exposes only occupied dates and times. Use the invitation link `/invitations/seed-pending-invitation-token-000000000000000000000000?action=accept` while signed out to accept the seeded invitation; use `action=decline` to decline it instead. Acceptance adds the meeting to Sam's diary.

To run against a local MySQL server, set `DB_HOST=localhost` and `DB_USER` to a MySQL account that can create databases and tables. `DB_PASSWORD` may be blank only when that account is configured without a password. Then run `npm install`, `npm run seed`, and `npm start`. The seed command creates the configured database and applies `db/schema.sql` before adding demo records. For Docker, keep `DB_HOST=db` and set non-empty `DB_PASSWORD` and `DB_ROOT_PASSWORD` values before `docker compose up --build`.

## Configuration

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: MySQL connection. `DB_ROOT_PASSWORD` configures the MySQL container root account.
- `SESSION_SECRET`: secret used to sign login sessions.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: outbound email settings. Leave host blank to disable email delivery; in-app reminders and invitation links still work.
- `APP_URL`: public base URL used in invitation emails.

A cron job checks upcoming appointments every minute, creates an in-app notification once per appointment, and sends email when SMTP is configured. Tasks with due dates receive one in-app reminder/email at the configured lead time before their due date begins. Invitation response links are tokenized and single-use. External invitees can record a response; registered invitees who accept get the meeting copied into their diary.

The JSON API is available under `/api`; page routes render EJS views. All SQL values are parameterized. Shared appointment API responses use the same server-side permission enforcement as the page view.

## UI initialization and implementation language

The requested `ui-ux-pro-max-cli` initialization completed with `uipro init --ai antigravity`. Bootstrap 5 is included by CDN for responsive layout and components. The source brief specifies PHP and a WAMP stack; this build follows the required project pipeline override and implements the system in Node.js + Express.js + EJS + MySQL. The application runtime contains no PHP or Python; all application logic is in Node.js.

## Operational notes

The initial MySQL schema and demo data are mounted on first container initialization. The named `mysql_data` volume preserves its contents between restarts. To recreate a clean local demo database, stop the compose stack and remove its `mysql_data` volume before bringing it up again.







