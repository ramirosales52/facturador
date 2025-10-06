import logo from './assets/logo.png'

function App() {
  return (
    <div className="flex flex-col gap-2 items-center w-full h-screen mt-24">
      <img alt="logo" src={logo} className="h-48 w-auto" />
      <h1>
        Vite + React + Electron + NestJS + Shadcn + Tailwind
      </h1>
    </div>
  )
}

export default App
