import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api/client";
import type { Profile } from "../lib/api/types";
import { sanitizeReturnTo, useMe } from "../lib/session";
import { Button } from "../components/ui/button";
import { Field, Input } from "../components/ui/primitives";
import { ErrorText } from "../components/ui/error-text";

const schema = z.object({
  email: z.email("Email không hợp lệ."),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự."),
  display_name: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/**
 * Sign in / sign up.
 *
 * The two screens are one component because they differ only in which fields
 * exist and which endpoint is called; splitting them would duplicate the
 * redirect, CSRF and save-intent handling that has to stay identical.
 *
 * The screen is deliberately outside the application shell: a guest should not
 * be shown navigation for pages they cannot open.
 */
export function Auth({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useQueryClient();
  const [searchParams] = useSearchParams();
  const me = useMe();
  const [reveal, setReveal] = useState(false);

  // The debug-login affordance only exists when the backend advertises it.
  const mode = useQuery({
    queryKey: ["login-mode"],
    queryFn: () => api<{ debug_login: boolean }>("auth/csrf/"),
    enabled: !register,
    retry: false,
  });
  const debugLogin = !register && mode.data?.debug_login === true;

  const form = useForm<Values>({ resolver: zodResolver(schema) });

  const target = () => {
    const intent = location.state as { returnTo?: string } | null;
    return (
      sanitizeReturnTo(intent?.returnTo || searchParams.get("returnTo")) ||
      "/discover"
    );
  };

  // Already signed in: leave immediately, honouring the original destination.
  useEffect(() => {
    if (me.data) navigate(target(), { replace: true });
    // `target` is derived from router state that is stable for this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data, navigate]);

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
      // A guest who pressed "save" before signing in expects the place saved.
      const intent = location.state as {
        returnTo?: string;
        savePlace?: string;
      } | null;
      if (intent?.savePlace) {
        await api("favorites/" + intent.savePlace + "/", { method: "PUT" });
      }
      navigate(target(), { replace: true });
    },
  });

  useEffect(() => {
    document.title = (register ? "Tạo tài khoản" : "Đăng nhập") + " · Rendez";
    const description = register
      ? "Tạo tài khoản để lưu địa điểm và đăng ảnh tại Đà Nẵng."
      : "Đăng nhập để lưu địa điểm và đăng ảnh tại Đà Nẵng.";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [register]);

  // While the session resolves, render nothing rather than flashing the form
  // at a member who is about to be redirected away.
  if (me.data) return null;

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <main className="auth-page__panel w-full max-w-md">
        <Link
          className="shell-brand auth-page__brand flex items-center justify-center gap-1.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-8"
          to="/discover"
          aria-label="Rendez"
        >
          <span aria-hidden>r</span>
          <span className="shell-brand__dot text-blue-600" aria-hidden>
            .
          </span>
          <span className="shell-brand__word">rendez</span>
        </Link>

        <div className="auth-card bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h1 className="auth-card__title text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-6 text-center">
            {register ? "Tạo tài khoản" : "Đăng nhập"}
          </h1>

          <form
            className="auth-form flex flex-col gap-4"
            noValidate
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
              <div className="field flex flex-col gap-1.5">
                <label className="field__label text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="auth-name">
                  Tên hiển thị
                </label>
                <Input
                  id="auth-name"
                  autoComplete="nickname"
                  maxLength={100}
                  aria-invalid={!!form.formState.errors.display_name}
                  aria-describedby="auth-name-error"
                  {...form.register("display_name")}
                />
                <p id="auth-name-error" className="field__error text-xs text-red-500" role="alert">
                  {form.formState.errors.display_name?.message}
                </p>
              </div>
            )}

            <Field label="Email" htmlFor="auth-email">
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!form.formState.errors.email}
                aria-describedby="auth-email-error"
                {...form.register("email")}
              />
            </Field>
            {/* The error id is owned by the span below, not by Field's default. */}
            <span id="auth-email-error" className="field__error text-xs text-red-500" role="alert">
              {form.formState.errors.email?.message}
            </span>

            <div className="field flex flex-col gap-1.5">
              <label className="field__label text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="auth-password">
                Mật khẩu
              </label>
              <div className="auth-form__password relative flex items-center">
                <Input
                  id="auth-password"
                  type={reveal ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby="auth-password-error"
                  className="pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--bordered absolute right-2.5 p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                  aria-label={reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={reveal}
                  onClick={() => setReveal(!reveal)}
                >
                  {reveal ? (
                    <EyeOff size={18} aria-hidden />
                  ) : (
                    <Eye size={18} aria-hidden />
                  )}
                </button>
              </div>
              <p id="auth-password-error" className="field__error text-xs text-red-500" role="alert">
                {form.formState.errors.password?.message}
              </p>
            </div>

            <ErrorText error={mutation.error} />

            {register && (
              <p className="auth-card__terms text-xs text-neutral-500 dark:text-neutral-400">
                Khi tạo tài khoản, bạn đồng ý với{" "}
                <Link to="/terms" className="text-blue-600 hover:underline">Điều khoản sử dụng</Link> của Rendez.
              </p>
            )}

            <Button type="submit" size="lg" block disabled={mutation.isPending}>
              {mutation.isPending
                ? register
                  ? "Đang tạo tài khoản…"
                  : "Đang đăng nhập…"
                : register
                  ? "Tạo tài khoản"
                  : "Đăng nhập"}
              {!mutation.isPending && <ArrowRight size={17} aria-hidden />}
            </Button>

            {debugLogin && (
              <Button
                type="button"
                variant="ghost"
                block
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ email: "", password: "" })}
              >
                Đăng nhập nhanh
              </Button>
            )}
          </form>

          <p className="auth-card__switch mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <Link
              to={(register ? "/login" : "/register") + location.search}
              state={location.state}
              className="text-blue-600 hover:underline font-medium"
            >
              {register ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản mới"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/*
 * The profile screen now lives in `features/profile`. It is re-exported here
 * because this module is the historical import site used by the access-control
 * tests; the implementation itself is not duplicated.
 */
export { ProfilePage } from "../features/profile/ProfilePage";
