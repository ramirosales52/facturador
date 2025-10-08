interface QRCodeProps {
  qrUrl: string
}

export function QRCode({ qrUrl }: QRCodeProps) {
  return (
    <div className="mt-4 p-4 bg-white rounded border border-green-300">
      <p className="font-medium text-green-800 mb-2">Código QR de AFIP:</p>
      <div className="flex flex-col items-center gap-3">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
          alt="QR Code"
          className="border-2 border-gray-300 rounded"
        />
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline cursor-pointer"
        >
          Verificar en AFIP
        </a>
      </div>
    </div>
  )
}
