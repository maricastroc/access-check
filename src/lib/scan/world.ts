import { readFile } from "fs/promises";
import type { CDPSession, Page } from "playwright-core";

export type DomWorld = Pick<Page, "evaluate">;

export type IsolatedWorld = DomWorld & {
  addScript(path: string): Promise<void>;
};

const WORLD_NAME = "accesscheck";

type Reply = {
  result: { value?: unknown };
  exceptionDetails?: { text: string; exception?: { description?: string } };
};

function unwrap({ result, exceptionDetails }: Reply): unknown {
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

const WORLD_GONE_MESSAGE = "Target page, context or browser has been closed";

function whenGone(page: Page): Promise<never> {
  const browser = page.context().browser();
  const gone = new Promise<never>((_, reject) => {
    const fail = () => {
      page.off("close", fail);
      page.off("crash", fail);
      browser?.off("disconnected", fail);
      reject(new Error(WORLD_GONE_MESSAGE));
    };
    page.once("close", fail);
    page.once("crash", fail);
    browser?.once("disconnected", fail);
  });
  gone.catch(() => undefined);
  return gone;
}

export async function openIsolatedWorld(page: Page): Promise<IsolatedWorld> {
  const gone = whenGone(page);
  const alive = <T>(work: Promise<T>): Promise<T> => Promise.race([work, gone]);

  const cdp: CDPSession = await alive(page.context().newCDPSession(page));
  const { frameTree } = await alive(cdp.send("Page.getFrameTree"));
  const { executionContextId } = await alive(
    cdp.send("Page.createIsolatedWorld", {
      frameId: frameTree.frame.id,
      worldName: WORLD_NAME,
      grantUniveralAccess: true,
    }),
  );

  const call = async (fn: unknown, arg?: unknown): Promise<unknown> =>
    unwrap(
      await alive(
        cdp.send("Runtime.callFunctionOn", {
          functionDeclaration: typeof fn === "string" ? `() => (${fn})` : String(fn),
          executionContextId,
          arguments: arg === undefined ? [] : [{ value: arg }],
          awaitPromise: true,
          returnByValue: true,
        }),
      ),
    );

  return {
    evaluate: call as Page["evaluate"],
    addScript: async (path) => {
      const source = await readFile(path, "utf8");
      unwrap(
        await alive(
          cdp.send("Runtime.evaluate", { expression: source, contextId: executionContextId }),
        ),
      );
    },
  };
}
