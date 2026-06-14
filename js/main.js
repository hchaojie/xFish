// 应用入口：注册路由并启动
import { route, startRouter } from './util/router.js';
import { home } from './views/home.js';
import { ground } from './views/ground.js';
import { codex } from './views/codex.js';
import { detail } from './views/detail.js';

const app = document.getElementById('app');

function mount(viewFn) {
  return (params) => {
    const view = viewFn(params);
    app.replaceChildren(view);
  };
}

route('/home', mount(home));
route('/ground/:id', mount(ground));
route('/codex', mount(codex));
route('/fish/:id', mount(detail));

startRouter();
