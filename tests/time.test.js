import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';

/**
 * TURN -> AGE / MONTH / PHASE 数学映射
 * AGE = Math.ceil(TURN / 36)（TURN=0 时为 0）
 * MONTH = Math.floor((TURN % 36) / 3) + 1
 * PHASE = TURN % 3（0=上旬, 1=中旬, 2=下旬）
 */

function turnToAge(turn) {
  return turn === 0 ? 0 : Math.floor(turn / 36) + 1;
}

function turnToMonth(turn) {
  return Math.floor((turn % 36) / 3) + 1;
}

function turnToPhase(turn) {
  return turn % 3;
}

export { turnToAge, turnToMonth, turnToPhase };

describe('TURN -> AGE/MONTH/PHASE 数学映射', () => {
  it('TURN=0 -> AGE=0, MONTH=1, PHASE=0', () => {
    strictEqual(turnToAge(0), 0);
    strictEqual(turnToMonth(0), 1);
    strictEqual(turnToPhase(0), 0);
  });

  it('TURN=1 -> AGE=1, MONTH=1, PHASE=1', () => {
    strictEqual(turnToAge(1), 1);
    strictEqual(turnToMonth(1), 1);
    strictEqual(turnToPhase(1), 1);
  });

  it('TURN=35 -> AGE=1, MONTH=12, PHASE=2', () => {
    strictEqual(turnToAge(35), 1);
    strictEqual(turnToMonth(35), 12);
    strictEqual(turnToPhase(35), 2);
  });

  it('TURN=36 -> AGE=2, MONTH=1, PHASE=0', () => {
    strictEqual(turnToAge(36), 2);
    strictEqual(turnToMonth(36), 1);
    strictEqual(turnToPhase(36), 0);
  });

  it('TURN=37 -> AGE=2, MONTH=1, PHASE=1', () => {
    strictEqual(turnToAge(37), 2);
    strictEqual(turnToMonth(37), 1);
    strictEqual(turnToPhase(37), 1);
  });

  it('TURN=2 -> AGE=1, MONTH=1, PHASE=2', () => {
    strictEqual(turnToAge(2), 1);
    strictEqual(turnToMonth(2), 1);
    strictEqual(turnToPhase(2), 2);
  });

  it('TURN=3 -> AGE=1, MONTH=2, PHASE=0', () => {
    strictEqual(turnToAge(3), 1);
    strictEqual(turnToMonth(3), 2);
    strictEqual(turnToPhase(3), 0);
  });

  it('TURN=72 -> AGE=3, MONTH=1, PHASE=0', () => {
    strictEqual(turnToAge(72), 3);
    strictEqual(turnToMonth(72), 1);
    strictEqual(turnToPhase(72), 0);
  });

  it('TURN=108 -> AGE=4, MONTH=1, PHASE=0', () => {
    strictEqual(turnToAge(108), 4);
    strictEqual(turnToMonth(108), 1);
    strictEqual(turnToPhase(108), 0);
  });

  it('MONTH范围始终为1-12', () => {
    for (let turn = 0; turn <= 200; turn++) {
      const month = turnToMonth(turn);
      ok(month >= 1 && month <= 12, `TURN=${turn} -> MONTH=${month} 不在1-12范围内`);
    }
  });

  it('PHASE范围始终为0-2', () => {
    for (let turn = 0; turn <= 200; turn++) {
      const phase = turnToPhase(turn);
      ok(phase >= 0 && phase <= 2, `TURN=${turn} -> PHASE=${phase} 不在0-2范围内`);
    }
  });
});
