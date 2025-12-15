import { CheckCircle2, XCircle } from 'lucide-react'
import { PDFActions } from './PDFActions'
import { PDFPreview } from './PDFPreview'

export interface FacturaResultadoData {
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
  tipoFactura?: string
  razonSocial?: string
}

interface FacturaResultadoProps {
  resultado: FacturaResultadoData
  qrUrl: string | null
  pdfUrl: string | null
  onGenerarPDF: () => Promise<void>
  htmlPreview?: string
  pdfSavePath?: string
  onSelectFolder?: () => Promise<void>
}

export function FacturaResultado({ 
  resultado, 
  pdfUrl, 
  onGenerarPDF, 
  htmlPreview, 
  pdfSavePath, 
  onSelectFolder,
}: FacturaResultadoProps) {
  // Obtener nombre del tipo de documento
  const getNombreTipoDoc = (tipo?: number): string => {
    if (!tipo) return 'N/A'
    switch (tipo) {
      case 80: return 'CUIT'
      case 96: return 'DNI'
      case 99: return 'Consumidor Final'
      default: return `Tipo ${tipo}`
    }
  }

  return (
    <div className={`mt-6 p-4 rounded-md ${resultado.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
      {resultado.success
        ? (
          <div>
            <p className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Factura creada exitosamente
            </p>
            
            {/* Grid de 2 columnas con máximo 4 filas */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-green-800 mb-4">
              <div>
                <span className="font-medium">Tipo de Factura:</span>
                {' '}
                {resultado.tipoFactura || 'N/A'}
              </div>
              <div>
                <span className="font-medium">CAE:</span>
                {' '}
                {resultado.data?.CAE}
              </div>
              
              <div>
                <span className="font-medium">Cliente:</span>
                {' '}
                {resultado.razonSocial || 'Consumidor Final'}
              </div>
              <div>
                <span className="font-medium">Vencimiento CAE:</span>
                {' '}
                {resultado.data?.CAEFchVto}
              </div>
              
              <div>
                <span className="font-medium">Documento:</span>
                {' '}
                {getNombreTipoDoc(resultado.data?.DocTipo)} {resultado.data?.DocNro || ''}
              </div>
              <div>
                <span className="font-medium">Comprobante Nro:</span>
                {' '}
                {String(resultado.data?.PtoVta).padStart(5, '0')}-{String(resultado.data?.CbteDesde).padStart(8, '0')}
              </div>
              
              <div>
                <span className="font-medium">Monto:</span>
                {' '}
                ${resultado.data?.ImpTotal?.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Punto de Venta:</span>
                {' '}
                {resultado.data?.PtoVta}
              </div>
            </div>

            {htmlPreview && <PDFPreview htmlContent={htmlPreview} qrUrl={null} />}

            <PDFActions pdfUrl={pdfUrl} onGenerar={onGenerarPDF} pdfSavePath={pdfSavePath} onSelectFolder={onSelectFolder} />
          </div>
        )
        : (
          <div>
            <p className="font-bold text-red-800 text-lg mb-2 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error al crear factura
            </p>
            <p className="text-red-800">{resultado.error}</p>
          </div>
        )}
    </div>
  )
}
