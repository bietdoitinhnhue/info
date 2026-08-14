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
| `/go/:slug` | `api/shorten.js` | Chuyển hướng link rút gọn |
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
│   └── rut-gon-link/               # URL /tools/rut-gon-link
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

Tùy chọn: đặt `SHORTENER_CREATE_KEY` để yêu cầu mã quản trị khi tạo link. Nếu không đặt, trang cho phép tạo link công khai và giới hạn 30 link/giờ/IP.

## Triển khai

Repo được cấu hình cho Vercel với clean URL. Ví dụ `profile/index.html` được truy cập bằng `/profile`.
