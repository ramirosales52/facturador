import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@render/components/ui/dialog'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Separator } from '@render/components/ui/separator'
import { ALICUOTAS_IVA, CONDICIONES_VENTA, UNIDADES_MEDIDA } from '@render/constants/afip'
import { formatearMoneda } from '@render/utils/calculos'

export interface ArticuloTicket {
  descripcion: string
  cantidad: number | null
  unidadMedida: string
  precioUnitario: number | undefined
  alicuotaIVA: string
}

export interface TicketFormData {
  CondicionVenta: string
  CondicionIVA: string
  IVA: string
  Articulo: ArticuloTicket
  ImpNeto: string
  ImpIVA: string
  ImpTotal: string
}

interface TicketFormProps {
  formData: TicketFormData
  loading: boolean
  error: string | null
  onInputChange: (field: keyof TicketFormData, value: string) => void
  onArticuloChange: (field: keyof ArticuloTicket, value: string | number) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
  onLimpiar: () => void
  onConfirmDialog?: () => void
}

export function TicketForm({
  formData,
  loading,
  error,
  onInputChange,
  onArticuloChange,
  onSubmit,
  onLimpiar,
  onConfirmDialog,
}: TicketFormProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setDialogOpen(true)
  }

  const handleConfirm = async () => {
    setDialogOpen(false)
    if (onConfirmDialog) {
      onConfirmDialog()
    }
    const fakeEvent = { preventDefault: () => { } } as FormEvent<HTMLFormElement>
    await onSubmit(fakeEvent)
  }

  const isFormValid = (): boolean => {
    // Validar que el artículo tenga descripción, cantidad y precio
    const articuloValido = formData.Articulo.descripcion.trim() !== '' &&
      formData.Articulo.cantidad > 0 &&
      formData.Articulo.precioUnitario > 0

    return articuloValido
  }

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <CardTitle>Ticket</CardTitle>
      </CardHeader>

      <Separator />

      <CardContent>
        <h3 className="font-medium text-sm mb-3">Datos del ticket</h3>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Fila: Condición de Venta, Condición IVA, IVA */}
          <div className="flex gap-4">
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
              <Label htmlFor="IVA" className="text-xs">IVA</Label>
              <Select
                value={formData.IVA || '4'}
                onValueChange={value => onInputChange('IVA', value)}
              >
                <SelectTrigger id="IVA">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">0%</SelectItem>
                  <SelectItem value="4">10.5%</SelectItem>
                  <SelectItem value="5">21%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Artículo único */}
          <div className="space-y-3 border-t pt-3">
            <h3 className="font-medium text-sm">Artículo</h3>

            <div className="border p-3 rounded-lg space-y-2 bg-gray-50">
              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-xs">Descripción</Label>
                <Input
                  id="descripcion"
                  type="text"
                  value={formData.Articulo.descripcion}
                  className="bg-white"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onArticuloChange('descripcion', e.target.value)}
                  placeholder="Descripción del artículo"
                  required
                />
              </div>

              {/* Cantidad, Unidad, Precio, Subtotal */}
              <div className="flex justify-between gap-2">
                <div className="flex gap-2">
                  <div className="space-y-1 w-20">
                    <Label htmlFor="cantidad" className="text-xs">Cantidad</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="bg-white"
                      value={formData.Articulo.cantidad ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onArticuloChange('cantidad', e.target.value === '' ? null : Number.parseFloat(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="unidad" className="text-xs">Unidad</Label>
                    <Select
                      value={formData.Articulo.unidadMedida}
                      onValueChange={value => onArticuloChange('unidadMedida', value)}
                    >
                      <SelectTrigger id="unidad" className="bg-white">
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
                    <Label htmlFor="precio" className="text-xs">Precio Unitario</Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="$"
                      className="bg-white"
                      value={formData.Articulo.precioUnitario || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onArticuloChange('precioUnitario', e.target.value === '' ? 0 : Number.parseFloat(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="min-w-36 space-y-1">
                  <Label className="text-xs">Subtotal</Label>
                  <div className="bg-white border rounded-md px-2 text-sm font-medium h-9 flex items-center">
                    {formData.Articulo.cantidad && formData.Articulo.precioUnitario
                      ? formatearMoneda(formData.Articulo.cantidad * formData.Articulo.precioUnitario)
                      : formatearMoneda(0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Totales */}
          <div className="gap-3 border-t pt-3 bg-gray-50 p-3 rounded-lg grid grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ImpNeto" className="text-xs">Neto (sin IVA)</Label>
              <div className="bg-white border rounded-md px-3 h-10 flex items-center font-medium">
                {formatearMoneda(Number.parseFloat(formData.ImpNeto) || 0)}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ImpIVA" className="text-xs">
                IVA
                {' '}
                {formData.IVA
                  ? `(${ALICUOTAS_IVA.find(a => a.id === formData.IVA)?.porcentaje || 0}%)`
                  : ''}
              </Label>
              <div className="bg-white border rounded-md px-3 h-10 flex items-center font-medium">
                {formatearMoneda(Number.parseFloat(formData.ImpIVA) || 0)}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ImpTotal" className="text-xs">Total</Label>
              <div className="bg-white border rounded-md px-3 h-10 flex items-center font-bold text-base">
                {formatearMoneda(Number.parseFloat(formData.ImpTotal) || 0)}
              </div>
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
            <Button type="submit" disabled={loading || !isFormValid()} className="flex-1">
              {loading ? 'Creando...' : 'Crear Ticket'}
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
            ¿Generar Ticket por <b>{formatearMoneda(Number.parseFloat(formData.ImpTotal))}</b>?
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
