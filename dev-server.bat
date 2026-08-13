@echo off
cd /d %~dp0
set NODE_ENV=development
set JWT_SECRET=husseiniya-dev-secret-key-2024
set DATABASE_URL=
echo === Starting dev server ===
node_modules\.bin\tsx watch server/_core/index.ts 2>&1
