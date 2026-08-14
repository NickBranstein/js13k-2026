// Compile-time flag injected by tools/build.mjs (esbuild `define`): true for
// devBuild(), false for the production bundle(). Anything gated behind it is
// dead-code-eliminated by terser in the production build, so it's free to use
// for dev/test-only tooling.
declare const __DEV__: boolean;
