import { transform } from "@babel/core";

test("it works", () => {
  expect(
    transform(
      `import { lazyRequire } from './test/macro';
      
lazyRequire<typeof import('thing')>()
`,
      {
        filename: __filename,
        plugins: ["babel-plugin-macros"],
        presets: ["@babel/preset-typescript"],
      }
    )!.code
  ).toMatchInlineSnapshot(`
    "\\"use strict\\";

    _lazyRequireThing();

    function _lazyRequireThing() {
      var mod = require(\\"thing\\");

      _lazyRequireThing = function _lazyRequireThing() {
        return mod;
      };

      return mod;
    }"
  `);
});
