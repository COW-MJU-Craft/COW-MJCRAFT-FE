import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout';
import MainPage from './pages/site/home/MainPage';
import FloatingSns from './components/social/FloatingSns';
import GoogleAnalytics from './components/analytics/GoogleAnalytics';
import { ApplicationRouteMetadata } from './components/seo/RouteMetadata';
import DeploymentVersion from './components/layout/DeploymentVersion';
import PageFallback from './components/ui/PageFallback';

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const AboutPage = lazy(() => import('./pages/site/about/AboutPage'));
const NoticesPage = lazy(() => import('./pages/site/notice/NoticesPage'));
const NoticeDetailPage = lazy(() => import('./pages/site/notice/NoticeDetailPage'));
const FeedbackPage = lazy(() => import('./pages/site/feedback/FeedbackPage'));
const ApplyPage = lazy(() => import('./pages/site/application/ApplyPage'));
const ApplyEntryPage = lazy(() => import('./pages/site/application/ApplyEntryPage'));
const ApplicationManagePage = lazy(() => import('./pages/site/application/ApplicationManagePage'));
const ApplicationResultPage = lazy(() => import('./pages/site/application/ApplicationResultPage'));
const MyPage = lazy(() => import('./pages/site/mypage/MyPage'));
const ProjectsPage = lazy(() => import('./pages/site/project/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/site/project/ProjectDetailPage'));
const ProjectItemDetailPage = lazy(() => import('./pages/site/project/ProjectItemDetailPage'));
const PayoutsPage = lazy(() => import('./pages/site/payout/PayoutsPage'));
const CartPage = lazy(() => import('./pages/site/cart/CartPage'));
const OrderPage = lazy(() => import('./pages/site/order/OrderPage'));
const OrderCompletePage = lazy(() => import('./pages/site/order/OrderCompletePage'));
const OrderViewPage = lazy(() => import('./pages/site/order/OrderViewPage'));
const LoginPage = lazy(() => import('./pages/site/auth/LoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard/AdminDashboardPage'));
const AdminProjectsListPage = lazy(() => import('./pages/admin/projects/AdminProjectsListPage'));
const AdminProjectEditorPage = lazy(() => import('./pages/admin/projects/AdminProjectEditorPage'));
const AdminProjectItemsListPage = lazy(() => import('./pages/admin/projects/AdminProjectItemsListPage'));
const AdminProjectItemCreatePage = lazy(() => import('./pages/admin/projects/AdminProjectItemCreatePage'));
const AdminItemDetailPage = lazy(() => import('./pages/admin/items/AdminItemDetailPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/orders/AdminProjectOrdersPage'));
const AdminOrderPolicyPage = lazy(() => import('./pages/admin/orders/AdminOrderPolicyPage'));
const AdminNoticesListPage = lazy(() => import('./pages/admin/notices/AdminNoticesListPage'));
const AdminNoticeEditorPage = lazy(() => import('./pages/admin/notices/AdminNoticeEditorPage'));
const AdminNoticeDetailPage = lazy(() => import('./pages/admin/notices/AdminNoticeDetailPage'));
const AdminApplicationsListPage = lazy(() => import('./pages/admin/applications/AdminApplicationsListPage'));
const AdminApplicationDetailPage = lazy(() => import('./pages/admin/applications/AdminApplicationDetailPage'));
const AdminFormsListPage = lazy(() => import('./pages/admin/forms/AdminFormsListPage'));
const AdminFormDetailPage = lazy(() => import('./pages/admin/forms/AdminFormDetailPage'));

export default function App() {
  const location = useLocation();
  const hideFloatingSns =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/apply/new';

  return (
    <>
      <ApplicationRouteMetadata />
      <GoogleAnalytics />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="/projects/:projectId/items/:itemId"
            element={<ProjectItemDetailPage />}
          />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order/complete" element={<OrderCompletePage />} />
          <Route path="/orders/view" element={<OrderViewPage />} />
          <Route path="/orders/lookup" element={<Navigate to="/" replace />} />
          <Route path="/orders/enroll" element={<Navigate to="/" replace />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/notices" element={<NoticesPage />} />
          <Route path="/notices/:noticeId" element={<NoticeDetailPage />} />
          <Route path="/apply" element={<ApplyEntryPage />} />
          <Route path="/apply/new" element={<ApplyPage />} />
          <Route path="/apply/manage" element={<ApplicationManagePage />} />
          <Route path="/apply/result" element={<ApplicationResultPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/projects" element={<AdminProjectsListPage />} />
          <Route
            path="/admin/projects/new"
            element={<AdminProjectEditorPage />}
          />
          <Route
            path="/admin/projects/:projectId/edit"
            element={<AdminProjectEditorPage />}
          />
          <Route
            path="/admin/projects/:projectId/items"
            element={<AdminProjectItemsListPage />}
          />
          <Route
            path="/admin/projects/:projectId/items/new"
            element={<AdminProjectItemCreatePage />}
          />
          <Route
            path="/admin/items/:itemId"
            element={<AdminItemDetailPage />}
          />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/policy" element={<AdminOrderPolicyPage />} />
          <Route path="/admin/notices" element={<AdminNoticesListPage />} />
          <Route
            path="/admin/notices/new"
            element={<AdminNoticeEditorPage />}
          />
          <Route
            path="/admin/notices/:noticeId"
            element={<AdminNoticeDetailPage />}
          />
          <Route
            path="/admin/notices/:noticeId/edit"
            element={<AdminNoticeEditorPage />}
          />
          <Route path="/admin/forms" element={<AdminFormsListPage />} />
          <Route
            path="/admin/forms/:formId"
            element={<AdminFormDetailPage />}
          />
          <Route
            path="/admin/applications"
            element={<AdminApplicationsListPage />}
          />
          <Route
            path="/admin/applications/:formId/:applicationId"
            element={<AdminApplicationDetailPage />}
          />
        </Route>
      </Routes>
      {!hideFloatingSns && <FloatingSns />}
      <DeploymentVersion />
    </>
  );
}
