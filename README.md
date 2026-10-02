# React + TypeScript + Vite

## Supabase setup

Copy `.env.example` to `.env` and set `VITE_SUPABASE_ANON_KEY` to the project's anon public key from Supabase Project Settings → API. Never put a `service_role` key in the frontend.

The sign-in page supports email/password accounts. Supabase persists the session; protected pages load each user's rows through the existing RLS policies.

Schedule sharing, currency preferences, and profile image uploads use additive Supabase migrations. After linking the project, review the files in `supabase/migrations/` and apply them with `supabase db push`. They add tables, columns, a bucket, policies, and RPCs; they do not drop or truncate tables or add cascading deletes.

Finance amounts are stored as integer minor units for the selected ISO currency. IDR has zero fractional digits, so `584649` displays as `Rp 584.649`; USD uses two fractional digits. Changing the selected currency relabels/reinterprets amounts and does not perform exchange-rate conversion.

Profile image uploads use the public `profile-avatars` Storage bucket. The additive migration restricts uploads to each authenticated user's own folder.

For password recovery, add `http://localhost:5173/reset-password` and your deployed app's `/reset-password` URL to the Supabase Auth redirect URL allow list.

## Ask Omni setup

Rotate any Groq key that has been exposed, then add one replacement key as the Supabase Edge Function secret `GROQ_API_KEY`. Qwen 3.8 handles both chat and image requests. Do not add the key to frontend files or `.env`:

```sh
supabase link --project-ref idrraytmjdbcgerdahkj
supabase secrets set GROQ_API_KEY=<your-rotated-groq-key>
supabase functions deploy ask-omni
```

The browser invokes the Edge Function with the signed-in Supabase session. Event proposals require a title, date, and start time, and are saved only after confirmation.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
