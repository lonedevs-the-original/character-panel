# Personal Progression System — Cross-Chat Reference

## Canonical identity

- Project ID: `personal-progression`
- Owner mode: one private owner; no public registration or multi-user features
- Workspace: `D:\Projects\GitHub projects\personal-progression`
- Supabase project: `cinzvrpcelfhicxoheyh`
- Inbox table: `public.progress_entries`
- Current status: implemented app with paste/file JSON import, schema validation, preview, and a pending review queue

## Purpose

This project is a private, evidence-based personal status panel. It tracks real development through measurements, reports, milestones, habits, quests, and periodic evaluations. Its presentation may feel like a character status panel from a novel, but scores must remain explainable and traceable to evidence.

## Preferred conversation skill

The canonical reusable converter is in `skills/axiom-conversation-export`. Give that skill to a compatible chat or attach its `SKILL.md` and `references/schema.md`, then ask it to create an Axiom update from the current conversation.

## Manual prompt for chats without skills

> Work with the project `personal-progression` at `D:\Projects\GitHub projects\personal-progression` and Supabase project `cinzvrpcelfhicxoheyh`. Read `PROJECT_REFERENCE.md` before acting. Extract only progress evidence relevant to the owner's personal tracker from our conversation. Do not invent measurements or silently change derived scores. If you have authorized Supabase access, insert entries into `public.progress_entries` with `user_id` set to `3099b2b0-3ef4-484e-a4ac-d55fba1b6687`, `status` set to `pending`, and an honest `source_reference`; report exactly what you added. Otherwise return a JSON submission envelope matching this file so it can be pasted into the app. Preserve dates, units, uncertainty, and source context. Summarize sensitive journal content minimally.

## Submission envelope

Other chats should return this object verbatim for later upload or paste into Axiom.

```json
{
  "project_id": "personal-progression",
  "schema_version": 1,
  "reported_at": "2026-10-10T00:00:00+05:00",
  "effective_date": "2026-10-10",
  "source": {
    "type": "conversation",
    "reference": "chat title, task ID, or a short human-readable description"
  },
  "entries": [
    {
      "domain": "physical",
      "metric": "running_5k",
      "kind": "measurement",
      "value": 28,
      "unit": "minutes",
      "summary": "Completed a 5 km run in 28 minutes.",
      "confidence": 1.0,
      "occurred_at": "2026-10-10T07:30:00+05:00",
      "tags": ["running", "cardio"],
      "sensitive": false
    }
  ],
  "suggested_effects": [
    {
      "target": "endurance",
      "direction": "increase",
      "reason": "Improved 5 km performance supported by a timed result."
    }
  ],
  "requires_owner_review": true
}
```

## Entry kinds

- `measurement`: objective value such as weight, distance, time, repetitions, sleep, or study hours
- `activity`: a completed action without a useful numeric measurement
- `milestone`: a personal best, completed program, achievement, or meaningful threshold
- `habit_check`: completion or failure of a repeated commitment
- `reflection`: subjective state, lesson, obstacle, or behavioral observation
- `correction`: replacement or retraction of an earlier report

## Initial domains

- `physical`: strength, endurance, mobility, body measurements, training, recovery
- `mental`: mood, resilience, stress, confidence, emotional regulation
- `intellectual`: study, reading, learning, problem solving, completed work
- `discipline`: consistency, routines, follow-through, impulse control
- `social`: communication, relationships, leadership, community
- `life`: sleep, finances, environment, major events, custom goals

Domains and derived attributes are configurable. Raw evidence should not be discarded when the scoring model changes.

## Update rules

1. Store reported evidence before calculating scores.
2. Never infer an exact measurement that the owner did not provide.
3. Keep objective measurements separate from derived attributes.
4. Every derived score change must link to supporting evidence and include a reason.
5. Imported updates enter a pending review queue unless the owner explicitly enables auto-approval for that entry type.
6. Corrections remain auditable; supersede old data instead of silently deleting it.
7. Use Asia/Tashkent (`UTC+05:00`) when a report has no explicit timezone.
8. Avoid importing unrelated conversation content or unnecessary sensitive detail.

## Planned integration contract

The application should eventually support all three paths:

1. A protected `POST /api/inbox` endpoint accepting the submission envelope.
2. A local import command that accepts an envelope JSON file.
3. Manual paste into an in-app “Import conversation update” dialog.

Authentication for machine submissions should use a separate revocable ingestion token. The browser's long-lived owner session must never be copied into other chats or command-line instructions.

