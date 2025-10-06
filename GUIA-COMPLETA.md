# 🚀 Guía Completa de Uso - Facturador Electrónico

## ✅ Sistema Completo Implementado

### Backend (NestJS + AFIP SDK)
- ✅ Módulo ARCA con todos los servicios de facturación
- ✅ Endpoints REST para crear facturas
- ✅ Configuración para ambiente de pruebas
- ✅ Documentación completa

### Frontend (React + Shadcn UI)
- ✅ Hook personalizado `useArca` para API calls
- ✅ Formulario completo de facturación
- ✅ Componentes UI de Shadcn instalados
- ✅ Cálculos automáticos de IVA y totales

## 🎯 Inicio Rápido en 5 Pasos

### 1️⃣ Configurar CUIT
```typescript
// Archivo: src/api/arca/arca.config.ts
export const ArcaConfig = {
  CUIT: 20409378472, // ← CAMBIAR por tu CUIT
  production: false,
  cert: 'certificates/certificate.crt',
  key: 'certificates/private_key.key',
};
```

### 2️⃣ Generar Certificados
```bash
node scripts/generar-certificados.js
```

### 3️⃣ Habilitar Servicio en AFIP
1. Ir a https://auth.afip.gob.ar/
2. "Administrador de Relaciones de Clave Fiscal"
3. Habilitar servicio **"wsfe"**

### 4️⃣ Iniciar Aplicación
```bash
npm run dev
```

### 5️⃣ Usar el Formulario
1. Abre http://localhost:5173 (o el puerto que vite indique)
2. Click en "Verificar Conexión"
3. Completa el formulario
4. Click en "Crear Factura"

## 📁 Estructura del Proyecto

```
facturador/
├── src/
│   ├── api/arca/                   # Backend
│   │   ├── arca.service.ts         # Lógica de facturación
│   │   ├── arca.controller.ts      # Endpoints REST
│   │   ├── arca.config.ts          # Configuración AFIP
│   │   ├── dto/                    # DTOs
│   │   ├── ejemplos-uso.ts         # Ejemplos de código
│   │   └── README.md               # Docs backend
│   │
│   └── render/                     # Frontend
│       ├── factura/
│       │   └── CrearFactura.tsx    # Formulario principal
│       ├── hooks/
│       │   └── useArca.ts          # Hook API
│       └── components/ui/          # Componentes Shadcn
│           ├── button.tsx
│           ├── card.tsx
│           ├── input.tsx
│           ├── label.tsx
│           └── select.tsx
│
├── scripts/
│   └── generar-certificados.js     # Script para certificados
│
├── INICIO-RAPIDO.md                # Guía rápida
├── INTEGRACION-AFIP.md             # Docs backend completa
├── FRONTEND-README.md              # Docs frontend completa
└── .env.example                    # Ejemplo de variables
```

## 🎨 Uso del Formulario

### Crear Factura C (Consumidor Final)
La opción más simple y común:

1. **Tipo de Comprobante:** Factura C
2. **Tipo de Documento:** Consumidor Final
3. **Número de Documento:** 0
4. **Importe Neto:** 100
5. Click en **"Calc. IVA 21%"**
6. **Total:** 121 (auto-calculado)
7. Click en **"Crear Factura"**

### Resultado Esperado
```
✓ Factura creada exitosamente
CAE: 12345678901234
Vencimiento CAE: 20240115
Comprobante Nro: 1
```

## 🔌 API Endpoints Disponibles

### Backend (Puerto 3000)
- `GET /arca/server-status` - Verificar conexión
- `POST /arca/factura` - Crear factura
- `GET /arca/ultimo-comprobante` - Último número
- `GET /arca/tipos-comprobante` - Tipos disponibles
- `GET /arca/puntos-venta` - Puntos de venta
- `GET /arca/comprobante/:id` - Consultar factura

### Frontend (Puerto 5173 por defecto)
- `/factura` - Formulario de facturación

## 💻 Código de Ejemplo

### Desde el Frontend
```typescript
import { useArca } from '../hooks/useArca';

const MiComponente = () => {
  const { loading, error, crearFactura } = useArca();

  const handleCrear = async () => {
    const resultado = await crearFactura({
      ImpTotal: 121,
      ImpNeto: 100,
      ImpIVA: 21,
      Iva: [{ Id: 5, BaseImp: 100, Importe: 21 }]
    });
    
    if (resultado.success) {
      console.log('CAE:', resultado.data.CAE);
    }
  };

  return (
    <button onClick={handleCrear} disabled={loading}>
      {loading ? 'Creando...' : 'Crear Factura'}
    </button>
  );
};
```

### Desde el Backend (curl)
```bash
# Verificar conexión
curl http://localhost:3000/arca/server-status

# Crear factura
curl -X POST http://localhost:3000/arca/factura \
  -H "Content-Type: application/json" \
  -d '{
    "ImpTotal": 121,
    "ImpNeto": 100,
    "ImpIVA": 21,
    "Iva": [{"Id": 5, "BaseImp": 100, "Importe": 21}]
  }'
```

## 🎯 Tipos de Facturas

| Tipo | Código | Uso |
|------|--------|-----|
| Factura C | 11 | Consumidor final (más común) |
| Factura B | 6 | Monotributista, IVA exento |
| Factura A | 1 | Responsable inscripto |
| Nota Crédito C | 13 | Anulación/devolución Factura C |
| Nota Crédito B | 8 | Anulación/devolución Factura B |
| Nota Crédito A | 3 | Anulación/devolución Factura A |

## 📊 Tipos de IVA

| Tipo | ID | Porcentaje |
|------|-------|-----------|
| IVA 0% | 3 | 0% |
| IVA 10.5% | 4 | 10.5% |
| IVA 21% | 5 | 21% |
| IVA 27% | 6 | 27% |

## 🛠️ Comandos Útiles

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Generar certificados
node scripts/generar-certificados.js

# Instalar componente Shadcn adicional
npx shadcn@latest add <componente>
```

## 🔒 Seguridad

✅ Certificados en `.gitignore`
✅ Variables de entorno para datos sensibles
✅ Ambiente de prueba por defecto
✅ Validación de datos en frontend y backend

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Verificar que el puerto 3000 esté libre
lsof -i :3000
```

### Error de certificados
```bash
# Verificar que existan los archivos
ls certificates/
```

### Frontend no conecta con backend
1. Verificar que backend esté corriendo
2. Verificar el puerto en `useArca.ts` (línea 4)
3. Verificar CORS habilitado en backend

### Error al crear factura
1. Click en "Verificar Conexión" primero
2. Verificar que los certificados estén configurados
3. Verificar que el servicio "wsfe" esté habilitado en AFIP

## 📚 Documentación Adicional

### Documentos del Proyecto
- `INICIO-RAPIDO.md` - Configuración inicial
- `INTEGRACION-AFIP.md` - Backend completo
- `FRONTEND-README.md` - Frontend completo
- `src/api/arca/README.md` - API endpoints
- `src/api/arca/ejemplos-uso.ts` - Ejemplos de código

### Links Externos
- [Documentación AFIP SDK](https://docs.afipsdk.com)
- [Portal AFIP](https://www.afip.gob.ar/ws/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## ✨ Características Implementadas

### Backend
- ✅ Crear facturas electrónicas
- ✅ Verificar estado del servidor AFIP
- ✅ Obtener último número de comprobante
- ✅ Listar tipos de comprobantes
- ✅ Listar puntos de venta
- ✅ Consultar comprobantes existentes
- ✅ Soporte para múltiples tipos de IVA
- ✅ Configuración centralizada
- ✅ Documentación completa

### Frontend
- ✅ Formulario intuitivo
- ✅ Validación de datos
- ✅ Cálculo automático de IVA
- ✅ Cálculo automático de total
- ✅ Verificación de conexión
- ✅ Manejo de errores
- ✅ Loading states
- ✅ Mensajes de éxito/error
- ✅ Botón limpiar formulario
- ✅ Información contextual

## 🎊 ¡Todo listo!

Tu sistema de facturación electrónica está completamente configurado y listo para usar. Solo necesitas:

1. Configurar tu CUIT
2. Generar certificados
3. Habilitar servicio en AFIP
4. Iniciar la aplicación

**¡A facturar! 🚀**
