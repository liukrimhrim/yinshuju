// 本机字体库：上传的字体存 IndexedDB（localStorage 放不下 ArrayBuffer），
// 只留在这台机器的浏览器里——不进仓库、不随站点分发，故授权受限的字体也能用。

const DB = 'yinshuju-fonts';
const STORE = 'fonts';

export interface StoredFont {
  id: string; // 时间戳+名，供选中与删除
  name: string; // 显示名（文件名去扩展名）
  data: ArrayBuffer;
}

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((res, rej) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  } finally {
    db.close();
  }
}

export const putFont = (f: StoredFont): Promise<IDBValidKey> =>
  tx('readwrite', (s) => s.put(f));

export const getFont = (id: string): Promise<StoredFont | undefined> =>
  tx('readonly', (s) => s.get(id) as IDBRequest<StoredFont | undefined>);

export const deleteFont = (id: string): Promise<undefined> =>
  tx('readwrite', (s) => s.delete(id));

/** 只取目录（id+name），不搬字体数据——列表用 */
export async function listFonts(): Promise<{ id: string; name: string }[]> {
  const all = await tx(
    'readonly',
    (s) => s.getAll() as IDBRequest<StoredFont[]>,
  );
  return all.map(({ id, name }) => ({ id, name }));
}
