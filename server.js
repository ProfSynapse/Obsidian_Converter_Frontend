import { handler } from './build/handler.js';
import express from 'express';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Let SvelteKit handle everything else
app.use(handler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
