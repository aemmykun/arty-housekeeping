# ArtyHospitality — Setup Skeleton (Deploy-Ready Scaffolding)

This bundle consolidates the prep we've mapped: ingest (HTML→CSV), schemas, roster/linen logic specs, UI theme tokens, and integration mappings — **without** full code. It's designed so you can drop files into your web/app repos or feed to Copilot.

## Modules
- **File Ingest**: tools to convert HTML tables → CSV, sanity-check headers.
- **Schemas**: canonical CSV columns for Rooms, Staff, Tasks, Inventory.
- **Roster Logic**: constraints & formulas; 2-line pseudo-code stubs.
- **Linen Logic**: JSON rules for 3N/5N/8N + Monday-offset example.
- **Integrations**: endpoint mappings & field maps (RMSCloud / Cloudbeds / eZee).
- **Dashboard App (stub)**: HTML placeholders + data-binding notes.
- **Themes**: tokenized color palettes (Quest/Light/Dark).
- **Prompts**: Bubble/Web prompts (≤400 words) for quick generation.
- **Automation**: CI notes to validate CSV schemas on PR.
- **Docs**: Quickstart & “where to paste” guide.

> Intentional constraint: no large code dumps. Stubs are short and safe to paste.
