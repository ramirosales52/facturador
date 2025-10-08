import type { ChangeEvent, FormEvent } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'

export interface Articulo {
  descripcion: string
  cantidad: number
  precioUnitario: number
  alicuotaIVA: string
}

export interface FormData {
  TipoFactura: 'A' | 'B'
  DocNro: string
  CondicionIVA: string
  Articulos: Articulo[]
  ImpNeto: string
  ImpIVA: string
  ImpTotal: string
}

// Alícuotas de IVA según AFIP
export const ALICUOTAS_IVA = [
  { id: '3', nombre: '0%', porcentaje: 0 },
  { id: '4', nombre: '10.5%', porcentaje: 10.5 },
  { id: '5', nombre: '21%', porcentaje: 21 },
  { id: '6', nombre: '27%', porcentaje: 27 },
  { id: '8', nombre: '5%', porcentaje: 5 },
  { id: '9', nombre: '2.5%', porcentaje: 2.5 },
]

// Condiciones de IVA
export const CONDICIONES_IVA = [
  { id: '1', nombre: 'IVA Responsable Inscripto' },
  { id: '4', nombre: 'IVA Sujeto Exento' },
  { id: '5', nombre: 'Consumidor Final' },
  { id: '6', nombre: 'Responsable Monotributo' },
]

interface FacturaFormProps {
  formData: FormData
  loading: boolean
  error: string | null
  onInputChange: (field: keyof FormData, value: string) => void
  onArticuloAdd: () => void
  onArticuloRemove: (index: number) => void
  onArticuloChange: (index: number, field: keyof Articulo, value: string | number) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
  onLimpiar: () => void
}

export function FacturaForm({
  formData,
  loading,
  error,
  onInputChange,
  onArticuloAdd,
  onArticuloRemove,
  onArticuloChange,
  onSubmit,
  onLimpiar,
}: FacturaFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la Factura {formData.TipoFactura}</CardTitle>
        <CardDescription>Complete los datos del cliente y los artículos</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Tipo de Factura */}
          <div className="space-y-2">
            <Label htmlFor="TipoFactura">Tipo de Factura *</Label>
            <Select
              value={formData.TipoFactura}
              onValueChange={(value) => onInputChange('TipoFactura', value)}
            >
              <SelectTrigger id="TipoFactura">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Factura A</SelectItem>
                <SelectItem value="B">Factura B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CUIT */}
          <div className="space-y-2">
            <Label htmlFor="DocNro">CUIT del Cliente *</Label>
            <Input
              id="DocNro"
              type="text"
              value={formData.DocNro}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('DocNro', e.target.value)}
              placeholder="20123456789"
              required
            />
            <p className="text-sm text-gray-500">Ingrese el CUIT sin guiones</p>
          </div>

          {/* Condición IVA - Solo para Factura B */}
          {formData.TipoFactura === 'B' && (
            <div className="space-y-2">
              <Label htmlFor="CondicionIVA">Condición IVA del Cliente *</Label>
              <Select
                value={formData.CondicionIVA}
                onValueChange={(value) => onInputChange('CondicionIVA', value)}
              >
                <SelectTrigger id="CondicionIVA">
                  <SelectValue placeholder="Seleccione condición" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">IVA Sujeto Exento</SelectItem>
                  <SelectItem value="5">Consumidor Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Artículos */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Artículos</h3>
              <Button type="button" onClick={onArticuloAdd} variant="outline" size="sm">
                + Agregar Artículo
              </Button>
            </div>

            {formData.Articulos.map((articulo, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3 relative">
                <Button
                  type="button"
                  onClick={() => onArticuloRemove(index)}
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  ✕
                </Button>

                <div className="space-y-2">
                  <Label htmlFor={`descripcion-${index}`}>Descripción *</Label>
                  <Input
                    id={`descripcion-${index}`}
                    type="text"
                    value={articulo.descripcion}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onArticuloChange(index, 'descripcion', e.target.value)
                    }
                    placeholder="Descripción del artículo"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`cantidad-${index}`}>Cantidad *</Label>
                    <Input
                      id={`cantidad-${index}`}
                      type="number"
                      step="1"
                      min="1"
                      value={articulo.cantidad}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onArticuloChange(index, 'cantidad', parseFloat(e.target.value) || 1)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`precio-${index}`}>Precio Unit. *</Label>
                    <Input
                      id={`precio-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={articulo.precioUnitario}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onArticuloChange(index, 'precioUnitario', parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`iva-${index}`}>Alícuota IVA *</Label>
                  <Select
                    value={articulo.alicuotaIVA}
                    onValueChange={(value) => onArticuloChange(index, 'alicuotaIVA', value)}
                  >
                    <SelectTrigger id={`iva-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALICUOTAS_IVA.map((alicuota) => (
                        <SelectItem key={alicuota.id} value={alicuota.id}>
                          {alicuota.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 text-sm text-gray-600">
                  Subtotal: ${(articulo.cantidad * articulo.precioUnitario).toFixed(2)}
                </div>
              </div>
            ))}

            {formData.Articulos.length === 0 && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                No hay artículos agregados. Haga clic en "Agregar Artículo" para comenzar.
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="space-y-4 border-t pt-4 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium">Totales</h3>

            <div className="space-y-2">
              <Label htmlFor="ImpNeto">Importe Neto (sin IVA)</Label>
              <Input
                id="ImpNeto"
                type="number"
                step="0.01"
                value={formData.ImpNeto}
                readOnly
                className="bg-white font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ImpIVA">Importe IVA</Label>
              <Input
                id="ImpIVA"
                type="number"
                step="0.01"
                value={formData.ImpIVA}
                readOnly
                className="bg-white font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ImpTotal">Importe Total</Label>
              <Input
                id="ImpTotal"
                type="number"
                step="0.01"
                value={formData.ImpTotal}
                readOnly
                className="bg-white font-bold text-lg"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading || formData.Articulos.length === 0} className="flex-1">
              {loading ? 'Creando Factura...' : `Crear Factura ${formData.TipoFactura}`}
            </Button>
            <Button type="button" variant="outline" onClick={onLimpiar}>
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
