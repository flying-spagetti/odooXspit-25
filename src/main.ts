import './style.css'
import { router } from './router'
<<<<<<< HEAD
import { store } from './store/api-store'
=======
import { store } from './store'
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
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
<<<<<<< HEAD
import { StockComponent } from './components/Stock'
=======
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d

// Check if user is authenticated
const currentUser = store.getCurrentUser()
router.setAuthState(!!currentUser)

// Register routes
router.addRoute({ path: '/login', component: LoginComponent })
router.addRoute({ path: '/signup', component: SignupComponent })
router.addRoute({ path: '/forgot-password', component: ForgotPasswordComponent })
router.addRoute({ path: '/dashboard', component: DashboardComponent, requiresAuth: true })
router.addRoute({ path: '/products', component: ProductsComponent, requiresAuth: true })
<<<<<<< HEAD
router.addRoute({ path: '/stock', component: StockComponent, requiresAuth: true })
=======
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
router.addRoute({ path: '/receipts', component: ReceiptsComponent, requiresAuth: true })
router.addRoute({ path: '/deliveries', component: DeliveriesComponent, requiresAuth: true })
router.addRoute({ path: '/transfers', component: TransfersComponent, requiresAuth: true })
router.addRoute({ path: '/adjustments', component: AdjustmentsComponent, requiresAuth: true })
router.addRoute({ path: '/history', component: HistoryComponent, requiresAuth: true })
router.addRoute({ path: '/settings', component: SettingsComponent, requiresAuth: true })
router.addRoute({ path: '/profile', component: ProfileComponent, requiresAuth: true })

// Default route
<<<<<<< HEAD
router.addRoute({ path: '/', component: async () => {
  if (currentUser) {
    return await DashboardComponent()
=======
router.addRoute({ path: '/', component: () => {
  if (currentUser) {
    return DashboardComponent()
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
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
