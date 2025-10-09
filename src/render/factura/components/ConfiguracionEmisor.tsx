import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Search, Save, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export interface DatosEmisor {
  cuit: string
  razonSocial: string
  domicilio: string
  condicionIVA: string
  iibb: string
  inicioActividades: string
  puntoVenta: number
}

interface ConfiguracionEmisorProps {
  onGuardar: (datos: DatosEmisor) => void
  onBuscarCUIT?: (cuit: string) => Promise<any>
  datosIniciales?: DatosEmisor
  loadingBusqueda?: boolean
}

const CONDICIONES_IVA_EMISOR = [
  { id: '1', nombre: 'Responsable Inscripto' },
  { id: '6', nombre: 'Responsable Monotributo' },
  { id: '4', nombre: 'Exento' },
]

export function ConfiguracionEmisor({
  onGuardar,
  onBuscarCUIT,
  datosIniciales,
  loadingBusqueda,
}: ConfiguracionEmisorProps) {
  const [formData, setFormData] = useState<DatosEmisor>(
    datosIniciales || {
      cuit: '20409378472',
      razonSocial: '',
      domicilio: '',
      condicionIVA: '1',
      iibb: '',
      inicioActividades: '',
      puntoVenta: 1,
    }
  )

  const [editado, setEditado] = useState(false)

  useEffect(() => {
    if (datosIniciales) {
      setFormData(datosIniciales)
    }
  }, [datosIniciales])

  const handleInputChange = (field: keyof DatosEmisor, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setEditado(true)
  }

  const handleBuscarCUIT = async () => {
    if (!formData.cuit) {
      toast.error('Ingrese un CUIT para buscar')
      return
    }

    if (!onBuscarCUIT) return

    toast.loading('Consultando datos en AFIP...', { id: 'buscar-emisor' })

    try {
      const response = await onBuscarCUIT(formData.cuit)

      if (response.success && response.data) {
        setFormData((prev) => ({
          ...prev,
          razonSocial: response.data.razonSocial || prev.razonSocial,
          domicilio: response.data.domicilio || prev.domicilio,
        }))

        toast.success(`Datos encontrados: ${response.data.razonSocial}`, {
          id: 'buscar-emisor',
          description: `${response.data.localidad}, ${response.data.provincia}`,
          duration: 4000,
        })
        setEditado(true)
      } else {
        toast.error(`No se encontraron datos: ${response.error}`, {
          id: 'buscar-emisor',
        })
      }
    } catch (err) {
      toast.error('Error al consultar AFIP', { id: 'buscar-emisor' })
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onGuardar(formData)
    setEditado(false)
    toast.success('Datos del emisor guardados correctamente')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle>Configuración del Emisor</CardTitle>
        </div>
        <CardDescription>
          Configure los datos de su empresa que aparecerán en las facturas
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CUIT con búsqueda */}
          <div className="space-y-1.5">
            <Label htmlFor="cuit-emisor" className="text-sm">
              CUIT de la Empresa
            </Label>
            <div className="flex gap-2">
              <Input
                id="cuit-emisor"
                type="text"
                value={formData.cuit}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('cuit', e.target.value)
                }
                placeholder="20409378472"
                required
                className="flex-1"
              />
              {onBuscarCUIT && (
                <Button
                  type="button"
                  onClick={handleBuscarCUIT}
                  disabled={!formData.cuit || loadingBusqueda}
                  variant="outline"
                  size="default"
                  title="Buscar datos en AFIP"
                >
                  {loadingBusqueda ? '...' : <Search className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* Razón Social */}
          <div className="space-y-1.5">
            <Label htmlFor="razon-social" className="text-sm">
              Razón Social
            </Label>
            <Input
              id="razon-social"
              type="text"
              value={formData.razonSocial}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('razonSocial', e.target.value)
              }
              placeholder="Nombre de tu empresa"
              required
            />
          </div>

          {/* Domicilio */}
          <div className="space-y-1.5">
            <Label htmlFor="domicilio-emisor" className="text-sm">
              Domicilio Comercial
            </Label>
            <Input
              id="domicilio-emisor"
              type="text"
              value={formData.domicilio}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('domicilio', e.target.value)
              }
              placeholder="Calle, número, localidad"
              required
            />
          </div>

          {/* Condición IVA */}
          <div className="space-y-1.5">
            <Label htmlFor="condicion-iva-emisor" className="text-sm">
              Condición frente al IVA
            </Label>
            <Select
              value={formData.condicionIVA}
              onValueChange={(value) => handleInputChange('condicionIVA', value)}
            >
              <SelectTrigger id="condicion-iva-emisor">
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {CONDICIONES_IVA_EMISOR.map((cond) => (
                  <SelectItem key={cond.id} value={cond.id}>
                    {cond.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ingresos Brutos */}
          <div className="space-y-1.5">
            <Label htmlFor="iibb" className="text-sm">
              Inscripción Ingresos Brutos (opcional)
            </Label>
            <Input
              id="iibb"
              type="text"
              value={formData.iibb}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('iibb', e.target.value)
              }
              placeholder="Ej: 123-456789-0 o Exento"
            />
          </div>

          {/* Inicio de Actividades */}
          <div className="space-y-1.5">
            <Label htmlFor="inicio-actividades" className="text-sm">
              Fecha de Inicio de Actividades
            </Label>
            <Input
              id="inicio-actividades"
              type="date"
              value={formData.inicioActividades}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('inicioActividades', e.target.value)
              }
              required
            />
          </div>

          {/* Punto de Venta */}
          <div className="space-y-1.5">
            <Label htmlFor="punto-venta" className="text-sm">
              Punto de Venta
            </Label>
            <Input
              id="punto-venta"
              type="number"
              min="1"
              max="9999"
              value={formData.puntoVenta}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('puntoVenta', parseInt(e.target.value) || 1)
              }
              placeholder="1"
              required
            />
            <p className="text-xs text-gray-500">
              Número de 4 dígitos habilitado en AFIP
            </p>
          </div>

          {/* Botón Guardar */}
          <Button
            type="submit"
            className="w-full"
            variant={editado ? 'default' : 'outline'}
          >
            <Save className="h-4 w-4 mr-2" />
            {editado ? 'Guardar Cambios' : 'Datos Guardados'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
