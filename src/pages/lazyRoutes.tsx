import { lazy } from 'react'

export const CommunityHomePage = lazy(() => import('./public/CommunityHomePage').then((m) => ({ default: m.CommunityHomePage })))
export const PostDetailPage = lazy(() => import('./public/PostDetailPage').then((m) => ({ default: m.PostDetailPage })))
export const DiscoverPage = lazy(() => import('./public/DiscoverPage').then((m) => ({ default: m.DiscoverPage })))
export const SearchResultsPage = lazy(() => import('./public/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })))
export const ExchangeListPage = lazy(() => import('./public/ExchangeListPage').then((m) => ({ default: m.ExchangeListPage })))
export const ExchangeDetailPage = lazy(() => import('./public/ExchangeDetailPage').then((m) => ({ default: m.ExchangeDetailPage })))
export const SavedPage = lazy(() => import('./public/SavedPage').then((m) => ({ default: m.SavedPage })))
export const ActivityPage = lazy(() => import('./public/ActivityPage').then((m) => ({ default: m.ActivityPage })))
export const ProfilePage = lazy(() => import('./public/ProfilePage').then((m) => ({ default: m.ProfilePage })))
export const CampaignsListPage = lazy(() => import('./public/CampaignsListPage').then((m) => ({ default: m.CampaignsListPage })))
export const MyCampaignsPage = lazy(() => import('./public/MyCampaignsPage').then((m) => ({ default: m.MyCampaignsPage })))
export const ConsumerSharingPage = lazy(() => import('./public/ConsumerSharingPage').then((m) => ({ default: m.ConsumerSharingPage })))
export const HelpPage = lazy(() => import('./public/HelpPage').then((m) => ({ default: m.HelpPage })))
export const AdminLayout = lazy(() => import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })))
export const AdminOverviewPage = lazy(() => import('./admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })))
export const AdminContentPage = lazy(() => import('./admin/AdminContentPage').then((m) => ({ default: m.AdminContentPage })))
export const AdminModerationPage = lazy(() => import('./admin/AdminModerationPage').then((m) => ({ default: m.AdminModerationPage })))
export const AdminReportsPage = lazy(() => import('./admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })))
export const AdminAnnouncementsPage = lazy(() => import('./admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })))
export const AdminExchangePage = lazy(() => import('./admin/AdminExchangePage').then((m) => ({ default: m.AdminExchangePage })))
export const AdminUsersPage = lazy(() => import('./admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
export const AdminUserDetailPage = lazy(() =>
  import('./admin/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage })),
)
export const AdminCampaignsPage = lazy(() => import('./admin/AdminCampaignsPage').then((m) => ({ default: m.AdminCampaignsPage })))
export const AdminCampaignDetailPage = lazy(() =>
  import('./admin/AdminCampaignDetailPage').then((m) => ({ default: m.AdminCampaignDetailPage })),
)
export const AdminSharingPage = lazy(() => import('./admin/AdminSharingPage').then((m) => ({ default: m.AdminSharingPage })))

export const AdminRewardsPage = lazy(() => import('./admin/AdminRewardsPage').then((m) => ({ default: m.AdminRewardsPage })))

export const AdminAnalyticsPage = lazy(() => import('./admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
export const AdminConfigPage = lazy(() => import('./admin/AdminConfigPage').then((m) => ({ default: m.AdminConfigPage })))
export const AdminAuditPage = lazy(() => import('./admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })))
export const AdminManagersPage = lazy(() => import('./admin/AdminManagersPage').then((m) => ({ default: m.AdminManagersPage })))
export const AdminManagerDetailPage = lazy(() =>
  import('./admin/AdminManagerDetailPage').then((m) => ({ default: m.AdminManagerDetailPage })),
)
export const AdminMembershipPage = lazy(() => import('./admin/AdminMembershipPage').then((m) => ({ default: m.AdminMembershipPage })))
export const ManagerLayout = lazy(() => import('@/pages/manager/ManagerLayout').then((m) => ({ default: m.ManagerLayout })))
export const ManagerOverviewPage = lazy(() =>
  import('./manager/ManagerOverviewPage').then((m) => ({ default: m.ManagerOverviewPage })),
)
export const ManagerContentPage = lazy(() =>
  import('./manager/ManagerContentPage').then((m) => ({ default: m.ManagerContentPage })),
)
export const ManagerReportsPage = lazy(() =>
  import('./manager/ManagerReportsPage').then((m) => ({ default: m.ManagerReportsPage })),
)
export const ManagerExchangePage = lazy(() =>
  import('./manager/ManagerExchangePage').then((m) => ({ default: m.ManagerExchangePage })),
)
export const ManagerAnnouncementsPage = lazy(() =>
  import('./manager/ManagerAnnouncementsPage').then((m) => ({ default: m.ManagerAnnouncementsPage })),
)
export const ManagerAppointmentPage = lazy(() =>
  import('./manager/ManagerAppointmentPage').then((m) => ({ default: m.ManagerAppointmentPage })),
)
export const NotificationsPage = lazy(() => import('./public/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
export const BusinessProfilePage = lazy(() => import('./public/BusinessProfilePage').then((m) => ({ default: m.BusinessProfilePage })))
export const CampaignDetailPage = lazy(() => import('./public/CampaignDetailPage').then((m) => ({ default: m.CampaignDetailPage })))
export const OfferDetailPage = lazy(() => import('./public/OfferDetailPage').then((m) => ({ default: m.OfferDetailPage })))
export const RewardDetailPage = lazy(() => import('./public/RewardDetailPage').then((m) => ({ default: m.RewardDetailPage })))
export const GroupDetailPage = lazy(() => import('./public/GroupDetailPage').then((m) => ({ default: m.GroupDetailPage })))
export const HashtagPage = lazy(() => import('./public/HashtagPage').then((m) => ({ default: m.HashtagPage })))
export const CategoryPage = lazy(() => import('./public/CategoryPage').then((m) => ({ default: m.CategoryPage })))
export const LoginPage = lazy(() => import('./auth/LoginPage').then((m) => ({ default: m.LoginPage })))
export const RegisterPage = lazy(() => import('./auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
export const BusinessDashboardPage = lazy(() => import('./business/BusinessDashboardPage').then((m) => ({ default: m.BusinessDashboardPage })))
export const BusinessPostsPage = lazy(() => import('./business/BusinessPostsPage').then((m) => ({ default: m.BusinessPostsPage })))
export const BusinessOffersPage = lazy(() => import('./business/BusinessOffersPage').then((m) => ({ default: m.BusinessOffersPage })))
export const BusinessCampaignsPage = lazy(() => import('./business/BusinessCampaignsPage').then((m) => ({ default: m.BusinessCampaignsPage })))
export const BusinessSharingPage = lazy(() => import('./business/BusinessSharingPage').then((m) => ({ default: m.BusinessSharingPage })))
export const BusinessSettingsPage = lazy(() => import('./business/BusinessSettingsPage').then((m) => ({ default: m.BusinessSettingsPage })))
