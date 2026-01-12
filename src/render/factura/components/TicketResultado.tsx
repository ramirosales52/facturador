import { CheckCircle2, Eye, EyeOff, FileText, FolderOpen, Printer, XCircle } from 'lucide-react'
import { Button } from '@render/components/ui/button'
import type { TicketFormData } from './TicketForm'
import { formatearMoneda } from '@render/utils/calculos'
import { useEffect, useRef, useState } from 'react'

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
  onDescargarPDF?: () => void
  loadingPDF?: boolean
  pdfUrl?: string | null
}

export function TicketResultado({ 
  resultado, 
  htmlPreview,
  onImprimir,
  loadingPrint,
  onDescargarPDF,
  loadingPDF,
  pdfUrl,
}: TicketResultadoProps) {
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && htmlPreview) {
      // Limpiar contenido previo
      containerRef.current.innerHTML = ''
      
      if (mostrarVistaPrevia) {
        // Crear shadow DOM para aislar estilos
        const shadow = containerRef.current.attachShadow({ mode: 'open' })
        shadow.innerHTML = htmlPreview
      }
    }
  }, [mostrarVistaPrevia, htmlPreview])

  const handleAbrirCarpeta = async () => {
    if (!pdfUrl) return
    try {
      // @ts-ignore - Electron API
      if (window.electron?.shell?.openPath) {
        // @ts-ignore
        await window.electron.shell.openPath(pdfUrl)
      }
    } catch (error) {
      console.error('Error al abrir carpeta:', error)
    }
  }

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

            {/* Botones de acción */}
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
                variant="outline"
                className="w-full"
              >
                {mostrarVistaPrevia ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Ocultar Vista Previa
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Mostrar Vista Previa
                  </>
                )}
              </Button>

              {/* Vista previa del ticket (colapsable) */}
              {mostrarVistaPrevia && (
                <div className="border border-green-400 rounded-md p-4 bg-gray-100">
                  <div className="flex justify-center">
                    <div 
                      ref={containerRef}
                      style={{ width: '80mm', maxWidth: '100%' }}
                      className="shadow-lg bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Botones de PDF */}
              <div className="grid grid-cols-2 gap-2">
                {onDescargarPDF && (
                  <Button
                    onClick={onDescargarPDF}
                    disabled={loadingPDF}
                    variant={pdfUrl ? 'outline' : 'default'}
                    className="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {loadingPDF ? 'Generando...' : pdfUrl ? 'Regenerar PDF' : 'Generar PDF'}
                  </Button>
                )}

                {pdfUrl && (
                  <Button
                    onClick={handleAbrirCarpeta}
                    variant="outline"
                    className="w-full"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Abrir Carpeta
                  </Button>
                )}
              </div>

              {onImprimir && (
                <Button 
                  onClick={onImprimir}
                  disabled={loadingPrint}
                  className="w-full"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {loadingPrint ? 'Imprimiendo...' : 'Imprimir Ticket'}
                </Button>
              )}
            </div>
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
