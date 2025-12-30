import { Button } from '@render/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PDFPreviewProps {
  htmlContent: string
  qrUrl?: string | null
}

export function PDFPreview({ htmlContent, qrUrl }: PDFPreviewProps) {
  const [mostrarPreview, setMostrarPreview] = useState(false)
  const [htmlConQR, setHtmlConQR] = useState(htmlContent)

  useEffect(() => {
    const convertirQRaBase64 = async () => {
      if (!qrUrl || !qrUrl.startsWith('file://')) {
        setHtmlConQR(htmlContent)
        return
      }

      try {
        // Leer la imagen del QR y convertirla a base64
        const response = await fetch(qrUrl)
        const blob = await response.blob()

        const reader = new FileReader()
        reader.onloadend = () => {
          const base64data = reader.result as string
          // Reemplazar la URL del archivo local con la versión base64
          const htmlModificado = htmlContent.replace(qrUrl, base64data)
          setHtmlConQR(htmlModificado)
        }
        reader.readAsDataURL(blob)
      }
      catch (error) {
        console.error('Error al convertir QR a base64:', error)
        setHtmlConQR(htmlContent)
      }
    }

    convertirQRaBase64()
  }, [htmlContent, qrUrl])

  return (
    <div className="mt-4">
      <Button
        onClick={() => setMostrarPreview(!mostrarPreview)}
        variant="outline"
        className="w-full"
      >
        {mostrarPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
        {mostrarPreview ? 'Ocultar' : 'Mostrar'}
        {' '}
        Vista Previa PDF
      </Button>

      {mostrarPreview && (
        <div className="mt-4 bg-gray-100 p-4 rounded-lg shadow">
          <div className="bg-white overflow-auto rounded shadow-md mx-auto" style={{ maxHeight: '800px', width: '210mm', maxWidth: '100%' }}>
            <iframe
              srcDoc={htmlConQR}
              title="PDF Preview"
              className="w-full border-0"
              style={{ height: '297mm', minHeight: '297mm' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
