import type { ChangeEvent, FormEvent } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'

export interface FormData {
  DocNro: string
  ImpNeto: string
  ImpIVA: string
  ImpTotal: string
}

interface FacturaFormProps {
  formData: FormData
  loading: boolean
  error: string | null
  onInputChange: (field: keyof FormData, value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
  onCalcularIVA: () => void
  onLimpiar: () => void
}

export function FacturaForm({
  formData,
  loading,
  error,
  onInputChange,
  onSubmit,
  onCalcularIVA,
  onLimpiar,
}: FacturaFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la Factura B</CardTitle>
        <CardDescription>Complete los datos del cliente y los importes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
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

          {/* Importes */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Importes</h3>

            <div className="space-y-2">
              <Label htmlFor="ImpNeto">Importe Neto (sin IVA) *</Label>
              <div className="flex gap-2">
                <Input
                  id="ImpNeto"
                  type="number"
                  step="0.01"
                  value={formData.ImpNeto}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('ImpNeto', e.target.value)}
                  placeholder="100.00"
                  required
                />
                <Button type="button" onClick={onCalcularIVA} variant="outline">
                  Calc. IVA 21%
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ImpIVA">Importe IVA *</Label>
              <Input
                id="ImpIVA"
                type="number"
                step="0.01"
                value={formData.ImpIVA}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('ImpIVA', e.target.value)}
                placeholder="21.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ImpTotal">Importe Total *</Label>
              <Input
                id="ImpTotal"
                type="number"
                step="0.01"
                value={formData.ImpTotal}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange('ImpTotal', e.target.value)}
                placeholder="121.00"
                required
                className="font-bold text-lg"
              />
              <p className="text-sm text-gray-500">Se calcula automáticamente</p>
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creando Factura...' : 'Crear Factura B'}
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
