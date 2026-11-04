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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "../../lib/api/client";
import type { Page, PhotoSubmission, VisualPlace } from "../../lib/api/types";
import { useCategories } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { shortAddress } from "../../lib/format";
import { AsyncState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Field, Input, Select, Textarea } from "../../components/ui/primitives";
import { SafeImage } from "../../components/ui/safe-image";
import { ErrorText } from "../../components/ui/error-text";

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

const experienceSchema = z.object({
  proposal: z.boolean(),
  placeId: z.string(),
  name: z.string().max(200),
  address: z.string().max(500),
  category: z.string(),
  caption: z.string().max(1000),
  files: z.array(z.custom<File>((f) => f instanceof File)).max(MAX_IMAGES),
  consent: z.boolean(),
});

type FormValues = z.infer<typeof experienceSchema>;

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
  const [search, setSearch] = useState("");
  const [placeLimit, setPlaceLimit] = useState(6);
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      proposal: false,
      placeId: params.get("place") ?? "",
      name: "",
      address: "",
      category: "",
      caption: "",
      files: [],
      consent: false,
    },
  });

  const { watch, setValue, register } = form;
  const proposal = watch("proposal");
  const placeId = watch("placeId");
  const name = watch("name");
  const address = watch("address");
  const category = watch("category");
  const caption = watch("caption");
  const files = watch("files");
  const consent = watch("consent");

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
  const categorySlug = category || categories.data?.[0]?.slug || "";

  // Geocode a proposed address so the pin lands somewhere real. A failure here
  // is not fatal: the submission still carries the typed address.
  const [geocode, setGeocode] = useState<{
    loading: boolean;
    failed: boolean;
    result: { display_name: string; provider: string } | null;
  }>({ loading: false, failed: false, result: null });

  const addressQuery = proposal ? address.trim() : "";

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
    setValue("files", [...files, ...incoming], { shouldValidate: true });
  };

  const removeFile = (indexToRemove: number) => {
    resetKey();
    setValue(
      "files",
      files.filter((_, idx) => idx !== indexToRemove),
      { shouldValidate: true },
    );
  };

  const next = () => {
    if (step === 1) {
      const missing = proposal
        ? !name.trim() || !address.trim()
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

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    setSubmitError(null);
    try {
      const data = new FormData();
      values.files.forEach((file) => data.append("images", file));
      data.set("caption", values.caption.trim());
      data.set("consent", "true");
      data.set("consent_version", "photo-rights-v2");
      if (values.proposal) {
        data.set("proposed_name", values.name.trim());
        data.set("proposed_address", values.address.trim());
        data.set("proposed_category", categorySlug);
        if (position) {
          data.set("latitude", String(position.latitude));
          data.set("longitude", String(position.longitude));
        }
      } else {
        data.set("place_id", values.placeId);
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
  });

  const chosenPlace = selected.data;
  const previewName = proposal ? name : (chosenPlace?.name ?? "");
  const previewAddress = proposal ? address : (chosenPlace?.address ?? "");

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
          empty="Cần đăng nhập để đăng ảnh"
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
    <div className="create-page max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <header className="page-head flex flex-col gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="page-head__copy">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Đăng ảnh địa điểm</h1>
          <p className="lede text-sm text-neutral-500 mt-1">
            Chọn địa điểm, thêm ảnh bạn tự chụp và kể lại điều bạn thấy. Ảnh sẽ
            xuất hiện trong thư viện của địa điểm đó.
          </p>
        </div>
      </header>

      <ol className="stepper flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4" aria-label="Các bước gửi ảnh">
        {steps.map((label, index) => {
          const value = (index + 1) as Step;
          const isActive = step === value;
          const isPassed = step > value;
          return (
            <li
              key={label}
              className={`stepper__item flex items-center gap-2 text-xs font-semibold ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : isPassed
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-400"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className={`stepper__index w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isPassed
                    ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
              }`} aria-hidden>
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
        <section className="create-panel flex flex-col gap-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs" aria-label="Bước 1: chọn địa điểm">
          <label className="check flex items-center gap-2 cursor-pointer text-sm font-medium text-neutral-900 dark:text-neutral-100">
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              checked={proposal}
              onChange={(event) => {
                resetKey();
                setValue("proposal", event.currentTarget.checked);
              }}
            />
            <span className="check__text">Thêm địa điểm mới</span>
          </label>

          {proposal ? (
            <div className="create-panel__grid flex flex-col gap-4">
              <Field label="Tên địa điểm" htmlFor="new-place-name">
                <Input
                  id="new-place-name"
                  {...register("name", {
                    onChange: () => resetKey(),
                  })}
                  maxLength={200}
                  placeholder="Ví dụ: Tiệm Cà Phê Mộc"
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
                  {...register("address", {
                    onChange: () => resetKey(),
                  })}
                  maxLength={500}
                  placeholder="Ví dụ: 100 Phạm Như Xương, Liên Chiểu, Đà Nẵng"
                />
              </Field>

              {geocodeView.result && (
                <p className="geocode-note flex items-start gap-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30" role="status">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" aria-hidden />
                  <span>
                    <strong>Đã định vị:</strong>{" "}
                    {geocodeView.result.display_name}
                    <span className="geocode-note__source block text-neutral-400 mt-0.5">
                      Nguồn: {geocodeView.result.provider}
                    </span>
                  </span>
                </p>
              )}

              {geocodeView.failed && (
                <p className="geocode-note flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30" role="status">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden />
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
                    setValue("category", event.currentTarget.value);
                  }}
                >
                  {categories.data?.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="create-panel__wide flex flex-col gap-3">
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
                      <p role="status" className="text-xs text-neutral-500">
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
                <p className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30" role="status">
                  <CheckCircle2 size={15} aria-hidden />
                  Đã chọn: <strong>{chosenPlace.name}</strong>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {" "}
                    · {shortAddress(chosenPlace.address)}
                  </span>
                </p>
              )}

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Chọn địa điểm</legend>
                {places.data?.results.slice(0, placeLimit).map((place) => (
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors" key={place.id}>
                    <input
                      type="radio"
                      name="place"
                      className="text-blue-600 focus:ring-blue-500"
                      checked={placeId === place.id}
                      onChange={() => {
                        resetKey();
                        setValue("placeId", place.id);
                      }}
                    />
                    <SafeImage
                      sources={[place.cover_media_url, place.cover_image_url]}
                      alt=""
                      ratio="1 / 1"
                      className="w-12 h-12 rounded-lg object-cover overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800"
                    />
                    <span className="flex flex-col text-sm">
                      <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{place.name}</strong>
                      <small className="text-xs text-neutral-500">{shortAddress(place.address)}</small>
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
                  <p className="text-xs text-neutral-500">
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
        <section className="create-panel flex flex-col gap-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs" aria-label="Bước 2: chọn ảnh">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Chọn ảnh</h2>
            <p className="text-xs text-neutral-500 mt-1">
              JPEG hoặc PNG · tối đa {MAX_IMAGES} ảnh · 10 MiB mỗi ảnh · tối thiểu
              100 × 100 px
            </p>
          </div>

          <label
            className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors bg-neutral-50/50 dark:bg-neutral-800/30 text-center cursor-pointer"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void addFiles(event.dataTransfer.files);
            }}
          >
            <Upload size={26} className="text-neutral-400" aria-hidden />
            <strong className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Kéo ảnh vào đây hoặc nhấn để chọn</strong>
            <small className="text-xs text-neutral-500">Chọn ảnh bạn tự chụp tại địa điểm</small>
            <input
              type="file"
              className="sr-only"
              aria-label="Chọn ảnh JPEG hoặc PNG"
              accept="image/jpeg,image/png"
              multiple
              onChange={(event) => {
                void addFiles(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {step === 2 && error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          <p className="text-xs text-neutral-500 font-mono">
            Đã chọn {files.length}/{MAX_IMAGES} ảnh.
          </p>

          {files.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list">
              {files.map((file, index) => (
                <li key={file.name + index} className="relative flex flex-col gap-2 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden">
                  <FilePreview file={file} />
                  <div className="flex flex-col text-xs truncate">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{file.name}</span>
                    <span className="text-neutral-500 text-[11px]">
                      {(file.size / 1024 / 1024).toFixed(1)} MiB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 dark:bg-neutral-800/90 text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 shadow-xs backdrop-blur-xs transition-colors"
                    aria-label={`Xóa ảnh ${index + 1}`}
                    onClick={() => removeFile(index)}
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
            hint={`${1000 - caption.length} ký tự còn lại`}
          >
            <Textarea
              id="caption"
              {...register("caption", {
                onChange: () => resetKey(),
              })}
              maxLength={1000}
              placeholder="Bạn thấy gì ở đây? Không gian, món uống, thời điểm…"
            />
          </Field>
        </section>
      )}

      {step === 3 && (
        <section className="create-panel flex flex-col gap-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs" aria-label="Bước 3: kiểm tra và gửi">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Kiểm tra trước khi gửi</h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-sm">
            <div>
              <dt className="text-xs text-neutral-500 font-medium">Địa điểm</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{previewName || "Chưa chọn"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500 font-medium">Địa chỉ</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{previewAddress || "Chưa có"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500 font-medium">Số ảnh</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{files.length}</dd>
            </div>
            {caption && (
              <div>
                <dt className="text-xs text-neutral-500 font-medium">Mô tả</dt>
                <dd className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{caption}</dd>
              </div>
            )}
          </dl>

          {proposal && (
            <p className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 text-xs">
              Địa điểm mới sẽ được xem xét trước khi xuất hiện công khai. Ảnh
              của bạn vẫn được gửi kèm.
            </p>
          )}

          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="list">
            {files.map((file, index) => (
              <li key={file.name + index} className="overflow-hidden rounded-lg aspect-square">
                <FilePreview file={file} />
              </li>
            ))}
          </ul>

          <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-neutral-900 dark:text-neutral-100">
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              checked={consent}
              onChange={(event) => {
                resetKey();
                setValue("consent", event.currentTarget.checked);
              }}
            />
            <span>
              Tôi có quyền đăng các ảnh này và đồng ý để chúng hiển thị công
              khai theo <Link to="/terms" className="text-blue-600 underline">Điều khoản sử dụng</Link>.
            </span>
          </label>
        </section>
      )}

      {step !== 2 && error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
          {error}
        </p>
      )}
      <ErrorText error={submitError} />

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
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
          <Button onClick={next} className="ml-auto">Tiếp tục</Button>
        ) : (
          <Button disabled={!consent || pending} onClick={() => void onSubmit()} className="ml-auto">
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
      className="w-full h-full object-cover rounded-lg aspect-square"
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
