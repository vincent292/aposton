# Quiniela Familiar 2026 - Next.js responsive mock

Mock convertido a Next.js con rutas reales por pantalla y diseño responsive para desktop y celular.

## Rutas principales

- `/` landing pública con partidos destacados.
- `/inicio` lista todos los partidos disponibles para apostar.
- `/login` inicio de sesión.
- `/registro` registro. Desde los partidos se envía primero aquí si el usuario no está autenticado.
- `/prediccion/[slug]` predicción por partido. Ejemplo: `/prediccion/argentina-mexico`.
- `/prediccion` redirige a una predicción de ejemplo.
- `/en-vivo` partido en vivo y estadísticas.
- `/ranking` ranking familiar.
- `/guardada` confirmación de predicción guardada.
- `/loading` pantalla de carga.
- `/gol` pantalla de celebración.

## Cómo correr

```bash
npm install
npm run dev
```

Abrir:

```bash
http://localhost:3000
```

## Imágenes

Reemplaza estas imágenes cuando tengas tus assets finales:

```bash
public/assets/ball.png
public/assets/mascot.png
```

## Flujo del mock

1. El usuario entra a `/` o `/inicio`.
2. Ve todos los partidos.
3. Presiona `Apostar / Registrarme`.
4. Va a `/registro`.
5. Después de registrarse entra a `/prediccion/argentina-mexico`.
6. Guarda la predicción y llega a `/guardada`.

## Archivos importantes

- `components/data.ts`: partidos y ranking de ejemplo.
- `components/AppShell.tsx`: layout responsive con sidebar desktop y bottom nav móvil.
- `components/MatchCard.tsx`: tarjeta de partido reutilizable.
- `components/PredictionClient.tsx`: predicción interactiva con marcador y apuestas.
- `app/globals.css`: estilos, responsive y animaciones.

## Sync automatico con Supabase Cron

El cron frecuente ya no vive en Vercel. Supabase Cron llama al endpoint:

```text
https://TU-DOMINIO.com/api/sync/live
```

Ese endpoint exige:

```http
Authorization: Bearer CRON_SECRET
```

### Configurar CRON_SECRET en Vercel

1. Entra a tu proyecto en Vercel.
2. Ve a `Settings > Environment Variables`.
3. Agrega `CRON_SECRET` con un valor largo y privado.
4. Redeploy de la app para que el endpoint use la variable nueva.

Tambien deben existir en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
API_FOOTBALL_KEY=
API_FOOTBALL_SEASON=2026
```

### Ejecutar el SQL en Supabase

1. Abre Supabase.
2. Ve a `SQL Editor`.
3. Ejecuta primero las migraciones del proyecto para crear `sync_state`.
4. Abre `sql/supabase-cron.sql`.
5. Reemplaza `https://MI-DOMINIO.com` por tu dominio real de Vercel.
6. Reemplaza `CRON_SECRET` por el mismo secreto configurado en Vercel.
7. Ejecuta el SQL.

### Cambiar de 10 minutos a 30 minutos

En `sql/supabase-cron.sql`, cambia:

```sql
'*/10 * * * *'
```

por:

```sql
'*/30 * * * *'
```

Luego vuelve a ejecutar el archivo en Supabase SQL Editor.

### Ahorro de requests de API-Football

API-Football gratis tiene un limite bajo de requests diarios. Por eso
`/api/sync/live` primero revisa la tabla `matches`:

- Si no hay partidos `live`.
- Si no hay partidos `scheduled` que empiecen dentro de los proximos 30 minutos.
- Si otro sync ya esta corriendo.
- Si ya se sincronizo hace menos de 8 minutos.

En esos casos responde `skipped: true` y no llama a API-Football.
