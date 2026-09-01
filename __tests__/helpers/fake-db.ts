import { vi, type Mock } from "vitest";

/**
 * Duplo de teste do cliente Drizzle.
 *
 * Reproduz só a superfície que as server actions usam: as consultas
 * relacionais (`db.query.<tabela>.findFirst/findMany`) e as escritas
 * encadeadas (`insert().values().returning()`, `update().set().where()`,
 * `delete().where()`), além de `transaction()`.
 *
 * Os mocks por tabela são criados sob demanda, então um teste só configura as
 * tabelas que lhe interessam.
 */

interface TableQueryMocks {
  findFirst: Mock;
  findMany: Mock;
}

const queryMocks: Record<string, TableQueryMocks> = {};

function tableQuery(table: string): TableQueryMocks {
  if (!queryMocks[table]) {
    queryMocks[table] = {
      findFirst: vi.fn().mockResolvedValue(undefined),
      findMany: vi.fn().mockResolvedValue([]),
    };
  }
  return queryMocks[table];
}

/** Mocks de consulta de uma tabela, para configurar retornos e inspecionar chamadas. */
export function queryFor(table: string): TableQueryMocks {
  return tableQuery(table);
}

const query = new Proxy(
  {},
  { get: (_target, table: string) => tableQuery(table) }
) as Record<string, TableQueryMocks>;

/**
 * Promise com `.returning()` e `.onConflictDoUpdate()/.onConflictDoNothing()`
 * acoplados, como a cadeia do Drizzle.
 */
function writeChain(returningValue: unknown[]) {
  const promise = Promise.resolve<unknown[]>([]) as Promise<unknown[]> & {
    returning: Mock;
    onConflictDoUpdate: Mock;
    onConflictDoNothing: Mock;
  };
  promise.returning = vi.fn().mockResolvedValue(returningValue);
  promise.onConflictDoUpdate = vi.fn(() => writeChain(returningValue));
  promise.onConflictDoNothing = vi.fn(() => writeChain(returningValue));
  return promise;
}

export const inserted: Array<{ table: unknown; values: unknown }> = [];
export const updated: Array<{ table: unknown; values: unknown }> = [];
export const deleted: Array<{ table: unknown }> = [];

/** Linhas devolvidas pelo `.returning()` do próximo insert em cada tabela. */
const returningQueue = new Map<unknown, unknown[][]>();

export function setReturning(table: unknown, ...rows: unknown[][]) {
  returningQueue.set(table, rows);
}

function nextReturning(table: unknown): unknown[] {
  const queue = returningQueue.get(table);
  if (!queue || queue.length === 0) return [];
  return queue.length === 1 ? queue[0] : (queue.shift() as unknown[]);
}

/** Erro lançado pela próxima escrita, para exercitar os caminhos de falha. */
let failNextWrite: Error | null = null;

export function failWrites(error = new Error("db failure")) {
  failNextWrite = error;
}

function guard() {
  if (failNextWrite) {
    const error = failNextWrite;
    failNextWrite = null;
    throw error;
  }
}

const writeApi = {
  insert: vi.fn((table: unknown) => ({
    values: vi.fn((values: unknown) => {
      guard();
      inserted.push({ table, values });
      return writeChain(nextReturning(table));
    }),
  })),

  update: vi.fn((table: unknown) => ({
    set: vi.fn((values: unknown) => ({
      where: vi.fn(() => {
        guard();
        updated.push({ table, values });
        return writeChain(nextReturning(table));
      }),
    })),
  })),

  delete: vi.fn((table: unknown) => ({
    where: vi.fn(async () => {
      guard();
      deleted.push({ table });
      return [];
    }),
  })),
};

export const transactionExecute = vi.fn().mockResolvedValue([]);

export const fakeDb = {
  query,
  ...writeApi,
  execute: vi.fn().mockResolvedValue([]),
  transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
    callback({ ...writeApi, query, execute: transactionExecute })
  ),
};

export function resetFakeDb() {
  inserted.length = 0;
  updated.length = 0;
  deleted.length = 0;
  returningQueue.clear();
  failNextWrite = null;

  for (const table of Object.keys(queryMocks)) {
    queryMocks[table].findFirst.mockReset().mockResolvedValue(undefined);
    queryMocks[table].findMany.mockReset().mockResolvedValue([]);
  }

  fakeDb.execute.mockClear();
  transactionExecute.mockClear();
  fakeDb.transaction.mockClear();
  writeApi.insert.mockClear();
  writeApi.update.mockClear();
  writeApi.delete.mockClear();
}
