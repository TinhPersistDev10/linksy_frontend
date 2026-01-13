import Link from 'next/link';
import { MessageCircle, Users, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MessageCircle className="text-blue-600" size={32} />
          <span className="text-2xl font-bold text-gray-800">Linksy</span>
        </div>
        <div className="space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Đăng ký
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
          Kết nối mọi người,
          <br />
          <span className="text-blue-600">Mọi nơi, Mọi lúc</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Trò chuyện, chia sẻ và kết nối với bạn bè, gia đình một cách dễ dàng và bảo mật
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-lg"
        >
          Bắt đầu ngay - Miễn phí
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Zap className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Nhanh chóng</h3>
            <p className="text-gray-600">
              Tin nhắn được gửi đi trong tích tắc, không delay, không lag
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Shield className="text-green-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Bảo mật</h3>
            <p className="text-gray-600">
              Mã hóa end-to-end, bảo vệ thông tin cá nhân tuyệt đối
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Users className="text-purple-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Kết nối</h3>
            <p className="text-gray-600">
              Nhóm chat, cuộc gọi video, chia sẻ file dễ dàng
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600 border-t">
        <p>&copy; 2026 Linksy. All rights reserved.</p>
      </footer>
    </div>
  );
}