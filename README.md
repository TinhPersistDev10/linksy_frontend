# Linksy Frontend

Real-time chat UI for **Linksy** — a messaging app with friends, groups, calls, notifications, privacy settings, and an admin console.

| Language | Section |
|----------|---------|
| English | [English](#english) |
| Tiếng Việt | [Tiếng Việt](#tiếng-việt) |

---

## English

### What is Linksy?

**Linksy** is a realtime messaging and social communication platform. People use it to stay connected with friends and groups: send messages (text, media, files, voice), react and poll in chats, make voice/video calls, manage friend requests, control who can message or call them, and get live notifications. System administrators use the same app to manage users and monitor the service.

This repository is the **web client** (UI) that people interact with; it connects to the [Linksy backend API](../backend_api).

### Overview

This is the Next.js client for Linksy. It talks to the ASP.NET Core API over REST (`/api/v1`) and SignalR (`/hubs/chat`), using httpOnly JWT cookies (`withCredentials`).

Companion backend: [`../backend_api`](../backend_api)

### Tech stack

| Area | Technology |
|------|------------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Lucide icons |
| Data | TanStack Query, Zustand, Axios |
| Realtime | `@microsoft/signalr` |
| Forms | React Hook Form, Zod |
| Calls | WebRTC (STUN/TURN via env) |

### Features

- Auth: register, email OTP verify, login/logout, forgot/reset password
- Direct & group chats with rich messages (reply, edit, delete, attachments, pins, mentions, reactions, polls)
- Voice/video calls (WebRTC + SignalR signaling)
- Friends: search, requests, directory; open profile / start chat from search
- Groups: create, invite, members, permissions, avatars
- Notifications (in-app + optional sound/preview)
- Privacy: block strangers from messaging/calling (`whoCanMessageMe`)
- Settings: profile, password, notifications, privacy, appearance, blocked users
- System admin UI (`/admin`) for users with role `Admin`

### Project structure

```
src/
  app/                 # Routes: (auth), (main), (admin)
  components/          # chat, friend, social, settings, admin, brand, ui
  contexts/            # AuthProvider
  lib/
    api/               # Axios clients (auth, messages, friends, …)
    hooks/             # SignalR, send message, queries
    types/             # Shared TypeScript types
    utils/
public/brand/          # Logo / favicon assets
```

### Prerequisites

- Node.js 20+ (recommended)

### Setup

```bash
cd linksy_frontend
cp .env.example .env.local
npm install
npm run dev
```

### Environment variables

Copy from [`.env.example`](./.env.example):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL, e.g. |
| `NEXT_PUBLIC_STUN_URLS` | Comma-separated STUN servers for WebRTC |
| `NEXT_PUBLIC_TURN_URL` | Optional TURN server URL |
| `NEXT_PUBLIC_TURN_USERNAME` | TURN username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | TURN credential |

Auth cookies require the browser to call the API origin with credentials; configure CORS on the backend for `http://localhost:3000`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

### Main routes

| Path | Description |
|------|-------------|
| `/login`, `/register`, `/verify-email`, `/forgot-password` | Auth |
| `/dashboard` | Chat + social workspace |
| `/settings` | User settings |
| `/admin` | Admin console (Admin role) |

### Related docs

- Agent guide: [`AGENTS.md`](./AGENTS.md)
- Docs index: [`docs/README.md`](./docs/README.md)

---

## Tiếng Việt

### Linksy là gì?

**Linksy** là nền tảng nhắn tin và giao tiếp xã hội theo thời gian thực. Người dùng dùng Linksy để kết nối với bạn bè và nhóm: gửi tin nhắn (chữ, ảnh/media, file, thoại), thả reaction và bình chọn trong chat, gọi thoại/video, quản lý lời mời kết bạn, kiểm soát ai được nhắn tin hay gọi mình, và nhận thông báo realtime. Quản trị viên hệ thống dùng cùng ứng dụng để quản lý người dùng và theo dõi dịch vụ.

Repo này là **giao diện web (client)** mà người dùng tương tác; nó kết nối tới [API backend Linksy](../backend_api).

### Tổng quan

Đây là client Next.js của **Linksy** — ứng dụng chat realtime. Frontend gọi backend ASP.NET Core qua REST (`/api/v1`) và SignalR (`/hubs/chat`), xác thực bằng JWT trong cookie httpOnly (`withCredentials`).

Backend đi kèm: [`../backend_api`](../backend_api)

### Công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Giao diện | Tailwind CSS 4, shadcn/ui, Lucide |
| Dữ liệu | TanStack Query, Zustand, Axios |
| Realtime | `@microsoft/signalr` |
| Form | React Hook Form, Zod |
| Cuộc gọi | WebRTC (STUN/TURN qua biến môi trường) |

### Tính năng chính

- Đăng ký / xác thực OTP email / đăng nhập / quên mật khẩu
- Chat 1-1 & nhóm: trả lời, sửa, xóa, file/ảnh, ghim, mention, reaction, bình chọn
- Gọi thoại / video (WebRTC + SignalR)
- Bạn bè: tìm kiếm, lời mời, danh bạ; xem hồ sơ / mở chat từ kết quả tìm
- Nhóm: tạo, mời, thành viên, phân quyền, avatar
- Thông báo trong app (âm thanh / xem trước tùy chỉnh)
- Quyền riêng tư: chặn người lạ nhắn tin / gọi (`whoCanMessageMe`)
- Cài đặt: hồ sơ, mật khẩu, thông báo, riêng tư, giao diện, danh sách chặn
- Admin hệ thống (`/admin`) cho tài khoản role `Admin`

### Cấu trúc thư mục

```
src/
  app/                 # Route: (auth), (main), (admin)
  components/          # chat, friend, social, settings, admin, brand, ui
  contexts/            # AuthProvider
  lib/
    api/               # Client Axios
    hooks/             # SignalR, gửi tin, query
    types/
    utils/
public/brand/          # Logo / favicon
```

### Yêu cầu

- Node.js 20+ (khuyến nghị)
- API Linksy đang chạy (mặc định `http://localhost:5253`)

### Cài đặt & chạy

```bash
cd linksy_frontend
cp .env.example .env.local
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

### Biến môi trường

Xem [`.env.example`](./.env.example):

| Biến | Mô tả |
|------|--------|
| `NEXT_PUBLIC_API_URL` | Base URL API, ví dụ `http://localhost:5253/api/v1` |
| `NEXT_PUBLIC_STUN_URLS` | Danh sách STUN (phân tách bằng dấu phẩy) |
| `NEXT_PUBLIC_TURN_URL` | URL TURN (tuỳ chọn) |
| `NEXT_PUBLIC_TURN_USERNAME` | Username TURN |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | Credential TURN |

Cookie auth cần CORS backend cho phép origin `http://localhost:3000` kèm credentials.

### Script npm

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy môi trường phát triển |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build |
| `npm run lint` | Kiểm tra ESLint |

### Route chính

| Đường dẫn | Mô tả |
|-----------|--------|
| `/login`, `/register`, `/verify-email`, `/forgot-password` | Xác thực |
| `/dashboard` | Không gian chat & social |
| `/settings` | Cài đặt người dùng |
| `/admin` | Bảng quản trị (role Admin) |

### Tài liệu liên quan

- Hướng dẫn agent: [`AGENTS.md`](./AGENTS.md)
- Mục lục docs: [`docs/README.md`](./docs/README.md)
