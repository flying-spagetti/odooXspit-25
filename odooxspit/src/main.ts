import './style.css'
<<<<<<< HEAD
import { router } from './router'
import { store } from './store/api-store'
import { LoginComponent } from './components/Auth/Login'
import { SignupComponent } from './components/Auth/Signup'
import { ForgotPasswordComponent } from './components/Auth/ForgotPassword'
import { DashboardComponent } from './components/Dashboard'
import { ProductsComponent } from './components/Products'
import { ReceiptsComponent } from './components/Receipts'
import { DeliveriesComponent } from './components/Deliveries'
import { TransfersComponent } from './components/Transfers'
import { AdjustmentsComponent } from './components/Adjustments'
import { HistoryComponent } from './components/History'
import { SettingsComponent } from './components/Settings'
import { ProfileComponent } from './components/Profile'
import { StockComponent } from './components/Stock'

// Check if user is authenticated
const currentUser = store.getCurrentUser()
router.setAuthState(!!currentUser)

// Register routes
router.addRoute({ path: '/login', component: LoginComponent })
router.addRoute({ path: '/signup', component: SignupComponent })
router.addRoute({ path: '/forgot-password', component: ForgotPasswordComponent })
router.addRoute({ path: '/dashboard', component: DashboardComponent, requiresAuth: true })
router.addRoute({ path: '/products', component: ProductsComponent, requiresAuth: true })
router.addRoute({ path: '/stock', component: StockComponent, requiresAuth: true })
router.addRoute({ path: '/receipts', component: ReceiptsComponent, requiresAuth: true })
router.addRoute({ path: '/deliveries', component: DeliveriesComponent, requiresAuth: true })
router.addRoute({ path: '/transfers', component: TransfersComponent, requiresAuth: true })
router.addRoute({ path: '/adjustments', component: AdjustmentsComponent, requiresAuth: true })
router.addRoute({ path: '/history', component: HistoryComponent, requiresAuth: true })
router.addRoute({ path: '/settings', component: SettingsComponent, requiresAuth: true })
router.addRoute({ path: '/profile', component: ProfileComponent, requiresAuth: true })

// Default route
router.addRoute({ path: '/', component: async () => {
  if (currentUser) {
    return await DashboardComponent()
  } else {
    return LoginComponent()
  }
}})

// Initialize router
const path = window.location.pathname
if (path === '/' || path === '') {
  router.navigate(currentUser ? '/dashboard' : '/login')
} else {
  router.navigate(path)
}
=======
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './App.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
>>>>>>> af18c82 (Initial commit)
