const FBX_WARNING_PATTERNS = [
  'THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex.',
  'THREE.FBXLoader: unknown material type',
  'THREE.FBXLoader: %s map is not supported in three.js, skipping texture.',
] as const;

let filterDepth = 0;
let originalConsoleWarn: typeof console.warn | null = null;

function shouldSuppressFbxWarning(args: unknown[]): boolean {
  if (args.length === 0) {
    return false;
  }

  const firstArg = args[0];
  if (typeof firstArg !== 'string' || !firstArg.startsWith('THREE.FBXLoader:')) {
    return false;
  }

  return FBX_WARNING_PATTERNS.some((pattern) => firstArg.includes(pattern));
}

function enableFbxWarningFilter(): void {
  if (originalConsoleWarn) {
    return;
  }

  originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (shouldSuppressFbxWarning(args)) {
      return;
    }
    originalConsoleWarn?.(...args);
  };
}

function disableFbxWarningFilter(): void {
  if (!originalConsoleWarn) {
    return;
  }

  console.warn = originalConsoleWarn;
  originalConsoleWarn = null;
}

export async function withFbxWarningFilter<T>(run: () => Promise<T>): Promise<T> {
  if (filterDepth === 0) {
    enableFbxWarningFilter();
  }
  filterDepth += 1;

  try {
    return await run();
  } finally {
    filterDepth = Math.max(0, filterDepth - 1);
    if (filterDepth === 0) {
      disableFbxWarningFilter();
    }
  }
}
