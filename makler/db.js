// Minimaler IndexedDB-Wrapper. Stores: cases (Vorgänge), files (Dateien als Blob, Index caseId).
const NAME = 'makler', VERSION = 1;
let conn;

function open() {
  return conn ??= new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('cases')) d.createObjectStore('cases', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' }).createIndex('caseId', 'caseId');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function run(store, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  });
}

export const db = {
  all: store => run(store, 'readonly', s => s.getAll()),
  get: (store, id) => run(store, 'readonly', s => s.get(id)),
  put: (store, v) => run(store, 'readwrite', s => s.put(v)),
  del: (store, id) => run(store, 'readwrite', s => s.delete(id)),
  filesOf: caseId => run('files', 'readonly', s => s.index('caseId').getAll(caseId)),
};
