/* ============================================================
   router.js — Simple hash router for the SPA views
   ============================================================ */

const Router = {
  routes: {},
  current: null,

  register(name, renderFn) {
    this.routes[name] = renderFn;
  },

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  resolve() {
    const session = Storage.getSession();
    let hash = (window.location.hash || '#dashboard').replace('#', '');
    if (!session && hash !== 'login') {
      window.location.hash = '#login';
      hash = 'login';
    }
    if (session && hash === 'login') {
      window.location.hash = '#dashboard';
      hash = 'dashboard';
    }
    if (!this.routes[hash]) hash = session ? 'dashboard' : 'login';
    this.navigate(hash, false);
  },

  navigate(name, updateHash = true) {
    if (!this.routes[name]) return;
    this.current = name;
    if (updateHash) window.location.hash = '#' + name;

    document.querySelectorAll('.app-shell').forEach(el => {
      el.style.display = name === 'login' ? 'none' : '';
    });
    document.getElementById('loginView').style.display = name === 'login' ? 'flex' : 'none';

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === name);
    });

    const main = document.getElementById('mainContent');
    main.classList.remove('view-enter');
    void main.offsetWidth; // reflow to restart animation
    this.routes[name]();
    main.classList.add('view-enter');

    // Close mobile sidebar after navigation
    document.getElementById('sidebar')?.classList.remove('open');
  }
};

window.Router = Router;
