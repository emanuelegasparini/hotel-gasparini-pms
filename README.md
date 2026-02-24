# Hotel Gasparini PMS

Property Management System completo per Hotel Gasparini.

## Deploy su Vercel (consigliato)

1. Carica questa cartella su GitHub
2. Vai su vercel.com → Add New Project
3. Seleziona il repository → Deploy
4. Il PMS sarà online su `tuonome.vercel.app`

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri http://localhost:3000

## Database

Il PMS è già collegato a Supabase. Assicurati di aver eseguito
lo schema SQL `hotel-gasparini-schema.sql` nel tuo progetto Supabase.

## Tecnologie

- React 18 + Vite
- Supabase (PostgreSQL cloud)
- Anthropic Claude AI
