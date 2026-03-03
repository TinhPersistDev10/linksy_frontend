'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import apiClient from '@/lib/api/axios';

interface ProfileFormData {
  fullname: string;
  username: string;
  bio: string;
  dateOfBirth: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      fullname: user?.fullname || '',
      username: user?.username || '',
      bio: user?.bio || '',
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      await apiClient.put('/users/profile', data);
      setSuccess('Cập nhật thông tin thành công!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    try {
      setAvatarLoading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      await apiClient.put('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err: any) {
      setError('Tải ảnh lên thất bại');
    } finally {
      setAvatarLoading(false);
    }
  };

  const avatarSrc = avatarPreview || user?.avatar || '';
  const initials = user?.fullname?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
        <p className="text-sm text-muted-foreground mt-1">Cập nhật ảnh đại diện và thông tin cá nhân của bạn</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
          >
            {avatarLoading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <p className="font-medium">{user?.fullname}</p>
          <p className="text-sm text-muted-foreground">@{user?.username}</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG tối đa 5MB</p>
        </div>
      </div>

      <div className="border-t" />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            error={errors.fullname?.message}
            {...register('fullname', { required: 'Họ và tên là bắt buộc' })}
          />
          <Input
            label="Tên người dùng"
            placeholder="username"
            error={errors.username?.message}
            {...register('username', {
              required: 'Tên người dùng là bắt buộc',
              pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Chỉ được dùng chữ, số và dấu _' }
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
          <textarea
            placeholder="Nói gì đó về bạn..."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] min-h-[80px] resize-none"
            {...register('bio')}
          />
        </div>

        <Input
          label="Ngày sinh"
          type="date"
          {...register('dateOfBirth')}
        />

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="flex-1 h-9 rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-muted-foreground cursor-not-allowed"
            />
            {user?.isEmailVerified && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-md whitespace-nowrap">
                Đã xác thực
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Save size={16} />
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}