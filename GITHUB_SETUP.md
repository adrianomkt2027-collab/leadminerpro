# Lead Miner Pro — GitHub Setup

This package is prepared for the repository:

`adrianomkt2027-collab/leadminerpro`

## Important

- `.env` files containing local credentials are excluded from the package.
- Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` in the deployment environment.
- Do not commit Supabase service-role/secret keys to the frontend repository.

## First push

From this project directory:

```bash
git init -b main
git remote add origin https://github.com/adrianomkt2027-collab/leadminerpro.git
git add .
git commit -m "Initial import - Lead Miner Pro"
git push -u origin main
```
