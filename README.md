# The Healing Directory

A Netlify React directory backed by Airtable.

## Airtable

The app reads providers through a Netlify function so your Airtable token stays private.

Default Airtable source:

- Base: `appJbWRXBOpmfNcUQ`
- Table: `tblOgiBFqw5iftDAE`
- View: `viwd0UGAiaOGCprXo`

## Netlify Environment Variables

Add one of these in Netlify:

```txt
AIRTABLE_TOKEN=your_airtable_personal_access_token
```

or:

```txt
AIRTABLE_API_KEY=your_airtable_personal_access_token
```

Optional overrides:

```txt
AIRTABLE_DIRECTORY_BASE_ID=appJbWRXBOpmfNcUQ
AIRTABLE_DIRECTORY_TABLE_ID=tblOgiBFqw5iftDAE
AIRTABLE_DIRECTORY_VIEW_ID=viwd0UGAiaOGCprXo
AIRTABLE_EVENTS_TABLE_ID=Events
AIRTABLE_SAVED_EVENTS_TABLE_ID="Saved Events"
AIRTABLE_SAVED_PROVIDERS_TABLE_ID="Saved Providers"
AIRTABLE_PENDING_PROVIDER_TABLE_ID="Pending Providers"
AIRTABLE_CLIENTS_TABLE_ID="tblGJKhK59EgQRI6V"
AIRTABLE_MEMBERS_TABLE_ID="tblGJKhK59EgQRI6V"
AIRTABLE_AUTO_CREATE_TABLES=true
```

Supabase overrides (for signup sync):

```txt
SUPABASE_URL=https://zpgvztndfkochixhuvaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROVIDER_SIGNUPS_TABLE=providers
SUPABASE_CLIENTS_TABLE=clients
SUPABASE_SIGNUP_REQUESTS_TABLE=signup_requests
```

If your Airtable columns have custom names, add field overrides such as:

```txt
AIRTABLE_DIRECTORY_FIELD_NAME=Your Name Column
AIRTABLE_DIRECTORY_FIELD_PROVIDER_TYPE=Your Provider Type Column
AIRTABLE_DIRECTORY_FIELD_SERVICES_OFFERED=Your Services Column
AIRTABLE_DIRECTORY_FIELD_AREAS_OF_SUPPORT=Your Concerns Column
AIRTABLE_DIRECTORY_FIELD_PHOTO=Your Photo Column
```

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
