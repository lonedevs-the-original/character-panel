---
name: axiom-conversation-export
description: Convert progress evidence from the current conversation into an Axiom Personal Progression schema-v1 JSON import. Use when the user asks to update, export to, or prepare data for Axiom, their character panel, status panel, or personal progression tracker. Do not use for unrelated summaries or direct database writes.
---

# Axiom Conversation Export

Turn relevant evidence in the current conversation into one importable JSON envelope. Read [references/schema.md](references/schema.md) before generating it.

## Extraction rules

- Use only facts the owner actually reported or clearly confirmed in this conversation.
- Do not infer an exact measurement, date, frequency, diagnosis, or achievement that was not stated.
- Prefer specific evidence over general self-descriptions. Omit plans unless the user reports completing them.
- Preserve the reported unit. Do not convert units unless needed; if converted, say so in the summary.
- Use `Asia/Tashkent` (`UTC+05:00`) when a local time has no timezone. If no usable occurrence time exists, omit `occurred_at` and set `effective_date` to the best supported date.
- Set confidence to reflect the evidence: `1` for an explicit result, lower for approximate or ambiguous reports. Never use confidence to disguise an invented value.
- Minimize sensitive detail. Keep only what is needed to track progress and set `sensitive: true` when appropriate.
- Put corrections in a `correction` entry; never silently replace an earlier report.
- Suggested effects are proposals, not score changes. Include only effects supported by the evidence and provide a reason.

## Output

Return exactly one fenced `json` block containing the envelope and no extra prose unless the user asks for explanation. Always set `requires_owner_review` to `true`.

If there is no relevant progress evidence, do not fabricate an empty import. Say that no importable evidence was found and briefly identify what kind of report would qualify.

When file creation is available, also save the identical JSON as `axiom-update-YYYY-MM-DD.json` and provide it to the user. The JSON block remains the canonical result.
