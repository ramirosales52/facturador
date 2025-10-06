# 🎨 Frontend - Facturación Electrónica

## 📋 Componentes Creados

### 1. Hook Personalizado: `useArca.ts`
Hook que maneja todas las llamadas a la API de ARCA/AFIP.

**Ubicación:** `src/render/hooks/useArca.ts`

**Funciones disponibles:**
- `crearFactura(data)` - Crear una nueva factura
- `verificarConexion()` - Verificar estado del servidor AFIP
- `obtenerUltimoComprobante(ptoVta, cbteTipo)` - Obtener último número de comprobante
- `obtenerTiposComprobante()` - Listar tipos de comprobantes disponibles

**Ejemplo de uso:**
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
    console.log(resultado);
  };

  return <button onClick={handleCrear}>Crear</button>;
};
```

### 2. Componente Principal: `CrearFactura.tsx`
Formulario completo para crear facturas electrónicas.

**Ubicación:** `src/render/factura/CrearFactura.tsx`

**Características:**
- ✅ Formulario con validación
- ✅ Selector de tipo de comprobante (Factura A, B, C)
- ✅ Selector de tipo de documento
- ✅ Cálculo automático de IVA 21%
- ✅ Cálculo automático de total
- ✅ Verificación de conexión con AFIP
- ✅ Manejo de errores
- ✅ Visualización de resultado (CAE, fecha vencimiento, etc.)
- ✅ Botón para limpiar formulario

## 🎨 Componentes UI de Shadcn Instalados

Los siguientes componentes de Shadcn/UI fueron instalados:
- ✅ `Button` - Botones con variantes
- ✅ `Input` - Campos de entrada
- ✅ `Label` - Etiquetas para formularios
- ✅ `Card` - Tarjetas contenedoras
- ✅ `Select` - Selectores dropdown

**Ubicación:** `src/render/components/ui/`

## 🚀 Cómo Usar el Formulario

### 1. Iniciar la aplicación
```bash
npm run dev
```

### 2. Navegar a la página de facturación
La aplicación ya está configurada para redireccionar a `/factura` automáticamente.

### 3. Verificar conexión
Antes de crear una factura, haz clic en "Verificar Conexión" para asegurarte de que el servidor backend esté corriendo y conectado a AFIP.

### 4. Completar el formulario
- **Tipo de Comprobante:** Selecciona el tipo (C para consumidor final es lo más común)
- **Tipo de Documento:** Consumidor Final (99) si no tienes documento del cliente
- **Importe Neto:** Ingresa el monto sin IVA
- **Calcular IVA:** Haz clic en "Calc. IVA 21%" para calcular automáticamente
- **Total:** Se calcula automáticamente al sumar neto + IVA

### 5. Crear factura
Haz clic en "Crear Factura" y espera el resultado con el CAE.

## 📐 Estructura del Formulario

```
CrearFactura
├── Card de Verificación
│   └── Botón "Verificar Conexión"
│       └── Resultado de conexión
├── Card Principal
│   ├── Tipo de Comprobante (Select)
│   ├── Tipo de Documento (Select)
│   ├── Número de Documento (Input)
│   ├── Importe Neto (Input + Botón Calcular IVA)
│   ├── Importe IVA (Input)
│   ├── Importe Total (Input - auto-calculado)
│   ├── Botones (Crear / Limpiar)
│   └── Resultado (CAE, fecha, etc.)
└── Card de Información
    └── Tips y datos útiles
```

## 🎯 Funcionalidades Implementadas

### Cálculos Automáticos
- ✅ Al cambiar el Importe Neto o IVA, el Total se recalcula automáticamente
- ✅ Botón para calcular IVA 21% sobre el neto

### Validaciones
- ✅ Campos numéricos con step de 0.01 para decimales
- ✅ Campos requeridos marcados
- ✅ Manejo de errores del servidor

### UX
- ✅ Loading states durante las peticiones
- ✅ Mensajes de éxito/error con colores
- ✅ Botón de limpiar formulario
- ✅ Info contextual sobre tipos de facturas

## 🔌 API Endpoints Usados

El hook `useArca` se conecta a:
- `POST /arca/factura` - Crear factura
- `GET /arca/server-status` - Verificar conexión
- `GET /arca/ultimo-comprobante` - Último número
- `GET /arca/tipos-comprobante` - Tipos disponibles

**Base URL:** `http://localhost:3000/arca`

## 💡 Ejemplo Rápido de Uso

1. **Factura C simple (Consumidor Final):**
   - Tipo: Factura C
   - Documento: Consumidor Final (0)
   - Neto: 100
   - Click en "Calc. IVA 21%" → IVA: 21
   - Total: 121 (auto-calculado)
   - Click en "Crear Factura"

2. **Resultado esperado:**
   ```
   ✓ Factura creada exitosamente
   CAE: 12345678901234
   Vencimiento CAE: 20240115
   Comprobante Nro: 1
   ```

## 🎨 Personalización

### Cambiar estilos
Los componentes usan Tailwind CSS. Puedes modificar las clases en `CrearFactura.tsx`.

### Agregar campos
Para agregar nuevos campos al formulario:

1. Agregar al estado `formData`
2. Crear el campo en el JSX con Input/Select
3. Actualizar el `handleInputChange`
4. Incluir en el objeto `facturaData` al enviar

### Agregar funciones del hook
Para agregar nuevas funciones a `useArca.ts`:

```typescript
const nuevaFuncion = async (params) => {
  setLoading(true);
  setError(null);
  try {
    const response = await axios.get(`${API_BASE_URL}/endpoint`);
    return response.data;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || err.message;
    setError(errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    setLoading(false);
  }
};
```

## 🐛 Troubleshooting

### Error de CORS
Si ves errores de CORS, asegúrate de que el backend NestJS tenga CORS habilitado:
```typescript
app.enableCors();
```

### Axios no está definido
Ya está instalado, pero si hay problemas:
```bash
npm install axios
```

### Componentes UI no encontrados
Los componentes de Shadcn ya fueron instalados. Si faltan, instalar con:
```bash
npx shadcn@latest add <componente>
```

### Backend no responde
1. Verificar que el backend esté corriendo en puerto 3000
2. Usar el botón "Verificar Conexión" para diagnosticar
3. Revisar la consola del navegador para errores

## 📚 Recursos Adicionales

- **Shadcn/UI Docs:** https://ui.shadcn.com/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Axios Docs:** https://axios-http.com/docs/intro
- **React Hooks:** https://react.dev/reference/react

---

**¡Frontend listo para facturar! 🎊**
