# Xiangqi Online — Cờ Tướng Trực Tuyến

Nền tảng chơi cờ tướng trực tuyến 2 người chơi trong thời gian thực, kiến trúc Server-Authoritative đảm bảo tính toàn vẹn của luật cờ và đồng hồ trận đấu.

---

## 1. Tính Năng Đã Triển Khai (Phase 1 — Functional MVP)

- **Bàn cờ SVG 90 giao điểm chuẩn xác**:
  - Tỷ lệ hình học tiêu chuẩn, 9 đường dọc (file), 10 đường ngang (rank), chia đôi bởi sông Sở Hà - Hán Giới.
  - Cung tướng hai bên với các đường chéo giao hội.
  - 32 quân cờ ban đầu với mặt chữ thư pháp Hán truyền thống (Đỏ: 帥, 仕, 相, 傌, 俥, 炮, 兵; Đen: 將, 士, 象, 馬, 車, 砲, 卒).
- **Game Engine độc lập (`@xiangqi/engine`)**:
  - Luật di chuyển của 7 loại quân cờ.
  - Kiểm tra chướng ngại: chặn mã (hobbling horse leg), mắt tượng (blocked elephant eye), ngòi pháo (cannon screen capture).
  - Giới hạn sông (Tượng không qua sông; Tốt qua sông được đi ngang).
  - Giới hạn cung tướng (Tướng, Sĩ không ra khỏi cung).
  - Luật lộ mặt tướng (Flying General rule: hai tướng không được nhìn thấy nhau trên cùng một cột khi không có quân cản).
  - Nhận diện chiếu tướng, chiếu bí (Checkmate), và hết nước đi (Stalemate - xử thua người hết nước đi theo luật cờ tướng).
- **Multiplayer thời gian thực (Socket.IO)**:
  - Tạo phòng với mã phòng 6 ký tự hoặc URL chia sẻ trực tiếp.
  - Ghép 2 người chơi vào cùng phòng (Chủ phòng nhận quân Đỏ đi trước, Khách nhận quân Đen).
  - Cơ chế phiên làm việc (Session Token) lưu trong trình duyệt, hỗ trợ Reconnection tự động khi rớt mạng hoặc tải lại trang trong thời gian ân hạn 60 giây.
  - Đồng hồ kiểm soát bởi server (Authoritative Clock) hỗ trợ 3 chế độ: Chớp (3 phút), Nhanh (10 phút), Tiêu chuẩn (30 phút).
  - Xin đi lại (Undo request / response) có thể bật/tắt theo cài đặt phòng.
  - Cầu hòa (Draw negotiation) và Đầu hàng (Resignation).
  - Giao diện phản hồi trực quan: gợi ý nước đi yên tĩnh (chấm xanh), nước ăn quân (vòng đỏ), vòng sáng báo chiếu tướng và đánh dấu nước đi vừa thực hiện.

---

## 2. Cấu Trúc Monorepo

```text
chinise_chess/
├── apps/
│   ├── server/           # Express + Socket.IO Server-authoritative backend
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── modules/rooms/
│   │   │   ├── socket/
│   │   │   └── server.ts
│   │   └── tests/
│   └── web/              # React 18 + Vite + Tailwind CSS + SVG Frontend
│       ├── src/
│       │   ├── features/board/
│       │   ├── features/game/
│       │   ├── pages/
│       │   └── services/
├── packages/
│   ├── xiangqi-engine/   # Pure TypeScript Xiangqi Domain Engine
│   │   ├── src/
│   │   └── tests/
│   └── shared-types/     # Shared DTOs, socket events, contracts
├── docs/
│   ├── architecture.md
│   ├── game-rules.md
│   ├── socket-events.md
│   └── implementation-plan.md
└── package.json
```

---

## 3. Hướng Dẫn Cài Đặt & Khởi Chạy

### 3.1. Yêu cầu môi trường
- Node.js >= 16.15.0
- npm >= 8.11.0

### 3.2. Cài đặt dependency
```bash
npm install
```

### 3.3. Chạy kiểm thử tự động (Test Suites)

1. **Kiểm thử Game Engine (Unit tests luật cờ, cản mã, mắt tượng, ngòi pháo, chiếu/chiếu bí/hết nước đi)**:
```bash
npx tsc -p packages/xiangqi-engine/tsconfig.test.json
node packages/xiangqi-engine/dist-test/tests/engine.test.js
```

2. **Kiểm thử Tích hợp Backend (Socket.IO client-server, tạo phòng, vào phòng bằng mã, xác thực nước đi, đầu hàng)**:
```bash
npx tsc -p apps/server/tsconfig.test.json
node apps/server/dist-test/tests/server.integration.test.js
```

### 3.4. Chạy ứng dụng môi trường phát triển (Development)

- **Khởi động Backend Server (Port 4000)**:
```bash
npm run dev:server
```

- **Khởi động Frontend Web Client (Port 3000)**:
```bash
npm run dev:web
```

Truy cập trình duyệt tại `http://localhost:3000`.

### 3.5. Build sản phẩm (Production Build)
```bash
npm run --workspace=@xiangqi/server build
npm run --workspace=@xiangqi/web build
```

---

## 4. Các Giới Hạn Hiện Tại & Lộ Trình

- **Phase 1 (MVP)**: Hoàn thành 100% tiêu chí nghiệm thu của Phase 1.
- **Phase 2 (Tài khoản & Dữ liệu bền vững)**: Đăng ký/đăng nhập người dùng, hash mật khẩu bằng Argon2/bcrypt, lưu lịch sử ván đấu vào PostgreSQL qua Prisma ORM, xem lại ván đấu (Replay).
- **Phase 3 (Ghép cặp ELO & Chat)**: Hàng đợi ghép trận ngẫu nhiên bằng Redis, tính điểm ELO theo công thức chuẩn quốc tế, Bảng xếp hạng kỳ thủ, và Chat trực tiếp trong phòng đấu.

