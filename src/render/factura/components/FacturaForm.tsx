import type { ChangeEvent, FormEvent } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Separator } from '@render/components/ui/separator'
import { X } from 'lucide-react'

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
  onConsultarContribuyente?: () => Promise<void>
  loadingContribuyente?: boolean
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
  onConsultarContribuyente,
  loadingContribuyente,
}: FacturaFormProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle>Datos de la Factura {formData.TipoFactura}</CardTitle>
            <CardDescription>Complete los datos del cliente y los artículos</CardDescription>
          </div>

          {/* Tipo de Factura a la derecha del header */}
          <div className="space-y-1.5 w-48 shrink-0">
            <Label htmlFor="TipoFactura" className="text-sm">Tipo de Factura</Label>
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
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Datos del cliente - Layout horizontal */}
          <div className="grid grid-cols-2 gap-3">
            {/* CUIT con botón de búsqueda */}
            <div className="space-y-1.5">
              <Label htmlFor="DocNro" className="text-sm">CUIT del Cliente</Label>
              <div className="flex gap-2">
                <Input
                  id="DocNro"
                  type="text"
                  value={formData.DocNro}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('DocNro', e.target.value)}
                  placeholder="20123456789"
                  required
                  className="flex-1"
                />
                {onConsultarContribuyente && (
                  <Button
                    type="button"
                    onClick={onConsultarContribuyente}
                    disabled={!formData.DocNro || loadingContribuyente}
                    variant="outline"
                    size="default"
                    title="Buscar datos en AFIP"
                  >
                    {loadingContribuyente ? '...' : '🔍'}
                  </Button>
                )}
              </div>
            </div>
            </div>

            {/* Condición IVA - Solo para Factura B */}
            {formData.TipoFactura === 'B' && (
              <div className="space-y-1.5">
                <Label htmlFor="CondicionIVA" className="text-sm">Condición IVA</Label>
                <Select
                  value={formData.CondicionIVA}
                  onValueChange={(value) => onInputChange('CondicionIVA', value)}
                >
                  <SelectTrigger id="CondicionIVA">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">IVA Sujeto Exento</SelectItem>
                    <SelectItem value="5">Consumidor Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Artículos */}
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Artículos</h3>
              <Button type="button" onClick={onArticuloAdd} variant="outline" size="sm">
                + Agregar
              </Button>
            </div>

            {formData.Articulos.map((articulo, index) => {
              // Calcular subtotal e IVA
              const subtotal = articulo.cantidad * articulo.precioUnitario
              const alicuota = ALICUOTAS_IVA.find((a) => a.id === articulo.alicuotaIVA)
              const ivaImporte = (subtotal * (alicuota?.porcentaje || 0)) / 100
              const totalConIVA = subtotal + ivaImporte

              return (
                <div key={index} className="border p-3 rounded-lg space-y-2 bg-gray-50">
                  {/* Descripción en ancho completo */}
                  <div className="flex gap-2 items-end mb-4">
                    <div className='w-full space-y-2'>
                      <Label htmlFor={`descripcion-${index}`} className="text-xs">Descripción</Label>
                      <Input
                        id={`descripcion-${index}`}
                        type="text"
                        value={articulo.descripcion}
                        className='bg-white'
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onArticuloChange(index, 'descripcion', e.target.value)
                        }
                        placeholder="Descripción del artículo"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => onArticuloRemove(index)}
                      variant="outline"
                      className="text-red-500 hover:text-red-700"
                    >
                      Borrar
                      <X />
                    </Button>
                  </div>

                  {/* Cantidad, Precio e IVA */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor={`cantidad-${index}`} className="text-xs">Cantidad</Label>
                      <Input
                        id={`cantidad-${index}`}
                        type="number"
                        step="1"
                        min="1"
                        className='bg-white'
                        value={articulo.cantidad}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onArticuloChange(index, 'cantidad', parseFloat(e.target.value) || 1)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`precio-${index}`} className="text-xs">Precio</Label>
                      <Input
                        id={`precio-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className='bg-white'
                        value={articulo.precioUnitario}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onArticuloChange(index, 'precioUnitario', e.target.value === "" ? null : parseFloat(e.target.value))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`iva-${index}`} className="text-xs">IVA</Label>
                      <Select
                        value={articulo.alicuotaIVA}
                        onValueChange={(value) => onArticuloChange(index, 'alicuotaIVA', value)}
                      >
                        <SelectTrigger
                          id={`iva-${index}`}
                          className='bg-white'
                        >
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
                    <div className="flex items-center justify-end text-sm font-medium">
                      Total: ${totalConIVA ? totalConIVA.toFixed(2) : "0.00"}
                    </div>
                  </div>

                  {/* Total con IVA a la derecha */}
                </div>
              )
            })}

            {formData.Articulos.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                No hay artículos
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="grid grid-cols-3 gap-3 border-t pt-3 bg-gray-50 p-3 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="ImpNeto" className="text-xs">Neto (sin IVA)</Label>
              <Input
                id="ImpNeto"
                type="number"
                step="0.01"
                value={formData.ImpNeto}
                readOnly
                className="bg-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ImpIVA" className="text-xs">IVA</Label>
              <Input
                id="ImpIVA"
                type="number"
                step="0.01"
                value={formData.ImpIVA}
                readOnly
                className="bg-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ImpTotal" className="text-xs">Total</Label>
              <Input
                id="ImpTotal"
                type="number"
                step="0.01"
                value={formData.ImpTotal}
                readOnly
                className="bg-white font-bold text-base"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || formData.Articulos.length === 0} className="flex-1">
              {loading ? 'Creando...' : `Crear Factura ${formData.TipoFactura}`}
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
