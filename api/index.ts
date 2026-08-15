import { createApp } from "../server/_core/index";
import { serveStatic } from "../server/_core/vite";

const app = createApp();
serveStatic(app);

export default app;