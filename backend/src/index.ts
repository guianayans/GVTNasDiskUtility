import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import diskRoutes from './routes/diskRoutes';
import fsRoutes from './routes/fsRoutes';
import sambaRoutes from './routes/sambaRoutes';
import systemRoutes from './routes/systemRoutes';
import wireguardRoutes from './routes/wireguardRoutes';
import { resetAllShares } from './services/sambaService';
import { env } from './config/env';

const app = express();
const PORT = env.port;
const HOST = env.host;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.use('/api', diskRoutes);
app.use('/api', fsRoutes);
app.use('/api', sambaRoutes);
app.use('/api', systemRoutes);
app.use('/api', wireguardRoutes);

const frontendDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function bootstrap() {
  try {
    await resetAllShares();
    console.log('SMB shares resetados na inicialização.');
  } catch (error) {
    console.error('Falha ao redefinir shares SMB no boot:', error);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

void bootstrap();
