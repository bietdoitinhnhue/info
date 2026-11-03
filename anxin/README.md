# Ăn xin Online

URL: https://about.drakenguyen.me/anxin

Trang tĩnh HTML/CSS/JavaScript, không cần bước build. Rewrite `/anxin` được đặt trước route rút gọn link trong `vercel.json`. Không thay đổi trang chủ hay API hiện có.

## Luồng donate

1. Chọn một trong bốn gói cố định: trà đá 5.000đ, cà phê 20.000đ, cơm sườn 50.000đ, hủ tíu 100.000đ.
2. QR tĩnh trong `momo-qr.svg` mã hóa chính xác `https://nhantien.momo.vn/0968333342`. QR không chứa số tiền; giao diện nhắc người gửi nhập theo gói và kiểm tra người nhận. Nút mở link MoMo dùng cùng URL.
3. Người gửi nhập tên tùy chọn và tick tự xác nhận đã chuyển. Trang tạo thẻ lưu niệm PNG 1200 × 1500 có tên, món, số tiền, ngày theo giờ Việt Nam và mã ngẫu nhiên.
4. Thẻ ghi rõ `NGƯỜI GỬI TỰ XÁC NHẬN · CHƯA ĐỐI SOÁT MOMO`. Không coi thao tác bấm nút là xác minh giao dịch. Không ghi doanh thu, bảng xếp hạng hay người donate giả.
5. Trình duyệt lưu thẻ gần nhất trong `localStorage` để mở lại sau khi tải lại trang. Không gửi tên người donate đến server. PNG tải về và Web Share được tạo tại máy người dùng.

## Giới hạn thanh toán

Link nhận tiền cá nhân không cung cấp webhook hay API xác nhận cho website này. Muốn chỉ phát thẻ khi tiền thực sự được nhận, cần backend lưu đơn cùng tích hợp đối tác thanh toán có webhook đã xác thực chữ ký và đối chiếu số tiền/trạng thái/id giao dịch. Không thể tự đối soát chỉ từ URL nhận tiền.

## Giao diện

Minh họa SVG riêng, animation CSS có hỗ trợ `prefers-reduced-motion`, dialog có nhãn và trả focus khi đóng, dùng text/canvas để hiển thị tên người dùng. Font Google Fonts có fallback hệ thống. QR và toàn bộ hình minh họa được phục vụ từ repo.

## Kiểm tra

`node --check anxin/app.js`

Xem trang qua HTTP(S), thử cả bốn gói và đối chiếu số tiền. Không cần chuyển tiền thật để kiểm thử trên môi trường preview. Checkbox là tự khai; thẻ thử không phải chứng từ. Thử nhập tên dài, đóng bằng Escape, tải PNG, và tải lại trang để xem lại thẻ.
