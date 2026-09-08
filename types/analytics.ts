export interface AnalyticsOverview {
  totalUsers: number;
  totalBlogs: number;
  totalEvents: number;
  totalPrayers: number;
  totalLikes: number;
  totalBookmarks: number;
  totalNotifications: number;
  verifiedUsers?: number;
  unverifiedUsers?: number;
  activeUsers?: number;
  inactiveUsers?: number;
  upcomingEvents?: number;
  pastEvents?: number;
}
export interface AnalyticsActivityDay { date: string; users: number; blogs: number; prayers: number; events: number; }
export interface TrendingBlog { _id: string; title: string; slug?: string; content?: string; likes?: number; views?: number; createdAt?: string; }
export interface AnalyticsTrending { trendingBlogs?: TrendingBlog[]; trendingPrayers?: Record<string, unknown>[]; trendingEvents?: Record<string, unknown>[]; }
export interface SystemMemory { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers?: number; }
export interface SystemHealth { mongoStatus: string; uptime: number; memory: SystemMemory; }
export interface UpcomingEvent { _id: string; title?: string; name?: string; date?: string; startDate?: string; location?: string; status?: string; }