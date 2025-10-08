import { Button } from '@render/components/ui/button'
import { Copy, FolderOpen, FileText } from 'lucide-react'
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

  const abrirCarpeta = async (): Promise<void> => {
    if (!pdfUrl) return
    
    try {
      // Obtener la carpeta del archivo (eliminar el nombre del archivo)
      const carpeta = pdfUrl.substring(0, pdfUrl.lastIndexOf('/'))
      
      // En Windows WSL, convertir la ruta
      const carpetaWindows = carpeta.replace('/mnt/c/', 'C:/')
      
      // Abrir el explorador de archivos
      window.open(`file:///${carpetaWindows}`, '_blank')
      
      toast.success('Abriendo carpeta del PDF')
    }
    catch {
      toast.error('Error al abrir la carpeta')
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

      {/* Ruta del PDF */}
      {pdfUrl && (
        <div className="mt-4 p-4 bg-white rounded border border-green-300">
          <p className="font-medium text-green-800 mb-2">PDF generado exitosamente:</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <p className="flex-1 text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded truncate">
                {pdfUrl}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => copiarAlPortapapeles(pdfUrl, 'Ruta del PDF')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar ruta
              </Button>
              <Button
                onClick={abrirCarpeta}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Abrir carpeta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
