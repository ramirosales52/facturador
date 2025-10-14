import { Button } from '@render/components/ui/button'
import { Copy, FolderOpen, FileText, FolderInput } from 'lucide-react'
import { toast } from 'sonner'

interface PDFActionsProps {
  pdfUrl: string | null
  onGenerar: () => Promise<void>
  pdfSavePath?: string
  onSelectFolder?: () => Promise<void>
}

export function PDFActions({ pdfUrl, onGenerar, pdfSavePath, onSelectFolder }: PDFActionsProps) {
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
      // Obtener la carpeta del archivo
      const carpeta = pdfUrl.substring(0, pdfUrl.lastIndexOf('/'))
      
      // Usar el API de Electron para abrir la carpeta
      // @ts-ignore - Electron API
      if (window.electron?.shell?.openPath) {
        // @ts-ignore
        await window.electron.shell.openPath(carpeta)
        toast.success('Abriendo carpeta del PDF')
      } else {
        // Fallback para desarrollo
        toast.info('Función disponible solo en la aplicación empaquetada')
      }
    }
    catch (error) {
      console.error('Error al abrir carpeta:', error)
      toast.error('Error al abrir la carpeta')
    }
  }

  return (
    <div>
      {/* Carpeta de guardado */}
      {onSelectFolder && (
        <div className="mt-4 flex gap-2 items-center">
          <div className="flex-1 bg-gray-50 border rounded px-3 py-2 text-sm text-gray-700">
            <span className="font-medium">Guardar en: </span>
            {pdfSavePath || 'Escritorio'}
          </div>
          <Button onClick={onSelectFolder} variant="outline" size="icon" title="Seleccionar carpeta">
            <FolderInput className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Botón generar PDF */}
      <div className="mt-4 flex gap-2">
        <Button onClick={onGenerar} variant="outline" className="flex-1">
          <FileText className="mr-2 h-4 w-4" />
          Generar PDF
        </Button>
        {onSelectFolder && (
          <Button onClick={onSelectFolder} variant="outline" size="icon" title="Cambiar carpeta">
            <FolderInput className="h-4 w-4" />
          </Button>
        )}
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
