// 应用入口：注册路由并启动
import { route, startRouter } from './util/router.js';
import { home } from './views/home.js';
import { ground } from './views/ground.js';
import { codex } from './views/codex.js';
import { detail } from './views/detail.js';
import { tank } from './views/tank.js';

const app = document.getElementById('app');
let current = null; // 当前视图元素，用于切换前清理（如释放 Three.js 渲染器）

function mount(viewFn) {
  return (params) => {
    if (current && typeof current.__cleanup === 'function') {
      try { current.__cleanup(); } catch (_) {}
    }
    const view = viewFn(params);
    current = view;
    app.replaceChildren(view);
  };
}

route('/home', mount(home));
route('/ground/:id', mount(ground));
route('/codex', mount(codex));
route('/fish/:id', mount(detail));
route('/tank/:id', mount(tank));

startRouter();
