# Quickstart

1) **GitHub**
- Create a new repo and unzip these files into it.
- Commit with message: `chore: init artyhospitality setup skeleton`.

2) **File ingest**
```bash
python tools/html_to_csv.py data/raw/sample.html data/processed/sample.csv
python tools/csv_sanity_check.py data/processed/sample.csv schemas/tasks.schema.csv
```

3) **Wire into your web app**
- Drop `schemas/*.md` guidance into your backend docs.
- For HTML exports, add a menu item: **Import → Upload HTML** then call the converter.

4) **Copilot prompts**
- Open files under `/prompts/` and paste to generate missing UI/handlers.
- Keep to token budget; these prompts are ≤400 words each.

5) **Next**
- Turn `/automation/ci/validate_headers.md` into a workflow.
- Replace `/apps/housekeeping-dashboard/index.stub.html` with your live page and keep data attributes intact.
