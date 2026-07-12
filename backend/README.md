# Check Scanner Backend

Express + TypeScript server that proxies check images to Azure AI Document
Intelligence (`prebuilt-document`) and returns the raw analysis JSON.

## Setup

```bash
cd backend
cp .env.example .env    # fill in Azure endpoint + key
npm install
npm run dev
```

Server listens on `PORT` (default `5000`). Endpoint:

`POST /api/analyze-check` — multipart/form-data, field `image` (PNG/JPG/JPEG, max 20MB).
Returns the raw Azure `AnalyzeResult` JSON.