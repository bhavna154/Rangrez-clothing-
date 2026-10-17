import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Persistent uploads directory
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

// Security and utility middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

import { isFirebaseConfigured, getImageFromFirestore, logCredentialStartupDiagnostics } from './server/firebase.ts';

// Check which credentials are present and log names and lengths only (never values)
logCredentialStartupDiagnostics();

// Serve uploaded media (local disk first, then Firestore fallback)
app.use('/uploads', express.static(uploadsDir));
app.get('/uploads/:fileName', async (req, res, next) => {
  const localFile = path.join(uploadsDir, req.params.fileName);
  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }

  if (isFirebaseConfigured()) {
    try {
      const id = req.params.fileName.replace(/\.[^/.]+$/, "");
      const imgDoc = (await getImageFromFirestore(id)) || (await getImageFromFirestore(req.params.fileName));
      if (imgDoc && imgDoc.base64) {
        const buffer = Buffer.from(imgDoc.base64, 'base64');
        try { fs.writeFileSync(localFile, buffer); } catch {}
        res.setHeader('Content-Type', imgDoc.contentType || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(buffer);
      }
    } catch (err) {
      console.error('[Uploads fallback error]:', err);
    }
  }
  next();
});

// API endpoints
app.use('/api', apiRouter);

// Serve static frontend assets if built
const distDir = path.resolve(__dirname, 'dist');
app.use(express.static(distDir));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const indexHtml = path.join(distDir, 'index.html');
  res.sendFile(indexHtml);
});

app.listen(PORT, () => {
  console.log(`RANGREZ store server running on port ${PORT}`);
});

export default app;
