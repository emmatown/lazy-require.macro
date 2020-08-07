// @ts-ignore
import { createMacro as _createMacro } from "babel-plugin-macros";
import * as Babel from "@babel/core";

type References = {
  [key: string]: Babel.NodePath[];
};

type Options = {
  configName?: string;
};

type MacroParams = {
  references: References;
  state: any;
  babel: typeof Babel;
};

type MacroHandler = (params: MacroParams) => void;

let createMacro: (
  handler: MacroHandler,
  options?: Options
) => void = _createMacro;

export default createMacro(({ babel, references, state }) => {
  let t = babel.types;
  let programPath = state.file.path as babel.NodePath<babel.types.Program>;
  let cache: Record<string, string> = {};
  const getIdentifierForModuleSpecifier = (moduleSpecifier: string) => {
    if (cache[moduleSpecifier] !== undefined) {
      return t.identifier(cache[moduleSpecifier]);
    }
    let name = programPath.scope.generateDeclaredUidIdentifier(
      `lazyRequire-${moduleSpecifier}`
    );
    cache[moduleSpecifier] = name.name;
    programPath.node.body.push(
      t.functionDeclaration(
        name,
        [],
        t.blockStatement([
          t.variableDeclaration("var", [
            t.variableDeclarator(
              t.identifier("mod"),
              t.callExpression(t.identifier("require"), [
                t.stringLiteral(moduleSpecifier),
              ])
            ),
          ]),
          t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.identifier(name.name),
              t.functionExpression(
                undefined,
                [],
                t.blockStatement([t.returnStatement(t.identifier("mod"))])
              )
            )
          ),
          t.returnStatement(t.identifier("mod")),
        ])
      )
    );
    return t.identifier(name.name);
  };
  if (references["lazyRequire"]) {
    references["lazyRequire"].forEach((reference) => {
      let parentNode = reference.parent;
      if (
        !t.isCallExpression(parentNode) ||
        reference.node !== parentNode.callee
      ) {
        throw reference.buildCodeFrameError(
          "lazyRequire must be called as a function"
        );
      }
      if (
        parentNode.typeParameters?.params.length !== 1 ||
        parentNode.typeParameters.params[0].type !== "TSTypeQuery" ||
        parentNode.typeParameters.params[0].exprName.type !== "TSImportType"
      ) {
        throw reference.buildCodeFrameError(
          "lazyRequire must have a single type parameter that looks like `typeof import ('...')`"
        );
      }
      if (parentNode.arguments.length) {
        throw reference.buildCodeFrameError(
          "lazyRequire must not have any runtime arguments"
        );
      }
      reference.replaceWith(
        getIdentifierForModuleSpecifier(
          parentNode.typeParameters.params[0].exprName.argument.value
        )
      );
    });
  }
});
