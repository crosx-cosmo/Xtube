'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ExternalLink,
  Home,
  KeyRound,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import type {
  AdminCommentItem,
  AdminDashboardStats,
  AuthUser,
  CategoryWithCount,
  UploadChapterInput,
  User,
  VideoChapter,
  VideoWithMeta,
} from '@/lib/types';
import {
  combineHmsToSeconds,
  formatDuration,
  formatViews,
  splitDurationToHms,
  validateCategoryPayload,
  validateUploadPayload,
} from '@/lib/video-utils';
import {
  getCollectionDotClass,
  getEducatorInitials,
} from '@/lib/admin-studio-utils';
import {
  AdminAuthGate,
  type AdminAuthView,
} from '@/components/admin/admin-auth-gate';
import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminInsightsRail } from '@/components/admin/admin-insights-rail';
import { AdminLinksManager } from '@/components/admin/admin-links-manager';
import {
  AdminCategoriesManager,
  AdminCommentsManager,
} from '@/components/admin/admin-taxonomy-comments';
import { ParticleOrbCrest } from '@/components/brand-logo';
import { ShareModal, type ShareTarget } from '@/components/share-modal';
import { cn } from '@/lib/utils';

type AdminVideoRow = VideoWithMeta & { chapters: VideoChapter[] };
type AdminTab = 'overview' | 'links' | 'categories' | 'comments';

interface AdminDashboardProps {
  initialAuthenticated: boolean;
  initialAdmin: AuthUser | null;
  initialVideos: AdminVideoRow[];
  categories: CategoryWithCount[];
  educators: User[];
  initialComments: AdminCommentItem[];
  initialStats: AdminDashboardStats;
  initialResetToken?: string | null;
  initialResetError?: string | null;
}

const DEFAULT_CHAPTERS: UploadChapterInput[] = [
  { timestamp: '00:00', title: 'Introduction & Overview' },
  { timestamp: '02:30', title: 'Core Psychology Framework' },
];

const ADMIN_TOKEN_STORAGE_KEY = 'kinship_admin_token';
const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024;
const ALLOWED_THUMBNAIL_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const TAB_BREADCRUMB: Record<AdminTab, string> = {
  overview: 'Overview',
  links: 'Video Links',
  categories: 'Categories',
  comments: 'Comments',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function readAndOptimizeThumbnailFile(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file from device.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/gif') {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const maxWidth = 1280;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const targetWidth = Math.max(1, Math.round(img.width * scale));
      const targetHeight = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      try {
        const webpUrl = canvas.toDataURL('image/webp', 0.84);
        if (webpUrl.startsWith('data:image/webp')) {
          resolve(webpUrl);
          return;
        }
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export function AdminDashboard({
  initialAuthenticated,
  initialAdmin,
  initialVideos,
  categories: initialCategories,
  educators: initialEducators,
  initialComments,
  initialStats,
  initialResetToken = null,
  initialResetError = null,
}: AdminDashboardProps) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = React.useState(initialAuthenticated);
  const [adminUser, setAdminUser] = React.useState<AuthUser | null>(initialAdmin);
  const [authView, setAuthView] = React.useState<AdminAuthView>(() =>
    initialResetToken ? 'reset-confirm' : 'login'
  );
  const [forceResetConfirm, setForceResetConfirm] = React.useState<boolean>(() =>
    Boolean(initialResetToken)
  );
  const [adminEmail, setAdminEmail] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authFieldErrors, setAuthFieldErrors] = React.useState<Record<string, string>>({});
  const [authLoading, setAuthLoading] = React.useState(false);

  // Admin Password Reset (Email OTP) State
  const [resetEmail, setResetEmail] = React.useState('');
  const [resetOtp, setResetOtp] = React.useState(() => initialResetToken ?? '');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(() => initialResetError);
  const [resetFieldErrors, setResetFieldErrors] = React.useState<Record<string, string>>({});
  const [resetStatusMessage, setResetStatusMessage] = React.useState<string | null>(null);
  const [headerResetLoading, setHeaderResetLoading] = React.useState(false);

  // Studio Workspace State
  const [activeTab, setActiveTab] = React.useState<AdminTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [studioSearch, setStudioSearch] = React.useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState('all');

  const [videos, setVideos] = React.useState<AdminVideoRow[]>(initialVideos);
  const [categories, setCategories] = React.useState<CategoryWithCount[]>(initialCategories);
  const [educators, setEducators] = React.useState<User[]>(initialEducators);
  const [comments, setComments] = React.useState<AdminCommentItem[]>(initialComments);
  const [commentsLoaded, setCommentsLoaded] = React.useState(initialAuthenticated);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentSearch, setCommentSearch] = React.useState('');
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = React.useState<string | null>(null);

  // Video Link Form State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState('');
  const [thumbnailUrl, setThumbnailUrl] = React.useState('');
  const [thumbnailMeta, setThumbnailMeta] = React.useState<{
    name: string;
    sizeLabel: string;
  } | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');
  const [educatorName, setEducatorName] = React.useState('');
  const [durationHours, setDurationHours] = React.useState(0);
  const [durationMinutes, setDurationMinutes] = React.useState(12);
  const [durationSecondsPart, setDurationSecondsPart] = React.useState(0);
  const [description, setDescription] = React.useState('');
  const [reflectionPrompt, setReflectionPrompt] = React.useState('');
  const [chapters, setChapters] = React.useState<UploadChapterInput[]>(DEFAULT_CHAPTERS);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [previewImgBroken, setPreviewImgBroken] = React.useState(false);

  // Category Management Form State
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = React.useState<string | null>(null);
  const [catName, setCatName] = React.useState('');
  const [catSlug, setCatSlug] = React.useState('');
  const [catSlugTouched, setCatSlugTouched] = React.useState(false);
  const [catDescription, setCatDescription] = React.useState('');
  const [catErrors, setCatErrors] = React.useState<Record<string, string>>({});
  const [catSaving, setCatSaving] = React.useState(false);
  const [catDeleteError, setCatDeleteError] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<{
    message: string;
    tone: 'success' | 'error';
  } | null>(null);
  const [shareTarget, setShareTarget] = React.useState<ShareTarget | null>(null);

  const totalDurationSeconds = React.useMemo(
    () => combineHmsToSeconds(durationHours, durationMinutes, durationSecondsPart),
    [durationHours, durationMinutes, durationSecondsPart]
  );

  const stats: AdminDashboardStats = React.useMemo(
    () => ({
      totalVideos: videos.length,
      totalViews: videos.reduce((acc, v) => acc + v.views, 0),
      totalLikes: videos.reduce((acc, v) => acc + v.likes, 0),
      totalComments: commentsLoaded ? comments.length : initialStats.totalComments,
    }),
    [videos, commentsLoaded, comments.length, initialStats.totalComments]
  );

  const categoriesWithLiveCounts = React.useMemo(
    () =>
      [...categories]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((cat) => ({
          ...cat,
          videoCount: videos.filter((v) => v.categoryId === cat.id).length,
        })),
    [categories, videos]
  );

  const filteredComments = React.useMemo(() => {
    const q = commentSearch.trim().toLowerCase();
    if (!q) return comments;
    return comments.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        c.author.name.toLowerCase().includes(q) ||
        c.videoTitle.toLowerCase().includes(q) ||
        (c.isAnonymous && 'anonymous'.includes(q))
    );
  }, [comments, commentSearch]);

  const adminTokenRef = React.useRef<string | null>(null);

  const getAdminToken = React.useCallback((override?: string): string | null => {
    if (override) return override;
    if (adminTokenRef.current) return adminTokenRef.current;
    if (typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
        if (stored) {
          adminTokenRef.current = stored;
          return stored;
        }
      } catch {
        // Ignore restricted storage environments
      }
    }
    return null;
  }, []);

  const persistAdminToken = React.useCallback((token: string | null) => {
    adminTokenRef.current = token;
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
        } else {
          window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        }
      } catch {
        // Ignore restricted storage environments
      }
    }
  }, []);

  const getAdminHeaders = React.useCallback(
    (extra?: Record<string, string>, tokenOverride?: string): Record<string, string> => {
      const result: Record<string, string> = { ...(extra ?? {}) };
      const token = getAdminToken(tokenOverride);
      if (token) {
        result['x-admin-token'] = token;
      }
      return result;
    },
    [getAdminToken]
  );

  const expireAdminSession = React.useCallback(
    (message?: string) => {
      persistAdminToken(null);
      setAuthenticated(false);
      setAdminUser(null);
      if (message) {
        setAuthError(message);
      }
    },
    [persistAdminToken]
  );

  const showToast = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4500);
  };

  const refreshAdminCatalog = React.useCallback(
    async (tokenOverride?: string) => {
      setCommentsLoading(true);
      try {
        const res = await fetch('/api/admin/catalog', {
          headers: getAdminHeaders(undefined, tokenOverride),
          credentials: 'include',
        });
        if (res.status === 401) {
          expireAdminSession('Session expired. Please sign in again.');
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as {
            videos?: AdminVideoRow[];
            categories?: CategoryWithCount[];
            educators?: User[];
            comments?: AdminCommentItem[];
          };
          if (Array.isArray(data.videos)) setVideos(data.videos);
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.educators)) setEducators(data.educators);
          if (Array.isArray(data.comments)) {
            setComments(data.comments);
            setCommentsLoaded(true);
          }
        }
      } catch {
        // Keep current list on transient network failure
      } finally {
        setCommentsLoading(false);
      }
    },
    [expireAdminSession, getAdminHeaders]
  );

  const refreshComments = React.useCallback(
    async (tokenOverride?: string) => {
      setCommentsLoading(true);
      try {
        const res = await fetch('/api/admin/comments', {
          headers: getAdminHeaders(undefined, tokenOverride),
          credentials: 'include',
        });
        if (res.status === 401) {
          expireAdminSession('Session expired. Please sign in again.');
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { comments?: AdminCommentItem[] };
          if (Array.isArray(data.comments)) {
            setComments(data.comments);
            setCommentsLoaded(true);
          }
        }
      } catch {
        // Keep current list on transient network failure
      } finally {
        setCommentsLoading(false);
      }
    },
    [expireAdminSession, getAdminHeaders]
  );

  // Restore active admin session from sessionStorage when third-party iframe cookies are blocked
  React.useEffect(() => {
    if (initialAuthenticated) return;
    const storedToken = getAdminToken();
    if (!storedToken) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/auth', {
          headers: { 'x-admin-token': storedToken },
          credentials: 'include',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          authenticated?: boolean;
          admin?: AuthUser | null;
        };
        if (cancelled) return;
        if (data.authenticated) {
          setAuthenticated(true);
          setAdminUser(data.admin ?? null);
          void refreshAdminCatalog(storedToken);
        } else {
          persistAdminToken(null);
        }
      } catch {
        // Keep login gate if server unreachable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialAuthenticated, getAdminToken, persistAdminToken, refreshAdminCatalog]);

  const clearThumbnailFile = () => {
    setThumbnailUrl('');
    setThumbnailMeta(null);
    setPreviewImgBroken(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processDeviceThumbnail = async (file: File) => {
    if (!ALLOWED_THUMBNAIL_TYPES.has(file.type.toLowerCase())) {
      setErrors((prev) => ({
        ...prev,
        thumbnailUrl: 'Unsupported file type. Upload a PNG, JPG, WebP, or GIF image.',
      }));
      return;
    }

    if (file.size > MAX_THUMBNAIL_BYTES) {
      setErrors((prev) => ({
        ...prev,
        thumbnailUrl: 'Image is too large. Please choose a file under 10 MB.',
      }));
      return;
    }

    setThumbnailUploading(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.thumbnailUrl;
      return next;
    });

    try {
      const dataUrl = await readAndOptimizeThumbnailFile(file);
      const uploadRes = await fetch('/api/admin/thumbnails', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ dataUrl }),
      });

      if (uploadRes.status === 401) {
        expireAdminSession('Session expired. Please sign in again.');
        return;
      }

      const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        configured?: boolean;
        storage?: string;
        url?: string;
        bucket?: string;
        byteSize?: number;
        error?: string;
      };

      if (!uploadRes.ok) {
        setErrors((prev) => ({
          ...prev,
          thumbnailUrl:
            uploadData.error ||
            'Could not upload thumbnail to object storage. Please try again.',
        }));
        return;
      }

      if (uploadData.storage === 'object-storage' && uploadData.url) {
        setThumbnailUrl(uploadData.url);
        setThumbnailMeta({
          name: file.name,
          sizeLabel: `${formatFileSize(uploadData.byteSize ?? file.size)} · ${uploadData.bucket ?? 'hey-lady'} bucket`,
        });
      } else {
        setThumbnailUrl(dataUrl);
        setThumbnailMeta({
          name: file.name,
          sizeLabel: `${formatFileSize(file.size)} · Inline fallback (${uploadData.bucket ?? 'hey-lady'} S3 env pending)`,
        });
      }
      setPreviewImgBroken(false);
    } catch {
      setErrors((prev) => ({
        ...prev,
        thumbnailUrl: 'Could not upload image from device. Please try another file.',
      }));
    } finally {
      setThumbnailUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleThumbnailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processDeviceThumbnail(file);
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processDeviceThumbnail(file);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setVideoUrl('');
    clearThumbnailFile();
    setCategoryName('');
    setEducatorName('');
    setDurationHours(0);
    setDurationMinutes(12);
    setDurationSecondsPart(0);
    setDescription('');
    setReflectionPrompt('');
    setChapters(DEFAULT_CHAPTERS);
    setErrors({});
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatSlug('');
    setCatSlugTouched(false);
    setCatDescription('');
    setCatErrors({});
    setCatDeleteError(null);
  };

  const clearResetQueryParams = () => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', '/admin');
    }
  };

  const switchAuthView = (nextView: AdminAuthView) => {
    setAuthError(null);
    setAuthFieldErrors({});
    setResetError(null);
    setResetFieldErrors({});
    if (nextView === 'reset-request') {
      if (!resetEmail.trim() && adminEmail.trim()) {
        setResetEmail(adminEmail.trim());
      }
      setResetStatusMessage(null);
    } else if (nextView === 'login') {
      setForceResetConfirm(false);
      setResetStatusMessage(null);
    } else if (nextView === 'reset-confirm') {
      setResetStatusMessage(null);
    }
    setAuthView(nextView);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthFieldErrors({});
    setResetError(null);
    setResetStatusMessage(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const rawText = await res.text();
      let data: {
        authenticated?: boolean;
        token?: string;
        admin?: AuthUser | null;
        error?: string;
        fieldErrors?: Record<string, string>;
      } = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { error: `Authentication request failed (${res.status}).` };
        }
      }
      if (!res.ok) {
        setAuthError(data.error || 'Invalid admin email or password.');
        if (data.fieldErrors) {
          setAuthFieldErrors(data.fieldErrors);
        }
        return;
      }
      const sessionToken = typeof data.token === 'string' ? data.token : null;
      persistAdminToken(sessionToken);
      setAuthenticated(true);
      setAdminUser(data.admin ?? null);
      setAdminPassword('');
      clearResetQueryParams();
      void refreshAdminCatalog(sessionToken ?? undefined);
    } catch {
      setAuthError('Unable to reach server. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetFieldErrors({});
    setResetStatusMessage(null);
    setResetLoading(true);
    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'request',
          email: resetEmail,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!res.ok) {
        setResetError(data.error || 'Unable to send password reset OTP code.');
        if (data.fieldErrors) {
          setResetFieldErrors(data.fieldErrors);
        }
        return;
      }

      setResetOtp('');
      setResetStatusMessage(
        data.message ||
          'A 6-digit password reset OTP code has been sent to your email. Check your inbox and spam folder.'
      );
      setAuthView('reset-confirm');
    } catch {
      setResetError('Unable to reach server. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const emailToUse = resetEmail.trim();
    if (!emailToUse) {
      setAuthView('reset-request');
      setResetFieldErrors({ email: 'Enter your administrator email address first.' });
      return;
    }
    if (resendLoading) return;
    setResetError(null);
    setResetFieldErrors({});
    setResendLoading(true);
    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'request',
          email: emailToUse,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!res.ok) {
        setResetError(data.error || 'Unable to resend OTP code.');
        if (data.fieldErrors) {
          setResetFieldErrors(data.fieldErrors);
        }
        return;
      }

      setResetStatusMessage(
        data.message ||
          `A fresh 6-digit OTP code has been sent to ${emailToUse}. Check your inbox and spam folder.`
      );
    } catch {
      setResetError('Unable to reach server. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetFieldErrors({});
    setResetLoading(true);
    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'confirm',
          email: resetEmail,
          otp: resetOtp,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!res.ok) {
        setResetError(data.error || 'Unable to verify OTP and update password.');
        if (data.fieldErrors) {
          setResetFieldErrors(data.fieldErrors);
        }
        return;
      }

      clearResetQueryParams();
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      if (authenticated) {
        setForceResetConfirm(false);
        setAuthView('login');
        setResetStatusMessage(null);
        showToast(data.message || 'Your admin password has been updated.');
      } else {
        setAuthError(null);
        setAuthFieldErrors({});
        setResetStatusMessage(
          data.message || 'Your admin password has been updated. Sign in with your new password.'
        );
        setAuthView('login');
      }
    } catch {
      setResetError('Unable to reach server. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleHeaderResetPassword = async () => {
    if (!adminUser?.email || headerResetLoading) return;
    setHeaderResetLoading(true);
    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          action: 'request',
          email: adminUser.email,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        showToast(data.error || 'Could not send password reset OTP email.', 'error');
        return;
      }
      setResetEmail(adminUser.email);
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetError(null);
      setResetFieldErrors({});
      setResetStatusMessage(
        data.message ||
          `A 6-digit password reset OTP code has been sent to ${adminUser.email}. Enter it below.`
      );
      setAuthView('reset-confirm');
      setForceResetConfirm(true);
    } catch {
      showToast('Unable to reach server to send a password reset OTP.', 'error');
    } finally {
      setHeaderResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', {
      method: 'DELETE',
      headers: getAdminHeaders(),
      credentials: 'include',
    });
    persistAdminToken(null);
    setAuthenticated(false);
    setAdminUser(null);
    setForceResetConfirm(false);
    setAuthView('login');
    setComments([]);
    setCommentsLoaded(false);
    resetForm();
    resetCategoryForm();
    router.refresh();
  };

  const handleStartEdit = (video: AdminVideoRow) => {
    setActiveTab('links');
    setMobileNavOpen(false);
    setEditingId(video.id);
    setTitle(video.title);
    setVideoUrl(video.videoUrl);
    setThumbnailUrl(video.thumbnailUrl);
    setThumbnailMeta({
      name: 'Current saved thumbnail',
      sizeLabel: 'Saved',
    });
    setCategoryName(video.category.name);
    setEducatorName(video.creator.name);
    const hms = splitDurationToHms(video.durationSeconds);
    setDurationHours(hms.hours);
    setDurationMinutes(hms.minutes);
    setDurationSecondsPart(hms.seconds);
    setDescription(video.description);
    setReflectionPrompt(video.reflectionPrompt);
    setChapters(
      video.chapters.length > 0
        ? video.chapters.map((ch) => ({
            timestamp: formatDuration(ch.timestampSeconds),
            title: ch.title,
          }))
        : DEFAULT_CHAPTERS
    );
    setErrors({});
    setPreviewImgBroken(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickCompose = (draft: {
    url: string;
    categoryName: string;
    durationMinutes: number;
  }) => {
    resetForm();
    if (/^https?:\/\//i.test(draft.url)) {
      setVideoUrl(draft.url);
    } else if (draft.url) {
      setTitle(draft.url);
    }
    if (draft.categoryName) {
      setCategoryName(draft.categoryName);
    }
    setDurationHours(0);
    setDurationMinutes(draft.durationMinutes);
    setDurationSecondsPart(0);
    setActiveTab('links');
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickUploadThumbnail = () => {
    resetForm();
    setActiveTab('links');
    setMobileNavOpen(false);
    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 120);
  };

  const handleOpenAddWithEducator = (name?: string) => {
    resetForm();
    if (name) {
      setEducatorName(name);
    }
    setActiveTab('links');
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddChapter = () => {
    setChapters((prev) => [...prev, { timestamp: '', title: '' }]);
  };

  const handleUpdateChapter = (
    idx: number,
    field: 'timestamp' | 'title',
    value: string
  ) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === idx ? { ...ch, [field]: value } : ch))
    );
  };

  const handleRemoveChapter = (idx: number) => {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
    );
    const matchedEducator = educators.find(
      (ed) => ed.name.toLowerCase() === educatorName.trim().toLowerCase()
    );

    const payload = {
      title,
      description,
      categoryId: matchedCategory?.id,
      categoryName: categoryName.trim(),
      userId: matchedEducator?.id,
      educatorName: educatorName.trim(),
      videoUrl,
      thumbnailUrl,
      durationSeconds: totalDurationSeconds,
      reflectionPrompt,
      chapters,
    };

    const validation = validateUploadPayload(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const endpoint = editingId ? `/api/videos/${editingId}` : '/api/videos';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 401) {
        expireAdminSession('Session expired. Please sign in again.');
        return;
      }

      if (!res.ok) {
        setErrors(data.errors ?? { form: data.error ?? 'Could not save video link.' });
        return;
      }

      const savedVideo: VideoWithMeta = data.video;
      const mappedChapters: VideoChapter[] = validation.parsedChapters.map((c, idx) => ({
        id: `ch-local-${idx}`,
        videoId: savedVideo.id,
        timestampSeconds: c.timestampSeconds,
        title: c.title,
      }));

      setCategories((prev) =>
        prev.some((c) => c.id === savedVideo.category.id)
          ? prev
          : [...prev, { ...savedVideo.category, videoCount: 1 }]
      );
      setEducators((prev) =>
        prev.some((ed) => ed.id === savedVideo.creator.id)
          ? prev
          : [...prev, savedVideo.creator]
      );

      if (editingId) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === editingId ? { ...savedVideo, chapters: mappedChapters } : v
          )
        );
        showToast('Saved changes to video link & thumbnail.');
      } else {
        setVideos((prev) => [{ ...savedVideo, chapters: mappedChapters }, ...prev]);
        showToast('New external video link published to viewer feed.');
      }

      resetForm();
      router.refresh();
    } catch {
      setErrors({ form: 'Network error while saving video link.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
        credentials: 'include',
      });
      if (res.status === 401) {
        expireAdminSession('Session expired. Please sign in again.');
        return;
      }
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        setComments((prev) => prev.filter((c) => c.videoId !== id));
        if (editingId === id) resetForm();
        setConfirmDeleteId(null);
        showToast('Video link removed from catalog.');
        router.refresh();
      }
    } catch {
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
        credentials: 'include',
      });
      if (res.status === 401) {
        expireAdminSession('Session expired. Please sign in again.');
        return;
      }
      if (res.ok) {
        setComments((prev) =>
          prev.filter((c) => c.id !== commentId && c.parentId !== commentId)
        );
        setConfirmDeleteCommentId(null);
        showToast('User comment removed.');
        router.refresh();
      }
    } catch {
      setConfirmDeleteCommentId(null);
    }
  };

  const handleStartEditCategory = (cat: CategoryWithCount) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatSlugTouched(true);
    setCatDescription(cat.description);
    setCatErrors({});
    setCatDeleteError(null);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatDeleteError(null);

    const payload = {
      name: catName,
      slug: catSlug,
      description: catDescription,
    };

    const validation = validateCategoryPayload(payload);
    if (!validation.valid) {
      setCatErrors(validation.errors);
      return;
    }

    setCatErrors({});
    setCatSaving(true);
    try {
      const endpoint = editingCategoryId
        ? `/api/categories/${editingCategoryId}`
        : '/api/categories';
      const method = editingCategoryId ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 401) {
        expireAdminSession('Session expired. Please sign in again.');
        return;
      }

      if (!res.ok) {
        setCatErrors(data.errors ?? { form: data.error ?? 'Could not save category.' });
        return;
      }

      const savedCat: CategoryWithCount = data.category;

      if (editingCategoryId) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategoryId ? savedCat : c))
        );
        setVideos((prev) =>
          prev.map((v) =>
            v.categoryId === editingCategoryId
              ? {
                  ...v,
                  category: {
                    id: savedCat.id,
                    name: savedCat.name,
                    slug: savedCat.slug,
                    description: savedCat.description,
                  },
                }
              : v
          )
        );
        showToast(`Category "${savedCat.name}" updated on homepage & sidebar.`);
      } else {
        setCategories((prev) => [...prev, savedCat]);
        showToast(`Category "${savedCat.name}" added to homepage tags.`);
      }

      resetCategoryForm();
      router.refresh();
    } catch {
      setCatErrors({ form: 'Network error while saving category.' });
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setCatDeleteError(null);
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
        credentials: 'include',
      });
      const data = await res.json();

      if (res.status === 401) {
        expireAdminSession('Session expired. Please sign in again.');
        return;
      }

      if (!res.ok) {
        setCatDeleteError(data.error ?? 'Unable to delete category.');
        setConfirmDeleteCatId(null);
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== catId));
      if (editingCategoryId === catId) {
        resetCategoryForm();
      }
      setConfirmDeleteCatId(null);
      showToast('Category tag removed from homepage.');
      router.refresh();
    } catch {
      setCatDeleteError('Network error while deleting category.');
      setConfirmDeleteCatId(null);
    }
  };

  const navigateTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    if (tab === 'comments' && !commentsLoaded) {
      void refreshComments();
    }
  };

  // Unauthenticated Admin Login & Email OTP Password Reset Gate
  if (!authenticated || forceResetConfirm) {
    return (
      <AdminAuthGate
        authView={authView}
        authenticated={authenticated}
        adminEmail={adminEmail}
        adminPassword={adminPassword}
        showPassword={showPassword}
        authError={authError}
        authFieldErrors={authFieldErrors}
        authLoading={authLoading}
        resetEmail={resetEmail}
        resetOtp={resetOtp}
        newPassword={newPassword}
        confirmNewPassword={confirmNewPassword}
        showNewPassword={showNewPassword}
        showConfirmPassword={showConfirmPassword}
        resetLoading={resetLoading}
        resendLoading={resendLoading}
        resetError={resetError}
        resetFieldErrors={resetFieldErrors}
        resetStatusMessage={resetStatusMessage}
        onAdminEmailChange={setAdminEmail}
        onAdminPasswordChange={setAdminPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        onResetEmailChange={setResetEmail}
        onResetOtpChange={setResetOtp}
        onNewPasswordChange={setNewPassword}
        onConfirmNewPasswordChange={setConfirmNewPassword}
        onToggleShowNewPassword={() => setShowNewPassword((prev) => !prev)}
        onToggleShowConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
        onSwitchView={switchAuthView}
        onBackFromConfirm={() => {
          clearResetQueryParams();
          switchAuthView('login');
        }}
        onLoginSubmit={handleAuthSubmit}
        onResetRequestSubmit={handleResetRequestSubmit}
        onResetConfirmSubmit={handleResetConfirmSubmit}
        onResendOtp={handleResendOtp}
      />
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="space-y-5">
        {/* Studio Brand Header */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => navigateTab('overview')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <ParticleOrbCrest variant="compact" />
            <div>
              <p className="font-display text-sm font-bold text-white leading-tight">
                Hey{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  Lady
                </span>
              </p>
              <p className="text-[0.625rem] text-zinc-400 leading-tight">
                Creator Studio · 18+
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close studio sidebar"
            className="lg:hidden inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.08] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Crisp Pure-White Primary Action CTA (Exact Mirror of Reference Sidebar) */}
        <button
          type="button"
          data-testid="studio-sidebar-add-btn"
          onClick={() => {
            resetForm();
            navigateTab('links');
          }}
          className="flex h-9 w-full items-center justify-between rounded-xl bg-white px-3.5 text-xs font-semibold text-[#090808] hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-black/30"
        >
          <span>New video link</span>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Workspace Navigation */}
        <div>
          <p className="px-2.5 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-500">
            Studio
          </p>
          <nav
            role="tablist"
            aria-label="Admin management sections"
            className="space-y-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => navigateTab('overview')}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'overview'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
              )}
            >
              <span className="inline-flex items-center gap-2.5">
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Overview</span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'links'}
              onClick={() => navigateTab('links')}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'links'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
              )}
            >
              <span className="inline-flex items-center gap-2.5">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                <span>Video Links</span>
              </span>
              <span className="font-mono text-[0.625rem] text-zinc-400 tabular-nums">
                {videos.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'categories'}
              onClick={() => navigateTab('categories')}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'categories'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
              )}
            >
              <span className="inline-flex items-center gap-2.5">
                <Tag className="h-4 w-4" aria-hidden="true" />
                <span>Categories</span>
              </span>
              <span className="font-mono text-[0.625rem] text-zinc-400 tabular-nums">
                {categoriesWithLiveCounts.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'comments'}
              onClick={() => navigateTab('comments')}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'comments'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
              )}
            >
              <span className="inline-flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span>Comments</span>
              </span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 font-mono text-[0.625rem] font-bold text-[#090808] tabular-nums">
                {stats.totalComments}
              </span>
            </button>
          </nav>
        </div>

        {/* Collections (Live Neon Categories with Dot Markers) */}
        <div>
          <p className="px-2.5 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-500">
            Collections
          </p>
          <div className="space-y-0.5">
            {categoriesWithLiveCounts.slice(0, 5).map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategorySlug((prev) =>
                    prev === cat.slug ? 'all' : cat.slug
                  );
                  if (activeTab === 'categories' || activeTab === 'comments') {
                    setActiveTab('overview');
                  }
                  setMobileNavOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
                  selectedCategorySlug === cat.slug
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                )}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      getCollectionDotClass(idx)
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="font-mono text-[0.625rem] text-zinc-500 tabular-nums shrink-0">
                  {cat.videoCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Saved Links */}
        {videos.length > 0 && (
          <div>
            <p className="px-2.5 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-500">
              Recent
            </p>
            <div className="space-y-1">
              {videos.slice(0, 2).map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleStartEdit(video)}
                  className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <div className="h-6 w-6 shrink-0 overflow-hidden rounded-md bg-zinc-900 border border-white/10">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="flex-1 truncate text-xs text-zinc-300 group-hover:text-white">
                    {video.title}
                  </span>
                  <span className="font-mono text-[0.625rem] text-zinc-500 tabular-nums shrink-0">
                    {formatDuration(video.durationSeconds)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Security Card & Signed-In Admin Profile */}
      <div className="space-y-3 pt-2">
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/15 via-[#181210] to-[#121010] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
              <span>Neon Auth</span>
            </span>
            {adminUser?.email && (
              <button
                type="button"
                disabled={headerResetLoading}
                data-testid="admin-header-reset-password-btn"
                onClick={handleHeaderResetPassword}
                className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer disabled:opacity-60"
              >
                <KeyRound className="h-3 w-3" aria-hidden="true" />
                <span>{headerResetLoading ? 'Sending...' : 'Reset'}</span>
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-zinc-400 leading-relaxed">
            PostgreSQL catalog &amp; password recovery active.
          </p>
        </div>

        <div className="border-t border-white/[0.07] pt-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>View Live Site</span>
          </Link>
        </div>

        <div
          data-testid="admin-signed-in-badge"
          className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-[0.6875rem] font-bold text-white">
              {getEducatorInitials(adminUser?.name ?? 'Admin')}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {adminUser?.name ?? 'Administrator'}
              </p>
              <p className="text-[0.625rem] text-zinc-500 truncate">
                {adminUser?.email ?? 'Admin session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign Out"
            title="Sign Out"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-testid="admin-studio-workspace"
      className="min-h-dvh bg-[#080707] text-zinc-100 flex"
    >
      {/* Desktop Left Studio Rail */}
      <aside
        aria-label="Studio sidebar navigation"
        className="hidden lg:flex w-[14.5rem] shrink-0 sticky top-0 h-dvh overflow-y-auto border-r border-white/[0.07] bg-[#0D0B0B] px-3.5 py-4 flex-col"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Studio Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation drawer"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-default"
          />
          <aside className="relative z-10 w-[min(82vw,16.5rem)] max-w-[84vw] h-full overflow-y-auto border-r border-white/10 bg-[#0D0B0B] px-4 py-4 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Studio Surface */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Studio Breadcrumb & Utility Bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-white/[0.06] bg-[#080707]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open studio navigation"
              className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.1] cursor-pointer"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs truncate">
              <button
                type="button"
                onClick={() => navigateTab('overview')}
                className="font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Studio
              </button>
              <span className="text-zinc-600" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-white truncate">
                {TAB_BREADCRUMB[activeTab]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Catalog Search Input */}
            <div className="relative hidden sm:block w-48 md:w-60">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500"
                aria-hidden="true"
              />
              <label htmlFor="studio-global-search" className="sr-only">
                Search admin catalog
              </label>
              <input
                id="studio-global-search"
                type="search"
                value={studioSearch}
                onChange={(e) => setStudioSearch(e.target.value)}
                placeholder="Search catalog..."
                className="h-8 w-full rounded-full border border-white/10 bg-[#141212] pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/60 focus:outline-none transition-colors"
              />
            </div>

            {/* Warm Amber-Lit Plays Pill Badge (Mirrors Reference Top-Right Pill) */}
            <button
              type="button"
              onClick={() => navigateTab('overview')}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-orange-500/25 bg-[#161210] px-3 text-xs font-semibold text-zinc-100 hover:border-orange-500/50 transition-colors cursor-pointer tabular-nums whitespace-nowrap"
            >
              <Zap className="h-3.5 w-3.5 text-orange-400 fill-orange-400/30" aria-hidden="true" />
              <span>{formatViews(stats.totalViews)}</span>
            </button>

            <Link
              href="/"
              aria-label="Open live public website"
              title="Open live public website"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#141212] text-zinc-300 hover:border-white/25 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Inline Toast Feedback */}
        {toast && (
          <div className="px-4 sm:px-6 pt-4">
            <div
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium',
                toast.tone === 'error'
                  ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
                  : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              )}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Workspace Content */}
        <div className="flex-1 p-4 sm:p-6">
          {activeTab === 'overview' && (
            <div className="flex flex-col xl:flex-row gap-5 items-start">
              <div className="flex-1 min-w-0 w-full">
                <AdminOverview
                  adminName={adminUser?.name ?? 'Admin'}
                  videos={videos}
                  categories={categoriesWithLiveCounts}
                  totalViews={stats.totalViews}
                  totalComments={stats.totalComments}
                  searchQuery={studioSearch}
                  selectedCategorySlug={selectedCategorySlug}
                  onSelectCategorySlug={setSelectedCategorySlug}
                  onQuickCompose={handleQuickCompose}
                  onQuickUploadThumbnail={handleQuickUploadThumbnail}
                  onOpenNewCategory={() => navigateTab('categories')}
                  onOpenComments={() => navigateTab('comments')}
                  onOpenAllLinks={() => navigateTab('links')}
                  onEditVideo={handleStartEdit}
                  onShareVideo={setShareTarget}
                />
              </div>

              <AdminInsightsRail
                videos={videos}
                categories={categoriesWithLiveCounts}
                educators={educators}
                comments={comments}
                totalViews={stats.totalViews}
                totalLikes={stats.totalLikes}
                onEditVideo={handleStartEdit}
                onOpenAllLinks={() => navigateTab('links')}
                onOpenAddWithEducator={handleOpenAddWithEducator}
                onOpenComments={() => navigateTab('comments')}
                onFilterByCategory={(slug) => setSelectedCategorySlug(slug)}
              />
            </div>
          )}

          {activeTab === 'links' && (
            <AdminLinksManager
              videos={videos}
              editingId={editingId}
              confirmDeleteId={confirmDeleteId}
              title={title}
              videoUrl={videoUrl}
              thumbnailUrl={thumbnailUrl}
              thumbnailMeta={thumbnailMeta}
              thumbnailUploading={thumbnailUploading}
              isDragOver={isDragOver}
              categoryName={categoryName}
              educatorName={educatorName}
              durationHours={durationHours}
              durationMinutes={durationMinutes}
              durationSecondsPart={durationSecondsPart}
              totalDurationSeconds={totalDurationSeconds}
              description={description}
              reflectionPrompt={reflectionPrompt}
              chapters={chapters}
              errors={errors}
              saving={saving}
              previewImgBroken={previewImgBroken}
              fileInputRef={fileInputRef}
              searchQuery={studioSearch}
              selectedCategorySlug={selectedCategorySlug}
              onSearchQueryChange={setStudioSearch}
              onClearCategoryFilter={() => setSelectedCategorySlug('all')}
              onTitleChange={setTitle}
              onVideoUrlChange={setVideoUrl}
              onCategoryNameChange={setCategoryName}
              onEducatorNameChange={setEducatorName}
              onDurationHoursChange={setDurationHours}
              onDurationMinutesChange={setDurationMinutes}
              onDurationSecondsChange={setDurationSecondsPart}
              onDescriptionChange={setDescription}
              onReflectionPromptChange={setReflectionPrompt}
              onDragOverChange={setIsDragOver}
              onThumbnailInputChange={handleThumbnailInputChange}
              onThumbnailDrop={handleThumbnailDrop}
              onClearThumbnail={clearThumbnailFile}
              onPreviewImgBroken={() => setPreviewImgBroken(true)}
              onAddChapter={handleAddChapter}
              onUpdateChapter={handleUpdateChapter}
              onRemoveChapter={handleRemoveChapter}
              onResetForm={resetForm}
              onSubmit={handleSubmit}
              onStartEdit={handleStartEdit}
              onShare={setShareTarget}
              onSetConfirmDeleteId={setConfirmDeleteId}
              onDelete={handleDelete}
            />
          )}

          {activeTab === 'categories' && (
            <AdminCategoriesManager
              categories={categoriesWithLiveCounts}
              editingCategoryId={editingCategoryId}
              confirmDeleteCatId={confirmDeleteCatId}
              catName={catName}
              catSlug={catSlug}
              catSlugTouched={catSlugTouched}
              catDescription={catDescription}
              catErrors={catErrors}
              catSaving={catSaving}
              catDeleteError={catDeleteError}
              onCatNameChange={setCatName}
              onCatSlugChange={(val) => {
                setCatSlugTouched(true);
                setCatSlug(val);
              }}
              onCatDescriptionChange={setCatDescription}
              onResetCategoryForm={resetCategoryForm}
              onCategorySubmit={handleCategorySubmit}
              onStartEditCategory={handleStartEditCategory}
              onRequestDeleteCategory={(id) => {
                setCatDeleteError(null);
                setConfirmDeleteCatId(id);
              }}
              onConfirmDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeTab === 'comments' && (
            <AdminCommentsManager
              comments={comments}
              filteredComments={filteredComments}
              commentSearch={commentSearch}
              commentsLoading={commentsLoading}
              confirmDeleteCommentId={confirmDeleteCommentId}
              onCommentSearchChange={setCommentSearch}
              onRefreshComments={() => void refreshComments()}
              onRequestDeleteComment={setConfirmDeleteCommentId}
              onConfirmDeleteComment={handleDeleteComment}
            />
          )}
        </div>
      </div>

      <ShareModal target={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
