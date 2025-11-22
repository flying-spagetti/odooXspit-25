export type Route = {
  path: string;
  component: () => HTMLElement;
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

  private handleRoute() {
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
    this.render();
  }

  private render() {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app || !this.currentRoute) return;

    app.innerHTML = '';
    app.appendChild(this.currentRoute.component());
  }

  getCurrentPath(): string {
    return window.location.pathname;
  }
}

export const router = new Router();

