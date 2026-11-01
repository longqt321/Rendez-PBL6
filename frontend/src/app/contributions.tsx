import { lazy, Suspense } from "react";
import { Upload, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { api, date, type Category, type Page } from "../lib/api/client";
import type { Submission, VisualPlace } from "../lib/api/visual";
import { Button } from "../components/ui/button";
import { AuthGate, Cover, ErrorText, Pager, State, useMe } from "./shared";

function PhotoPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const reader = new FileReader();
    reader.onload = () => {
      if (active && typeof reader.result === "string") {
        setUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    return () => {
      active = false;
    };
  }, [file]);
  if (!url) return null;
  return <img src={url} alt={"Ảnh đã chọn: " + file.name} />;
}
const LocationPicker = lazy(() =>
  import("./map").then((module) => ({ default: module.LocationPicker })),
);

export function NewContribution() {
  const [params] = useSearchParams();
  return (
    <AuthGate returnTo={"/submissions/new?" + params}>
      <PhotoForm />
    </AuthGate>
  );
}
function PhotoForm() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    cache = useQueryClient();
  const [step, setStep] = useState(1),
    [proposal, setProposal] = useState(false),
    [placeId, setPlaceId] = useState(params.get("place") || ""),
    [search, setSearch] = useState("");
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [metadata, setMetadata] = useState({
    name: "",
    address: "",
    category: "cafe",
    caption: "",
  });
  const [placeLimit, setPlaceLimit] = useState(6);
  const [files, setFiles] = useState<File[]>([]),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false);
  const [geocodeState, setGeocodeState] = useState<{
    loading: boolean;
    result: {
      display_name: string;
      provider: string;
      latitude: number;
      longitude: number;
    } | null;
  }>({ loading: false, result: null });
  const key = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!proposal || !metadata.address || metadata.address.trim().length < 3) {
      const resetTimer = setTimeout(() => {
        setGeocodeState({ loading: false, result: null });
      }, 0);
      return () => clearTimeout(resetTimer);
    }
    const timer = setTimeout(async () => {
      setGeocodeState((prev) => ({ ...prev, loading: true }));
      try {
        const res = await api<{
          success: boolean;
          latitude: number;
          longitude: number;
          display_name: string;
          provider: string;
        }>("places/geocode/?q=" + encodeURIComponent(metadata.address));
        if (res && res.success && res.latitude && res.longitude) {
          setPosition({ latitude: res.latitude, longitude: res.longitude });
          setGeocodeState({
            loading: false,
            result: {
              display_name: res.display_name,
              provider: res.provider ?? "OpenStreetMap",
              latitude: res.latitude,
              longitude: res.longitude,
            },
          });
        } else {
          setGeocodeState({ loading: false, result: null });
        }
      } catch {
        setGeocodeState({ loading: false, result: null });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [proposal, metadata.address]);
  const places = useQuery({
    queryKey: ["submission-places", search],
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("places/?q=" + encodeURIComponent(search), {
        signal,
      }),
  });
  const selected = useQuery({
    queryKey: ["submission-place", placeId],
    queryFn: () => api<VisualPlace>("places/" + placeId + "/"),
    enabled: !!placeId && !proposal,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("categories/"),
  });
  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      files.forEach((file) => data.append("images", file));
      data.set("caption", metadata.caption);
      data.set("consent", "true");
      data.set("consent_version", "photo-rights-v2");
      if (proposal) {
        data.set("proposed_name", metadata.name);
        data.set("proposed_address", metadata.address);
        data.set("proposed_category", metadata.category);
        if (position) {
          data.set("latitude", String(position.latitude));
          data.set("longitude", String(position.longitude));
        }
      } else data.set("place_id", placeId);
      return api<Submission>("photo-submissions/", {
        method: "POST",
        body: data,
        headers: { "Idempotency-Key": key.current },
      });
    },
    onSuccess: async (result) => {
      await cache.invalidateQueries();
      navigate("/submissions/" + result.id, {
        replace: true,
        state: { justSubmitted: true },
      });
    },
  });
  const changed = () => {
    key.current = crypto.randomUUID();
    mutation.reset();
    setError("");
  };
  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = [...list];
    if (files.length + incoming.length > 5) {
      setError("Chọn tối đa 5 ảnh.");
      return;
    }
    for (const file of incoming) {
      if (
        !["image/jpeg", "image/png"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      ) {
        setError("Chọn ảnh JPEG hoặc PNG, tối đa 10 MiB mỗi ảnh.");
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const valid =
          Math.min(bitmap.width, bitmap.height) >= 100 &&
          bitmap.width * bitmap.height <= 20_000_000;
        bitmap.close();
        if (!valid) {
          setError("Ảnh cần ít nhất 100 × 100 px và tối đa 20 MP.");
          return;
        }
      } catch {
        setError("Không đọc được ảnh.");
        return;
      }
    }
    changed();
    setFiles((previous) => [...previous, ...incoming]);
  };
  const next = () => {
    if (
      step === 1 &&
      (!proposal ? !placeId : !metadata.name.trim() || !metadata.address.trim())
    ) {
      setError("Chọn địa điểm hoặc nhập tên và địa chỉ địa điểm mới.");
      return;
    }
    if (step === 2 && !files.length) {
      setError("Chọn ít nhất 1 ảnh.");
      return;
    }
    setError("");
    setStep(step + 1);
  };
  return (
    <section className="panel submission-form">
      <span className="eyebrow">Ảnh cộng đồng</span>
      <h1>Đăng ảnh địa điểm</h1>
      <p className="muted">Chọn địa điểm, thêm ảnh bạn chụp và đăng.</p>
      <ol className="step-list" aria-label="Các bước gửi ảnh">
        {["Chọn địa điểm", "Chọn ảnh", "Kiểm tra và gửi"].map((name, i) => (
          <li key={name} aria-current={step === i + 1 ? "step" : undefined}>
            {i + 1}. {name}
          </li>
        ))}
      </ol>
      {step === 1 && (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={proposal}
              onChange={(e) => {
                changed();
                setProposal(e.target.checked);
              }}
            />
            Thêm địa điểm mới
          </label>
          {proposal ? (
            <div className="new-place-fields">
              <label>
                Tên địa điểm
                <input
                  value={metadata.name}
                  maxLength={200}
                  placeholder="Ví dụ: Tiệm Cà Phê Mộc"
                  onChange={(e) => {
                    changed();
                    setMetadata({ ...metadata, name: e.target.value });
                  }}
                />
              </label>
              <label>
                Địa chỉ
                <input
                  value={metadata.address}
                  maxLength={500}
                  placeholder="Ví dụ: 100 Phạm Như Xương, Liên Chiểu, Đà Nẵng"
                  onChange={(e) => {
                    changed();
                    setMetadata({ ...metadata, address: e.target.value });
                  }}
                />
                {geocodeState.loading && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Đang tự động tra cứu tọa độ từ OpenStreetMap…
                  </span>
                )}
                {geocodeState.result && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      fontSize: "0.85rem",
                      color: "#285548",
                      backgroundColor: "rgba(40, 85, 72, 0.08)",
                      border: "1px solid rgba(40, 85, 72, 0.2)",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      marginTop: "6px",
                    }}
                  >
                    <CheckCircle2
                      size={16}
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                    <span>
                      <strong>Tự động định vị:</strong>{" "}
                      {geocodeState.result.display_name} (
                      {geocodeState.result.latitude.toFixed(6)},{" "}
                      {geocodeState.result.longitude.toFixed(6)})
                      <small
                        style={{
                          display: "block",
                          color: "#4b5563",
                          marginTop: "2px",
                        }}
                      >
                        Nguồn dữ liệu: {geocodeState.result.provider}
                      </small>
                    </span>
                  </span>
                )}
              </label>
              <label>
                Loại địa điểm
                <select
                  aria-label="Loại địa điểm"
                  value={metadata.category}
                  onChange={(e) => {
                    changed();
                    setMetadata({ ...metadata, category: e.target.value });
                  }}
                >
                  {categories.data?.map((c) => (
                    <option value={c.slug} key={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="location-field">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                >
                  {showMap
                    ? "Ẩn bản đồ"
                    : position
                      ? "Xem vị trí đã ghim trên bản đồ"
                      : "Chọn vị trí trên bản đồ (tùy chọn)"}
                </Button>
                {showMap && (
                  <Suspense fallback={<p role="status">Đang tải bản đồ…</p>}>
                    <LocationPicker
                      value={position}
                      onChange={(value) => {
                        changed();
                        setPosition(value);
                      }}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          ) : (
            <>
              <label>
                Tìm địa điểm
                <input
                  value={search}
                  placeholder="Tên địa điểm hoặc địa chỉ"
                  maxLength={100}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPlaceLimit(6);
                  }}
                />
              </label>
              <State
                pending={places.isPending}
                error={places.error}
                onRetry={() => void places.refetch()}
              />
              {selected.data && (
                <p className="selected-place">
                  Đã chọn: <strong>{selected.data.name}</strong> ·{" "}
                  {selected.data.address}
                </p>
              )}
              <fieldset className="place-search-results">
                <legend>Chọn địa điểm</legend>
                {places.data?.results.slice(0, placeLimit).map((place) => (
                  <label className="check-label" key={place.id}>
                    <input
                      type="radio"
                      name="place"
                      checked={placeId === place.id}
                      onChange={() => {
                        changed();
                        setPlaceId(place.id);
                      }}
                    />
                    <Cover place={place} className="picker-cover" />
                    <span>
                      {place.name}
                      <small>{place.address}</small>
                    </span>
                  </label>
                ))}
                {places.data && placeLimit < places.data.results.length && (
                  <Button
                    variant="outline"
                    onClick={() => setPlaceLimit(placeLimit + 6)}
                  >
                    Xem thêm địa điểm
                  </Button>
                )}
                {places.data?.count === 0 && (
                  <p>
                    Không tìm thấy địa điểm. Chọn “Thêm địa điểm mới” để gửi
                    thông tin.
                  </p>
                )}
              </fieldset>
            </>
          )}
          <State
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
        </>
      )}
      {step === 2 && (
        <>
          <h2>Chọn ảnh</h2>
          <p className="muted">JPEG/PNG · tối đa 5 ảnh · 10 MiB/ảnh</p>
          <label
            className="upload-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void addFiles(event.dataTransfer.files);
            }}
          >
            <Upload size={30} />
            <strong>Kéo ảnh vào đây hoặc nhấn để chọn</strong>
            <small>Chọn ảnh bạn chụp tại địa điểm</small>
            <input
              type="file"
              aria-label="Chọn ảnh JPEG hoặc PNG"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => {
                void addFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <p className="muted small">
            Đã chọn {files.length}/5 ảnh. Có thể xóa ảnh trước khi gửi.
          </p>
          <div className="upload-previews">
            {files.map((file, i) => (
              <article key={i + file.name}>
                <PhotoPreview file={file} />
                <p className="small">{file.name}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    changed();
                    setFiles(files.filter((_, index) => index !== i));
                  }}
                >
                  Xóa ảnh {i + 1}
                </Button>
              </article>
            ))}
          </div>
          <label>
            Mô tả ảnh (tùy chọn)
            <textarea
              value={metadata.caption}
              maxLength={1000}
              onChange={(e) => {
                changed();
                setMetadata({ ...metadata, caption: e.target.value });
              }}
            />
          </label>
        </>
      )}
      {step === 3 && (
        <>
          <h2>Kiểm tra trước khi gửi</h2>
          <p>
            <strong>{proposal ? metadata.name : selected.data?.name}</strong>
          </p>
          <p>{proposal ? metadata.address : selected.data?.address}</p>
          <p>{metadata.caption}</p>
          <div className="upload-previews">
            {files.map((file, i) => (
              <PhotoPreview key={i} file={file} />
            ))}
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                changed();
                setConsent(e.target.checked);
              }}
            />
            Tôi có quyền đăng các ảnh này và đồng ý công khai.
          </label>
          <p className="muted small">
            Ảnh sẽ xuất hiện ngay sau khi đăng. Việc gửi ảnh tuân theo{" "}
            <Link to="/terms">Điều khoản sử dụng</Link>.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ErrorText error={mutation.error} />
      <div className="detail-actions">
        {step > 1 && (
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => setStep(step - 1)}
          >
            Quay lại bước trước
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={next}>Tiếp tục</Button>
        ) : (
          <Button
            disabled={!consent || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Đang đăng…" : "Đăng ảnh"}
          </Button>
        )}
      </div>
    </section>
  );
}
function submissionLabel(s: Submission) {
  if (s.assets.some((a) => a.publication_status === "published"))
    return "Đã đăng";
  if (s.assets.some((a) => a.publication_status === "withdrawn"))
    return "Đã gỡ";
  return "Chưa đăng";
}

export function ContributionHistory() {
  return (
    <AuthGate returnTo="/submissions">
      <History />
    </AuthGate>
  );
}
function History() {
  const [params] = useSearchParams(),
    me = useMe();
  const result = useQuery({
    queryKey: ["submissions", me.data?.id, params.get("page")],
    queryFn: () =>
      api<Page<Submission>>(
        "photo-submissions/?page=" + (params.get("page") || "1"),
      ),
  });
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Ảnh của tôi</h1>
          <p className="muted">Xem những ảnh bạn đã đăng.</p>
        </div>
        <Button asChild>
          <Link to="/submissions/new">Đăng ảnh</Link>
        </Button>
      </header>
      <State
        pending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
        empty={result.data?.count === 0 ? "Bạn chưa đăng ảnh nào" : undefined}
      />
      <div className="submission-list">
        {result.data?.results.map((s) => (
          <Link
            className="panel submission-row"
            key={s.id}
            to={"/submissions/" + s.id}
          >
            {s.assets[0] && (
              <img
                src={s.assets[0].preview_url}
                alt="Ảnh bạn đã đăng"
                width={110}
                height={120}
                loading="lazy"
                decoding="async"
              />
            )}
            <div>
              <h2>{s.place_name}</h2>
              <p>
                {s.assets.length} ảnh · {date(s.submitted_at)}
              </p>
              <span
                className={
                  "status-badge " +
                  (submissionLabel(s) === "Đã gỡ" ? "rejected" : s.status)
                }
              >
                {submissionLabel(s)}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {result.data && (
        <Pager next={result.data.next} previous={result.data.previous} />
      )}
    </>
  );
}
export function ContributionDetailPage() {
  const { id } = useParams();
  return (
    <AuthGate returnTo={"/submissions/" + id}>
      <SubmissionDetail id={id!} />
    </AuthGate>
  );
}
function SubmissionDetail({ id }: { id: string }) {
  const me = useMe();
  const result = useQuery({
    queryKey: ["submission", id, me.data?.id],
    queryFn: () => api<Submission>("photo-submissions/" + id + "/"),
  });
  if (!result.data)
    return (
      <State
        pending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
      />
    );
  const s = result.data;
  return (
    <section className="panel">
      <Link className="back-link" to="/submissions">
        <ArrowLeft size={16} /> Ảnh của tôi
      </Link>
      <h1>{s.place_name}</h1>
      <span
        className={
          "status-badge " +
          (submissionLabel(s) === "Đã gỡ" ? "rejected" : s.status)
        }
      >
        {submissionLabel(s)}
      </span>
      <div className="submission-timeline">
        <div>
          <strong>
            <CheckCircle2 size={15} /> Đã đăng ảnh
          </strong>
          <small>
            {date(s.submitted_at)} · {s.assets.length} ảnh
          </small>
        </div>
      </div>
      {s.reason && <p className="submission-notice">Lý do gỡ: {s.reason}</p>}
      <p>{s.caption}</p>
      <div className="gallery-grid">
        {s.assets.map((a) => (
          <article key={a.id}>
            <img
              className="card-image"
              src={a.preview_url}
              alt="Ảnh bạn đã đăng"
              loading="lazy"
              decoding="async"
            />
            {a.publication_status === "published" && (
              <Link to={"/photos/" + a.public_photo_id}>
                Xem và quản lý ảnh
              </Link>
            )}
          </article>
        ))}
      </div>
      <div className="detail-actions">
        <Button variant="outline" onClick={() => void result.refetch()}>
          Cập nhật trạng thái
        </Button>
        <Button asChild>
          <Link to="/submissions/new">Đăng thêm ảnh</Link>
        </Button>
      </div>
    </section>
  );
}
