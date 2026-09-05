# Documento de Definición Técnica y Operativa (V4)

**Proyecto:** Plataforma Inteligente de Monitoreo y Efectividad Comercial

Este documento detalla exhaustivamente cada fase operativa, los pasos de ejecución y la estructura de datos para la transición hacia la nueva plataforma.

---

## 1. Caso de Negocio: La Crisis del Crecimiento Operativo

### A. Planteamiento del Problema
Actualmente, la operación comercial se sostiene sobre una arquitectura transitoria basada en múltiples hojas de cálculo (Google Sheets / Excel) creadas mes a mes. El volumen transaccional actual ha puesto en evidencia cuellos de botella críticos:
* **Fragmentación Histórica:** Un archivo nuevo por mes fragmenta el historial de clientes y asesores, haciendo que los análisis trimestrales requieran un trabajo de consolidación manual masivo.
* **Carga Administrativa:** El equipo realiza tareas manuales repetitivas, como el desdoblamiento manual de ventas múltiples ("Ventas Dobles" o "Triples") y la actualización diaria de estados a las 2:00 PM.
* **Riesgo de Datos:** Inconsistencias de formato en los números telefónicos, DNIs mal ingresados o duplicados no controlados ensucian los reportes de efectividad y comisiones.
* **Falta de Visibilidad:** Los asesores operan "a ciegas" sin acceso en tiempo real a su progreso de cuotas, efectividad o alertas de rechazos.

### B. Solución Propuesta
Transicionar a una **Plataforma Web Centralizada con Base de Datos Relacional (PostgreSQL)** basada en Next.js (React) y Node.js.
* **Ingesta y Desdoblamiento Automático (ETL):** El backend leerá los Sheets/formularios y separará de forma automática las ventas multilínea.
* **Lógica de UPSERT:** El sistema actualizará los estados modificados por Backoffice (2:00 PM) sin generar duplicados.
* **Resiliencia (Ventas Huérfanas):** Los DNI erróneos irán a una cola especial para asignación manual en vez de perder la venta.
* **Dashboards por Rol:** Vistas diferenciadas y seguras para Asesores, Supervisores y la Jefatura.

---

## 2. Fases de Implementación

### Fase 1: Estructuración y Fundación de Datos
* **Paso 1 - ERD:** Diseño del Modelo Entidad-Relación (Ventas, Usuarios, Colas, Auditoría).
* **Paso 2 - Clave Compuesta:** Unidad mínima de negocio: la línea (`ID_ORDEN` + `NÚMERO/CORRELATIVO`).
* **Paso 3 - Auditoría:** Estructura que guardará el histórico de modificaciones (valor anterior, nuevo, autor, fecha).
* **Paso 4 - Seguridad:** Segmentación de colas (`WSP APP`, `WSP APP RENO`, `WSP DIGITAL`, `C2C APP`, `C2C DIGITAL`).

### Fase 2: Automatización de Ingesta y Limpieza de Datos
* **Paso 1 - Lector:** Proceso automatizado que lee periódicamente las filas del Google Sheet.
* **Paso 2 - Normalización (Regex):** Eliminación de espacios y caracteres en números de portabilidad.
* **Paso 3 - Desdoblamiento:** Creación de múltiples registros en la base de datos a partir de una celda con múltiples números.
* **Paso 4 - UPSERT:** Lógica inteligente de actualización sin duplicidades.

### Fase 3: Interfaces de Visualización (Dashboards)
* **Paso 1 - Panel Asesor:** Resumen diario, mis ventas, caídas (gráficos de motivos y tendencia), metas y alertas.
* **Paso 2 - Panel Supervisor:** Analítica de equipo, operaciones, caídas (drill-down por asesor), configuraciones, cuotas y alerts.
* **Paso 3 - Panel Jefe:** Vista comparativa inter-colas y panel de administración de cuentas (usuarios, roles, colas).
* **Paso 4 - Panel de Excepciones:** Bandeja para resolver ventas huérfanas y errores de carga.

### Fase 4: Transición al Ingreso Nativo y Desconexión
* **Paso 1 - Formulario Web:** Carga nativa para los asesores con validación inmediata.
* **Paso 2 - Panel de Backoffice:** Pantallas dedicadas para validadores y carga masiva de estados.
* **Paso 3 - Marcha Blanca:** Funcionamiento en paralelo.
* **Paso 4 - Desconexión:** Apagado definitivo del motor de sincronización con Google Sheets.

---

## 3. Estructura de Datos (Diccionario de Datos)

### A. Matriz Principal de Ventas (Columnas del Excel)
El sistema almacenará todos los campos que el asesor y el backoffice gestionan en la hoja de cálculo. Se detallan a continuación organizados por categoría:

#### 1. Datos de Identificación y Control Operativo
* **Marca temporal** (DateTime): Fecha y hora automática del envío del formulario.
* **CAMPAÑA** (String): Nombre de la campaña (ej. `WSP APP`, `C2C APP`).
* **FECHA DE VENTA** (Date): Fecha en la que se efectúa la venta.
* **CD** (String): Código/identificador del CD.
* **TÚ HICISTE CVOZ?** (String/Boolean): Registro si se realizó confirmación por voz.
* **VALIDADOR** (String): Nombre del validador de la venta.
* **TIPO DE VENTA** (String): Clasificación (Portabilidad, Línea Nueva, Renovación).

#### 2. Datos del Cliente y la Gestión
* **DETALLE DE VENTA** (String): Descripción del plan o servicio vendido.
* **VENTA** (String): Tipo de transacción comercial.
* **OFERTA** (String): Detalles de la oferta comercial aplicada.
* **DNI DEL CLIENTE** (String): Documento de identidad del comprador.
* **NOMBRE DEL CLIENTE** (String): Nombre completo del cliente.
* **FECHA DE NACIMIENTO** (Date): Fecha de nacimiento del cliente.
* **LUGAR DE NACIMIENTO** (String): Ciudad/Distrito de nacimiento del cliente.
* **NÚMERO DE REFERENCIA** (String): Teléfono alternativo de contacto.
* **NÚMERO A PORTAR O RENOVAR** (String): Número telefónico principal de la transacción.
* **OPERADOR ACTUAL** (String): Operador de origen en portabilidad (Claro, Movistar, Entel, Bitel).
* **ORIGEN DE LINEA** (String): Procedencia de la línea.

#### 3. Especificaciones del Plan y Equipo
* **CICLO** (String): Ciclo de facturación asignado.
* **TIPO DE PLAN** (String): Tipo de plan contratado (Postpago, Prepago, etc.).
* **PLANES NUEVOS** (String): Nombre del plan adquirido.
* **PLANES ANTIGUOS** (String): Plan anterior (en caso de Renovación).
* **LINEA ASOCIADA (PF)** (String): Línea telefónica asociada.
* **SKU** (String): Código de stock del equipo.
* **CANTIDAD DE CUOTAS** (Int): Cuotas de financiamiento del equipo (0, 12, 18, etc.).
* **CUOTAS MENSUALES** (Decimal): Importe de las cuotas mensuales del equipo.
* **PROMOCIÓN** (String): Nombre de la promoción aplicada.

#### 4. Entrega y Logística
* **TIPO DE ENTREGA** (String): Modalidad (Delivery, Tienda).
* **MOTIVO DE RT** (String): Causa del rechazo logístico / devolución de equipo.
* **MODALIDAD** (String): Modalidad de entrega/pago.
* **MOTIVO DE 24H A 72H** (String): Causa del plazo de entrega ampliado.
* **FECHA DE ENTREGA** (Date): Fecha de entrega programada o real.
* **LUGAR DE ENTREGA** (String): Establecimiento o punto de entrega.
* **DIRECCION DE ENTREGA** (String): Dirección física de destino.
* **REFERENCIA DE ENTREGA** (String): Detalles adicionales para llegar al domicilio.
* **COORDENADAS** (String): Ubicación GPS (Latitud/Longitud) para el delivery.
* **DIRECCION DE FACTURACION** (String): Dirección de envío de recibos.

#### 5. Gestión del Asesor y Venta
* **LINK DE CONVERSACION BOTMAKER** (String): Enlace al chat con el cliente para auditoría.
* **MEDIO DE VENTA** (String): Canal de venta.
* **DNI ASESOR** (String): Documento de identidad del vendedor (clave de asociación).
* **NOMBRE ASESOR** (String): Nombre del vendedor.
* **TURNO** (String): Turno de trabajo (Mañana, Tarde, Noche).
* **ID VALKIRIA** (String): Identificador interno del sistema Valkiria.
* **RESULTADO** (String): Estado de la venta a nivel del asesor.
* **ID OT** (String): Identificador de la Orden de Trabajo (Siebel/Valkiria).
* **¿EXCEPCIONES ?** (String): Registro de excepciones aplicadas.
* **REINGRESO** (String/Boolean): Indica si la orden fue ingresada nuevamente tras un rechazo.
* **OBSERVACION ES CALIDAD** (String): Notas del validador de calidad.

#### 6. Calidad y Validación (Campos actualizados por Backoffice)
* **CALIDAD** (String): Calificación de la llamada / venta por auditoría.
* **RESULTADO_ENTREGA** (String): Estado logístico (Entregado, Cancelado, etc.).
* **ESTADO_SIEBEL** (String): Estado transaccional en Siebel (Cerrado, En proceso, Pendiente, Cancelado).
* **MOTIVO_SIEBEL** (String): Razón del estado en Siebel (ej. Motivo de caída).
* **FECHA ACTIVACIÓN** (DateTime): Fecha y hora en la que la línea se activa formalmente.
* **ESTADO** (String): Estado final de la venta procesada por el sistema (`ACTIVADO`, `PENDIENTE`, `CAIDA`).
* **GTR VENTA** (String): ID de gestión de venta.
* **CONDICIONAL** (String): Estado de venta condicional.


### B. Matriz de Auditoría y Trazabilidad (Historial)
* **Referencia de Venta:** Expediente y correlativo modificado.
* **Elemento Modificado:** Campo que cambió (ej. "Estado de Operación").
* **Dato Anterior / Dato Nuevo:** Valores antes y después del cambio.
* **Autor & Marca de Tiempo:** Quién editó y cuándo.

### C. Matriz de Usuarios y Accesos
* **Documento / DNI:** Login único del personal.
* **Rol:** Asesor, Supervisor, Jefe de Supervisión.
* **Cola Asignada:** `WSP APP`, `WSP APP RENO`, `WSP DIGITAL`, `C2C APP`, `C2C DIGITAL`.

### D. Matriz de Metas (Cuotas)
* **Asociación:** DNI del asesor o ID de la Cola.
* **Periodo:** Mes y Año (ej. `2026-08`).
* **Meta (Cuota):** Cantidad de líneas activadas a cumplir.

---

### C. Lógica de Multiórdenes y Tipos de Venta

Para procesar sin error las casuísticas reales del negocio (asesores cargando portabilidades, líneas y renovaciones), el motor de base de datos y de sincronización aplicará las siguientes reglas lógicas:

1. **Portabilidad:**
   * **Multiorden con IDs diferentes (Asesor A vende 2 portabilidades con ID 1 y 2):** Se ingresan como dos registros totalmente independientes, pues cada una tiene su propio `idOt`.
   * **Línea múltiple en un solo ID (Asesor B vende 2 portabilidades bajo el ID 3):** El motor lee la celda `numeroPortarRenovar`, extrae los dos números de 9 dígitos (mediante Regex) y genera **2 registros separados en la BD** vinculados al mismo `idOt`:
     * Fila 1: `idOt = 3`, `correlative = 1`, `numeroPortarRenovar = 999111222`, `tipoVenta = PORTA`
     * Fila 2: `idOt = 3`, `correlative = 2`, `numeroPortarRenovar = 999333444`, `tipoVenta = PORTA`
     * Ambos suman al KPI del Asesor B.

2. **Líneas Nuevas y Adicionales:**
   * **Múltiples líneas en IDs diferentes (Asesor A vende 3 líneas nuevas con IDs 4, 5 y 6):** Al tener IDs distintos, se guardan como 3 registros independientes en la base de datos.
   * **Múltiples líneas bajo el mismo ID:** Como no tienen número telefónico inicial, el sistema usa la columna `correlative` para desdoblarlas de manera única. Por ejemplo, si se cargan 2 líneas adicionales para el ID 7:
     * Fila 1: `idOt = 7`, `correlative = 1`, `numeroPortarRenovar = "POR ASIGNAR"`, `tipoVenta = ADICIONAL`
     * Fila 2: `idOt = 7`, `correlative = 2`, `numeroPortarRenovar = "POR ASIGNAR"`, `tipoVenta = ADICIONAL`
     * Esto evita conflictos de duplicados antes de que Backoffice asigne los números reales.

3. **Renovaciones:**
   * **Renovación "Equipo Solo" (Upgrade):** Se asocia a un número existente. El sistema valida que sea 1 sola línea, registrando `hardwareType = EQUIPO` y `tipoVenta = RENO`.
   * **Renovación "Línea Nueva con Equipo":** Se registra bajo la lógica de Línea Nueva (`numeroPortarRenovar = "POR ASIGNAR"`), con el flag `hardwareType = EQUIPO` encendido para que Logística sepa que debe enviar un terminal y activar una nueva línea.


### D. Reglas de Visibilidad y Seguridad de Datos (RLS)

Para garantizar la privacidad y confidencialidad en cada nivel jerárquico, la plataforma aplicará filtros estrictos en las consultas a la base de datos (seguridad a nivel de fila):

1. **Perfil JEFE DE SUPERVISIÓN (Visión Panóptica/Global):**
   * Tiene acceso a **todas las colas de venta** (`WSP APP`, `WSP APP RENO`, `WSP DIGITAL`, `C2C APP`, `C2C DIGITAL`).
   * Puede visualizar el desempeño, métricas e historial de **todos los asesores** de la empresa de manera individual o agrupada por cola.

2. **Perfil SUPERVISOR (Visión de Campaña):**
   * El supervisor está asignado a una o más colas específicas.
   * **Filtro de datos:** Solo puede visualizar los datos, KPIs, motivos de caída y alertas de las colas a las que está asociado.
   * **Filtro de personal:** Solo tiene acceso a visualizar y gestionar el desempeño de los **asesores que pertenecen a su misma cola**. Tiene prohibido ver datos de otras colas o de asesores ajenos.

3. **Perfil ASESOR (Visión Individual Autogestionada):**
   * El asesor pertenece a una cola específica.
   * **Filtro de datos:** Solo puede ver la cola en la que está y **únicamente sus propios registros y metas individuales (su propio seguimiento)**. No puede ver las ventas, metas ni efectividad de ningún otro asesor, ni el total de su cola.


## 4. Flujo de Resiliencia y Gestión de Excepciones

* **Inconsistencias (Opción A):** Si el asesor marca "Venta Doble" pero digita un solo número, el sistema registra una venta simple con una alerta amarilla en el panel del supervisor, evitando duplicaciones falsas.
* **Ventas Huérfanas:** Si el DNI no existe en el catálogo de usuarios, el registro no se borra. Pasa a una bandeja de "Ventas Huérfanas" para que el supervisor lo reasigne manualmente.
* **Reingresos:** Si una venta se cae en Siebel (ID 01) y se vuelve a ingresar generando un nuevo ID de Siebel (ID 02), el sistema registra ID 01 como "CAÍDO" e ID 02 como una nueva transacción independiente.

---

## 5. Optimización de Rendimiento y Consumo de APIs

Para evitar la saturación de consultas recurrentes, cuellos de botella en el servidor y latencia en el consumo de la API REST, se implementarán las siguientes reglas de optimización a nivel de base de datos PostgreSQL:

* **Paginación Obligatoria en Endpoints de Listado:** Para todas las API REST de consulta que retornen listados de ventas (como la bandeja de "Mis Ventas" del Asesor o la vista de "Analítica/Caídas" del Supervisor), el backend de Next.js implementará de forma obligatoria **paginación basada en desplazamiento (Limit/Offset)**. Los parámetros aceptados serán `page` y `limit` (por defecto `limit = 20`). Esto evita el envío de miles de filas innecesarias al cliente, reduciendo drásticamente el consumo de memoria en el servidor y mejorando el tiempo de respuesta visual (FCP/LCP) en el frontend.
* **Encapsulamiento en Vistas y Funciones Almacenadas (Procedimientos):** Las agregaciones complejas (como el cálculo del porcentaje de efectividad diaria/mensual, el ranking de asesores y la analítica comparativa entre colas) se resolverán del lado del motor PostgreSQL utilizando **Vistas (Views)**, **Vistas Materializadas (Materialized Views)** o **Funciones de Base de Datos (PL/pgSQL)**. Esto permite que el backend de Next.js consuma resultados precalculados o consultas sumamente eficientes.
* **Índices de Alto Rendimiento:** Se crearán índices compuestos y de búsqueda en las columnas de mayor filtrado y agrupación:
  * Índice sobre `agentDni` para el panel individual del asesor.
  * Índice sobre `opState` y `createdAt` para el filtrado de analíticas por estados y fechas.
  * Índice compuesto sobre `[orderId, correlative]` para la validación ultrarrápida del motor de UPSERT.
* **Vistas de Caché para Dashboards:** La Jefatura y los supervisores consumirán vistas pre-agregadas que evitarán el escaneo completo de la tabla principal de ventas en cada petición de API.


### E. Infraestructura de Base de Datos con Docker

Para garantizar portabilidad y funcionamiento idéntico en cualquier computadora:
* **Motor:** PostgreSQL 16 Alpine en contenedor Docker (`postgres_sistema_comercial`).
* **Archivo de Orquestación:** [`docker-compose.yml`](file:///C:/Users/adria/Desktop/TRUSCORP/sistema_automatizacionbackend/docker-compose.yml) en el directorio backend.
* **Puerto Mapeado:** `5434:5432` (asignado en puerto 5434 para evitar colisiones con otros servicios locales de PostgreSQL existentes en la máquina).
* **Persistencia:** Volumen nombrado de Docker `postgres_data`.
* **Seed Inicial:** Script [`prisma/seed.ts`](file:///C:/Users/adria/Desktop/TRUSCORP/sistema_automatizacionbackend/prisma/seed.ts) que inserta los usuarios base (Admin, Supervisor y Asesores) con contraseñas encriptadas mediante bcrypt.
