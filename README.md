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
