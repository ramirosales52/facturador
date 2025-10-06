import { Button } from '@render/components/ui/button'
import { Copy, ExternalLink, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface PDFActionsProps {
  pdfUrl: string | null
  onGenerar: () => Promise<void>
}

export function PDFActions({ pdfUrl, onGenerar }: PDFActionsProps) {
  const copiarAlPortapapeles = async (texto: string, tipo: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success(`${tipo} copiado al portapapeles`)
    }
    catch {
      toast.error('Error al copiar al portapapeles')
    }
  }

  return (
    <div>
      {/* Botón generar PDF */}
      <div className="mt-4">
        <Button onClick={onGenerar} variant="outline" className="w-full">
          <FileText className="mr-2 h-4 w-4" />
          Generar PDF
        </Button>
      </div>

      {/* URL del PDF */}
      {pdfUrl && (
        <div className="mt-4 p-4 bg-white rounded border border-green-300">
          <p className="font-medium text-green-800 mb-2">PDF generado exitosamente:</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-blue-600 hover:underline truncate"
              >
                {pdfUrl}
              </a>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => copiarAlPortapapeles(pdfUrl, 'Enlace del PDF')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar enlace
              </Button>
              <Button
                onClick={() => window.open(pdfUrl, '_blank')}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
