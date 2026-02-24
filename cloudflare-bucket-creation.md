# Creazione Bucket Cloudflare R2 per Digito Master

Questo bucket serve per lo storage dei file (loghi clienti, immagini eventi, brand, post, partecipanti) caricati dalla dashboard admin. Sostituisce Firebase Storage.

## Requisiti

- Accesso alla Cloudflare Dashboard con permessi R2 sull'account Goodgest
- Account ID Cloudflare: `051dc2e9e468e286dbcc269fd75eca35`

---

## Step 1: Creare il bucket

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com) → seleziona l'account Goodgest
2. Menu laterale → **R2 Object Storage** → **Buckets**
3. Click **Create bucket**
4. Nome bucket: `digito-admin-dev`
5. Location hint: **European Union (EU)** (coerente con l'infrastruttura esistente)
6. Click **Create bucket**

---

## Step 2: Abilitare accesso pubblico

Le immagini caricate devono essere accessibili pubblicamente (loghi, foto eventi, ecc.).

1. Apri il bucket `digito-admin-dev`
2. Tab **Settings**
3. Sezione **Public access** → click **Allow Access**
4. Verrà generato un dominio pubblico tipo `pub-XXXXX.r2.dev`
5. **Copia questo URL** — servirà come `CLOUDFLARE_R2_PUBLIC_URL`

> In alternativa, si può collegare un custom domain (es. `assets-dev.goodgest.com`) dalla sezione **Custom Domains** dello stesso bucket.

---

## Step 3: Creare API Token R2 (opzionale)

Se si vuole un token dedicato per il bucket dev (invece di riusare le credenziali esistenti `SERVICES_CLOUDFLARE_R2_*`):

1. Nella pagina R2 → **Manage R2 API Tokens** (link in alto a destra, oppure **R2 Overview** → **Manage API Tokens**)
2. **Create API Token**
3. Permessi: **Object Read & Write**
4. Scope: seleziona **solo** il bucket `digito-admin-dev`
5. TTL: nessuna scadenza (o a discrezione)
6. **Copia Access Key ID e Secret Access Key** — servono come `SERVICES_CLOUDFLARE_R2_ACCESS_KEY` e `SERVICES_CLOUDFLARE_R2_SECRET_ACCESS_KEY`

---

## Step 4: Configurare le variabili d'ambiente

Aggiungere al file `.env.local` del progetto (NON committare):

```env
# R2 Upload Bucket (dev)
CLOUDFLARE_R2_BUCKET_NAME=digito-admin-dev
CLOUDFLARE_R2_PUBLIC_URL=https://pub-XXXXX.r2.dev
```

Le credenziali R2 sono già configurate nel `.env`:
- `CLOUDFLARE_R2_ACCESS_KEY`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_ENDPOINT` (endpoint EU S3-compatible)

Se hai creato un token dedicato (Step 3), aggiorna queste variabili con i nuovi valori.

---

## Step 5: Verifica

Per verificare che il bucket funzioni:

1. Dalla Cloudflare Dashboard, apri il bucket → tab **Objects**
2. Carica manualmente un file di test (drag & drop)
3. Verifica che sia accessibile dall'URL pubblico: `https://pub-XXXXX.r2.dev/nome-file.jpg`

---

## Per produzione

Quando si passa a produzione, creare un bucket separato `digito-admin-prod` seguendo gli stessi step, con:
- Custom domain dedicato (es. `assets.goodgest.com`)
- Token API con scope limitato al bucket di produzione
- CORS configurato per il dominio della dashboard
