import type { ChangeEvent, FormEvent } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Separator } from '@render/components/ui/separator'
import { Search, X } from 'lucide-react'

export interface Articulo {
  codigo?: string
  descripcion: string
  cantidad: number
  unidadMedida: string
  precioUnitario: number
  alicuotaIVA: string
}

export interface FormData {
  TipoFactura: 'A' | 'B'
  DocTipo: string
  DocNro: string
  Concepto: string
  CondicionIVA: string
  RazonSocial?: string
  Domicilio?: string
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

// Tipos de Documento
export const TIPOS_DOCUMENTO = [
  { id: '80', nombre: 'CUIT' },
  { id: '96', nombre: 'DNI' },
  { id: '99', nombre: 'Consumidor Final' },
]

// Conceptos de Facturación
export const CONCEPTOS = [
  { id: '1', nombre: 'Productos' },
  { id: '2', nombre: 'Servicios' },
  { id: '3', nombre: 'Productos y Servicios' },
]

// Unidades de Medida
export const UNIDADES_MEDIDA = [
  { id: 'unidad', nombre: 'Unidad' },
  { id: 'kg', nombre: 'Kilogramo' },
  { id: 'metro', nombre: 'Metro' },
  { id: 'litro', nombre: 'Litro' },
  { id: 'hora', nombre: 'Hora' },
  { id: 'mes', nombre: 'Mes' },
  { id: 'servicio', nombre: 'Servicio' },
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
      <CardHeader className='flex justify-between'>
        <div>
          <CardTitle>Factura {formData.TipoFactura}</CardTitle>
          <CardDescription>Complete los datos del cliente y los artículos</CardDescription>
        </div>
        <div className="space-y-1.5">
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
      </CardHeader>

      <Separator />

      <CardContent>
        <h3 className="font-medium text-sm mb-3">Datos de la factura</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Tipo de Documento y CUIT/DNI */}
          <div className="grid grid-cols-3 gap-3">
            {/* Tipo de Documento */}
            <div className="space-y-1.5">
              <Label htmlFor="DocTipo" className="text-sm">Tipo de Documento</Label>
              <Select
                value={formData.DocTipo}
                onValueChange={(value) => onInputChange('DocTipo', value)}
              >
                <SelectTrigger id="DocTipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CUIT/DNI con botón de búsqueda */}
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="DocNro" className="text-sm">
                {formData.DocTipo === '99' ? 'Sin Documento' : 
                 formData.DocTipo === '96' ? 'DNI del Cliente' : 'CUIT del Cliente'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="DocNro"
                  type="text"
                  value={formData.DocNro}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('DocNro', e.target.value)}
                  placeholder={formData.DocTipo === '99' ? '0' : formData.DocTipo === '96' ? '12345678' : '20123456789'}
                  required={formData.DocTipo !== '99'}
                  disabled={formData.DocTipo === '99'}
                  className="flex-1"
                />
                {onConsultarContribuyente && formData.DocTipo === '80' && (
                  <Button
                    type="button"
                    onClick={onConsultarContribuyente}
                    disabled={!formData.DocNro || loadingContribuyente}
                    variant="outline"
                    size="default"
                    title="Buscar datos en AFIP"
                  >
                    {loadingContribuyente ? '...' : <Search className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label htmlFor="Concepto" className="text-sm">Concepto de Facturación</Label>
            <Select
              value={formData.Concepto}
              onValueChange={(value) => onInputChange('Concepto', value)}
            >
              <SelectTrigger id="Concepto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONCEPTOS.map((concepto) => (
                  <SelectItem key={concepto.id} value={concepto.id}>
                    {concepto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condición IVA - Solo para Factura B */}
          {formData.TipoFactura === 'B' && (
            <div className="space-y-1.5">
              <Label htmlFor="CondicionIVA" className="text-sm">Condición IVA del Cliente</Label>
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

          {/* Datos del Cliente - Card editable */}
          {(formData.RazonSocial || formData.Domicilio) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="space-y-3">
                <h4 className="font-medium text-sm text-blue-900">Datos del Cliente</h4>

                <div className="space-y-1.5">
                  <Label htmlFor="RazonSocial" className="text-sm">Razón Social / Nombre</Label>
                  <Input
                    id="RazonSocial"
                    type="text"
                    value={formData.RazonSocial || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('RazonSocial', e.target.value)}
                    placeholder="Nombre del cliente"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="Domicilio" className="text-sm">Domicilio</Label>
                  <Input
                    id="Domicilio"
                    type="text"
                    value={formData.Domicilio || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('Domicilio', e.target.value)}
                    placeholder="Dirección del cliente"
                    className="bg-white"
                  />
                </div>
              </CardContent>
            </Card>
          )}

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
                  {/* Código y Descripción */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className='space-y-2'>
                      <Label htmlFor={`codigo-${index}`} className="text-xs">Código (opcional)</Label>
                      <Input
                        id={`codigo-${index}`}
                        type="text"
                        value={articulo.codigo || ''}
                        className='bg-white'
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onArticuloChange(index, 'codigo', e.target.value)
                        }
                        placeholder="001"
                      />
                    </div>
                    <div className='col-span-2 space-y-2'>
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
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => onArticuloRemove(index)}
                        variant="outline"
                        className="text-red-500 hover:text-red-700 w-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Cantidad, Unidad, Precio e IVA */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor={`cantidad-${index}`} className="text-xs">Cantidad</Label>
                      <Input
                        id={`cantidad-${index}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        className='bg-white'
                        value={articulo.cantidad}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onArticuloChange(index, 'cantidad', parseFloat(e.target.value) || 1)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`unidad-${index}`} className="text-xs">Unidad</Label>
                      <Select
                        value={articulo.unidadMedida}
                        onValueChange={(value) => onArticuloChange(index, 'unidadMedida', value)}
                      >
                        <SelectTrigger id={`unidad-${index}`} className='bg-white'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES_MEDIDA.map((unidad) => (
                            <SelectItem key={unidad.id} value={unidad.id}>
                              {unidad.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    
                    <div className="flex items-end text-sm font-medium">
                      <div className="bg-white border rounded-md px-3 py-2 w-full">
                        ${totalConIVA ? totalConIVA.toFixed(2) : "0.00"}
                      </div>
                    </div>
                  </div>
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
          {error && !loadingContribuyente && (
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
