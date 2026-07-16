// src/lib/utils/validators.ts
// Tập trung các validation rules dùng chung cho react-hook-form
// Tránh duplicate validation logic ở nhiều form

export const validators = {
  email: {
    required: 'Email là bắt buộc',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Email không hợp lệ',
    },
  },

  password: {
    required: 'Mật khẩu là bắt buộc',
    minLength: {
      value: 6,
      message: 'Mật khẩu phải có ít nhất 6 ký tự',
    },
    maxLength: {
      value: 100,
      message: 'Mật khẩu không được quá 100 ký tự',
    },
  },

  username: {
    required: 'Tên người dùng là bắt buộc',
    minLength: {
      value: 3,
      message: 'Tên người dùng phải có ít nhất 3 ký tự',
    },
    maxLength: {
      value: 50,
      message: 'Tên người dùng không được quá 50 ký tự',
    },
    pattern: {
      value: /^[a-zA-Z0-9_]+$/,
      message: 'Tên người dùng chỉ được chứa chữ, số và dấu gạch dưới',
    },
  },

  fullname: {
    required: 'Họ và tên là bắt buộc',
    minLength: {
      value: 2,
      message: 'Họ và tên phải có ít nhất 2 ký tự',
    },
    maxLength: {
      value: 100,
      message: 'Họ và tên không được quá 100 ký tự',
    },
  },

  otp: {
    required: 'Vui lòng nhập mã OTP',
    pattern: {
      value: /^\d{6}$/,
      message: 'Mã OTP phải gồm 6 chữ số',
    },
  },
};

// Dùng cho confirm password field
export const matchPassword = (password: string) => (value: string) =>
  value === password || 'Mật khẩu xác nhận không khớp';