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
│   └── tao-QR/                     # URL /tools/tao-QR
├── lai-kep/
└── vercel.json                     # Clean URL và redirect URL cũ
```

## Quy ước quản lý

- Website mới đặt tại `<nhóm>/<url-slug>/index.html`.
- Asset riêng đặt trong folder website tương ứng.
- Asset dùng chung đặt trong folder `assets/` của nhóm.
- Giữ nguyên chữ hoa của `Course` và `tools/tao-QR` để khớp URL đã chọn.
- Khi đổi URL, thêm redirect vào `vercel.json` để không làm gãy link cũ.

## Triển khai

Repo được cấu hình cho Vercel với clean URL. Ví dụ `profile/index.html` được truy cập bằng `/profile`.
