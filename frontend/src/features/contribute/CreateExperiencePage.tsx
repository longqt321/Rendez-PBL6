import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Trash2,
  Upload,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api/client";
import type { Page, PhotoSubmission, VisualPlace } from "../../lib/api/types";
import { useCategories } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { shortAddress } from "../../lib/format";
import { AsyncState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Field, Input, Select, Textarea } from "../../components/ui/primitives";
import { SafeImage } from "../../components/ui/safe-image";
import { ErrorText } from "../../app/shared";

const LocationPicker = lazy(() =>
  import("../../app/map").then((module) => ({
    default: module.LocationPicker,
  })),
);

const MAX_IMAGES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_EDGE = 100;
const MAX_PIXELS = 20_000_000;

type Step = 1 | 2 | 3;

/**
 * Create experience.
 *
 * Place-first: a contribution must attach to a real place, because the place is
 * the durable object other people browse. If the place does not exist yet, the
 * user proposes one and the submission is queued for review — the UI never
 * implies the place was created immediately.
 *
 * The flow is three explicit steps rather than one long form so validation
 * happens where the mistake is, and so the final step can honestly show exactly
 * what will be published.
 */
export function CreateExperiencePage() {
  const me = useMe();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [proposal, setProposal] = useState(false);
  const [placeId, setPlaceId] = useState(params.get("place") ?? "");
  const [search, setSearch] = useState("");
  const [placeLimit, setPlaceLimit] = useState(6);
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [meta, setMeta] = useState({
    name: "",
    address: "",
    category: "",
    caption: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  // One key per attempt: retrying a failed submit must not create a duplicate
  // submission, and any edit invalidates the key so the next attempt is new.
  const idempotencyKey = useRef(crypto.randomUUID());
  const resetKey = () => {
    idempotencyKey.current = crypto.randomUUID();
    setSubmitError(null);
    setError("");
  };

  const categories = useCategories();
  const places = useQuery({
    queryKey: ["submission-places", search],
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("places/?q=" + encodeURIComponent(search), {
        signal,
      }),
  });
  const selected = useQuery({
    queryKey: ["submission-place", placeId],
    queryFn: ({ signal }) =>
      api<VisualPlace>("places/" + placeId + "/", { signal }),
    enabled: Boolean(placeId) && !proposal,
  });

  // Default the proposal category to the first real category. Deriving it keeps
  // the select usable before the category list resolves without an extra render
  // pass, and an explicit choice always wins.
  const categorySlug = meta.category || categories.data?.[0]?.slug || "";

  // Geocode a proposed address so the pin lands somewhere real. A failure here
  // is not fatal: the submission still carries the typed address.
  const [geocode, setGeocode] = useState<{
    loading: boolean;
    failed: boolean;
    result: { display_name: string; provider: string } | null;
  }>({ loading: false, failed: false, result: null });

  const addressQuery = proposal ? meta.address.trim() : "";

  useEffect(() => {
    if (addressQuery.length < 3) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGeocode({ loading: true, failed: false, result: null });
      try {
        const response = await api<{
          success: boolean;
          latitude?: number | null;
          longitude?: number | null;
          display_name?: string;
          provider?: string;
        }>("places/geocode/?q=" + encodeURIComponent(addressQuery));
        if (cancelled) return;
        if (response.success && response.latitude && response.longitude) {
          setPosition({
            latitude: response.latitude,
            longitude: response.longitude,
          });
          setGeocode({
            loading: false,
            failed: false,
            result: {
              display_name: response.display_name ?? "",
              provider: response.provider ?? "OpenStreetMap",
            },
          });
        } else {
          setGeocode({ loading: false, failed: true, result: null });
        }
      } catch {
        if (!cancelled)
          setGeocode({ loading: false, failed: true, result: null });
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addressQuery]);

  // A short address invalidates any previous lookup; derive that instead of
  // writing the reset back into state from the effect.
  const geocodeView =
    addressQuery.length < 3
      ? { loading: false, failed: false, result: null }
      : geocode;

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = [...list];
    if (files.length + incoming.length > MAX_IMAGES) {
      setError(`Chọn tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    for (const file of incoming) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError("Chọn ảnh JPEG hoặc PNG.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Mỗi ảnh tối đa 10 MiB.");
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const valid =
          Math.min(bitmap.width, bitmap.height) >= MIN_EDGE &&
          bitmap.width * bitmap.height <= MAX_PIXELS;
        bitmap.close();
        if (!valid) {
          setError("Ảnh cần ít nhất 100 × 100 px và tối đa 20 MP.");
          return;
        }
      } catch {
        setError("Không đọc được ảnh này.");
        return;
      }
    }
    resetKey();
    setFiles((current) => [...current, ...incoming]);
  };

  const next = () => {
    if (step === 1) {
      const missing = proposal
        ? !meta.name.trim() || !meta.address.trim()
        : !placeId;
      if (missing) {
        setError("Chọn địa điểm hoặc nhập tên và địa chỉ địa điểm mới.");
        return;
      }
    }
    if (step === 2 && files.length === 0) {
      setError("Chọn ít nhất 1 ảnh.");
      return;
    }
    setError("");
    setStep((current) => (current + 1) as Step);
  };

  const submit = async () => {
    setPending(true);
    setSubmitError(null);
    try {
      const data = new FormData();
      files.forEach((file) => data.append("images", file));
      data.set("caption", meta.caption.trim());
      data.set("consent", "true");
      data.set("consent_version", "photo-rights-v2");
      if (proposal) {
        data.set("proposed_name", meta.name.trim());
        data.set("proposed_address", meta.address.trim());
        data.set("proposed_category", categorySlug);
        if (position) {
          data.set("latitude", String(position.latitude));
          data.set("longitude", String(position.longitude));
        }
      } else {
        data.set("place_id", placeId);
      }
      const result = await api<PhotoSubmission>("photo-submissions/", {
        method: "POST",
        body: data,
        headers: { "Idempotency-Key": idempotencyKey.current },
      });
      navigate("/submissions/" + result.id, {
        replace: true,
        state: { justSubmitted: true },
      });
    } catch (caught) {
      setSubmitError(
        caught instanceof ApiError
          ? caught
          : new Error("Không gửi được ảnh. Kiểm tra kết nối rồi thử lại."),
      );
    } finally {
      setPending(false);
    }
  };

  const chosenPlace = selected.data;
  const previewName = proposal ? meta.name : (chosenPlace?.name ?? "");
  const previewAddress = proposal ? meta.address : (chosenPlace?.address ?? "");

  const steps = useMemo(
    () => ["Chọn địa điểm", "Chọn ảnh", "Kiểm tra và gửi"],
    [],
  );

  if (me.isPending) {
    return <AsyncState pending loadingVariant="list" loadingLabel="Đang tải" />;
  }

  if (!me.data) {
    return (
      <div className="create-page">
        <AsyncState
          empty="Cần đăng nhập để đăng trải nghiệm"
          emptyBody="Ảnh và địa điểm bạn gửi gắn với tài khoản của bạn."
          emptyActions={
            <Button asChild>
              <Link to="/login" state={{ returnTo: "/create" }}>
                Đăng nhập
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="create-page">
      <header className="page-head">
        <div className="page-head__copy">
          <p className="eyebrow">Đóng góp</p>
          <h1>Đăng ảnh địa điểm</h1>
          <p className="lede">
            Chọn địa điểm, thêm ảnh bạn tự chụp và kể lại điều bạn thấy. Ảnh sẽ
            xuất hiện trong thư viện của địa điểm đó.
          </p>
        </div>
      </header>

      <ol className="stepper" aria-label="Các bước gửi ảnh">
        {steps.map((label, index) => {
          const value = (index + 1) as Step;
          return (
            <li
              key={label}
              className="stepper__item"
              aria-current={step === value ? "step" : undefined}
            >
              <span className="stepper__index" aria-hidden>
                {value}
              </span>
              <span>
                {value}. {label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <section className="create-panel" aria-label="Bước 1: chọn địa điểm">
          <label className="check">
            <input
              type="checkbox"
              checked={proposal}
              onChange={(event) => {
                resetKey();
                setProposal(event.currentTarget.checked);
              }}
            />
            <span className="check__text">Thêm địa điểm mới</span>
          </label>

          {proposal ? (
            <div className="create-panel__grid">
              <Field label="Tên địa điểm" htmlFor="new-place-name">
                <Input
                  id="new-place-name"
                  value={meta.name}
                  maxLength={200}
                  placeholder="Ví dụ: Tiệm Cà Phê Mộc"
                  onChange={(event) => {
                    resetKey();
                    setMeta({ ...meta, name: event.currentTarget.value });
                  }}
                />
              </Field>

              <Field
                label="Địa chỉ"
                htmlFor="new-place-address"
                hint={
                  geocodeView.loading
                    ? "Đang tra cứu toạ độ…"
                    : "Càng chi tiết càng dễ xác minh."
                }
              >
                <Input
                  id="new-place-address"
                  value={meta.address}
                  maxLength={500}
                  placeholder="Ví dụ: 100 Phạm Như Xương, Liên Chiểu, Đà Nẵng"
                  onChange={(event) => {
                    resetKey();
                    setMeta({ ...meta, address: event.currentTarget.value });
                  }}
                />
              </Field>

              {geocodeView.result && (
                <p className="geocode-note" role="status">
                  <CheckCircle2 size={15} aria-hidden />
                  <span>
                    <strong>Đã định vị:</strong>{" "}
                    {geocodeView.result.display_name}
                    <span className="geocode-note__source">
                      Nguồn: {geocodeView.result.provider}
                    </span>
                  </span>
                </p>
              )}

              {geocodeView.failed && (
                <p className="geocode-note geocode-note--failed" role="status">
                  <AlertCircle size={15} aria-hidden />
                  <span>
                    <strong>Chưa định vị được địa chỉ này.</strong> Địa điểm vẫn
                    được gửi kèm địa chỉ bạn đã nhập nhưng sẽ không có ghim trên
                    bản đồ.
                  </span>
                </p>
              )}

              <Field label="Loại địa điểm" htmlFor="new-place-category">
                <Select
                  id="new-place-category"
                  value={categorySlug}
                  onChange={(event) => {
                    resetKey();
                    setMeta({ ...meta, category: event.currentTarget.value });
                  }}
                >
                  {categories.data?.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="create-panel__wide">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMap((value) => !value)}
                >
                  <MapPin size={16} aria-hidden />
                  {showMap
                    ? "Ẩn bản đồ"
                    : position
                      ? "Xem vị trí đã ghim"
                      : "Ghim vị trí trên bản đồ (không bắt buộc)"}
                </Button>
                {showMap && (
                  <Suspense
                    fallback={
                      <p role="status" className="muted small">
                        Đang tải bản đồ…
                      </p>
                    }
                  >
                    <LocationPicker
                      value={position}
                      onChange={(value) => {
                        resetKey();
                        setPosition(value);
                      }}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          ) : (
            <>
              <Field label="Tìm địa điểm" htmlFor="place-search">
                <Input
                  id="place-search"
                  value={search}
                  placeholder="Tên địa điểm hoặc địa chỉ"
                  maxLength={100}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value);
                    setPlaceLimit(6);
                  }}
                />
              </Field>

              <AsyncState
                pending={places.isPending}
                error={places.error}
                onRetry={() => void places.refetch()}
                loadingVariant="inline"
              />

              {chosenPlace && (
                <p className="selected-place" role="status">
                  <CheckCircle2 size={15} aria-hidden />
                  Đã chọn: <strong>{chosenPlace.name}</strong>
                  <span className="muted">
                    {" "}
                    · {shortAddress(chosenPlace.address)}
                  </span>
                </p>
              )}

              <fieldset className="place-picker">
                <legend className="field__label">Chọn địa điểm</legend>
                {places.data?.results.slice(0, placeLimit).map((place) => (
                  <label className="place-picker__row" key={place.id}>
                    <input
                      type="radio"
                      name="place"
                      checked={placeId === place.id}
                      onChange={() => {
                        resetKey();
                        setPlaceId(place.id);
                      }}
                    />
                    <SafeImage
                      sources={[place.cover_media_url, place.cover_image_url]}
                      alt=""
                      ratio="1 / 1"
                      className="place-picker__thumb"
                    />
                    <span className="place-picker__text">
                      <strong>{place.name}</strong>
                      <small>{shortAddress(place.address)}</small>
                    </span>
                  </label>
                ))}
                {places.data && placeLimit < places.data.results.length && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlaceLimit((value) => value + 6)}
                  >
                    Xem thêm địa điểm
                  </Button>
                )}
                {places.data?.count === 0 && (
                  <p className="muted small">
                    Không tìm thấy địa điểm phù hợp. Chọn “Thêm địa điểm mới” để
                    gửi thông tin địa điểm.
                  </p>
                )}
              </fieldset>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="create-panel" aria-label="Bước 2: chọn ảnh">
          <h2 className="section-title">Chọn ảnh</h2>
          <p className="muted small">
            JPEG hoặc PNG · tối đa {MAX_IMAGES} ảnh · 10 MiB mỗi ảnh · tối thiểu
            100 × 100 px
          </p>

          <label
            className="upload-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void addFiles(event.dataTransfer.files);
            }}
          >
            <Upload size={26} aria-hidden />
            <strong>Kéo ảnh vào đây hoặc nhấn để chọn</strong>
            <small>Chọn ảnh bạn tự chụp tại địa điểm</small>
            <input
              type="file"
              aria-label="Chọn ảnh JPEG hoặc PNG"
              accept="image/jpeg,image/png"
              multiple
              onChange={(event) => {
                void addFiles(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <p className="muted small tabular">
            Đã chọn {files.length}/{MAX_IMAGES} ảnh.
          </p>

          {files.length > 0 && (
            <ul className="upload-list" role="list">
              {files.map((file, index) => (
                <li key={file.name + index} className="upload-item">
                  <FilePreview file={file} />
                  <div className="upload-item__meta">
                    <span className="upload-item__name">{file.name}</span>
                    <span className="muted micro">
                      {(file.size / 1024 / 1024).toFixed(1)} MiB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Xóa ảnh ${index + 1}`}
                    onClick={() => {
                      resetKey();
                      setFiles((current) =>
                        current.filter((_, position) => position !== index),
                      );
                    }}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Field
            label="Mô tả ảnh (không bắt buộc)"
            htmlFor="caption"
            hint={`${1000 - meta.caption.length} ký tự còn lại`}
          >
            <Textarea
              id="caption"
              value={meta.caption}
              maxLength={1000}
              placeholder="Bạn thấy gì ở đây? Không gian, món uống, thời điểm…"
              onChange={(event) => {
                resetKey();
                setMeta({ ...meta, caption: event.currentTarget.value });
              }}
            />
          </Field>
        </section>
      )}

      {step === 3 && (
        <section className="create-panel" aria-label="Bước 3: kiểm tra và gửi">
          <h2 className="section-title">Kiểm tra trước khi gửi</h2>

          <dl className="review-list">
            <div>
              <dt>Địa điểm</dt>
              <dd>{previewName || "Chưa chọn"}</dd>
            </div>
            <div>
              <dt>Địa chỉ</dt>
              <dd>{previewAddress || "Chưa có"}</dd>
            </div>
            <div>
              <dt>Số ảnh</dt>
              <dd className="tabular">{files.length}</dd>
            </div>
            {meta.caption && (
              <div>
                <dt>Mô tả</dt>
                <dd>{meta.caption}</dd>
              </div>
            )}
          </dl>

          {proposal && (
            <p className="notice notice--info">
              Địa điểm mới sẽ được xem xét trước khi xuất hiện công khai. Ảnh
              của bạn vẫn được gửi kèm.
            </p>
          )}

          <ul className="upload-list upload-list--compact" role="list">
            {files.map((file, index) => (
              <li key={file.name + index}>
                <FilePreview file={file} />
              </li>
            ))}
          </ul>

          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                resetKey();
                setConsent(event.currentTarget.checked);
              }}
            />
            <span className="check__text">
              Tôi có quyền đăng các ảnh này và đồng ý để chúng hiển thị công
              khai theo <Link to="/terms">Điều khoản sử dụng</Link>.
            </span>
          </label>
        </section>
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ErrorText error={submitError} />

      <div className="create-actions">
        {step > 1 && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setStep((current) => (current - 1) as Step)}
          >
            Quay lại bước trước
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={next}>Tiếp tục</Button>
        ) : (
          <Button disabled={!consent || pending} onClick={() => void submit()}>
            {pending ? "Đang đăng…" : "Đăng ảnh"}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Local object-URL preview; revoked on unmount to avoid leaking blobs. */
function FilePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <img
      className="upload-item__preview"
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
