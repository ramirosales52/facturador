import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@render/components/ui/table'
import { ChevronDown, ChevronUp, Filter, Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useArca } from '../../hooks/useArca'

const TIPOS_COMPROBANTE = [
  { id: '1', nombre: 'Factura A' },
  { id: '6', nombre: 'Factura B' },
]

const TIPOS_DOCUMENTO = [
  { id: '80', nombre: 'CUIT' },
  { id: '96', nombre: 'DNI' },
  { id: '99', nombre: 'Consumidor Final' },
]

interface Comprobante {
  'Fecha de Emisión': string
  'Tipo de Comprobante': string
  'Punto de Venta': string
  'Número Desde': string
  'Número Hasta': string
  'Cód. Autorización': string
  'Tipo Doc. Receptor': string
  'Nro. Doc. Receptor': string
  'Denominación Receptor': string
  'Tipo Cambio': string
  'Moneda': string
  'Imp. Neto Gravado': string
  'Imp. Neto No Gravado': string
  'Imp. Op. Exentas': string
  'Otros Tributos': string
  'IVA': string
  'Imp. Total': string
}

interface ComprobantesEmitidosProps { }

export function ComprobantesEmitidos() {
  const { getMisComprobantes } = useArca()

  const [loading, setLoading] = useState(false)
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [puntoVenta, setPuntoVenta] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('')
  const [tipoDoc, setTipoDoc] = useState('')
  const [nroDoc, setNroDoc] = useState('')
  const [codigoAutorizacion, setCodigoAutorizacion] = useState('')

  const formatearFechas = (desde: string, hasta: string): string => {
    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const formatear = (fecha: string) => {
      const [year, month, day] = fecha.split('-')
      return `${day}/${month}/${year}`
    }

    return `${formatear(desde)} - ${formatear(hasta)}`
  }

  const handleBuscar = async () => {
    // Limpiar error anterior
    setError(null)

    // Obtener credenciales guardadas
    const credenciales = localStorage.getItem('credencialesARCA')
    if (!credenciales) {
      setError('Debe configurar sus credenciales de AFIP primero. Vaya a la pestaña "Configuración Emisor" y guarde sus credenciales.')
      return
    }

    const { username, password } = JSON.parse(credenciales)

    if (!username || !password) {
      setError('Credenciales incompletas. Vaya a la pestaña "Configuración Emisor" y guarde sus credenciales.')
      return
    }

    if (!fechaDesde || !fechaHasta) {
      setError('Debe seleccionar un rango de fechas.')
      return
    }

    setLoading(true)
    toast.loading('Consultando comprobantes en AFIP...', { id: 'buscar-comprobantes' })

    try {
      const filters: any = {
        cuit: username, // Usar username como CUIT (son el mismo valor)
        username,
        password,
        fechaEmision: formatearFechas(fechaDesde, fechaHasta),
      }

      // Agregar filtros opcionales si están presentes
      if (puntoVenta) {
        filters.puntosVenta = [Number.parseInt(puntoVenta)]
      }
      if (tipoComprobante) {
        filters.tiposComprobantes = [Number.parseInt(tipoComprobante)]
      }
      if (tipoDoc) {
        filters.tipoDoc = Number.parseInt(tipoDoc)
      }
      if (nroDoc) {
        filters.nroDoc = nroDoc
      }
      if (codigoAutorizacion) {
        filters.codigoAutorizacion = codigoAutorizacion
      }

      const response = await getMisComprobantes(filters)

      if (response.success && response.data) {
        setComprobantes(response.data)
        setError(null)
        toast.success(`Se encontraron ${response.total || 0} comprobantes`)
      } else {
        setError(response.error || 'Error al consultar comprobantes. Verifique los parámetros enviados.')
      }
    } catch (error: any) {
      console.error('Error al buscar comprobantes:', error)
      setError(error.message || 'Error inesperado al consultar comprobantes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes Emitidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros básicos siempre visibles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaDesde">Fecha Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaHasta">Fecha Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          {/* Botón para mostrar/ocultar filtros avanzados */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {mostrarFiltros ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )}
          </Button>

          {/* Filtros avanzados colapsables */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="puntoVenta">Punto de Venta</Label>
                <Input
                  id="puntoVenta"
                  type="number"
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(e.target.value)}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoComprobante">Tipo de Comprobante</Label>
                <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                  <SelectTrigger id="tipoComprobante">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_COMPROBANTE.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoDoc">Tipo de Documento</Label>
                <Select value={tipoDoc} onValueChange={setTipoDoc}>
                  <SelectTrigger id="tipoDoc">
                    <SelectValue placeholder="Seleccionar tipo" />
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

              <div className="space-y-2">
                <Label htmlFor="nroDoc">Número de Documento</Label>
                <Input
                  id="nroDoc"
                  value={nroDoc}
                  onChange={(e) => setNroDoc(e.target.value)}
                  placeholder="20123456789"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="codigoAutorizacion">Código de Autorización (CAE)</Label>
                <Input
                  id="codigoAutorizacion"
                  value={codigoAutorizacion}
                  onChange={(e) => setCodigoAutorizacion(e.target.value)}
                  placeholder="74112153083444"
                />
              </div>
            </div>
          )}

          {/* Botón de búsqueda */}
          <Button
            onClick={handleBuscar}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar Comprobantes
              </>
            )}
          </Button>

          {/* Mensaje de error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error al consultar comprobantes</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de resultados */}
      {comprobantes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados ({comprobantes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pto. Venta</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Receptor</TableHead>
                    <TableHead>Doc. Receptor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>CAE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprobantes.map((comp, index) => (
                    <TableRow key={index}>
                      <TableCell>{comp['Fecha de Emisión']}</TableCell>
                      <TableCell>{comp['Tipo de Comprobante']}</TableCell>
                      <TableCell>{comp['Punto de Venta']}</TableCell>
                      <TableCell>{comp['Número Desde']}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {comp['Denominación Receptor']}
                      </TableCell>
                      <TableCell>{comp['Nro. Doc. Receptor']}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${comp['Imp. Total']}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {comp['Cód. Autorización']}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
