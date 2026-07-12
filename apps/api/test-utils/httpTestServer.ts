import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

export type TestHttpApp = {
  listen(port: number, hostname: string, callback: () => void): Server;
};

export async function request(
  app: TestHttpApp,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const server = await listen(app);

  try {
    const address = server.address();

    if (!isAddressInfo(address)) {
      throw new Error("Test server did not expose a TCP address.");
    }

    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await close(server);
  }
}

function listen(app: TestHttpApp): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));

    server.once("error", reject);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function isAddressInfo(
  value: string | AddressInfo | null,
): value is AddressInfo {
  return typeof value === "object" && value !== null;
}
