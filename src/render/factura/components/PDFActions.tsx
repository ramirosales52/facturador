import { Button } from '@render/components/ui/button'
import { FileText, FolderInput, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

interface PDFActionsProps {
  pdfUrl: string | null
  onGenerar: () => Promise<void>
  pdfSavePath?: string
  onSelectFolder?: () => Promise<void>
  loadingPDF?: boolean
}

export function PDFActions({ pdfUrl, onGenerar, pdfSavePath, onSelectFolder, loadingPDF }: PDFActionsProps) {
  const abrirCarpeta = async (): Promise<void> => {
    if (!pdfUrl)
      return

    try {
      // Usar el API de Electron para abrir la carpeta y seleccionar el archivo
      // @ts-ignore - Electron API
      if (window.electron?.shell?.openPath) {
        // @ts-ignore
        const result = await window.electron.shell.openPath(pdfUrl)
        // El handler retorna 'ok' si tuvo éxito, o un mensaje de error si falló
        if (result === 'El archivo fue borrado o movido') {
          toast.error('El archivo fue borrado o movido')
        } else if (result !== 'ok') {
          toast.error('No se pudo abrir la carpeta')
        }
      }
      else {
        // Fallback para desarrollo
        console.log('Función disponible solo en la aplicación empaquetada')
      }
    }
    catch (error) {
      console.error('Error al abrir carpeta:', error)
      toast.error('Error al abrir la carpeta', { id: 'abrir-carpeta-pdf' })
    }
  }

  return (
    <div>
      {/* Carpeta de guardado - Solo mostrar si NO hay PDF generado */}
      {!pdfUrl && onSelectFolder && (
        <div className="mt-4 flex gap-2 items-center">
          <div className="flex-1 bg-gray-50 border rounded px-3 py-2 text-sm text-gray-700 font-mono truncate">
            {pdfSavePath || 'Escritorio (por defecto)'}
          </div>
          <Button onClick={onSelectFolder} variant="outline" size="icon" title="Seleccionar carpeta">
            <FolderInput className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Botón generar PDF o Abrir carpeta */}
      <div className="mt-4">
        {!pdfUrl ? (
          <Button onClick={onGenerar} variant="outline" className="w-full" disabled={loadingPDF}>
            <FileText className="mr-2 h-4 w-4" />
            {loadingPDF ? 'Generando...' : 'Generar PDF'}
          </Button>
        ) : (
          <Button onClick={abrirCarpeta} variant="default" className="w-full">
            <FolderOpen className="mr-2 h-4 w-4" />
            Abrir carpeta
          </Button>
        )}
      </div>
    </div>
  )
}
