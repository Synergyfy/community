import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { BusinessLayout } from '@/components/layout/BusinessLayout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { GuestRoute, ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { SessionExpiryHandler } from '@/components/auth/SessionExpiryHandler'
import { AttributionCapture } from '@/components/sharing/AttributionCapture'
import { StoreOwnerSync } from '@/components/StoreOwnerSync'
import {
  CommunityHomePage,
  PostDetailPage,
  DiscoverPage,
  SearchResultsPage,
  ExchangeListPage,
  ExchangeDetailPage,
  SavedPage,
  ActivityPage,
  ProfilePage,
  CampaignsListPage,
  MyCampaignsPage,
  ConsumerSharingPage,
  HelpPage,
  NotificationsPage,
  BusinessProfilePage,
  CampaignDetailPage,
  OfferDetailPage,
  RewardDetailPage,
  GroupDetailPage,
  HashtagPage,
  CategoryPage,
  LoginPage,
  RegisterPage,
  BusinessDashboardPage,
  BusinessPostsPage,
  BusinessOffersPage,
  BusinessCampaignsPage,
  BusinessSharingPage,
  BusinessSettingsPage,
  AdminLayout,
  AdminOverviewPage,
  AdminContentPage,
  AdminModerationPage,
  AdminReportsPage,
  AdminAnnouncementsPage,
  AdminExchangePage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminCampaignsPage,
  AdminCampaignDetailPage,
  AdminSharingPage,
  AdminRewardsPage,
  AdminAnalyticsPage,
  AdminConfigPage,
  AdminAuditPage,
  AdminManagersPage,
  AdminManagerDetailPage,
  AdminMembershipPage,
  ManagerLayout,
  ManagerOverviewPage,
  ManagerContentPage,
  ManagerReportsPage,
  ManagerExchangePage,
  ManagerAnnouncementsPage,
  ManagerAppointmentPage,
} from '@/pages/lazyRoutes'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionExpiryHandler />
        <AttributionCapture />
        <StoreOwnerSync />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path='/' element={<Navigate to='/community' replace />} />
            <Route element={<PublicLayout />}>
              <Route path='/community' element={<CommunityHomePage />} />
              <Route path='/community/post/:id' element={<PostDetailPage />} />
              <Route path='/community/discover' element={<DiscoverPage />} />
              <Route path='/community/discover/search' element={<SearchResultsPage />} />
              <Route path='/community/discover/exchanges' element={<ExchangeListPage />} />
              <Route path='/community/exchange/:id' element={<ExchangeDetailPage />} />
              <Route path='/community/saved' element={<SavedPage />} />
              <Route path='/community/activity' element={<ActivityPage />} />
              <Route path='/community/profile' element={<ProfilePage />} />
              <Route path='/community/campaigns' element={<CampaignsListPage />} />
              <Route path='/community/my-campaigns' element={<MyCampaignsPage />} />
              <Route path='/community/sharing' element={<ConsumerSharingPage />} />
              <Route path='/community/help' element={<HelpPage />} />
              <Route path='/community/notifications' element={<NotificationsPage />} />
              <Route path='/community/discover/hashtag/:tag' element={<HashtagPage />} />
              <Route path='/community/discover/category/:id' element={<CategoryPage />} />
              <Route path='/community/business/:id' element={<BusinessProfilePage />} />
              <Route path='/community/campaign/:id' element={<CampaignDetailPage />} />
              <Route path='/community/offer/:id' element={<OfferDetailPage />} />
              <Route path='/community/reward/:id' element={<RewardDetailPage />} />
              <Route path='/community/group/:id' element={<GroupDetailPage />} />
            </Route>
            <Route element={<PublicLayout />}>
              <Route element={<GuestRoute />}>
                <Route path='/auth/login' element={<LoginPage />} />
                <Route path='/auth/register' element={<RegisterPage />} />
              </Route>
            </Route>
            <Route element={<PublicLayout />}>
              <Route element={<ProtectedRoute requiredUserTypes={['business']} />}>
                <Route path='/business' element={<BusinessLayout />}>
                  <Route index element={<Navigate to='dashboard' replace />} />
                  <Route path='dashboard' element={<BusinessDashboardPage />} />
                  <Route path='posts' element={<BusinessPostsPage />} />
                  <Route path='offers' element={<BusinessOffersPage />} />
                  <Route path='campaigns' element={<BusinessCampaignsPage />} />
                  <Route path='sharing' element={<BusinessSharingPage />} />
                  <Route path='settings' element={<BusinessSettingsPage />} />
                </Route>
              </Route>
            </Route>
            <Route element={<ProtectedRoute requiredUserTypes={['admin']} />}>
              <Route path='/admin' element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path='content' element={<AdminContentPage />} />
                <Route path='moderation' element={<AdminModerationPage />} />
                <Route path='reports' element={<AdminReportsPage />} />
                <Route path='announcements' element={<AdminAnnouncementsPage />} />
                <Route path='exchange' element={<AdminExchangePage />} />
                <Route path='users' element={<AdminUsersPage />} />
                <Route path='users/:id' element={<AdminUserDetailPage />} />
                <Route path='campaigns' element={<AdminCampaignsPage />} />
                <Route path='campaigns/:id' element={<AdminCampaignDetailPage />} />
                <Route path='managers' element={<AdminManagersPage />} />
                <Route path='managers/:id' element={<AdminManagerDetailPage />} />
                <Route path='sharing' element={<AdminSharingPage />} />
                <Route path='rewards' element={<AdminRewardsPage />} />
                <Route path='analytics' element={<AdminAnalyticsPage />} />
                <Route path='config' element={<AdminConfigPage />} />
                <Route path='membership' element={<AdminMembershipPage />} />
                <Route path='audit' element={<AdminAuditPage />} />
              </Route>
            </Route>
            {/* Community Manager Dashboard — the manager layout itself guards
                by appointment record; any signed-in account may reach it and
                sees an explanation when they hold no manager role. */}
            <Route element={<ProtectedRoute />}>
              <Route path='/manager' element={<ManagerLayout />}>
                <Route index element={<ManagerOverviewPage />} />
                <Route path='content' element={<ManagerContentPage />} />
                <Route path='reports' element={<ManagerReportsPage />} />
                <Route path='exchange' element={<ManagerExchangePage />} />
                <Route path='announcements' element={<ManagerAnnouncementsPage />} />
                <Route path='appointment' element={<ManagerAppointmentPage />} />
              </Route>
            </Route>
            <Route path='*' element={<Navigate to='/community' replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
