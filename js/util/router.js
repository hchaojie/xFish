// 极简 hash 路由
// 路由格式：#/home  #/ground/:id  #/codex  #/fish/:id
// 注册路由 -> 监听 hashchange -> 匹配并调用对应 handler

const routes = [];

export function route(pattern, handler) {
  // pattern 例如 '/ground/:id'，编译成正则与参数名
  const names = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/:[^/]+/g, (m) => {
        names.push(m.slice(1));
        return '([^/]+)';
      }) +
      '$'
  );
  routes.push({ re, names, handler });
}

export function navigate(path) {
  if (location.hash === '#' + path) resolve();
  else location.hash = '#' + path;
}

function resolve() {
  const path = location.hash.replace(/^#/, '') || '/home';
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = {};
      r.names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])));
      r.handler(params);
      window.scrollTo(0, 0);
      return;
    }
  }
  // 兜底回首页
  navigate('/home');
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
