# CheckU Móvil

Aplicación móvil de CheckU para consultar clases y gestionar la asistencia universitaria. Está construida con React Native, Expo y Expo Router, y consume la API REST de CheckU desarrollada con FastAPI.

## Funcionalidades

- Inicio de sesión y cierre de sesión.
- Restauración de sesión y almacenamiento seguro de tokens.
- Pantalla de inicio con accesos rápidos.
- Consulta de clases y detalle de cada clase.
- Inscripción a una clase mediante un código de seis dígitos (alumnos).
- Registro de asistencia con PIN de cuatro dígitos o lectura de QR (alumnos).
- Consulta del historial de asistencia.
- Consulta del perfil y del rol del usuario.

## Requisitos

- Node.js 20 o posterior y npm.
- Un dispositivo Android o iOS con Expo Go compatible, o un emulador.
- La API FastAPI de CheckU en ejecución. La aplicación espera que sus rutas estén bajo `/api/v1`.

## Instalación y configuración

Abre PowerShell en la carpeta `checku-movil` y ejecuta:

```powershell
npm ci
Copy-Item .env.example .env
```

Edita `.env` y configura la URL base de la API. No incluyas `/docs` ni `/api/v1`: la aplicación agrega el prefijo `/api/v1` automáticamente.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.9:8000
```

Reemplaza `192.168.1.9` por la dirección IP del ordenador donde se ejecuta FastAPI:

- **Teléfono físico:** usa la IP local/LAN del ordenador. El teléfono y el ordenador deben estar conectados a la misma red.
- **Emulador Android:** normalmente usa `http://10.0.2.2:8000` para acceder al ordenador anfitrión.
- **iOS Simulator:** si la API se ejecuta en el mismo Mac, puedes usar `http://127.0.0.1:8000`.

El archivo `.env` es local y no se debe subir al repositorio.

## Iniciar la API

Desde la carpeta del backend `checku-backend`, activa su entorno virtual si corresponde y ejecuta:

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El módulo `app.main:app` corresponde a la estructura actual del backend. La opción `--host 0.0.0.0` permite que otros dispositivos de la red, como un teléfono, alcancen la API. La documentación interactiva de FastAPI queda disponible en `http://127.0.0.1:8000/docs` desde el ordenador.

Si Windows muestra una solicitud del firewall, permite el acceso para redes privadas. Para probar la conexión desde el teléfono, abre `http://<IP-LAN-DEL-ORDENADOR>:8000/docs` en su navegador.

## Ejecutar la aplicación

Desde `checku-movil`:

```powershell
npm run start
```

Escanea el código QR con Expo Go o abre la aplicación en un emulador. Si cambias la URL de `.env` mientras Expo está abierto, reinicia limpiando la caché:

```powershell
npx expo start -c
```

Comandos alternativos:

```powershell
npm run android
npm run ios
npm run web
```

## Validación

```powershell
npm run lint
npx tsc --noEmit
npx expo install --check
```

## Tecnologías principales

- Expo SDK 58, React 19 y React Native 0.88.
- Expo Router para navegación basada en archivos.
- Expo SecureStore para almacenar tokens.
- Expo Camera para escanear códigos QR.
- TypeScript.

## Estructura

```text
app/                 Pantallas y rutas de Expo Router
src/api/             Cliente HTTP y comunicación con FastAPI
src/auth/            Estado de autenticación
src/components/      Componentes reutilizables de interfaz
src/theme/           Colores y tokens visuales
src/types/           Tipos de datos de la API
assets/              Iconos y recursos gráficos
```
