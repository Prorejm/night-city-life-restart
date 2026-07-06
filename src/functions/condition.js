// 条件表达式引擎 - 赛博朋克版
// 属性名: STYLE(街头声望), TECH(技术), CHROME(义体), EDDIES(欧元), HUMANITY(人性), LIFE(生命)
//         AGE(年龄), TLT(天赋ID列表), EVT(事件ID列表)
// 比较符: >, <, >=, <=, =, !=, ?(包含), !(不包含)
// 组合: & (AND), | (OR), ! (NOT前缀)

export const PROPERTY_TYPES = {
  STYLE: 'STYLE',
  TECH: 'TECH',
  CHROME: 'CHROME',
  EDDIES: 'EDDIES',
  HUMANITY: 'HUMANITY',
  LIFE: 'LIFE',
  AGE: 'AGE',
  TLT: 'TLT',
  EVT: 'EVT',
  GANG: 'GANG',
  CORP: 'CORP',
  DIST: 'DIST',
  TURN: 'TURN',
  MONTH: 'MONTH',
  PHASE: 'PHASE',
  // 特殊成就检查条件
  LEGENDARY_COUNT: 'LEGENDARY_COUNT',
  COLLECT_ALL_WEAPONS: 'COLLECT_ALL_WEAPONS',
  COLLECT_ALL_CYBER: 'COLLECT_ALL_CYBER'
};

// 解析条件表达式为AST
export function parseCondition(expr) {
  if (!expr || typeof expr !== 'string') return null;
  return parseOr(expr.trim(), 0).result;
}

function parseOr(str, pos) {
  let left = parseAnd(str, pos);
  while (left.result && left.pos < str.length) {
    const { result: op, pos: newPos } = parseChar(str, left.pos);
    if (op === '|') {
      const right = parseAnd(str, newPos);
      if (!right.result) break;
      left = {
        result: { type: 'or', left: left.result, right: right.result },
        pos: right.pos
      };
    } else {
      break;
    }
  }
  return left;
}

function parseAnd(str, pos) {
  let left = parsePrimary(str, pos);
  while (left.result && left.pos < str.length) {
    const { result: op, pos: newPos } = parseChar(str, left.pos);
    if (op === '&') {
      const right = parsePrimary(str, newPos);
      if (!right.result) break;
      left = {
        result: { type: 'and', left: left.result, right: right.result },
        pos: right.pos
      };
    } else {
      break;
    }
  }
  return left;
}

function parsePrimary(str, pos) {
  skipSpace(str, pos);
  if (pos >= str.length) return { result: null, pos };

  // 括号表达式
  if (str[pos] === '(') {
    pos++;
    const expr = parseOr(str, pos);
    if (!expr.result) return { result: null, pos };
    pos = skipSpace(str, expr.pos);
    if (pos < str.length && str[pos] === ')') {
      pos++;
      return { result: expr.result, pos };
    }
    return { result: null, pos };
  }

  // NOT前缀
  if (str[pos] === '!') {
    pos++;
    const sub = parsePrimary(str, pos);
    if (!sub.result) return { result: null, pos };
    return { result: { type: 'not', sub: sub.result }, pos: sub.pos };
  }

  // 简单属性条件: 属性名 比较符 值
  return parseSimpleCondition(str, pos);
}

function parseSimpleCondition(str, pos) {
  pos = skipSpace(str, pos);
  const propMatch = str.slice(pos).match(/^[A-Z_]+/);
  if (!propMatch) return { result: null, pos };
  const propName = propMatch[0];
  pos += propName.length;
  pos = skipSpace(str, pos);

  // 特殊属性（无比较符）
  const SPECIAL_PROPS = ['LEGENDARY_COUNT', 'COLLECT_ALL_WEAPONS', 'COLLECT_ALL_CYBER', 'VEHICLE_COUNT', 'COLLECT_JOHNNY', 'COLLECT_ALL_RECIPES', 'COLLECT_5_RECIPES', 'COLLECT_5_LEGENDARY', 'DRUG_COUNT', 'TRAUMA_COUNT', 'TAROT_COUNT', 'WEAPON_COUNT', 'TOTAL_EDDIES', 'GANG_COUNT', 'CORP_COUNT'];
  if (SPECIAL_PROPS.includes(propName)) {
    return {
      result: { type: 'special', prop: propName },
      pos
    };
  }

  const opMatch = str.slice(pos).match(/^(>=|<=|!=|[><=?!])/);
  if (!opMatch) return { result: null, pos };
  const op = opMatch[0];
  pos += op.length;
  pos = skipSpace(str, pos);

  // 值可以是数字或数组 [n1,n2,...]
  if (str[pos] === '[') {
    pos++;
    const values = [];
    let numStr = '';
    while (pos < str.length && str[pos] !== ']') {
      if (str[pos] === ',') {
        if (numStr) { values.push(Number(numStr)); numStr = ''; }
        pos++;
      } else if (/\d/.test(str[pos])) {
        numStr += str[pos];
        pos++;
      } else {
        pos++;
      }
    }
    if (numStr) values.push(Number(numStr));
    if (pos < str.length) pos++; // skip ]
    return {
      result: { type: 'compare', prop: propName, op, value: values },
      pos
    };
  }

  // 纯数字
  const numMatch = str.slice(pos).match(/^\d+/);
  if (numMatch) {
    const value = Number(numMatch[0]);
    pos += numMatch[0].length;
    return {
      result: { type: 'compare', prop: propName, op, value },
      pos
    };
  }

  return { result: null, pos };
}

function parseChar(str, pos) {
  pos = skipSpace(str, pos);
  if (pos < str.length && (str[pos] === '&' || str[pos] === '|')) {
    return { result: str[pos], pos: pos + 1 };
  }
  return { result: null, pos };
}

function skipSpace(str, pos) {
  while (pos < str.length && /\s/.test(str[pos])) pos++;
  return pos;
}

// 求值条件表达式
export function evaluateCondition(parsed, propertyState, extraState = {}) {
  if (!parsed) return true;
  
  switch (parsed.type) {
    case 'and':
      return evaluateCondition(parsed.left, propertyState, extraState) &&
             evaluateCondition(parsed.right, propertyState, extraState);
    case 'or':
      return evaluateCondition(parsed.left, propertyState, extraState) ||
             evaluateCondition(parsed.right, propertyState, extraState);
    case 'not':
      return !evaluateCondition(parsed.sub, propertyState, extraState);
    case 'compare': {
      const propValue = getPropertyValue(parsed.prop, propertyState, extraState);
      const val = parsed.value;
      switch (parsed.op) {
        case '>': return propValue > val;
        case '<': return propValue < val;
        case '>=': return propValue >= val;
        case '<=': return propValue <= val;
        case '=':
        case '==': return Array.isArray(val) ? val.includes(propValue) : propValue === val;
        case '!=': return Array.isArray(val) ? !val.includes(propValue) : propValue !== val;
        case '?': return Array.isArray(val) ? val.some(v => propValue.includes(v)) : propValue.includes(val);
        case '!': return Array.isArray(val) ? !val.some(v => propValue.includes(v)) : !propValue.includes(val);
        default: return true;
      }
    }
    case 'special': {
      switch (parsed.prop) {
        case 'LEGENDARY_COUNT':
          return (extraState.legendaryCount || 0) >= 3;
        case 'COLLECT_ALL_WEAPONS':
          return (extraState.legendaryWeapons || []).length >= 12;
        case 'COLLECT_ALL_CYBER':
          return (extraState.legendaryCyberware || []).length >= 12;
        case 'VEHICLE_COUNT':
          return (extraState.vehicleCount || 0) >= 5;
        case 'COLLECT_JOHNNY':
          return (extraState.collectedJohnnyItems || 0) >= 3;
        case 'COLLECT_ALL_RECIPES':
          return (extraState.unlockedRecipeCount || 0) >= 8;
        case 'COLLECT_5_RECIPES':
          return (extraState.unlockedRecipeCount || 0) >= 5;
        case 'COLLECT_5_LEGENDARY':
          return (extraState.legendaryCount || 0) >= 5;
        case 'DRUG_COUNT':
          return (extraState.drugCount || 0) >= 20;
        case 'TRAUMA_COUNT':
          return (extraState.traumaCount || 0) >= 3;
        case 'TAROT_COUNT':
          return (extraState.tarotCount || 0) >= 10;
        case 'WEAPON_COUNT':
          return (extraState.weaponCount || 0) >= 10;
        case 'TOTAL_EDDIES':
          return (extraState.totalEddies || 0) >= 1000;
        case 'GANG_COUNT':
          return (extraState.gangCount || 0) >= 5;
        case 'CORP_COUNT':
          return (extraState.corpCount || 0) >= 5;
        default:
          return true;
      }
    }
    default:
      return true;
  }
}

function getPropertyValue(propName, propertyState, extraState) {
  // 检查数字属性
  if (typeof propertyState[propName] === 'number') {
    return propertyState[propName];
  }
  // 检查数组属性
  if (Array.isArray(propertyState[propName])) {
    return propertyState[propName];
  }
  return 0;
}
