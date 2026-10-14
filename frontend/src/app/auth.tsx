import {
  Bookmark,
  Camera,
  Images,
  ArrowUpRight,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api, type Profile } from "../lib/api/client";
import { Button } from "../components/ui/button";
import { ErrorText, State, useMe } from "./shared";

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
  const mode = useQuery({
    queryKey: ["login-mode"],
    queryFn: () => api<{ debug_login: boolean }>("auth/csrf/"),
    enabled: !register,
    retry: false,
  });
  const debugLogin = !register && mode.data?.debug_login === true;
  const [reveal, setReveal] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
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
      navigate(
        intent?.returnTo?.startsWith("/") &&
          !intent.returnTo.startsWith("//") &&
          !intent.returnTo.includes("\\")
          ? intent.returnTo
          : "/discover",
        { replace: true },
      );
    },
  });
  useEffect(() => {
    document.title = (register ? "Tạo tài khoản" : "Đăng nhập") + " · Rendez";
  }, [register]);
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
            : debugLogin
              ? "DEBUG: bấm Đăng nhập để vào bằng tài khoản demo."
              : "Đăng nhập để lưu địa điểm và đăng ảnh."}
        </p>
        <form
          noValidate={debugLogin}
          onSubmit={(event) => {
            if (debugLogin) {
              event.preventDefault();
              mutation.mutate({ email: "", password: "" });
              return;
            }
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
              <span id="auth-name-error" className="error">
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
            <span id="auth-email-error" className="error">
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
            <span id="auth-password-error" className="error">
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
        </form>
        <Link to={register ? "/login" : "/register"} state={location.state}>
          {register ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản mới"}
        </Link>
      </section>
    </div>
  );
}
export function ProfilePage() {
  const me = useMe(),
    cache = useQueryClient(),
    navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api<void>("auth/logout/", { method: "POST" }),
    onSuccess: () => {
      cache.clear();
      cache.setQueryData(["me"], null);
      navigate("/login", { replace: true });
    },
  });
  if (me.isPending) return <State pending />;
  if (me.isError)
    return <State error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data)
    return (
      <section className="state">
        <h1>Cá nhân</h1>
        <p>Đăng nhập để lưu địa điểm và đăng ảnh.</p>
        <Button asChild>
          <Link to="/login" state={{ returnTo: "/profile" }}>
            Đăng nhập
          </Link>
        </Button>
      </section>
    );
  return (
    <section className="profile-page">
      <h1>Tài khoản</h1>
      <p className="muted">
        Địa điểm đã lưu, ảnh đã đăng và thông tin của bạn.
      </p>
      <div className="profile-card">
        <span className="avatar">
          {me.data.display_name.slice(0, 1).toUpperCase() || <User />}
        </span>
        <div>
          <h2>{me.data.display_name}</h2>
          <p>{me.data.email}</p>
          <div className="profile-stats">
            <span>
              <strong>{me.data.saved_count ?? 0}</strong> địa điểm đã lưu
            </span>
            <span>
              <strong>{me.data.photo_count ?? 0}</strong> ảnh công khai
            </span>
          </div>
        </div>
      </div>
      <div className="profile-links">
        <Link to="/saved">
          <Bookmark size={22} />
          <span>
            <strong>Địa điểm đã lưu</strong>
            <small>Xem lại những nơi bạn muốn ghé</small>
          </span>
          <ArrowUpRight className="arrow" />
        </Link>
        <Link to="/submissions">
          <Images size={22} />
          <span>
            <strong>Ảnh của tôi</strong>
            <small>Xem ảnh bạn đã đăng</small>
          </span>
          <ArrowUpRight className="arrow" />
        </Link>
        <Link to="/submissions/new">
          <Camera size={22} />
          <span>
            <strong>Đăng ảnh</strong>
            <small>Chia sẻ ảnh và thêm địa điểm</small>
          </span>
          <ArrowUpRight className="arrow" />
        </Link>
        {me.data.is_staff && <a href="/admin/">Quản trị</a>}
      </div>
      <AccountSettings profile={me.data} />
      <Button
        variant="outline"
        disabled={logout.isPending}
        onClick={() => {
          if (window.confirm("Đăng xuất khỏi Rendez?")) logout.mutate();
        }}
      >
        Đăng xuất
      </Button>
      <ErrorText error={logout.error} />
    </section>
  );
}

function AccountSettings({ profile }: { profile: Profile }) {
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
      <section className="panel">
        <h2>Thông tin cá nhân</h2>
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
      <section className="panel">
        <h2>Đổi mật khẩu</h2>
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
              Đã đổi mật khẩu. Phiên đăng nhập hiện tại được giữ.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
