declare global {
  interface Window {
    electron: {
      sendMsg: (msg: string) => Promise<string>
      onReplyMsg: (cb: (msg: string) => any) => void
      getCommandLineCuit: () => Promise<string | null>
      getBackendPort: () => Promise<number>
    }
  }
}

export { }
