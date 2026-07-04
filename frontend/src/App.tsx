import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { RoleRedirect } from './pages/RoleRedirect'
import { BookingPage } from './pages/customer/BookingPage'
import { FrontDeskPage } from './pages/staff/FrontDeskPage'
import { AllBookingsPage } from './pages/staff/AllBookingsPage'
import { FleetPage } from './pages/staff/FleetPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { StaffManagementPage } from './pages/admin/StaffManagementPage'
import { LandingPage } from './pages/LandingPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* App layout wrapper */}
          <Route element={<AppShell />}>
            {/* Publicly accessible routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/book" element={<BookingPage />} />

            {/* Authenticated user routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/redirect" element={<RoleRedirect />} />

              {/* Staff actions */}
              <Route element={<ProtectedRoute roles={['staff', 'admin']} />}>
                <Route path="/desk" element={<FrontDeskPage />} />
                <Route path="/fleet" element={<FleetPage />} />
                <Route path="/bookings" element={<AllBookingsPage />} />
              </Route>

              {/* Admin actions */}
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/staff" element={<StaffManagementPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
