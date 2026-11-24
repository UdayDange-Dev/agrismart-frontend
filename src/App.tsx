import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireCustomer } from './components/RequireCustomer';
import { Loading } from './components/Status';
import { AccountAddressesPage } from './pages/account/AccountAddressesPage';
import { AccountInquiriesPage } from './pages/account/AccountInquiriesPage';
import { AccountOrdersPage } from './pages/account/AccountOrdersPage';
import { AccountPage } from './pages/account/AccountPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './pages/account/RecoveryPages';
import { SignInPage } from './pages/account/SignInPage';
import { SignUpPage } from './pages/account/SignUpPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderStatusPage } from './pages/OrderStatusPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { SolutionDetailPage, SolutionsPage } from './pages/SolutionsPage';

// The back office is a separate chunk so storefront visitors never download it.
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:itemCode" element={<ProductDetailPage />} />
        <Route path="solutions" element={<SolutionsPage />} />
        <Route path="solutions/:id" element={<SolutionDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders/:reference" element={<OrderStatusPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route
          path="account"
          element={
            <RequireCustomer>
              <AccountPage />
            </RequireCustomer>
          }
        />
        <Route
          path="account/orders"
          element={
            <RequireCustomer>
              <AccountOrdersPage />
            </RequireCustomer>
          }
        />
        <Route
          path="account/inquiries"
          element={
            <RequireCustomer>
              <AccountInquiriesPage />
            </RequireCustomer>
          }
        />
        <Route
          path="account/addresses"
          element={
            <RequireCustomer>
              <AccountAddressesPage />
            </RequireCustomer>
          }
        />
        <Route
          path="admin"
          element={
            <Suspense fallback={<Loading />}>
              <AdminPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
