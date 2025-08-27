## EPFS POS

Aplicación POS (backend Express + SQLite, frontend React + Vite + Tailwind).

### Versionado de build frontend

El script `npm run build` ahora inyecta `VITE_APP_VERSION` (package.json version + timestamp) accesible en `import.meta.env.VITE_APP_VERSION` y mostrado en la barra superior (`App.jsx`). Esto fuerza cache busting porque el hash del bundle cambia y puedes verificar la versión en DevTools (meta tag `app-version`).

### Despliegue con Docker

Para reconstruir imágenes tras cambios:
```
docker compose build --no-cache api web
docker compose up -d --force-recreate
```

### Variables relevantes
Backend: `JWT_SECRET`, `ADMIN_PIN`, `CORS_ORIGIN`, `DATA_DIR`, `BACKUP_CRON`.
Frontend: `VITE_APP_VERSION` (inyectada automáticamente al build).

### Seguridad / Mejoras claves ya aplicadas
- Rate limiting global y de login.
- Validación de payloads (zod).
- Índices de rendimiento en tablas críticas.
- Logging estructurado (pino).

### Próximos pasos sugeridos
1. Tests e2e (Playwright) para flujo venta.
2. Soporte pagos parciales (layaway) y entregas (CRUD deliveries).
3. Cache de settings con TTL.
4. Export incremental (solo cambios desde última marca de tiempo).
