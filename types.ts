
export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_key: string; // R2 key, Drive ID, or VidMoly ID
  source_type: 'r2' | 'drive' | 'vidmoly';
  duration: number;
  year: number;
  slug: string;
  rating?: string;
  genre?: string[];
  cast?: string[];
}

export interface Category {
  id: string;
  title: string;
  slug: string;
  videos: Video[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
}
