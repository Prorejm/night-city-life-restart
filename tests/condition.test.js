import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { parseCondition, evaluateCondition } from '../src/functions/condition.js';

describe('Condition Engine', () => {
  it('解析简单比较: STYLE>5', () => {
    const ast = parseCondition('STYLE>5');
    strictEqual(ast.type, 'compare');
    strictEqual(ast.prop, 'STYLE');
    strictEqual(ast.op, '>');
    strictEqual(ast.value, 5);
  });

  it('解析数组包含: TLT?[1001,1002]', () => {
    const ast = parseCondition('TLT?[1001,1002]');
    strictEqual(ast.type, 'compare');
    strictEqual(ast.prop, 'TLT');
    strictEqual(ast.op, '?');
    deepStrictEqual(ast.value, [1001, 1002]);
  });

  it('解析 AND 组合: STYLE>5&AGE>18', () => {
    const ast = parseCondition('STYLE>5&AGE>18');
    strictEqual(ast.type, 'and');
    strictEqual(ast.left.type, 'compare');
    strictEqual(ast.right.type, 'compare');
  });

  it('解析 OR 组合: HUMANITY<3|CHROME>10', () => {
    const ast = parseCondition('HUMANITY<3|CHROME>10');
    strictEqual(ast.type, 'or');
    strictEqual(ast.left.type, 'compare');
    strictEqual(ast.right.type, 'compare');
  });

  it('解析括号优先级: (STYLE>5&AGE>18)|HUMANITY<2', () => {
    const ast = parseCondition('(STYLE>5&AGE>18)|HUMANITY<2');
    strictEqual(ast.type, 'or');
    strictEqual(ast.left.type, 'and');
  });

  it('解析 NOT 前缀: !EVT?[11001]', () => {
    const ast = parseCondition('!EVT?[11001]');
    strictEqual(ast.type, 'not');
    strictEqual(ast.sub.type, 'compare');
  });

  it('求值: STYLE>5 为 true', () => {
    const ast = parseCondition('STYLE>5');
    strictEqual(evaluateCondition(ast, { STYLE: 6 }), true);
    strictEqual(evaluateCondition(ast, { STYLE: 5 }), false);
  });

  it('求值: TLT?[1001] 数组包含', () => {
    const ast = parseCondition('TLT?[1001]');
    strictEqual(evaluateCondition(ast, { TLT: [1001, 1002] }), true);
    strictEqual(evaluateCondition(ast, { TLT: [1002] }), false);
  });

  it('求值: GANG![1,2] 数组不包含', () => {
    const ast = parseCondition('GANG![1,2]');
    strictEqual(evaluateCondition(ast, { GANG: [3, 4] }), true);
    strictEqual(evaluateCondition(ast, { GANG: [1, 3] }), false);
  });

  it('求值: AND 组合', () => {
    const ast = parseCondition('STYLE>5&AGE>18');
    strictEqual(evaluateCondition(ast, { STYLE: 6, AGE: 20 }), true);
    strictEqual(evaluateCondition(ast, { STYLE: 4, AGE: 20 }), false);
    strictEqual(evaluateCondition(ast, { STYLE: 6, AGE: 16 }), false);
  });

  it('求值: OR 组合', () => {
    const ast = parseCondition('HUMANITY<3|CHROME>10');
    strictEqual(evaluateCondition(ast, { HUMANITY: 2, CHROME: 5 }), true);
    strictEqual(evaluateCondition(ast, { HUMANITY: 5, CHROME: 12 }), true);
    strictEqual(evaluateCondition(ast, { HUMANITY: 5, CHROME: 5 }), false);
  });

  it('求值: NOT 前缀', () => {
    const ast = parseCondition('!EVT?[11001]');
    strictEqual(evaluateCondition(ast, { EVT: [11002] }), true);
    strictEqual(evaluateCondition(ast, { EVT: [11001] }), false);
  });

  it('求值: 空条件返回 true', () => {
    strictEqual(evaluateCondition(null, { STYLE: 0 }), true);
    strictEqual(evaluateCondition(parseCondition(''), { STYLE: 0 }), true);
  });

  it('求值: TURN条件解析和求值', () => {
    const ast = parseCondition('TURN>5');
    strictEqual(ast.type, 'compare');
    strictEqual(ast.prop, 'TURN');
    strictEqual(ast.op, '>');
    strictEqual(evaluateCondition(ast, { TURN: 10 }), true);
    strictEqual(evaluateCondition(ast, { TURN: 3 }), false);
  });

  it('求值: TURN<36 条件', () => {
    const ast = parseCondition('TURN<36');
    strictEqual(evaluateCondition(ast, { TURN: 10 }), true);
    strictEqual(evaluateCondition(ast, { TURN: 40 }), false);
  });

  it('求值: TURN>5&MONTH=3 组合条件', () => {
    const ast = parseCondition('TURN>5&MONTH=3');
    strictEqual(evaluateCondition(ast, { TURN: 10, MONTH: 3 }), true);
    strictEqual(evaluateCondition(ast, { TURN: 3, MONTH: 3 }), false);
    strictEqual(evaluateCondition(ast, { TURN: 10, MONTH: 5 }), false);
  });

  it('求值: MONTH和PHASE条件', () => {
    const monthAst = parseCondition('MONTH>=6');
    strictEqual(evaluateCondition(monthAst, { MONTH: 6 }), true);
    strictEqual(evaluateCondition(monthAst, { MONTH: 3 }), false);

    const phaseAst = parseCondition('PHASE=0');
    strictEqual(evaluateCondition(phaseAst, { PHASE: 0 }), true);
    strictEqual(evaluateCondition(phaseAst, { PHASE: 1 }), false);
  });

  it('求值: 特殊属性 LEGENDARY_COUNT', () => {
    const ast = parseCondition('LEGENDARY_COUNT');
    strictEqual(ast.type, 'special');
    strictEqual(evaluateCondition(ast, {}, { legendaryCount: 3 }), true);
    strictEqual(evaluateCondition(ast, {}, { legendaryCount: 2 }), false);
  });
});
