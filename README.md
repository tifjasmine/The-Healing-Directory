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
