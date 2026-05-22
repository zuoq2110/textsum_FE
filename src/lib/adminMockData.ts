// Mock data for admin features when backend is not ready
import type { AdminStats, AdminUser, AdminSummary } from './adminApi'

export const MOCK_ADMIN_STATS: AdminStats = {
  totalUsers: 1247,
  totalSummaries: 8934,
  todaySummaries: 156,
  activeUsers: 342,
  modelUsage: {
    extractive: 3421,
    abstractive: 2789,
    hybrid: 2724,
  },
}

export const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: '1',
    email: 'admin@example.com',
    fullName: 'Nguyễn Admin',
    role: 'admin',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    summaryCount: 234,
  },
  {
    id: '2',
    email: 'nguyenvana@gmail.com',
    fullName: 'Nguyễn Văn A',
    role: 'user',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastLoginAt: new Date(Date.now() - 300000).toISOString(),
    summaryCount: 45,
  },
  {
    id: '3',
    email: 'tranvanb@gmail.com',
    fullName: 'Trần Văn B',
    role: 'user',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
    summaryCount: 78,
  },
  {
    id: '4',
    email: 'lethic@gmail.com',
    fullName: 'Lê Thị C',
    role: 'user',
    isActive: false,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    lastLoginAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    summaryCount: 12,
  },
  {
    id: '5',
    email: 'phamvand@gmail.com',
    fullName: 'Phạm Văn D',
    role: 'user',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    lastLoginAt: new Date(Date.now() - 1800000).toISOString(),
    summaryCount: 156,
  },
]

export const MOCK_ADMIN_SUMMARIES: AdminSummary[] = [
  {
    id: 'sum1',
    userId: '2',
    userName: 'Nguyễn Văn A',
    userEmail: 'nguyenvana@gmail.com',
    mode: 'hybrid',
    source:
      'Trí tuệ nhân tạo (AI) đang thay đổi cách chúng ta sống và làm việc. Từ xe tự lái đến trợ lý ảo, AI đang dần trở thành một phần không thể thiếu trong cuộc sống hàng ngày. Các công ty công nghệ lớn đang đầu tư hàng tỷ đô la vào nghiên cứu và phát triển AI.',
    summary:
      'AI đang thay đổi cuộc sống và công việc của con người. Các công ty công nghệ đang đầu tư mạnh vào phát triển AI.',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    wordCount: 24,
  },
  {
    id: 'sum2',
    userId: '3',
    userName: 'Trần Văn B',
    userEmail: 'tranvanb@gmail.com',
    mode: 'extractive',
    source:
      'Biến đổi khí hậu là một trong những thách thức lớn nhất mà nhân loại phải đối mặt. Nhiệt độ toàn cầu đang tăng lên, băng ở hai cực đang tan chảy với tốc độ chưa từng có. Các quốc gia trên thế giới cần hợp tác chặt chẽ để giảm phát thải khí nhà kính.',
    summary:
      'Nhiệt độ toàn cầu đang tăng lên, băng ở hai cực đang tan chảy với tốc độ chưa từng có. Các quốc gia trên thế giới cần hợp tác chặt chẽ để giảm phát thải khí nhà kính.',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    wordCount: 34,
  },
  {
    id: 'sum3',
    userId: '5',
    userName: 'Phạm Văn D',
    userEmail: 'phamvand@gmail.com',
    mode: 'abstractive',
    source:
      'Việt Nam đang có những bước tiến vượt bậc trong lĩnh vực giáo dục. Chất lượng giảng dạy được nâng cao, cơ sở vật chất được đầu tư hiện đại hóa. Học sinh Việt Nam thường xuyên đạt thành tích cao trong các kỳ thi quốc tế.',
    summary: 'Giáo dục Việt Nam đang phát triển mạnh mẽ với chất lượng dạy và học được cải thiện đáng kể.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    wordCount: 18,
  },
]

// Enable mock mode via environment variable
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_ADMIN === 'true'
