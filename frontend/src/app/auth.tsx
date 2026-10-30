import {
  Bookmark,
  Camera,
  Settings,
  Pencil,
  KeyRound,
  LogOut,
  X,
  ArrowLeft,
  History,
  Shield,
  User,
  Eye,
  EyeOff,
  MapPin,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { api, type Profile, type Page } from "../lib/api/client";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import {
  ErrorText,
  State,
  useMe,
  useLogout,
  PlaceCard,
  Pager,
  sanitizeReturnTo,
} from "./shared";

import type { FeedItem, VisualPlace } from "../lib/api/visual";
import { PhotoCard } from "./discovery";
import { MasonryFeed } from "./masonry";

const schema = z.object({
  email: z.email("Email không hợp lệ."),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự."),
  display_name: z.string().optional(),
});
type Values = z.infer<typeof schema>;
export function Auth({ register = false }: { register?: boolean }) {
  const navigate = useNavigate(),
    location = useLocation(),
    cache = useQueryClient();
  const [searchParams] = useSearchParams();
  const me = useMe();
  const mode = useQuery({
    queryKey: ["login-mode"],
    queryFn: () => api<{ debug_login: boolean }>("auth/csrf/"),
    enabled: !register,
    retry: false,
  });
  const debugLogin = !register && mode.data?.debug_login === true;
  const [reveal, setReveal] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (me.data) {
      const intent = location.state as { returnTo?: string } | null;
      const target =
        sanitizeReturnTo(intent?.returnTo || searchParams.get("returnTo")) ||
        "/discover";
      navigate(target, { replace: true });
    }
  }, [me.data, location.state, searchParams, navigate]);

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      api<Profile>(register ? "auth/register/" : "auth/login/", {
        method: "POST",
        body: JSON.stringify(
          register
            ? values
            : { email: values.email, password: values.password },
        ),
      }),
    onSuccess: async (user) => {
      cache.clear();
      cache.setQueryData(["me"], user);
      const intent = location.state as {
        returnTo?: string;
        savePlace?: string;
      } | null;
      if (intent?.savePlace)
        await api("favorites/" + intent.savePlace + "/", { method: "PUT" });
      const target =
        sanitizeReturnTo(intent?.returnTo || searchParams.get("returnTo")) ||
        "/discover";
      navigate(target, { replace: true });
    },
  });
  useEffect(() => {
    const path = location.pathname;
    const title = register ? "Tạo tài khoản" : "Đăng nhập";
    document.title = title + " · Rendez";
    let description = "Đăng nhập để lưu địa điểm và đăng ảnh.";
    if (register) description = "Tạo tài khoản để lưu địa điểm và đăng ảnh.";
    else if (path === "/login") description = "Đăng nhập để tiếp tục khám phá.";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [register, location.pathname]);
  if (me.data) {
    return <State pending />;
  }

  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Link className="brand" to="/discover">
          Rendez<span className="brand-dot">●</span>
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow">ĐÀ NẴNG · VIỆT NAM</span>
          <h2>
            Những nơi
            <br />
            muốn quay lại.
          </h2>
          <p>
            Khám phá thành phố qua ảnh. Lưu địa điểm bạn thích, chia sẻ góc nhìn
            của bạn.
          </p>
        </div>
        <span className="auth-story-footer">
          Biển Mỹ Khê · Ảnh Christophe95 / CC BY-SA 4.0
        </span>
      </aside>
      <section className="auth-panel">
        <Link className="brand" to="/discover">
          Rendez
        </Link>
        <h1>{register ? "Tạo tài khoản" : "Đăng nhập"}</h1>
        <p className="muted">
          {register
            ? "Tạo tài khoản để lưu địa điểm và đăng ảnh."
            : "Đăng nhập để lưu địa điểm và đăng ảnh của bạn."}
        </p>
        <form
          onSubmit={(event) => {
            void form.handleSubmit((values) => {
              if (register && !values.display_name?.trim()) {
                form.setError("display_name", {
                  message: "Nhập tên hiển thị.",
                });
                return;
              }
              mutation.mutate(values);
            })(event);
          }}
        >
          {register && (
            <div className="auth-field">
              <label htmlFor="auth-name">Tên hiển thị</label>
              <input
                id="auth-name"
                autoComplete="nickname"
                maxLength={100}
                aria-invalid={!!form.formState.errors.display_name}
                aria-describedby="auth-name-error"
                {...form.register("display_name")}
              />
              <span id="auth-name-error" className="error" role="alert">
                {form.formState.errors.display_name?.message}
              </span>
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby="auth-email-error"
              {...form.register("email")}
            />
            <span id="auth-email-error" className="error" role="alert">
              {form.formState.errors.email?.message}
            </span>
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">Mật khẩu</label>
            <div className="password-field">
              <input
                id="auth-password"
                type={reveal ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                aria-invalid={!!form.formState.errors.password}
                aria-describedby="auth-password-error"
                {...form.register("password")}
              />
              <Button
                type="button"
                variant="outline"
                aria-label={reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={reveal}
                onClick={() => setReveal(!reveal)}
              >
                {reveal ? (
                  <EyeOff size={20} aria-hidden />
                ) : (
                  <Eye size={20} aria-hidden />
                )}
              </Button>
            </div>
            <span id="auth-password-error" className="error" role="alert">
              {form.formState.errors.password?.message}
            </span>
          </div>
          <ErrorText error={mutation.error} />
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending
              ? register
                ? "Đang tạo tài khoản…"
                : "Đang đăng nhập…"
              : register
                ? "Tạo tài khoản"
                : "Đăng nhập"}
          </Button>
          {debugLogin && !register && (
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ email: "", password: "" })}
            >
              Đăng nhập trải nghiệm nhanh
            </Button>
          )}
        </form>
        <Link
          to={(register ? "/login" : "/register") + location.search}
          state={location.state}
        >
          {register ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản mới"}
        </Link>
      </section>
    </div>
  );
}
export function ProfilePage() {
  const me = useMe();
  const [params] = useSearchParams();
  const saved = params.get("tab") === "saved";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [view, setView] = useState<"menu" | "name" | "password">("menu");
  const dialog = useRef<HTMLDialogElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (settingsOpen) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [settingsOpen]);
  const logout = useLogout();
  if (me.isPending) return <State pending />;
  if (me.isError)
    return <State error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data) return null;
  const openSettings = (next: typeof view) => {
    setView(next);
    setSettingsOpen(true);
  };
  return (
    <section className="profile-page">
      <div className="profile-hero-card">
        <div className="profile-hero-banner" />
        <div className="profile-hero-body">
          <div className="profile-avatar-wrap">
            <span className="avatar profile-avatar" aria-hidden>
              {me.data.display_name.slice(0, 1).toUpperCase() || <User />}
            </span>
            {me.data.is_staff && (
              <span className="profile-badge-icon" title="Quản trị viên">
                <Shield size={16} />
              </span>
            )}
          </div>
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1>{me.data.display_name}</h1>
              {me.data.is_staff ? (
                <span className="profile-role-badge admin">
                  <Shield size={13} aria-hidden /> Quản trị viên
                </span>
              ) : (
                <span className="profile-role-badge member">
                  <Sparkles size={13} aria-hidden /> Thành viên Rendez
                </span>
              )}
            </div>
            <p className="profile-sub-meta">
              <span>
                <MapPin size={14} aria-hidden /> Đà Nẵng, Việt Nam
              </span>
              <span>•</span>
              <span>{me.data.email}</span>
            </p>
          </div>
          <button
            className="profile-settings-button"
            ref={settingsTrigger}
            aria-label="Cài đặt tài khoản"
            title="Cài đặt tài khoản"
            onClick={() => openSettings("menu")}
          >
            <Settings size={18} aria-hidden />
            <span>Cài đặt</span>
          </button>
        </div>

        <div className="profile-quick-stats">
          <div className="stat-box">
            <strong>{me.data.photo_count ?? 0}</strong>
            <span>Ảnh đã chia sẻ</span>
          </div>
          <div className="stat-box">
            <strong>{me.data.saved_count ?? 0}</strong>
            <span>Địa điểm đã lưu</span>
          </div>
          <div className="stat-box">
            <strong>Đà Nẵng</strong>
            <span>Thành phố khám phá</span>
          </div>
        </div>
      </div>

      <nav className="profile-tabs" aria-label="Nội dung cá nhân">
        <Link to="/profile" aria-current={!saved ? "page" : undefined}>
          <Camera size={18} aria-hidden />
          Ảnh đã đăng <span>{me.data.photo_count ?? 0}</span>
        </Link>
        <Link to="/profile?tab=saved" aria-current={saved ? "page" : undefined}>
          <Bookmark size={18} aria-hidden />
          Đã lưu <span>{me.data.saved_count ?? 0}</span>
        </Link>
      </nav>
      <ProfileCollection key={saved ? "saved" : "photos"} saved={saved} />
      <dialog
        ref={dialog}
        className="profile-settings-dialog"
        aria-labelledby="profile-settings-title"
        onCancel={() => setSettingsOpen(false)}
        onClose={() => {
          setSettingsOpen(false);
          settingsTrigger.current?.focus();
        }}
      >
        <header className="profile-dialog-header">
          {view !== "menu" && (
            <button
              type="button"
              className="profile-settings-button"
              aria-label="Quay lại cài đặt"
              onClick={() => setView("menu")}
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
          )}
          <h2 id="profile-settings-title">
            {view === "name"
              ? "Chỉnh sửa hồ sơ"
              : view === "password"
                ? "Đổi mật khẩu"
                : "Cài đặt tài khoản"}
          </h2>
          <button
            type="button"
            className="profile-settings-button"
            aria-label="Đóng cài đặt"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        {settingsOpen &&
          (view === "menu" ? (
            <div className="profile-settings-menu">
              <div className="profile-account-email">
                <span>Email</span>
                <strong>{me.data.email}</strong>
              </div>
              <button onClick={() => setView("name")}>
                <Pencil size={18} aria-hidden />
                Chỉnh sửa hồ sơ
              </button>
              <button onClick={() => setView("password")}>
                <KeyRound size={18} aria-hidden />
                Đổi mật khẩu
              </button>
              <Link to="/submissions" onClick={() => dialog.current?.close()}>
                <History size={18} aria-hidden />
                Lịch sử đăng ảnh
              </Link>
              {me.data.is_staff && (
                <a href="/admin/">
                  <Shield size={18} aria-hidden />
                  Quản trị
                </a>
              )}
              <button
                className="danger-button"
                disabled={logout.isPending}
                onClick={() => setConfirmLogout(true)}
              >
                <LogOut size={18} aria-hidden />
                Đăng xuất
              </button>
              <ConfirmDialog
                open={confirmLogout}
                title="Đăng xuất"
                description="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Rendez không?"
                confirmLabel="Đăng xuất"
                cancelLabel="Ở lại"
                isDestructive
                isLoading={logout.isPending}
                onConfirm={() => {
                  logout.mutate(undefined, {
                    onSettled: () => setConfirmLogout(false),
                  });
                }}
                onCancel={() => setConfirmLogout(false)}
              />
              <ErrorText error={logout.error} />
            </div>
          ) : (
            <AccountSettings key={view} profile={me.data} mode={view} />
          ))}
      </dialog>
    </section>
  );
}

function ProfileCollection({ saved }: { saved: boolean }) {
  const [params] = useSearchParams(),
    me = useMe();
  const page = params.get("page") || "1";
  const photos = useQuery({
    queryKey: ["profile-photos", me.data?.id, page],
    enabled: !saved,
    queryFn: ({ signal }) =>
      api<Page<FeedItem>>("feed/?mine=true&page=" + page, { signal }),
  });
  const places = useQuery({
    queryKey: ["profile-saved", me.data?.id, page],
    enabled: saved,
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("favorites/?page=" + page, { signal }),
  });
  const result = saved ? places : photos;
  return (
    <div className="profile-content">
      <State
        pending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
      />
      {result.data?.count === 0 && (
        <section className="profile-empty-card">
          <div className="empty-visual-icon">
            {saved ? (
              <Bookmark size={36} aria-hidden />
            ) : (
              <Camera size={36} aria-hidden />
            )}
          </div>
          <h2>
            {saved
              ? "Chưa có địa điểm nào trong danh sách lưu"
              : "Bạn chưa chia sẻ khoảnh khắc nào"}
          </h2>
          <p>
            {saved
              ? "Hãy dạo quanh trang Khám phá và lưu lại các địa điểm tại Đà Nẵng mà bạn yêu thích."
              : "Đăng tải góc check-in, không gian hoặc đồ uống yêu thích của bạn để chia sẻ cùng cộng đồng Rendez!"}
          </p>
          <div className="profile-empty-actions">
            <Button asChild>
              <Link to={saved ? "/discover" : "/submissions/new"}>
                {saved ? "Khám phá địa điểm ngay" : "Đăng ảnh đầu tiên"}
              </Link>
            </Button>
            {!saved && (
              <Button asChild variant="outline">
                <Link to="/discover">Xem ảnh cộng đồng</Link>
              </Button>
            )}
          </div>
        </section>
      )}
      {saved ? (
        <div className="place-grid">
          {places.data?.results.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <MasonryFeed className="pin-feed">
          {photos.data?.results.map(({ photo, place }) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              place={place}
              from="/profile"
            />
          ))}
        </MasonryFeed>
      )}
      {result.data && (result.data.next || result.data.previous) && (
        <Pager next={result.data.next} previous={result.data.previous} />
      )}
    </div>
  );
}

function AccountSettings({
  profile,
  mode,
}: {
  profile: Profile;
  mode: "name" | "password";
}) {
  const cache = useQueryClient();
  const [name, setName] = useState(profile.display_name);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const update = useMutation({
    mutationFn: () =>
      api<Profile>("auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ display_name: name }),
      }),
    onSuccess: (user) => cache.setQueryData(["me"], user),
  });
  const change = useMutation({
    mutationFn: () =>
      api<void>("auth/password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: current,
          new_password: password,
        }),
      }),
    onSuccess: () => {
      setCurrent("");
      setPassword("");
    },
  });
  return (
    <div className="account-settings">
      {mode === "name" && (
        <section className="panel">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate();
            }}
          >
            <label>
              Tên hiển thị
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  update.reset();
                }}
                required
                maxLength={100}
                autoComplete="nickname"
              />
            </label>
            <Button disabled={!name.trim() || update.isPending}>
              {update.isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
            <ErrorText error={update.error} />
            {update.isSuccess && (
              <p className="success" role="status">
                Đã cập nhật tên.
              </p>
            )}
          </form>
        </section>
      )}
      {mode === "password" && (
        <section className="panel">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              change.mutate();
            }}
          >
            <label>
              Mật khẩu hiện tại
              <input
                type="password"
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value);
                  change.reset();
                }}
                required
                autoComplete="current-password"
              />
            </label>
            <div className="auth-field">
              <label htmlFor="profile-new-password">Mật khẩu mới</label>
              <input
                id="profile-new-password"
                aria-describedby="profile-password-hint"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  change.reset();
                }}
                required
                minLength={8}
                maxLength={4096}
                autoComplete="new-password"
              />
              <small id="profile-password-hint" className="muted">
                Ít nhất 8 ký tự. Tránh mật khẩu phổ biến hoặc chỉ gồm số.
              </small>
            </div>
            <Button disabled={change.isPending}>
              {change.isPending ? "Đang đổi…" : "Đổi mật khẩu"}
            </Button>
            <ErrorText error={change.error} />
            {change.isSuccess && (
              <p className="success" role="status">
                Đã đổi mật khẩu.
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
