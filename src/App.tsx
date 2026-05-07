import { Route, Routes, useLocation } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import AdminLayout from './components/AdminLayout';
import MainPage from './pages/site/MainPage';
import AboutPage from './pages/site/AboutPage';
import NoticesPage from './pages/site/NoticesPage';
import NoticeDetailPage from './pages/site/NoticeDetailPage';
import FeedbackPage from './pages/site/FeedbackPage';
import ApplyPage from './pages/site/ApplyPage';
import ApplyEntryPage from './pages/site/ApplyEntryPage';
import ApplicationManagePage from './pages/site/ApplicationManagePage';
import ApplicationResultPage from './pages/site/ApplicationResultPage';
import MyPage from './pages/site/MyPage';
import ProjectsPage from './pages/site/ProjectsPage';
import ProjectDetailPage from './pages/site/ProjectDetailPage';
import ProjectItemDetailPage from './pages/site/ProjectItemDetailPage';
import PayoutsPage from './pages/site/PayoutsPage';
import CartPage from './pages/site/CartPage';
import OrderPage from './pages/site/OrderPage';
import OrderCompletePage from './pages/site/OrderCompletePage';
import OrderLookupPage from './pages/site/OrderLookupPage';
import OrderViewPage from './pages/site/OrderViewPage';
import LoginPage from './pages/site/LoginPage';
import OAuthCallbackPage from './pages/site/OAuthCallbackPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProjectsListPage from './pages/admin/AdminProjectsListPage';
import AdminProjectEditorPage from './pages/admin/AdminProjectEditorPage';
import AdminProjectItemsListPage from './pages/admin/AdminProjectItemsListPage';
import AdminProjectItemCreatePage from './pages/admin/AdminProjectItemCreatePage';
import AdminItemDetailPage from './pages/admin/AdminItemDetailPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminNoticesListPage from './pages/admin/AdminNoticesListPage';
import AdminNoticeEditorPage from './pages/admin/AdminNoticeEditorPage';
import AdminNoticeDetailPage from './pages/admin/AdminNoticeDetailPage';
import AdminApplicationsListPage from './pages/admin/AdminApplicationsListPage';
import AdminApplicationDetailPage from './pages/admin/AdminApplicationDetailPage';
import AdminFormsListPage from './pages/admin/AdminFormsListPage';
import AdminFormDetailPage from './pages/admin/AdminFormDetailPage';
import FloatingSns from './components/FloatingSns';
import GoogleAnalytics from './components/GoogleAnalytics';

export default function App() {
  const location = useLocation();
  const hideFloatingSns = location.pathname.startsWith('/admin');

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
          <Route path="/oauth/kakao/callback" element={<OAuthCallbackPage />} />
          <Route path="/oauth/naver/callback" element={<OAuthCallbackPage />} />
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
