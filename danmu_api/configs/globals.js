import { Envs } from './envs.js';

/**
 * 全局变量管理模块
 * 集中管理项目中的静态常量和运行时共享变量
 * ⚠️不是持久化存储，每次冷启动会丢失
 */
export const Globals = {
  // 缓存环境变量
  envs: {},
  accessedEnvVars: {},

  // 静态常量
  VERSION: '1.5.0',
  MAX_LOGS: 500, // 日志存储，最多保存 500 行
  MAX_ANIMES: 100,
  MAX_LAST_SELECT_MAP: 100,

  // 运行时状态
  animes: [],
  episodeIds: [],
  episodeNum: 10001, // 全局变量，用于自增 ID
  logBuffer: [],
  requestHistory: new Map(), // 记录每个 IP 地址的请求历史
  redisValid: false, // redis是否生效
  redisCacheInitialized: false, // redis 缓存是否已初始化
  lastSelectMap: new Map(), // 存储查询关键字上次选择的animeId，用于下次match自动匹配时优先选择该anime
  lastHashes: { // 存储上一次各变量哈希值
    animes: null,
    episodeIds: null,
    episodeNum: null,
    lastSelectMap: null
  },
  searchCache: new Map(), // 搜索结果缓存，存储格式：{ keyword: { results, timestamp } }
  commentCache: new Map(), // 弹幕缓存，存储格式：{ videoUrl: { comments, timestamp } }

  /**
   * 初始化全局变量，加载环境变量依赖
   * @param {Object} env 环境对象
   * @param {string} deployPlatform 部署平台
   * @returns {Object} 全局配置对象
   */
  init(env = {}, deployPlatform = 'node') {
    this.envs = Envs.load(env, deployPlatform);
    this.accessedEnvVars = Object.fromEntries(Envs.getAccessedEnvVars());
    return this.getConfig();
  },

  /**
   * 获取全局配置快照
   * @returns {Object} 当前全局配置
   */
  /**
   * 获取全局配置对象（单例，可修改）
   * @returns {Object} 全局配置对象本身
   */
  getConfig() {
    // 使用 Proxy 保持接口兼容性
    const self = this;
    return new Proxy({}, {
      get(target, prop) {
        // 优先返回 envs 中的属性（保持原有的平铺效果）
        if (prop in self.envs) {
          return self.envs[prop];
        }
        // 映射大写常量到小写
        if (prop === 'version') return self.VERSION;
        if (prop === 'maxLogs') return self.MAX_LOGS;
        if (prop === 'maxAnimes') return self.MAX_ANIMES;
        if (prop === 'maxLastSelectMap') return self.MAX_LAST_SELECT_MAP;

        // 其他属性直接返回
        return self[prop];
      },
      set(target, prop, value) {
        // 写操作同步到 Globals
        if (prop in self.envs) {
          self.envs[prop] = value;
        } else {
          self[prop] = value;
        }
        return true;
      }
    });
  },
};

/**
 * 全局配置代理对象
 * 自动转发所有属性访问到 Globals.getConfig()
 * 使用示例：
 *   import { globals } from './globals.js';
 *   console.log(globals.version);  // 直接访问，无需调用 getConfig()
 */
export const globals = new Proxy({}, {
  get(target, prop) {
    return Globals.getConfig()[prop];
  },
  set(target, prop, value) {
    Globals.getConfig()[prop] = value;
    return true;
  },
  has(target, prop) {
    return prop in Globals.getConfig();
  },
  ownKeys(target) {
    return Reflect.ownKeys(Globals.getConfig());
  },
  getOwnPropertyDescriptor(target, prop) {
    return Object.getOwnPropertyDescriptor(Globals.getConfig(), prop);
  }
});