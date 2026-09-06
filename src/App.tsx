import { Route, Routes, useLocation } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout';
import AdminLayout from './components/layout/AdminLayout';
import MainPage from './pages/site/home/MainPage';
import AboutPage from './pages/site/about/AboutPage';
import NoticesPage from './pages/site/notice/NoticesPage';
import NoticeDetailPage from './pages/site/notice/NoticeDetailPage';
import FeedbackPage from './pages/site/feedback/FeedbackPage';
import ApplyPage from './pages/site/application/ApplyPage';
import ApplyEntryPage from './pages/site/application/ApplyEntryPage';
import ApplicationManagePage from './pages/site/application/ApplicationManagePage';
import ApplicationResultPage from './pages/site/application/ApplicationResultPage';
import MyPage from './pages/site/mypage/MyPage';
import ProjectsPage from './pages/site/project/ProjectsPage';
import ProjectDetailPage from './pages/site/project/ProjectDetailPage';
import ProjectItemDetailPage from './pages/site/project/ProjectItemDetailPage';
import PayoutsPage from './pages/site/payout/PayoutsPage';
import CartPage from './pages/site/cart/CartPage';
import OrderPage from './pages/site/order/OrderPage';
import OrderCompletePage from './pages/site/order/OrderCompletePage';
import OrderLookupPage from './pages/site/order/OrderLookupPage';
import OrderViewPage from './pages/site/order/OrderViewPage';
import LoginPage from './pages/site/auth/LoginPage';
import AdminDashboardPage from './pages/admin/dashboard/AdminDashboardPage';
import AdminProjectsListPage from './pages/admin/projects/AdminProjectsListPage';
import AdminProjectEditorPage from './pages/admin/projects/AdminProjectEditorPage';
import AdminProjectItemsListPage from './pages/admin/projects/AdminProjectItemsListPage';
import AdminProjectItemCreatePage from './pages/admin/projects/AdminProjectItemCreatePage';
import AdminItemDetailPage from './pages/admin/items/AdminItemDetailPage';
import AdminOrdersPage from './pages/admin/orders/AdminProjectOrdersPage';
import AdminNoticesListPage from './pages/admin/notices/AdminNoticesListPage';
import AdminNoticeEditorPage from './pages/admin/notices/AdminNoticeEditorPage';
import AdminNoticeDetailPage from './pages/admin/notices/AdminNoticeDetailPage';
import AdminApplicationsListPage from './pages/admin/applications/AdminApplicationsListPage';
import AdminApplicationDetailPage from './pages/admin/applications/AdminApplicationDetailPage';
import AdminFormsListPage from './pages/admin/forms/AdminFormsListPage';
import AdminFormDetailPage from './pages/admin/forms/AdminFormDetailPage';
import FloatingSns from './components/social/FloatingSns';
import GoogleAnalytics from './components/analytics/GoogleAnalytics';

export default function App() {
  const location = useLocation();
  const hideFloatingSns =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/apply/new';

  return (
    <>
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
          <Route path="/orders/lookup" element={<OrderLookupPage />} />
          <Route path="/orders/view" element={<OrderViewPage />} />
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

        <Route element={<AdminLayout />}>
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
    </>
  );
}
