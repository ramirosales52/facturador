# Cambios realizados para solucionar el error de CondIvaReceptor

## Problema
Error 10246: Campo "Condicion Frente al IVA del receptor" es obligatorio conforme a la Resolución General Nro 5616.

## Solución Implementada

### 1. DTO actualizado (`src/api/arca/dto/create-arca.dto.ts`)
- Agregado campo opcional `CondIvaReceptor` al DTO

### 2. Servicio actualizado (`src/api/arca/arca.service.ts`)
- El servicio ahora determina automáticamente la condición de IVA del receptor si no se proporciona:
  - Si DocTipo es 99 (Consumidor Final) → CondIvaReceptor = 5 (Consumidor Final)
  - Si DocTipo es 80 (CUIT) → CondIvaReceptor = 1 (Responsable Inscripto)
  - Si se proporciona explícitamente, usa el valor proporcionado

### 3. Configuración actualizada (`src/api/arca/arca.config.ts`)
- Agregado export `CondicionesIVA` con todos los valores posibles

## Valores de CondicionesIVA

```typescript
CondicionesIVA = {
  RESPONSABLE_INSCRIPTO: 1,                      // Más común para empresas
  RESPONSABLE_NO_INSCRIPTO: 2,
  RESPONSABLE_NO_INSCRIPTO_BIENES_DE_USO: 3,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,                           // Para ventas al público
  RESPONSABLE_MONOTRIBUTO: 6,                    // Para monotributistas
  SUJETO_NO_CATEGORIZADO: 7,
  PROVEEDOR_DEL_EXTERIOR: 8,
  CLIENTE_DEL_EXTERIOR: 9,
  IVA_LIBERADO_LEY_19_640: 10,
  RESPONSABLE_INSCRIPTO_AGENTE_PERCEPCION: 11,
  PEQUENO_CONTRIBUYENTE_EVENTUAL: 12,
  MONOTRIBUTISTA_SOCIAL: 13,
  PEQUENO_CONTRIBUYENTE_EVENTUAL_SOCIAL: 14,
}
```

## Uso

### Opción 1: Dejar que el servicio lo determine automáticamente
```typescript
const facturaData = {
  DocTipo: 80,        // CUIT
  DocNro: 20123456789,
  ImpTotal: 121.00,
  ImpNeto: 100.00,
  ImpIVA: 21.00,
  // CondIvaReceptor se asignará automáticamente como 1 (Responsable Inscripto)
};
```

### Opción 2: Especificar explícitamente
```typescript
const facturaData = {
  DocTipo: 80,
  DocNro: 20123456789,
  CondIvaReceptor: 6,  // Monotributista
  ImpTotal: 121.00,
  ImpNeto: 100.00,
  ImpIVA: 21.00,
};
```

## Tipos de Factura y Condición IVA

| Tipo Factura | DocTipo | CondIvaReceptor Común |
|--------------|---------|------------------------|
| Factura A    | 80 (CUIT) | 1 (Responsable Inscripto) |
| Factura B    | 80 (CUIT) | 6 (Monotributista) o 1 |
| Factura C    | 99 (CF) | 5 (Consumidor Final) |

## Estado
✅ Cambios implementados y probados
✅ Lógica automática funcionando correctamente
✅ Documentación actualizada
