import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@render/components/ui/dialog'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Separator } from '@render/components/ui/separator'
import { ALICUOTAS_IVA, CONCEPTOS, CONDICIONES_IVA, CONDICIONES_VENTA, TIPOS_DOCUMENTO, UNIDADES_MEDIDA } from '@render/constants/afip'
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
  CondicionVenta: string
  RazonSocial?: string
  Domicilio?: string
  Articulos: Articulo[]
  ImpNeto: string
  ImpIVA: string
  ImpTotal: string
  IVAGlobal?: string // Para Factura B
}

// Re-exportar constantes para compatibilidad con código existente
export { ALICUOTAS_IVA, CONCEPTOS, CONDICIONES_IVA, CONDICIONES_VENTA, TIPOS_DOCUMENTO, UNIDADES_MEDIDA }

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
  onConfirmDialog?: () => void
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
  onConfirmDialog,
}: FacturaFormProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setDialogOpen(true)
  }

  const handleConfirm = async () => {
    setDialogOpen(false)
    // Notificar al padre que se confirmó el diálogo
    if (onConfirmDialog) {
      onConfirmDialog()
    }
    // Crear un evento sintético para pasar a onSubmit
    const fakeEvent = { preventDefault: () => { } } as FormEvent<HTMLFormElement>
    await onSubmit(fakeEvent)
  }

  // Validar si el formulario está completo
  const isFormValid = (): boolean => {
    // Validar que haya al menos un artículo
    if (formData.Articulos.length === 0) return false

    // Determinar si es Consumidor Final
    const esConsumidorFinal = formData.DocTipo === '99'

    // Validar DocNro solo si NO es Consumidor Final
    if (!esConsumidorFinal && !formData.DocNro.trim()) return false

    // Validar Razón Social y Domicilio solo si NO es Consumidor Final
    // Para Consumidor Final estos campos son opcionales
    if (!esConsumidorFinal) {
      if (!formData.RazonSocial?.trim()) return false
      if (!formData.Domicilio?.trim()) return false
    }

    // Validar que todos los artículos tengan descripción, cantidad y precio
    const articulosValidos = formData.Articulos.every(articulo =>
      articulo.descripcion.trim() !== '' &&
      articulo.cantidad > 0 &&
      articulo.precioUnitario > 0
    )

    if (!articulosValidos) return false

    // Validar Condición IVA para Factura B
    if (formData.TipoFactura === 'B' && !formData.CondicionIVA) return false

    return true
  }

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <div>
          <CardTitle>
            Factura {formData.TipoFactura}
          </CardTitle>
          <CardDescription>Complete los datos del cliente y los artículos</CardDescription>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="TipoFactura" className="text-sm">Tipo de Factura</Label>
          <Select
            value={formData.TipoFactura}
            onValueChange={value => onInputChange('TipoFactura', value)}
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
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Primera fila: Tipo Doc y CUIT con botones */}
          <div className="flex gap-4">
            {/* Tipo de Documento */}
            <div className="space-y-1.5">
              <Label htmlFor="DocTipo" className="text-xs">Tipo Doc.</Label>
              <Select
                value={formData.DocTipo}
                onValueChange={value => onInputChange('DocTipo', value)}
              >
                <SelectTrigger id="DocTipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO
                    .filter(tipo => formData.TipoFactura === 'A' ? tipo.id === '80' : true)
                    .map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CUIT/CUIL/DNI con botón de búsqueda */}
            <div className="space-y-1.5">
              <Label htmlFor="DocNro" className="text-xs">
                {formData.DocTipo === '99'
                  ? 'DNI (opcional)'
                  : formData.DocTipo === '96'
                    ? 'DNI'
                    : 'CUIT'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="DocNro"
                  type="text"
                  value={formData.DocNro}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('DocNro', e.target.value)}
                  placeholder={formData.DocTipo === '99'
                    ? 'Sin documento'
                    : formData.DocTipo === '96'
                      ? '12345678'
                      : '20123456789'}
                  required={formData.DocTipo !== '99'}
                  className="flex-1"
                />
                {onConsultarContribuyente && (formData.DocTipo === '80' || formData.DocTipo === '96') && (
                  <Button
                    type="button"
                    onClick={onConsultarContribuyente}
                    disabled={!formData.DocNro || loadingContribuyente}
                    variant="outline"
                    size="icon"
                    title={formData.DocTipo === '96' ? 'Buscar datos en AFIP por DNI' : 'Buscar datos en AFIP'}
                  >
                    {loadingContribuyente ? '...' : <Search className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Segunda fila: Concepto, Condición de Venta, Condición IVA (B), IVA (B) */}
          <div className="flex gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="Concepto" className="text-xs">Concepto</Label>
              <Select
                value={formData.Concepto}
                onValueChange={value => onInputChange('Concepto', value)}
              >
                <SelectTrigger id="Concepto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONCEPTOS.map(concepto => (
                    <SelectItem key={concepto.id} value={concepto.id}>
                      {concepto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="CondicionVenta" className="text-xs">Condición de Venta</Label>
              <Select
                value={formData.CondicionVenta}
                onValueChange={value => onInputChange('CondicionVenta', value)}
              >
                <SelectTrigger id="CondicionVenta">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICIONES_VENTA.map(condicion => (
                    <SelectItem key={condicion.id} value={condicion.id}>
                      {condicion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condición IVA y IVA - Solo para Factura B */}
            {formData.TipoFactura === 'B' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="CondicionIVA" className="text-xs">Condición IVA</Label>
                  <Select
                    value={formData.CondicionIVA}
                    onValueChange={value => onInputChange('CondicionIVA', value)}
                  >
                    <SelectTrigger id="CondicionIVA">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">IVA Sujeto Exento</SelectItem>
                      <SelectItem value="5">Consumidor Final</SelectItem>
                      <SelectItem value="6">Responsable Monotributo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="IVAGlobal" className="text-xs">IVA</Label>
                  <Select
                    value={formData.IVAGlobal || '4'}
                    onValueChange={value => onInputChange('IVAGlobal', value)}
                  >
                    <SelectTrigger id="IVAGlobal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">0%</SelectItem>
                      <SelectItem value="4">10.5%</SelectItem>
                      <SelectItem value="5">21%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Datos del Cliente - Siempre visible */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="RazonSocial" className="text-xs">Razón Social / Nombre</Label>
              <Input
                id="RazonSocial"
                type="text"
                value={formData.RazonSocial || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('RazonSocial', e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="Domicilio" className="text-xs">Domicilio</Label>
              <Input
                id="Domicilio"
                type="text"
                value={formData.Domicilio || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('Domicilio', e.target.value)}
                placeholder="Dirección del cliente"
              />
            </div>
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
              // El precio unitario ahora es el precio FINAL (con IVA incluido)
              // El subtotal mostrado es el total de la línea (precio final * cantidad)
              const totalLinea = articulo.cantidad * articulo.precioUnitario

              return (
                <div key={index} className="border p-3 rounded-lg space-y-2 bg-gray-50">
                  {/* Primera fila: Descripción y botón eliminar */}
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`descripcion-${index}`} className="text-xs">Descripción</Label>
                      <Input
                        id={`descripcion-${index}`}
                        type="text"
                        value={articulo.descripcion}
                        className="bg-white"
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onArticuloChange(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del artículo"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => onArticuloRemove(index)}
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Segunda fila: Código, Cantidad, Unidad, Precio juntos + Subtotal separado a la derecha */}
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <div className="space-y-1 w-32">
                        <Label htmlFor={`codigo-${index}`} className="text-xs">Código (opcional)</Label>
                        <Input
                          id={`codigo-${index}`}
                          type="text"
                          value={articulo.codigo || ''}
                          className="bg-white"
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onArticuloChange(index, 'codigo', e.target.value)}
                          placeholder="001"
                        />
                      </div>

                      <div className="space-y-1 w-20">
                        <Label htmlFor={`cantidad-${index}`} className="text-xs">Cantidad</Label>
                        <Input
                          id={`cantidad-${index}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="bg-white"
                          value={articulo.cantidad}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onArticuloChange(index, 'cantidad', e.target.value === '' ? null : Number.parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`unidad-${index}`} className="text-xs">Unidad</Label>
                        <Select
                          value={articulo.unidadMedida}
                          onValueChange={value => onArticuloChange(index, 'unidadMedida', value)}
                        >
                          <SelectTrigger id={`unidad-${index}`} className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIDADES_MEDIDA.map(unidad => (
                              <SelectItem key={unidad.id} value={unidad.id}>
                                {unidad.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 w-28">
                        <Label htmlFor={`precio-${index}`} className="text-xs">Precio Unitario</Label>
                        <Input
                          id={`precio-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="$"
                          className="bg-white"
                          value={articulo.precioUnitario ?? ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onArticuloChange(index, 'precioUnitario', e.target.value === '' ? null : Number.parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      {formData.TipoFactura === 'A' && (
                        <div className="space-y-1 w-24">
                          <Label htmlFor={`iva-porcentaje-${index}`} className="text-xs">IVA %</Label>
                          <Select
                            value={articulo.alicuotaIVA}
                            onValueChange={value => onArticuloChange(index, 'alicuotaIVA', value)}
                          >
                            <SelectTrigger
                              id={`iva-porcentaje-${index}`}
                              className="bg-white"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALICUOTAS_IVA.map(alicuota => (
                                <SelectItem key={alicuota.id} value={alicuota.id}>
                                  {alicuota.porcentaje}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="min-w-36 space-y-1">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="bg-white border rounded-md px-2 text-sm font-medium h-9 flex items-center">
                        $
                        {totalLinea ? totalLinea.toFixed(2) : '0.00'}
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
          <div className="gap-3 border-t pt-3 bg-gray-50 p-3 rounded-lg grid grid-cols-3">
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
              <Label htmlFor="ImpIVA" className="text-xs">
                IVA
                {' '}
                {formData.TipoFactura === 'B' && formData.IVAGlobal
                  ? `(${ALICUOTAS_IVA.find(a => a.id === formData.IVAGlobal)?.porcentaje || 0}%)`
                  : formData.TipoFactura === 'A' && formData.Articulos.length > 0
                    ? `(${ALICUOTAS_IVA.find(a => a.id === formData.Articulos[0]?.alicuotaIVA)?.porcentaje || 0}%)`
                    : ''}
              </Label>
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
            <Button type="submit" disabled={loading || !isFormValid()} className="flex-1">
              {loading ? 'Creando...' : `Crear Factura ${formData.TipoFactura}`}
            </Button>
            <Button type="button" variant="outline" onClick={onLimpiar}>
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar</DialogTitle>
          </DialogHeader>
          <Separator />
          <h1>
            ¿Generar Factura <b>{formData.TipoFactura}</b> por <b>${formData.ImpTotal}</b>?
          </h1>
          <DialogFooter>
            <Button type="button" onClick={handleConfirm}>
              Confirmar
            </Button>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
