export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const PASSWORD_RULE_MESSAGE =
  "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số";

export const BIO_MAX_LENGTH = 500;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH && PASSWORD_PATTERN.test(password)
  );
}

export const validators = {
  email: {
    required: "Email là bắt buộc",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Email không hợp lệ",
    },
  },

  password: {
    required: "Mật khẩu là bắt buộc",
    minLength: {
      value: PASSWORD_MIN_LENGTH,
      message: PASSWORD_RULE_MESSAGE,
    },
    maxLength: {
      value: 100,
      message: "Mật khẩu không được quá 100 ký tự",
    },
    pattern: {
      value: PASSWORD_PATTERN,
      message: PASSWORD_RULE_MESSAGE,
    },
  },

  username: {
    required: "Tên người dùng là bắt buộc",
    minLength: {
      value: 3,
      message: "Tên người dùng phải có ít nhất 3 ký tự",
    },
    maxLength: {
      value: 50,
      message: "Tên người dùng không được quá 50 ký tự",
    },
    pattern: {
      value: /^[a-zA-Z0-9_]+$/,
      message: "Tên người dùng chỉ được chứa chữ, số và dấu gạch dưới",
    },
  },

  fullname: {
    required: "Họ và tên là bắt buộc",
    minLength: {
      value: 2,
      message: "Họ và tên phải có ít nhất 2 ký tự",
    },
    maxLength: {
      value: 100,
      message: "Họ và tên không được quá 100 ký tự",
    },
  },

  bio: {
    maxLength: {
      value: BIO_MAX_LENGTH,
      message: `Giới thiệu không được quá ${BIO_MAX_LENGTH} ký tự`,
    },
  },

  otp: {
    required: "Vui lòng nhập mã OTP",
    pattern: {
      value: /^\d{6}$/,
      message: "Mã OTP phải gồm 6 chữ số",
    },
  },

  dateOfBirth: {
    validate: (value: string | undefined) => {
      if (!value) return true;

      const birth = new Date(value);
      if (Number.isNaN(birth.getTime())) {
        return "Ngày sinh không hợp lệ";
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      birth.setHours(0, 0, 0, 0);

      if (birth > today) {
        return "Ngày sinh không được ở tương lai";
      }

      const minAgeDate = new Date(today);
      minAgeDate.setFullYear(minAgeDate.getFullYear() - 13);
      if (birth > minAgeDate) {
        return "Bạn phải từ 13 tuổi trở lên";
      }

      const maxAgeDate = new Date(today);
      maxAgeDate.setFullYear(maxAgeDate.getFullYear() - 120);
      if (birth < maxAgeDate) {
        return "Ngày sinh không hợp lệ";
      }

      return true;
    },
  },
};

export const matchPassword = (password: string) => (value: string) =>
  value === password || "Mật khẩu xác nhận không khớp";
