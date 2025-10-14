import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld(
  'electron',
  {
    sendMsg: (msg: string): Promise<string> => ipcRenderer.invoke('msg', msg),
    onReplyMsg: (cb: (msg: string) => any) => ipcRenderer.on('reply-msg', (e, msg: string) => {
      cb(msg)
    }),
    getCommandLineCuit: (): Promise<string | null> => ipcRenderer.invoke('get-command-line-cuit'),
    getBackendPort: (): Promise<number> => ipcRenderer.invoke('get-backend-port'),
    shell: {
      openPath: (path: string): Promise<string> => ipcRenderer.invoke('shell-open-path', path),
    },
    dialog: {
      showOpenDialog: (options: any): Promise<any> => ipcRenderer.invoke('dialog-show-open', options),
    },
    store: {
      get: (key: string): Promise<any> => ipcRenderer.invoke('store-get', key),
      set: (key: string, value: any): Promise<void> => ipcRenderer.invoke('store-set', key, value),
    },
  },
)
