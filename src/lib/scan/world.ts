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

export async function openIsolatedWorld(page: Page): Promise<IsolatedWorld> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const { frameTree } = await cdp.send("Page.getFrameTree");
  const { executionContextId } = await cdp.send("Page.createIsolatedWorld", {
    frameId: frameTree.frame.id,
    worldName: WORLD_NAME,
    grantUniveralAccess: true,
  });

  const call = async (fn: unknown, arg?: unknown): Promise<unknown> =>
    unwrap(
      await cdp.send("Runtime.callFunctionOn", {
        functionDeclaration: typeof fn === "string" ? `() => (${fn})` : String(fn),
        executionContextId,
        arguments: arg === undefined ? [] : [{ value: arg }],
        awaitPromise: true,
        returnByValue: true,
      }),
    );

  return {
    evaluate: call as Page["evaluate"],
    addScript: async (path) => {
      const source = await readFile(path, "utf8");
      unwrap(
        await cdp.send("Runtime.evaluate", { expression: source, contextId: executionContextId }),
      );
    },
  };
}
