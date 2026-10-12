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
import { useState } from "react";
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
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Link className="brand" to="/discover">
          Rendez<span className="brand-dot">●</span>
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow">Cà phê & ăn uống ở Đà Nẵng</span>
          <h2>
            Lưu quán
            <br />
            và gửi ảnh.
          </h2>
          <p>Đăng nhập để xem quán đã lưu và quản lý ảnh đã gửi.</p>
        </div>
        <span className="auth-story-footer">
          Đăng nhập để khám phá quán và ảnh.
        </span>
      </aside>
      <section className="auth-panel">
        <Link className="brand" to="/discover">
          Rendez
        </Link>
        <h1>{register ? "Tạo tài khoản" : "Đăng nhập"}</h1>
        <p className="muted">
          {register
            ? "Tạo tài khoản để lưu quán và gửi ảnh."
            : debugLogin
              ? "DEBUG: bấm Đăng nhập để vào bằng tài khoản demo."
              : "Đăng nhập để lưu quán và gửi ảnh."}
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
            <label>
              Tên hiển thị
              <input
                autoComplete="nickname"
                maxLength={100}
                {...form.register("display_name")}
              />
              <span className="error">
                {form.formState.errors.display_name?.message}
              </span>
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            <span className="error">
              {form.formState.errors.email?.message}
            </span>
          </label>
          <label>
            Mật khẩu
            <div className="password-field">
              <input
                aria-label="Mật khẩu"
                type={reveal ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
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
            <span className="error">
              {form.formState.errors.password?.message}
            </span>
          </label>
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
        <p>Đăng nhập để lưu quán và gửi ảnh.</p>
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
      <p className="muted">Quản lý quán đã lưu và ảnh đã gửi.</p>
      <div className="profile-card">
        <span className="avatar">
          {me.data.display_name.slice(0, 1).toUpperCase() || <User />}
        </span>
        <div>
          <h2>{me.data.display_name}</h2>
          <p>{me.data.email}</p>
        </div>
      </div>
      <div className="profile-links">
        <Link to="/saved">
          <Bookmark size={22} />
          <span>
            <strong>Quán đã lưu</strong>
            <small>Xem lại địa chỉ và ảnh quán</small>
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
            <small>Gửi ảnh bạn chụp tại quán</small>
          </span>
          <ArrowUpRight className="arrow" />
        </Link>
        {me.data.is_staff && <a href="/admin/">Quản trị</a>}
      </div>
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
