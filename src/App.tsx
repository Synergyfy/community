import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { GuestRoute } from '@/components/auth/ProtectedRoute'
import { SessionExpiryHandler } from '@/components/auth/SessionExpiryHandler'
import {
  CommunityHomePage,
  PostDetailPage,
  DiscoverPage,
  SearchResultsPage,
  ExchangeListPage,
  ExchangeDetailPage,
  SavedPage,
  ActivityPage,
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
} from '@/pages/lazyRoutes'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionExpiryHandler />
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
            <Route path='*' element={<Navigate to='/community' replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
