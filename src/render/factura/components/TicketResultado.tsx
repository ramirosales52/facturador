import { CheckCircle2, Printer, XCircle } from 'lucide-react'
import { Button } from '@render/components/ui/button'
import type { TicketFormData } from './TicketForm'
import { formatearMoneda } from '@render/utils/calculos'

export interface TicketResultadoData {
  success: boolean
  data?: {
    CAE: string
    CAEFchVto: string
    CbteDesde: number
    CbteHasta: number
    PtoVta?: number
    CbteTipo?: number
    DocTipo?: number
    DocNro?: number
    ImpTotal?: number
    FchProceso?: string
  }
  facturaLocalId?: number
  error?: string
  formData?: TicketFormData
}

interface TicketResultadoProps {
  resultado: TicketResultadoData
  htmlPreview?: string
  onImprimir?: () => void
  loadingPrint?: boolean
}

export function TicketResultado({ 
  resultado, 
  htmlPreview,
  onImprimir,
  loadingPrint,
}: TicketResultadoProps) {
  return (
    <div className={`mt-6 p-4 rounded-md ${resultado.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
      {resultado.success
        ? (
          <div>
            <p className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Ticket creado exitosamente
            </p>
            
            {/* Grid de 2 columnas */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-green-800 mb-4">
              <div>
                <span className="font-medium">Tipo:</span>
                {' '}
                Factura B - Ticket
              </div>
              <div>
                <span className="font-medium">CAE:</span>
                {' '}
                {resultado.data?.CAE}
              </div>
              
              <div>
                <span className="font-medium">Cliente:</span>
                {' '}
                Consumidor Final
              </div>
              <div>
                <span className="font-medium">Vencimiento CAE:</span>
                {' '}
                {resultado.data?.CAEFchVto}
              </div>
              
              <div>
                <span className="font-medium">Comprobante Nro:</span>
                {' '}
                {String(resultado.data?.PtoVta).padStart(5, '0')}-{String(resultado.data?.CbteDesde).padStart(8, '0')}
              </div>
              <div>
                <span className="font-medium">Monto:</span>
                {' '}
                {resultado.data?.ImpTotal ? formatearMoneda(resultado.data.ImpTotal) : formatearMoneda(0)}
              </div>
            </div>

            {/* Vista previa del ticket */}
            {htmlPreview && (
              <div className="mt-4 mb-4">
                <h3 className="font-medium text-green-800 mb-2">Vista Previa del Ticket</h3>
                <div className="border border-green-400 rounded-md p-4 bg-white max-h-[600px] overflow-auto">
                  <div className="mx-auto" style={{ width: '80mm' }}>
                    <iframe
                      srcDoc={htmlPreview}
                      style={{ width: '100%', border: 'none', minHeight: '500px' }}
                      title="Vista previa del ticket"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botón de imprimir */}
            {onImprimir && (
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={onImprimir}
                  disabled={loadingPrint}
                  className="flex-1"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {loadingPrint ? 'Imprimiendo...' : 'Imprimir Ticket'}
                </Button>
              </div>
            )}
          </div>
        )
        : (
          <div>
            <p className="font-bold text-red-800 text-lg mb-2 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error al crear ticket
            </p>
            <p className="text-red-800">{resultado.error}</p>
          </div>
        )}
    </div>
  )
}
