import { CheckCircle2, XCircle } from 'lucide-react'
import { PDFActions } from './PDFActions'
import { PDFPreview } from './PDFPreview'
import { QRCode } from './QRCode'

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
  error?: string
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

export function FacturaResultado({ resultado, qrUrl, pdfUrl, onGenerarPDF, htmlPreview, pdfSavePath, onSelectFolder }: FacturaResultadoProps) {
  return (
    <div className={`mt-6 p-4 rounded-md ${resultado.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
      {resultado.success
        ? (
            <div>
              <p className="font-bold text-green-800 text-lg mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Factura B creada exitosamente
              </p>
              <div className="space-y-1 text-green-800">
                <p>
                  <span className="font-medium">CAE:</span>
                  {' '}
                  {resultado.data?.CAE}
                </p>
                <p>
                  <span className="font-medium">Vencimiento CAE:</span>
                  {' '}
                  {resultado.data?.CAEFchVto}
                </p>
                <p>
                  <span className="font-medium">Comprobante Nro:</span>
                  {' '}
                  {resultado.data?.CbteDesde}
                </p>
                <p>
                  <span className="font-medium">Punto de Venta:</span>
                  {' '}
                  {resultado.data?.PtoVta}
                </p>
              </div>

              {qrUrl && <QRCode qrUrl={qrUrl} />}

              {htmlPreview && <PDFPreview htmlContent={htmlPreview} qrUrl={qrUrl} />}

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
