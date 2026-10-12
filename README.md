# Axiom — Personal Progression

A private, single-owner progression tracker built around evidence, quests, attributes, and cross-chat updates.

Conversation updates can be pasted or uploaded as schema-v1 JSON. The app validates and previews the document before adding its entries to the owner's pending review queue. A reusable converter skill lives at `skills/axiom-conversation-export`.

## Features

- Persistent Supabase owner session
- Owner-locked Row Level Security policies
- Attribute status panel and level progression
- Active quests with quick progress controls
- Evidence timeline with measurements and reflections
- JSON conversation-envelope import
- Pending review queue with explainable score effects
- Full JSON export

## Local development

1. Copy `.env.example` to `.env.local` and add the Supabase project URL, publishable key, and owner email.
2. Run `npm install`.
3. Run `npm run dev`.

The database migration is stored in `supabase/migrations`. Cross-chat instructions and the import envelope schema are documented in `PROJECT_REFERENCE.md`.

## Verification

```sh
npm run typecheck
npm run build
```
