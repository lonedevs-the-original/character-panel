# Axiom import schema v1

The root object must contain:

```json
{
  "project_id": "personal-progression",
  "schema_version": 1,
  "reported_at": "2026-10-12T12:00:00+05:00",
  "effective_date": "2026-10-12",
  "source": {
    "type": "conversation",
    "reference": "Chat title or short human-readable description"
  },
  "entries": [],
  "suggested_effects": [],
  "requires_owner_review": true
}
```

## Entry

Each entry has this shape:

```json
{
  "domain": "physical",
  "metric": "running_5k",
  "kind": "measurement",
  "value": 28,
  "unit": "minutes",
  "summary": "Completed a 5 km run in 28 minutes.",
  "confidence": 1,
  "occurred_at": "2026-10-12T07:30:00+05:00",
  "tags": ["running", "cardio"],
  "sensitive": false
}
```

Required entry fields: `domain`, `kind`, and `summary`.

- `domain`: `physical`, `mental`, `intellectual`, `discipline`, `social`, or `life`
- `kind`: `measurement`, `activity`, `milestone`, `habit_check`, `reflection`, or `correction`
- `metric`: stable lower-snake-case name when a repeatable measure exists; otherwise omit it
- `value`: finite JSON number; omit rather than using `null` when unknown
- `unit`: short human-readable unit; include whenever `value` is present
- `summary`: factual, self-contained, 500 characters or fewer
- `confidence`: number from `0` to `1`; omit only when no useful distinction is available
- `occurred_at`: ISO 8601 date-time; omit when unsupported
- `tags`: array of short lowercase labels
- `sensitive`: Boolean

## Suggested effect

```json
{
  "target": "endurance",
  "direction": "increase",
  "delta": 1,
  "reason": "Timed endurance result."
}
```

`direction` is `increase`, `decrease`, or `none`. `delta` is optional and should normally be omitted unless the conversation establishes an agreed scoring rule. Every effect needs a concise evidence-based reason.

## Validation constraints

- One envelope can contain 1 to 100 entries.
- `project_id`, `schema_version`, `reported_at`, `source`, `entries`, and `requires_owner_review` are required.
- `source.type` must be `conversation`; `source.reference` cannot be blank.
- `effective_date`, when present, uses `YYYY-MM-DD`.
- Unknown properties should be avoided.
- The Axiom app validates and previews the envelope, then places entries in its pending review queue. It never auto-approves an import.
