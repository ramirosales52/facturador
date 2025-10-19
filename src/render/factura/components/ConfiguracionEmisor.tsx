import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import axios from 'axios'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@render/components/ui/dialog'
import { Search, Save, Building2, Shield, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { CONDICIONES_IVA_EMISOR } from '@render/constants/afip'

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

export function ConfiguracionEmisor({
  onGuardar,
  onBuscarCUIT,
  datosIniciales,
  loadingBusqueda,
}: ConfiguracionEmisorProps) {
  const [formData, setFormData] = useState<DatosEmisor>(
    datosIniciales || {
      cuit: '', // Iniciar vacío
      razonSocial: '',
      domicilio: '',
      condicionIVA: '1',
      iibb: '',
      inicioActividades: '',
      puntoVenta: 1,
    }
  )

  const [datosOriginales, setDatosOriginales] = useState<DatosEmisor>(
    datosIniciales || {
      cuit: '',
      razonSocial: '',
      domicilio: '',
      condicionIVA: '1',
      iibb: '',
      inicioActividades: '',
      puntoVenta: 1,
    }
  )

  const [conectandoARCA, setConectandoARCA] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [credencialesAFIP, setCredencialesAFIP] = useState({
    username: '',
    password: '',
  })
  const [cuitARCA, setCuitARCA] = useState<string>('') // Iniciar vacío
  const [certificadoCreado, setCertificadoCreado] = useState(false)

  useEffect(() => {
    if (datosIniciales) {
      setFormData(datosIniciales)
      setDatosOriginales(datosIniciales)
      setCuitARCA(datosIniciales.cuit)
      // Si ya hay un CUIT, significa que el certificado fue creado anteriormente
      if (datosIniciales.cuit) {
        setCertificadoCreado(true)
      }
    }
    
    // Cargar estado del certificado desde localStorage
    const certificadoGuardado = localStorage.getItem('certificadoARCACreado')
    const cuitGuardado = localStorage.getItem('cuitARCA')
    
    if (certificadoGuardado === 'true' && cuitGuardado) {
      setCertificadoCreado(true)
      setCuitARCA(cuitGuardado)
      // Solo actualizar formData si no hay datosIniciales
      if (!datosIniciales?.cuit) {
        setFormData(prev => ({ ...prev, cuit: cuitGuardado }))
      }
    }
  }, [datosIniciales])

  // Verificar si los datos han cambiado
  const hayDatosCambiados = () => {
    return JSON.stringify(formData) !== JSON.stringify(datosOriginales)
  }

  const handleInputChange = (field: keyof DatosEmisor, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleBuscarCUIT = async () => {
    if (!cuitARCA || cuitARCA.trim() === '') {
      toast.error('Debe crear el certificado ARCA primero', { 
        id: 'toast-buscar-cuit-error',
        description: 'El CUIT se obtiene al conectar con ARCA'
      })
      return
    }

    if (!onBuscarCUIT) return

    toast.loading('Consultando datos en AFIP...', { id: 'toast-buscar-cuit-loading' })

    try {
      const response = await onBuscarCUIT(cuitARCA)

      if (response.success && response.data) {
        setFormData((prev) => ({
          ...prev,
          razonSocial: response.data.razonSocial || prev.razonSocial,
          domicilio: response.data.domicilio || prev.domicilio,
        }))

        toast.success(`Datos encontrados: ${response.data.razonSocial}`, {
          id: 'toast-buscar-cuit-loading',
          description: `${response.data.localidad}, ${response.data.provincia}`,
          duration: 4000,
        })
      } else {
        // No se encontraron datos - mostrar error sin actualizar campos
        toast.error('CUIT no encontrado', {
          id: 'toast-buscar-cuit-loading',
          description: response.error || 'No se encontraron datos en AFIP'
        })
      }
    } catch (err) {
      toast.error('Error al consultar AFIP', { id: 'toast-buscar-cuit-loading' })
    }
  }

  const handleConectarARCA = async () => {
    if (!credencialesAFIP.username || !credencialesAFIP.password) {
      setDialogError('Complete todos los campos de credenciales AFIP')
      return
    }

    // Verificar que window.electron esté disponible
    if (typeof window === 'undefined' || !window.electron || typeof window.electron.getBackendPort !== 'function') {
      setDialogError('Error: La aplicación no está completamente cargada')
      return
    }

    setConectandoARCA(true)
    setDialogError(null)

    try {
      const backendPort = await window.electron.getBackendPort()
      const response = await axios.post(`http://localhost:${backendPort}/arca/crear-certificado-dev`, {
        cuit: credencialesAFIP.username, // El CUIT debe ser el mismo que el username
        username: credencialesAFIP.username,
        password: credencialesAFIP.password,
      })

      const result = response.data

      if (result.success) {
        setDialogOpen(false)
        toast.success('¡Certificado creado exitosamente!', {
          id: 'toast-conectar-arca-success',
          description: `Guardado en: ${result.certDir}`,
          duration: 6000,
        })
        
        // Actualizar el CUIT del emisor con el username
        const cuitStr = credencialesAFIP.username
        setCuitARCA(cuitStr)
        setCertificadoCreado(true)
        setFormData(prev => ({ ...prev, cuit: cuitStr }))
        
        // Guardar estado del certificado en localStorage
        localStorage.setItem('certificadoARCACreado', 'true')
        localStorage.setItem('cuitARCA', cuitStr)
        
        // Limpiar credenciales y error
        setCredencialesAFIP({ username: '', password: '' })
        setDialogError(null)
        
        // Buscar automáticamente los datos del CUIT
        if (onBuscarCUIT) {
          toast.loading('Consultando datos en AFIP...', { id: 'toast-buscar-auto-loading' })
          
          try {
            const busquedaResponse = await onBuscarCUIT(cuitStr)
            
            if (busquedaResponse.success && busquedaResponse.data) {
              setFormData((prev) => ({
                ...prev,
                cuit: cuitStr,
                razonSocial: busquedaResponse.data.razonSocial || prev.razonSocial,
                domicilio: busquedaResponse.data.domicilio || prev.domicilio,
              }))

              toast.success(`Datos encontrados: ${busquedaResponse.data.razonSocial}`, {
                id: 'toast-buscar-auto-loading',
                description: `${busquedaResponse.data.localidad}, ${busquedaResponse.data.provincia}`,
                duration: 4000,
              })
            } else {
              toast.info('Complete manualmente los datos del emisor', {
                id: 'toast-buscar-auto-loading',
                description: 'No se encontraron datos automáticos en AFIP'
              })
            }
          } catch (err) {
            console.error('Error al buscar CUIT:', err)
            toast.info('Complete manualmente los datos del emisor', {
              id: 'toast-buscar-auto-loading',
              description: 'No se pudieron obtener datos de AFIP'
            })
          }
        }
      } else {
        // Mostrar error en el dialog sin cerrarlo
        setDialogError(result.error || 'Error desconocido')
      }
    } catch (error: any) {
      console.error('Error completo:', error)
      // Extraer el mensaje de error más específico
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Error desconocido'
      setDialogError(errorMsg)
    } finally {
      setConectandoARCA(false)
    }
  }

  const handleDesconectarARCA = () => {
    // Limpiar estado del certificado
    setCertificadoCreado(false)
    setCuitARCA('')
    setFormData({
      cuit: '',
      razonSocial: '',
      domicilio: '',
      condicionIVA: '1',
      iibb: '',
      inicioActividades: '',
      puntoVenta: 1,
    })
    setDatosOriginales({
      cuit: '',
      razonSocial: '',
      domicilio: '',
      condicionIVA: '1',
      iibb: '',
      inicioActividades: '',
      puntoVenta: 1,
    })
    
    // Limpiar localStorage
    localStorage.removeItem('certificadoARCACreado')
    localStorage.removeItem('cuitARCA')
    localStorage.removeItem('datosEmisor')
    
    toast.success('Certificado ARCA desconectado', {
      description: 'Puede crear un nuevo certificado cuando lo necesite'
    })
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onGuardar(formData)
    setDatosOriginales(formData)
    toast.success('Datos del emisor guardados correctamente', { id: 'toast-guardar-emisor' })
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
          {/* Botón Conectar con ARCA */}
          {!certificadoCreado ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  disabled={conectandoARCA}
                  className="w-full text-white font-semibold"
                  style={{ backgroundColor: '#242c50' }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Conectar con <strong className="ml-1">ARCA</strong>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conectar con ARCA</DialogTitle>
                  <DialogDescription>
                    Ingrese sus credenciales de AFIP para generar el certificado de desarrollo. El CUIT ingresado será usado como CUIT del emisor.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {dialogError && (
                    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 font-medium">{dialogError}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="afip-username">CUIT / Usuario AFIP</Label>
                    <Input
                      id="afip-username"
                      type="text"
                      value={credencialesAFIP.username}
                      onChange={(e) => {
                        setCredencialesAFIP(prev => ({ ...prev, username: e.target.value }))
                        setDialogError(null) // Limpiar error al editar
                      }}
                      placeholder="20409378472"
                      disabled={conectandoARCA}
                    />
                    <p className="text-xs text-gray-500">
                      Este será el CUIT de su empresa
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="afip-password">Contraseña AFIP</Label>
                    <Input
                      id="afip-password"
                      type="password"
                      value={credencialesAFIP.password}
                      onChange={(e) => {
                        setCredencialesAFIP(prev => ({ ...prev, password: e.target.value }))
                        setDialogError(null) // Limpiar error al editar
                      }}
                      placeholder="••••••••"
                      disabled={conectandoARCA}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      setDialogError(null)
                    }}
                    disabled={conectandoARCA}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConectarARCA}
                    disabled={!credencialesAFIP.username || !credencialesAFIP.password || conectandoARCA}
                    className="text-white font-semibold"
                    style={{ backgroundColor: '#242c50' }}
                  >
                    {conectandoARCA ? 'Generando...' : 'Generar Certificado'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                disabled
                className="w-full text-white font-semibold"
                style={{ backgroundColor: '#242c50' }}
              >
                <Shield className="h-4 w-4 mr-2" />
                Conectado
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDesconectarARCA}
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Desconectar ARCA
              </Button>
            </div>
          )}
          
          <p className="text-xs text-gray-500 text-center">
            {certificadoCreado 
              ? 'Certificado de desarrollo creado correctamente'
              : 'Crea automáticamente el certificado de desarrollo para facturación electrónica'
            }
          </p>

          {/* Separador - Solo mostrar si el certificado fue creado */}
          {certificadoCreado && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Datos del Emisor
                </span>
              </div>
            </div>
          )}

          {/* Formulario - Solo mostrar si el certificado fue creado */}
          {certificadoCreado && (
            <>
              {/* CUIT con búsqueda - Ahora solo lectura */}
              <div className="space-y-1.5">
                <Label htmlFor="cuit-emisor" className="text-sm">
                  CUIT de la Empresa
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cuit-emisor"
                    type="text"
                    value={cuitARCA || ''} 
                    readOnly
                    disabled
                    placeholder="Conecte con ARCA primero"
                    className="flex-1 bg-gray-50"
                  />
                  {onBuscarCUIT && (
                    <Button
                      type="button"
                      onClick={handleBuscarCUIT}
                      disabled={!cuitARCA || cuitARCA.trim() === '' || loadingBusqueda}
                      variant="outline"
                      size="default"
                      title={!cuitARCA || cuitARCA.trim() === '' ? "Primero debe conectar con ARCA" : "Buscar datos en AFIP"}
                    >
                      {loadingBusqueda ? '...' : <Search className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  El CUIT está vinculado con el certificado de ARCA creado
                </p>
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
                disabled={!hayDatosCambiados()}
              >
                <Save className="h-4 w-4 mr-2" />
                {hayDatosCambiados() ? 'Guardar datos' : 'Datos guardados'}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
