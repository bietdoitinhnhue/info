# Drake Nguyễn websites

Kho mã nguồn cho các website tĩnh của Drake Nguyễn. Các website được nhóm theo URL để dễ tìm, sửa và triển khai trên Vercel.

## Bản đồ URL

| URL | File nguồn | Nội dung |
| --- | --- | --- |
| `/` | `index.html` | Trang hub tổng hợp các nội dung |
| `/profile` | `profile/index.html` | CV Drake Nguyễn |
| `/profile/portfolio` | `profile/portfolio/index.html` | Portfolio và case study |
| `/Course/ads-course` | `Course/ads-course/index.html` | Landing page Coaching Ads |
| `/Course/ai-content-system` | `Course/ai-content-system/index.html` | Landing page AI Video Content System |
| `/Course/social-pro` | `Course/social-pro/index.html` | Lộ trình Social Conversion Pro |
| `/tools/tao-QR` | `tools/tao-QR/index.html` | Công cụ tạo mã QR |
| `/tools/link-builder-affiliate` | `tools/link-builder-affiliate/index.html` | Công cụ tạo link Shopee Affiliate |
| `/tools/rut-gon-link` | `tools/rut-gon-link/index.html` | Công cụ rút gọn link với URL tùy chọn |
| `/tools/rut-gon-link/auth` | `tools/rut-gon-link/auth/index.html` | Đăng ký và đăng nhập |
| `/tools/rut-gon-link/dashboard` | `tools/rut-gon-link/dashboard/index.html` | Dashboard link và analytics |
| `/go/:slug` | `api/shorten.js` | Chuyển hướng và ghi nhận click |
| `/lai-kep` | `lai-kep/index.html` | Công cụ lập kế hoạch tài chính |

## Cấu trúc repo

```text
.
├── index.html                      # URL /
├── profile/
│   ├── index.html                  # URL /profile
│   ├── portfolio/                  # URL /profile/portfolio
│   │   └── assets/
│   └── assets/brand/               # Ảnh dùng chung cho profile
├── Course/
│   ├── ads-course/                 # URL /Course/ads-course
│   ├── ai-content-system/          # URL /Course/ai-content-system
│   ├── social-pro/                 # URL /Course/social-pro
│   └── assets/case-studies/        # Ảnh dùng chung cho khóa học
├── tools/
│   ├── tao-QR/                     # URL /tools/tao-QR
│   ├── link-builder-affiliate/     # URL /tools/link-builder-affiliate
│   └── rut-gon-link/
│       ├── index.html               # URL /tools/rut-gon-link
│       ├── account.css              # Giao diện auth và dashboard
│       ├── auth/                    # URL /tools/rut-gon-link/auth
│       └── dashboard/               # URL /tools/rut-gon-link/dashboard
├── api/
│   ├── auth.js                      # Đăng ký, đăng nhập, session
│   ├── custom-domains.js            # Kết nối và xác minh custom domain qua Vercel
│   ├── shorten.js                   # Tạo link, redirect, analytics
│   └── shortener-dashboard.js       # Dữ liệu dashboard có phân quyền
├── lib/
│   └── shortener-store.js           # Redis, mật khẩu và session dùng chung
├── lai-kep/
└── vercel.json                     # Clean URL và redirect URL cũ
```

## Quy ước quản lý

- Website mới đặt tại `<nhóm>/<url-slug>/index.html`.
- Asset riêng đặt trong folder website tương ứng.
- Asset dùng chung đặt trong folder `assets/` của nhóm.
- Giữ nguyên chữ hoa của `Course` và `tools/tao-QR` để khớp URL đã chọn.
- Khi đổi URL, thêm redirect vào `vercel.json` để không làm gãy link cũ.

## Cấu hình công cụ rút gọn link

Công cụ dùng Redis qua REST để lưu URL. Trên Vercel, kết nối Upstash Redis và khai báo một trong hai cặp biến môi trường:

- `KV_REST_API_URL` và `KV_REST_API_TOKEN` (Vercel Marketplace).
- `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` (Upstash trực tiếp).

Đặt `SHORTENER_ADMIN_EMAILS` bằng danh sách email admin, phân tách bằng dấu phẩy. Ví dụ:

```text
SHORTENER_ADMIN_EMAILS=admin@example.com,owner@example.com
```

Trang cho phép đăng ký công khai. Mật khẩu được băm bằng scrypt, session lưu bằng cookie HttpOnly/Secure trong 30 ngày. Người dùng chỉ xem link của mình; email trong `SHORTENER_ADMIN_EMAILS` có thể chuyển sang phạm vi “Tất cả”.

Analytics ghi nhận số đếm tổng hợp theo ngày, quốc gia, thành phố, referrer/social và thiết bị. Vị trí lấy từ header Vercel; hệ thống không lưu IP thô. Các link cũ được tạo trước hệ thống tài khoản vẫn redirect bình thường nhưng không được gán cho tài khoản.

### Custom domain

Mỗi tài khoản có thể kết nối tối đa 1 domain/subdomain trong Dashboard. Hệ thống thêm domain vào đúng Vercel Project, trả về bản ghi DNS được Vercel đề xuất và chỉ cho tạo link dạng `https://go.tenmien.com/ten-link` sau khi DNS đã xác minh. Apex domain dùng bản ghi A trỏ về IP Vercel; subdomain ưu tiên CNAME theo cấu hình của project.

Thêm các biến môi trường sau trên Vercel:

- `VERCEL_API_TOKEN`: Access Token của tài khoản/team có quyền quản lý Project; bật **Sensitive**.
- `SHORTENER_VERCEL_PROJECT_ID`: Project ID, ví dụ `prj_...`. Có thể bỏ qua nếu runtime đã có `VERCEL_PROJECT_ID`.
- `SHORTENER_VERCEL_TEAM_ID`: Team ID, ví dụ `team_...`. Có thể bỏ qua với project cá nhân hoặc khi runtime đã có `VERCEL_ORG_ID`.
- `SHORTENER_PRIMARY_DOMAINS`: danh sách domain chính không cho người dùng nhận làm custom domain, phân tách bằng dấu phẩy. Ví dụ `about.drakenguyen.me`.

Vercel Hobby giới hạn 50 custom domain cho mỗi project. Việc giới hạn 1 domain/tài khoản giúp tránh dùng hết quota ngoài ý muốn.

## Triển khai

Repo được cấu hình cho Vercel với clean URL. Ví dụ `profile/index.html` được truy cập bằng `/profile`.
