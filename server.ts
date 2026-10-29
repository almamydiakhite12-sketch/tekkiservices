import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db.js';
import { apiRouter } from './server/routes.js';
import { checkAndExpireSubscriptions } from './server/payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialisation de la base de données SQLite
initDatabase();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enregistrement des routes API
app.use('/api', apiRouter);

// Vérification périodique des abonnements expirés (toutes les 5 minutes)
setInterval(() => {
  try {
    checkAndExpireSubscriptions();
  } catch (err) {
    console.error('Erreur vérification automatique abonnements:', err);
  }
}, 5 * 60 * 1000);

async function startServer() {
  if (!isProd) {
    // Mode développement avec Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Mode production : servir les fichiers statiques générés
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Tekki Services opérationnel sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
