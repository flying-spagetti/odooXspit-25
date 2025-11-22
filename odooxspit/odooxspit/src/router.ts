export type Route = {
  path: string;
  component: () => HTMLElement | Promise<HTMLElement>;
  requiresAuth?: boolean;
};

class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private isAuthenticated: boolean = false;

  constructor() {
    window.addEventListener('popstate', () => this.handleRoute());
    this.handleRoute();
  }

  setAuthState(isAuthenticated: boolean) {
    this.isAuthenticated = isAuthenticated;
  }

  addRoute(route: Route) {
    this.routes.push(route);
  }

  navigate(path: string) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  private async handleRoute() {
    const path = window.location.pathname;
    const route = this.routes.find((r) => r.path === path) || this.routes.find((r) => r.path === '/');

    if (!route) {
      console.error('Route not found:', path);
      return;
    }

    if (route.requiresAuth && !this.isAuthenticated) {
      this.navigate('/login');
      return;
    }

    this.currentRoute = route;
    await this.render();
  }

  private async render() {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app || !this.currentRoute) return;

    try {
      app.innerHTML = '';
      const component = this.currentRoute.component();
      const element = component instanceof Promise ? await component : component;
      app.appendChild(element);
    } catch (error) {
      console.error('Error rendering component:', error);
      app.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h1>Error Loading Page</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.location.reload()" class="btn btn-primary">Reload</button>
        </div>
      `;
    }
  }

  getCurrentPath(): string {
    return window.location.pathname;
  }
}

export const router = new Router();

