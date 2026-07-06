/**
 * 指数等级曲线系统
 *
 * 核心公式:
 *   - 第n级所需经验: baseExp * multiplier^(n-1)
 *   - 升到n级累计总经验: baseExp * (multiplier^(n-1) - 1) / (multiplier - 1)  [当multiplier ≠ 1]
 *
 * 示例 (baseExp=100, multiplier=2):
 *   1级→2级: 100
 *   2级→3级: 200
 *   3级→4级: 400
 *   累计到4级: 100+200+400 = 700
 */
export class LevelCurve {
  #baseExp;
  #multiplier;
  #maxLevel;
  #level;
  #exp; // 当前等级已积累的经验

  constructor(options = {}) {
    this.#baseExp = options.baseExp ?? 100;
    this.#multiplier = options.multiplier ?? 2;
    this.#maxLevel = options.maxLevel ?? 99;
    this.#level = 0;
    this.#exp = 0;
  }

  /**
   * 计算从第n级升到第n+1级所需的经验值（单级）
   * 例如: n=0 返回从0级升到1级所需经验 = baseExp
   */
  getExpRequiredForLevel(n) {
    if (n < 0) return 0;
    return this.#baseExp * Math.pow(this.#multiplier, n);
  }

  /**
   * 计算从0级升到n级所需的累计总经验
   */
  getTotalExpForLevel(n) {
    if (n <= 0) return 0;
    const m = this.#multiplier;
    const a = this.#baseExp;
    if (m === 1) return a * n;
    // 等比数列求和: a*(m^n - 1)/(m - 1)
    // 序列: a, a*m, a*m^2, ... a*m^(n-1) (共n项)
    return a * (Math.pow(m, n) - 1) / (m - 1);
  }

  /**
   * 添加经验值，自动处理升级
   * @returns {number} 实际升级的级数
   */
  addExp(amount) {
    if (amount <= 0) return 0;
    let levelsGained = 0;
    this.#exp += amount;

    while (this.#level < this.#maxLevel) {
      const required = this.getExpRequiredForLevel(this.#level);
      if (this.#exp >= required) {
        this.#exp -= required;
        this.#level++;
        levelsGained++;
      } else {
        break;
      }
    }

    // 如果已达最高级，溢出的经验保留但不升级
    return levelsGained;
  }

  /**
   * 直接设置等级（用于初始化或恢复）
   */
  setLevel(level, exp = 0) {
    this.#level = Math.min(level, this.#maxLevel);
    this.#exp = Math.max(0, exp);
  }

  getLevel() {
    return this.#level;
  }

  getExp() {
    return this.#exp;
  }

  getBaseExp() {
    return this.#baseExp;
  }

  getMultiplier() {
    return this.#multiplier;
  }

  getMaxLevel() {
    return this.#maxLevel;
  }

  /**
   * 升到下一级还需要多少经验
   */
  getExpToNextLevel() {
    if (this.#level >= this.#maxLevel) return 0;
    return this.getExpRequiredForLevel(this.#level) - this.#exp;
  }

  /**
   * 当前等级进度百分比 (0-100)
   */
  getProgressPercent() {
    if (this.#level >= this.#maxLevel) return 100;
    const required = this.getExpRequiredForLevel(this.#level);
    if (required <= 0) return 100;
    return Math.min(100, Math.floor((this.#exp / required) * 100));
  }

  /**
   * 序列化
   */
  serialize() {
    return {
      baseExp: this.#baseExp,
      multiplier: this.#multiplier,
      maxLevel: this.#maxLevel,
      level: this.#level,
      exp: this.#exp
    };
  }

  /**
   * 恢复状态
   */
  restore(data) {
    if (data.baseExp !== undefined) this.#baseExp = data.baseExp;
    if (data.multiplier !== undefined) this.#multiplier = data.multiplier;
    if (data.maxLevel !== undefined) this.#maxLevel = data.maxLevel;
    if (data.level !== undefined) this.#level = data.level;
    if (data.exp !== undefined) this.#exp = data.exp;
  }

  reset() {
    this.#level = 0;
    this.#exp = 0;
  }
}
