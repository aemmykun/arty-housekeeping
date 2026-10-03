# ArtyHospitality — Setup Skeleton (Deploy-Ready Scaffolding)

This bundle consolidates the prep we've mapped: ingest (HTML→CSV), schemas, roster/linen logic specs, UI theme tokens, and integration mappings — **without** full code. It's designed so you can drop files into your web/app repos or feed to Copilot.

## Quick Start

### Multiple Deployment Options
This project supports **4 deployment types**, each with its own dedicated branch:

1. **Web** (`deploy/web`) - Express.js REST API + Dashboard
2. **Bubble** (`deploy/bubble`) - No-code Bubble.io integration  
3. **Flutter** (`deploy/flutter`) - Mobile app for iOS/Android
4. **Docker** (`deploy/docker`) - Containerized deployment

**To set up deployment branches:**
```bash
./create_deployment_branches.sh
```

See [BRANCH_STRUCTURE.md](BRANCH_STRUCTURE.md) for detailed branch strategy and workflow.

### Quick Deploy
```bash
# Web deployment
./deploy.sh web

# Bubble deployment
./deploy.sh bubble

# Flutter deployment
./deploy.sh flutter

# Docker deployment
./deploy.sh docker
```

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
