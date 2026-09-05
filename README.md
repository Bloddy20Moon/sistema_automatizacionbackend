# 🚀 Sistema de Automatización Comercial - Backend & Base de Datos

Plataforma inteligente de monitoreo, gestión de efectividad comercial y trazabilidad de ventas multilínea para la operación comercial de **TRUSCORP**.

Este repositorio contiene el **Backend (API REST)**, el motor de base de datos relacional **PostgreSQL**, el ORM **Prisma 7** y la lógica de sincronización e ingesta de datos.

---

## 🛠️ Stack Tecnológico

* **Entorno & Framework:** Next.js 16 (App Router / Route Handlers) con TypeScript.
* **Base de Datos:** PostgreSQL 16 (orquestado en Docker).
* **ORM:** Prisma 7 con driver adapter `@prisma/adapter-pg` y pool de conexiones nativo `pg`.
* **Contenedores:** Docker & Docker Compose.
* **Seguridad:** Encriptación de claves con `bcryptjs`, validación de esquemas con `zod`.

---

## 🗺️ Fases del Proyecto y Estado de Implementación

### 📦 Fase 1: Estructuración y Fundación de Datos
- [x] **Separación Arquitectónica:** División limpia de proyectos independientes para Backend y Frontend.
- [x] **Contenedor PostgreSQL:** Configuración de `docker-compose.yml` (PostgreSQL 16 Alpine en puerto `5434:5432` con volumen persistente `postgres_data`).
- [x] **Modelado Relacional en Prisma:**
  - `User`: Roles (`ADMIN`, `SUPERVISOR`, `AGENT`) y asignación de cola (`WSP_APP`, `C2C_DIGITAL`, etc.).
  - `Sale`: Matriz de venta completa basada en el formulario comercial real.
  - `Meta`: Cuotas comerciales dinámicas por asesor o por cola.
  - `AuditLog`: Historial inmutable de modificaciones operativas.
- [x] **Lógica de Clave Compuesta Antiduplicados:** Unidad mínima única `@@unique([idOt, correlative])` para desdoblar ventas dobles/triples y líneas nuevas sin número ("POR ASIGNAR").
- [x] **Depuración de Datos y Privacidad:** Exclusión de campos sensibles (nombres de padres, emails, desgloses logísticos redundantes y cuotas iniciales).
- [x] **Pool de Conexiones de Alto Rendimiento:** Implementación de `@prisma/adapter-pg` en `src/lib/prisma.ts` para conexiones directas y sin latencia.
- [x] **Sincronización Física de Tablas:** Ejecución de `prisma db push` en el contenedor activo.
- [x] **Seed Inicial de Usuarios:** Script `prisma/seed.ts` para sembrar cuentas base (Jefe, Supervisor y Asesores) con contraseñas encriptadas.
- [x] **Primer Endpoint REST con Paginación:** `GET /api/sales` con paginación obligatoria por Limit/Offset (`page`, `limit`) y filtros por asesor, cola y estado.
- [x] **Vistas SQL Analíticas de Alto Rendimiento:** Creación e integración de 4 vistas nativas en PostgreSQL para precalcular KPIs en memoria (< 5ms):
  - `vista_resumen_asesor`: Agrupación de efectividad, activadas, pendientes, caídas y avance de meta por asesor.
  - `vista_rendimiento_colas`: Comparativa de volumen y efectividad entre campañas (`WSP APP`, `C2C`, etc.) para el Jefe.
  - `vista_analisis_caidas`: Análisis Pareto de motivos de caída de Siebel para el Supervisor.
  - `vista_ventas_huerfanas`: Bandeja de aislamiento y cuarentena para ventas con DNI no registrado.

---

### 🔄 Fase 2: Automatización de Ingesta y Limpieza de Datos (Google Sheets ➔ PostgreSQL)
- [ ] **Conector a Google Sheets:** Servicio automatizado de lectura e ingesta periódica desde las hojas de cálculo.
- [ ] **Motor de Limpieza y Regex:** Extracción estricta de números telefónicos de 9 dígitos y descarte de caracteres inválidos.
- [ ] **Algoritmo de Desdoblamiento Automático:** Separación automática de celdas multilínea ("Ventas Dobles / Triples") en registros individuales correlativos.
- [ ] **Motor de UPSERT Inteligente:** Sincronización diaria (2:00 PM) para actualizar estados de Backoffice sin duplicar registros.
- [ ] **Bandeja de Cuarentena (Ventas Huérfanas):** Aislamiento de ventas con DNI no reconocido hacia la cola del supervisor para su resolución manual.

---

### 🛡️ Fase 3: Seguridad, Permisos y APIs de Métricas
- [ ] **Autenticación con JWT:** Endpoints de login y generación de tokens seguros que incluyan DNI, Rol y Cola.
- [ ] **Row-Level Security (RLS) en Endpoints:**
  - **Jefe de Supervisión:** Acceso global a todas las colas y asesores.
  - **Supervisor:** Filtro exclusivo para su cola asignada y su equipo de asesores.
  - **Asesor:** Acceso restringido exclusivamente a sus ventas individuales.
- [ ] **APIs de Analítica y Rendimiento:** Endpoints optimizados para consultar:
  - Efectividad acumulada diaria y mensual.
  - Ranking de asesores por cola.
  - Alertas de caídas y motivos recurrentes de rechazo.
- [ ] **API de Gestión de Metas:** Endpoints para crear y actualizar cuotas comerciales mensuales.

---

### 🌐 Fase 4: Transición al Ingreso Nativo y Desconexión
- [ ] **API de Carga Nativa:** Endpoint seguro para que los asesores registren ventas directamente desde la web con validaciones instantáneas.
- [ ] **API de Validación para Backoffice:** Módulo de actualización masiva de estados de Siebel/Valkiria desde la interfaz web.
- [ ] **Trigger de Auditoría Automático:** Registro en `AuditLog` cada vez que el estado de una orden sea modificado.
- [ ] **Apagado del Motor de Google Sheets:** Retiro formal de las hojas de cálculo tras periodo de marcha blanca.

---

## 🚀 Puesta en Marcha Local (Quick Start)

### 1. Requisitos Previos
* Docker y Docker Desktop corriendo.
* Node.js v18+ y npm instalados.

### 2. Iniciar la Base de Datos con Docker
```bash
docker compose up -d
```
*El contenedor PostgreSQL se iniciará en el puerto `5434`.*

### 3. Configuración del Entorno
Verifica que el archivo `.env` contenga la cadena de conexión:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5434/sistema_comercial?schema=public"
```

### 4. Sincronizar Tablas y Sembrar Datos
```bash
# Aplicar esquema a PostgreSQL
npx prisma db push

# Poblar usuarios iniciales de prueba (Admin, Supervisor, Asesores)
npx tsx prisma/seed.ts
```

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
*El servidor estará disponible en `http://localhost:3000`.*

### 6. Inspeccionar la Base de Datos Visualmente
```bash
npx prisma studio
```
*Abre una interfaz gráfica en `http://localhost:5555` para ver y editar los registros de PostgreSQL.*
