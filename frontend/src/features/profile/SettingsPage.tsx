import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Bookmark,
  History,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
} from "lucide-react";
import { api } from "../../lib/api/client";
import type { Profile } from "../../lib/api/types";
import { useTheme, type ThemePreference } from "../../lib/theme";
import { useMe, useLogout } from "../../lib/session";
import { Button } from "../../components/ui/button";
import { Field, Input } from "../../components/ui/primitives";
import { AsyncState } from "../../components/ui/states";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ErrorText } from "../../components/ui/error-text";

/**
 * Settings.
 *
 * Account-level controls that are not about the member's content: how the app
 * looks, their display name, their password, and the way out. Each block is an
 * independent form so a failure in one does not disable the others.
 */
export function SettingsPage() {
  const me = useMe();
  const logout = useLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (me.isPending) return <AsyncState pending loadingVariant="list" />;
  if (me.isError)
    return <AsyncState error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data) return null;

  return (
    <div className="settings-page max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <Link className="back-link inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100" to="/profile">
        <ArrowLeft size={16} aria-hidden />
        Về hồ sơ
      </Link>

      <header className="page-head border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="page-head__copy">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Cài đặt</h1>
        </div>
      </header>

      <ThemeSection />
      <DisplayNameSection profile={me.data} />
      <PasswordSection />

      <section className="settings-block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4" aria-labelledby="links-heading">
        <h2 id="links-heading" className="settings-block__title text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Nội dung của bạn
        </h2>
        <ul className="settings-links flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800" role="list">
          <li className="py-2.5">
            <Link to="/profile" className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              <History size={17} aria-hidden />
              <span>Ảnh đã gửi</span>
            </Link>
          </li>
          <li className="py-2.5">
            <Link to="/profile?tab=saved" className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              <Bookmark size={17} aria-hidden />
              <span>Địa điểm đã lưu</span>
            </Link>
          </li>
          {me.data.is_staff && (
            <li className="py-2.5">
              {/* Django admin is a server-rendered surface outside the SPA. */}
              <a href="/admin/" className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
                <Shield size={17} aria-hidden />
                <span>Quản trị</span>
              </a>
            </li>
          )}
        </ul>
      </section>

      <section className="settings-block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4" aria-labelledby="session-heading">
        <h2 id="session-heading" className="settings-block__title text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Phiên đăng nhập
        </h2>
        <p className="muted small text-sm text-neutral-500 dark:text-neutral-400">
          Đăng xuất khỏi thiết bị này. Bạn sẽ cần đăng nhập lại để lưu địa điểm
          hoặc đăng ảnh.
        </p>
        <div>
          <Button
            variant="destructive"
            disabled={logout.isPending}
            onClick={() => setConfirmLogout(true)}
          >
            <LogOut size={16} aria-hidden />
            Đăng xuất
          </Button>
        </div>
        <ErrorText error={logout.error} />
        <ConfirmDialog
          open={confirmLogout}
          title="Đăng xuất"
          description="Bạn sẽ cần đăng nhập lại."
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
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Theme */

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
];

function ThemeSection() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <section className="settings-block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4" aria-labelledby="theme-heading">
      <h2 id="theme-heading" className="settings-block__title text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Giao diện
      </h2>
      <p className="muted small text-sm text-neutral-500 dark:text-neutral-400">
        Lựa chọn được lưu trên thiết bị này. Hiện đang hiển thị giao diện{" "}
        {resolved === "dark" ? "tối" : "sáng"}.
      </p>
      <div className="segmented inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg gap-1 max-w-fit" role="group" aria-label="Chọn giao diện">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={preference === value}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              preference === value
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
            onClick={() => setPreference(value)}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Display name */

const displayNameSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên hiển thị.")
    .max(100, "Tên hiển thị tối đa 100 ký tự."),
});
type DisplayNameValues = z.infer<typeof displayNameSchema>;

function DisplayNameSection({ profile }: { profile: Profile }) {
  const cache = useQueryClient();
  const form = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { display_name: profile.display_name },
  });

  const update = useMutation({
    mutationFn: (values: DisplayNameValues) =>
      api<Profile>("auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ display_name: values.display_name }),
      }),
    onSuccess: (user) => {
      cache.setQueryData(["me"], user);
      form.reset({ display_name: user.display_name });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(values);
  });

  return (
    <section className="settings-block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4" aria-labelledby="name-heading">
      <h2 id="name-heading" className="settings-block__title text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Thông tin cá nhân
      </h2>
      <form className="settings-form flex flex-col gap-4" onSubmit={onSubmit}>
        <Field label="Tên hiển thị" htmlFor="settings-name">
          <Input
            id="settings-name"
            {...form.register("display_name")}
            required
            maxLength={100}
            autoComplete="nickname"
          />
        </Field>
        {form.formState.errors.display_name?.message && (
          <p className="field-error text-xs text-red-500" role="alert">
            {form.formState.errors.display_name.message}
          </p>
        )}
        <div>
          <Button disabled={update.isPending}>
            {update.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
        <ErrorText error={update.error} />
        <p className="success form-status text-sm text-green-600 dark:text-green-400 font-medium" role="status">
          {update.isSuccess ? "Đã lưu tên." : ""}
        </p>
      </form>
    </section>
  );
}

/* --------------------------------------------------------------- Password */

const passwordSchema = z.object({
  current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
  new_password: z
    .string()
    .min(8, "Mật khẩu mới cần ít nhất 8 ký tự.")
    .max(4096, "Mật khẩu tối đa 4096 ký tự."),
});
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordSection() {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "" },
  });

  const change = useMutation({
    mutationFn: (values: PasswordValues) =>
      api<void>("auth/password/", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    change.mutate(values);
  });

  return (
    <section className="settings-block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4" aria-labelledby="password-heading">
      <h2 id="password-heading" className="settings-block__title text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <KeyRound size={16} aria-hidden /> Đổi mật khẩu
      </h2>
      <form className="settings-form flex flex-col gap-4" onSubmit={onSubmit}>
        <Field label="Mật khẩu hiện tại" htmlFor="settings-current-password">
          <Input
            id="settings-current-password"
            type="password"
            {...form.register("current_password")}
            required
            autoComplete="current-password"
          />
        </Field>
        {form.formState.errors.current_password?.message && (
          <p className="field-error text-xs text-red-500" role="alert">
            {form.formState.errors.current_password.message}
          </p>
        )}
        <Field
          label="Mật khẩu mới"
          htmlFor="settings-new-password"
          hint="Ít nhất 8 ký tự. Tránh mật khẩu phổ biến hoặc chỉ gồm số."
        >
          <Input
            id="settings-new-password"
            type="password"
            {...form.register("new_password")}
            required
            minLength={8}
            maxLength={4096}
            autoComplete="new-password"
          />
        </Field>
        {form.formState.errors.new_password?.message && (
          <p className="field-error text-xs text-red-500" role="alert">
            {form.formState.errors.new_password.message}
          </p>
        )}
        <div>
          <Button disabled={change.isPending}>
            {change.isPending ? "Đang đổi…" : "Đổi mật khẩu"}
          </Button>
        </div>
        <ErrorText error={change.error} />
        <p className="success form-status text-sm text-green-600 dark:text-green-400 font-medium" role="status">
          {change.isSuccess ? "Đã đổi mật khẩu." : ""}
        </p>
      </form>
    </section>
  );
}
