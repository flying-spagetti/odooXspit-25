import './style.css'


// Check if user is authenticated
const currentUser = store.getCurrentUser()
router.setAuthState(!!currentUser)

// Register routes
router.addRoute({ path: '/login', component: LoginComponent })
router.addRoute({ path: '/signup', component: SignupComponent })
router.addRoute({ path: '/forgot-password', component: ForgotPasswordComponent })
router.addRoute({ path: '/dashboard', component: DashboardComponent, requiresAuth: true })
router.addRoute({ path: '/products', component: ProductsComponent, requiresAuth: true })
router.addRoute({ path: '/receipts', component: ReceiptsComponent, requiresAuth: true })
router.addRoute({ path: '/deliveries', component: DeliveriesComponent, requiresAuth: true })
router.addRoute({ path: '/transfers', component: TransfersComponent, requiresAuth: true })
router.addRoute({ path: '/adjustments', component: AdjustmentsComponent, requiresAuth: true })
router.addRoute({ path: '/history', component: HistoryComponent, requiresAuth: true })
router.addRoute({ path: '/settings', component: SettingsComponent, requiresAuth: true })
router.addRoute({ path: '/profile', component: ProfileComponent, requiresAuth: true })

// Default route
router.addRoute({ path: '/', component: () => {
  if (currentUser) {
    return DashboardComponent()
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
