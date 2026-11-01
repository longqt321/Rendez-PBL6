import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  History,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { api } from "../../lib/api/client";
import type { Profile } from "../../lib/api/types";
import { useTheme, type ThemePreference } from "../../lib/theme";
import { useMe, useLogout } from "../../app/shared";
import { Button } from "../../components/ui/button";
import { Field, Input } from "../../components/ui/primitives";
import { AsyncState } from "../../components/ui/states";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ErrorText } from "../../app/shared";

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
    <div className="settings-page">
      <Link className="back-link" to="/profile">
        <ArrowLeft size={16} aria-hidden />
        Về hồ sơ
      </Link>

      <header className="page-head">
        <div className="page-head__copy">
          <p className="eyebrow">Tài khoản</p>
          <h1>Cài đặt</h1>
          <p className="lede">
            Giao diện, thông tin cá nhân và bảo mật của tài khoản Rendez.
          </p>
        </div>
      </header>

      <ThemeSection />
      <DisplayNameSection profile={me.data} />
      <PasswordSection />

      <section className="settings-block" aria-labelledby="links-heading">
        <h2 id="links-heading" className="settings-block__title">
          Nội dung của bạn
        </h2>
        <ul className="settings-links" role="list">
          <li>
            <Link to="/submissions">
              <History size={17} aria-hidden />
              <span>Lịch sử đăng ảnh</span>
            </Link>
          </li>
          <li>
            <Link to="/saved">
              <User size={17} aria-hidden />
              <span>Địa điểm và trải nghiệm đã lưu</span>
            </Link>
          </li>
          {me.data.is_staff && (
            <li>
              {/* Django admin is a server-rendered surface outside the SPA. */}
              <a href="/admin/">
                <Shield size={17} aria-hidden />
                <span>Quản trị</span>
              </a>
            </li>
          )}
        </ul>
      </section>

      <section className="settings-block" aria-labelledby="session-heading">
        <h2 id="session-heading" className="settings-block__title">
          Phiên đăng nhập
        </h2>
        <p className="muted small">
          Đăng xuất khỏi thiết bị này. Bạn sẽ cần đăng nhập lại để lưu địa điểm
          hoặc đăng trải nghiệm.
        </p>
        <Button
          variant="destructive"
          disabled={logout.isPending}
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut size={16} aria-hidden />
          Đăng xuất
        </Button>
        <ErrorText error={logout.error} />
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
    <section className="settings-block" aria-labelledby="theme-heading">
      <h2 id="theme-heading" className="settings-block__title">
        Giao diện
      </h2>
      <p className="muted small">
        Lựa chọn được lưu trên thiết bị này. Hiện đang hiển thị giao diện{" "}
        {resolved === "dark" ? "tối" : "sáng"}.
      </p>
      <div className="segmented" role="group" aria-label="Chọn giao diện">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={preference === value}
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

function DisplayNameSection({ profile }: { profile: Profile }) {
  const cache = useQueryClient();
  const [name, setName] = useState(profile.display_name);
  const update = useMutation({
    mutationFn: () =>
      api<Profile>("auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ display_name: name.trim() }),
      }),
    onSuccess: (user) => cache.setQueryData(["me"], user),
  });

  return (
    <section className="settings-block" aria-labelledby="name-heading">
      <h2 id="name-heading" className="settings-block__title">
        Tên hiển thị
      </h2>
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <Field label="Tên hiển thị" htmlFor="settings-name">
          <Input
            id="settings-name"
            value={name}
            onChange={(event) => {
              setName(event.currentTarget.value);
              update.reset();
            }}
            required
            maxLength={100}
            autoComplete="nickname"
          />
        </Field>
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
  );
}

/* --------------------------------------------------------------- Password */

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
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
    <section className="settings-block" aria-labelledby="password-heading">
      <h2 id="password-heading" className="settings-block__title">
        <KeyRound size={16} aria-hidden /> Đổi mật khẩu
      </h2>
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          change.mutate();
        }}
      >
        <Field label="Mật khẩu hiện tại" htmlFor="settings-current-password">
          <Input
            id="settings-current-password"
            type="password"
            value={current}
            onChange={(event) => {
              setCurrent(event.currentTarget.value);
              change.reset();
            }}
            required
            autoComplete="current-password"
          />
        </Field>
        <Field
          label="Mật khẩu mới"
          htmlFor="settings-new-password"
          hint="Ít nhất 8 ký tự. Tránh mật khẩu phổ biến hoặc chỉ gồm số."
        >
          <Input
            id="settings-new-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.currentTarget.value);
              change.reset();
            }}
            required
            minLength={8}
            maxLength={4096}
            autoComplete="new-password"
          />
        </Field>
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
  );
}
