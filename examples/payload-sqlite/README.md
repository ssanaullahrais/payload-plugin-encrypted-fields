# Payload SQLite Demo

This is a ready-to-run Payload CMS demo for `payload-plugin-encrypted-fields`.

It uses SQLite, seeds demo data automatically, and does not require a committed `.env` file. The demo is included in GitHub so you can test the plugin quickly before installing it in your own Payload project.

## Run It

From this folder:

```sh
npm install
npm run dev
```

`npm run demo` also works. It is an alias for `npm run dev`.

The dev command will:

- create/use a local SQLite database
- set a safe demo `PAYLOAD_SECRET` automatically
- seed the default admin user
- seed collection and global secret examples
- start the Payload/Next dev server
- open the browser automatically

If port `3001` is busy, the demo picks the next available port.

## Login

```txt
Email: admin@admin.com
Password: password
```

## What To Check

Open the admin panel and inspect:

- `Plugin Secrets` collection
- `Plugin Settings` global

The demo includes realistic secret examples:

- Cloudflare API token
- SMTP password
- webhook signing secret
- hidden token
- read-only encrypted field

Normal API responses show safe placeholders instead of the real secret values. Protected demo endpoints show that trusted backend code can still retrieve the real encrypted value when needed.

## Useful URLs

The exact port may change if `3001` is already busy.

```txt
Frontend: http://localhost:3001
Admin:    http://localhost:3001/admin
```

## Notes

- `.env` is optional for this demo.
- `.env.example` is included only as documentation.
- Generated SQLite database files are ignored by Git.
- This demo uses the published npm package version from `package.json`.
