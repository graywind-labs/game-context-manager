import electron from 'electron';

const { contextBridge } = electron;
contextBridge.exposeInMainWorld('gameContextManager', {
  platform: process.platform
});
