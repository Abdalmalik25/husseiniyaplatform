@echo off
cd /d d:\Projects26\ALHUSAINIA\husseiniya-platform
set NODE_ENV=production
set JWT_SECRET=husseiniya-dev-secret-key-2024
set DATABASE_URL=
echo === Building server bundle ===
node_modules\.bin\esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo === Build complete, starting server ===
node dist\index.js
