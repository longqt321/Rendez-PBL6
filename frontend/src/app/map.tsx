import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, List, ArrowUpRight, X, RotateCcw } from "lucide-react";
import { api, discoveryQuery } from "../lib/api/client";
import type { VisualMap } from "../lib/api/visual";
import { Button } from "../components/ui/button";
import {
  Cover,
  Filters,
  SaveButton,
  AttributeChips,
  State,
  useMe,
  googleMapsDirectionsUrl,
} from "./shared";

function number(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = params.get(key),
    value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}
export function MapPage() {
  const [params, setParams] = useSearchParams(),
    map = useRef<MapRef>(null);
  const initial = {
    longitude: number(params, "lng", 108.153, -180, 180),
    latitude: number(params, "lat", 16.068, -85, 85),
    zoom: number(params, "zoom", 14, 2, 20),
  };
  const [currentZoom, setCurrentZoom] = useState(initial.zoom);
  const [bounds, setBounds] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const selected = params.get("selected"),
    me = useMe();
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracyNotice, setAccuracyNotice] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false),
    [generation, setGeneration] = useState(0);
  const resultPanel = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = discoveryQuery(params);
  query.delete("page");
  const results = useQuery({
    queryKey: ["markers", bounds, query.toString(), me.data?.id],
    enabled: !!bounds,
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      api<VisualMap>("places/map/?" + query + "&bbox=" + bounds, { signal }),
  });
  const sync = () => {
    const current = map.current;
    if (!current) return;
    const box = current.getBounds();
    if (box)
      setBounds(
        [box.getWest(), box.getSouth(), box.getEast(), box.getNorth()].join(
          ",",
        ),
      );
  };
  useEffect(() => {
    const current = map.current;
    if (!current) return;
    const center = current.getCenter();
    if (
      Math.abs(center.lng - initial.longitude) > 0.00001 ||
      Math.abs(center.lat - initial.latitude) > 0.00001 ||
      Math.abs(current.getZoom() - initial.zoom) > 0.01
    ) {
      current.jumpTo({
        center: [initial.longitude, initial.latitude],
        zoom: initial.zoom,
      });
    }
  }, [initial.longitude, initial.latitude, initial.zoom]);
  const move = (event: ViewStateChangeEvent) => {
    setCurrentZoom(event.viewState.zoom);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      sync();
      // The camera callback may outlive the render that created it. Read the
      // latest URL so an in-flight camera update cannot drop new filters.
      const next = new URLSearchParams(window.location.search);
      next.set("lat", event.viewState.latitude.toFixed(6));
      next.set("lng", event.viewState.longitude.toFixed(6));
      next.set("zoom", event.viewState.zoom.toFixed(2));
      if (
        next.toString() !==
        new URLSearchParams(window.location.search).toString()
      ) {
        setParams(next, { replace: true });
      }
    }, 300);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const place = results.data?.results.find((p) => p.id === selected);
  const activeQuery = (params.get("q") || "").trim();
  const select = (id: string | null) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (id) next.set("selected", id);
        else next.delete("selected");
        return next;
      },
      { replace: true },
    );
  };
  return (
    <>
      <h1 className="sr-only">Địa điểm trên bản đồ</h1>
      <Filters compact />
      <div className="map-context">
        <div className="map-context-left">
          <span>Đà Nẵng · Di chuyển bản đồ để tìm quán</span>
          {activeQuery && (
            <span className="map-active-chip">
              Tìm: <strong>{activeQuery}</strong>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.delete("q");
                  setParams(next, { replace: true });
                }}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          )}
          <button
            type="button"
            className="map-reset-btn"
            onClick={() => {
              map.current?.flyTo({
                center: [108.19, 16.06],
                zoom: 12.5,
                duration: 900,
              });
            }}
            title="Xem toàn cảnh thành phố Đà Nẵng"
          >
            <RotateCcw size={12} aria-hidden /> Toàn cảnh
          </button>
        </div>
        <Link to={"/discover?" + params.toString()} className="map-switch-view">
          Xem ảnh <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
      {gpsError && <p role="status">{gpsError}</p>}
      {accuracyNotice && (
        <p
          role="status"
          className="small"
          style={{ margin: "4px 0 8px", color: "var(--muted)" }}
        >
          {accuracyNotice}
        </p>
      )}
      <div className="map-layout">
        <div className="map-canvas">
          <Map
            key={generation}
            ref={map}
            initialViewState={initial}
            locale={{
              "NavigationControl.ZoomIn": "Phóng to",
              "NavigationControl.ZoomOut": "Thu nhỏ",
              "NavigationControl.ResetBearing": "Đặt lại hướng Bắc",
              "GeolocateControl.FindMyLocation": "Vị trí của tôi",
              "GeolocateControl.LocationNotAvailable": "Không lấy được vị trí",
            }}
            minZoom={11}
            maxBounds={[108.0, 15.8, 108.4, 16.3]}
            maxZoom={18}
            mapStyle="/map/style.json"
            onLoad={sync}
            onResize={sync}
            onMoveEnd={move}
            onError={(e) => {
              const msg = e.error?.message?.toLowerCase() || "";
              if (
                msg.includes("style") ||
                msg.includes("failed to fetch") ||
                !map.current?.getMap()?.isStyleLoaded()
              ) {
                setTileError(true);
              }
            }}
            onClick={() => select(null)}
            attributionControl={{ compact: false }}
          >
            <NavigationControl position="top-right" />
            <GeolocateControl
              position="top-right"
              trackUserLocation={false}
              positionOptions={{
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
              }}
              fitBoundsOptions={{
                maxZoom: 16,
              }}
              onError={() => {
                setGpsError(
                  "Không lấy được vị trí từ thiết bị. Kiểm tra quyền truy cập vị trí trên trình duyệt.",
                );
                setAccuracyNotice(null);
              }}
              onGeolocate={(e) => {
                setGpsError(null);
                if (e.coords.accuracy > 500) {
                  const km = (e.coords.accuracy / 1000).toFixed(1);
                  setAccuracyNotice(
                    `Vị trí ước tính từ địa chỉ mạng (sai số ~${km} km). Định vị trên thiết bị di động có GPS sẽ đạt độ chính xác cao nhất.`,
                  );
                } else {
                  setAccuracyNotice(null);
                }
              }}
              onOutOfMaxBounds={() => {
                setGpsError(
                  "Vị trí của bạn hiện nằm ngoài phạm vi bản đồ Đà Nẵng.",
                );
                setAccuracyNotice(null);
              }}
            />
            {currentZoom < 13.8 && (
              <>
                <Marker longitude={108.152} latitude={16.074} anchor="center">
                  <span className="map-label">LIÊN CHIỂU</span>
                </Marker>
                <Marker longitude={108.226} latitude={16.08} anchor="center">
                  <span className="map-label">HẢI CHÂU</span>
                </Marker>
                <Marker longitude={108.262} latitude={16.082} anchor="center">
                  <span className="map-label">SƠN TRÀ</span>
                </Marker>
                <Marker longitude={108.247} latitude={16.01} anchor="center">
                  <span className="map-label">NGŨ HÀNH SƠN</span>
                </Marker>
              </>
            )}
            {results.data?.results.map((p) => (
              <Marker
                key={p.id}
                longitude={p.longitude!}
                latitude={p.latitude!}
                anchor="bottom"
              >
                <button
                  type="button"
                  title={p.name + " · " + p.category.name}
                  aria-label={"Xem " + p.name + " (" + p.category.name + ")"}
                  aria-pressed={p.id === selected}
                  className={
                    "marker " +
                    (p.id === selected ? "selected " : "") +
                    (p.id === hovered ? "hovered " : "")
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    select(p.id);
                  }}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <MapPin fill="currentColor" size={30} />
                  <span className="marker-name">
                    <strong>{p.name}</strong>
                    <small>{p.category.name}</small>
                  </span>
                </button>
              </Marker>
            ))}
          </Map>
          {place && (
            <div
              className="map-mobile-peek"
              role="region"
              aria-label={"Xem nhanh " + place.name}
            >
              <div className="map-mobile-peek-thumb">
                <Cover
                  place={{
                    name: place.name,
                    cover_image_url:
                      place.supporting_photo?.url || place.cover_image_url,
                  }}
                />
              </div>
              <div className="map-mobile-peek-info">
                <div className="map-mobile-peek-header">
                  <span className="map-mobile-peek-cat">
                    {place.category.name}
                  </span>
                  <button
                    type="button"
                    className="map-mobile-peek-close"
                    onClick={() => select(null)}
                    aria-label="Đóng xem trước"
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>
                <h3 className="map-mobile-peek-title">{place.name}</h3>
                <p className="map-mobile-peek-address">{place.address}</p>
                <div className="map-mobile-peek-actions">
                  <Button asChild className="map-mobile-peek-primary">
                    <Link
                      to={
                        place.supporting_photo || place.cover_photo_id
                          ? "/photos/" +
                            (place.supporting_photo?.id || place.cover_photo_id)
                          : "/places/" + place.id
                      }
                      state={{ from: "/map?" + params.toString() }}
                    >
                      Chi tiết <ArrowUpRight size={13} aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="map-mobile-peek-sub"
                  >
                    <a
                      href={googleMapsDirectionsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chỉ đường
                    </a>
                  </Button>
                  <SaveButton place={place} />
                </div>
              </div>
            </div>
          )}
          <Button
            className="map-mode-switch"
            onClick={() =>
              resultPanel.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            <List size={16} /> {results.data?.total_places ?? "Xem"} địa điểm
            trong vùng
          </Button>
          {tileError && (
            <div className="map-error" role="alert">
              <p>Không tải được bản đồ.</p>
              <Button
                onClick={() => {
                  setTileError(false);
                  setGeneration(generation + 1);
                }}
              >
                Thử lại bản đồ
              </Button>
              <Link to={"/discover?" + query}>Về Khám phá</Link>
            </div>
          )}
        </div>
        <aside className="map-results" ref={resultPanel}>
          <h2>
            {results.data
              ? results.data.total_places + " địa điểm trong vùng"
              : "Địa điểm trong vùng"}
          </h2>
          {results.data?.truncated && (
            <p>Phóng to bản đồ để xem thêm địa điểm.</p>
          )}
          <State
            pending={results.isFetching}
            error={results.error}
            onRetry={() => void results.refetch()}
          />
          {results.data?.count === 0 && (
            <div style={{ padding: "12px 0" }}>
              <p>Không có địa điểm nào trong vùng hiển thị này.</p>
              <p
                className="muted small"
                style={{ margin: "6px 0 12px", lineHeight: "1.5" }}
              >
                Mạng lưới không gian Rendez đang liên tục được cộng đồng cập
                nhật tại Đà Nẵng.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  map.current?.flyTo({
                    center: [108.153, 16.068],
                    zoom: 14,
                    duration: 1200,
                  });
                }}
              >
                Khám phá các quán tại khu vực Liên Chiểu
              </Button>
            </div>
          )}
          {place && (
            <article className="marker-preview">
              <div className="marker-preview-header">
                <div>
                  <h3 className="marker-preview-title">{place.name}</h3>
                  <p className="marker-preview-cat">{place.category.name}</p>
                </div>
                <button
                  type="button"
                  className="marker-preview-close"
                  onClick={() => select(null)}
                  aria-label="Đóng xem trước"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
              <Cover
                place={{
                  name: place.name,
                  cover_image_url:
                    place.supporting_photo?.url || place.cover_image_url,
                }}
              />
              {place.supporting_photo && (
                <AttributeChips
                  attributes={place.supporting_photo.attributes}
                  matched={place.supporting_photo.matched_attribute_codes}
                />
              )}
              <p className="muted small">{place.address}</p>
              <div className="marker-preview-actions">
                <Button asChild className="marker-preview-primary">
                  <Link
                    to={
                      place.supporting_photo || place.cover_photo_id
                        ? "/photos/" +
                          (place.supporting_photo?.id || place.cover_photo_id)
                        : "/places/" + place.id
                    }
                    state={{ from: "/map?" + params.toString() }}
                  >
                    Xem chi tiết không gian{" "}
                    <ArrowUpRight size={16} aria-hidden />
                  </Link>
                </Button>
                <div className="marker-preview-subactions">
                  <SaveButton place={place} />
                  <Button asChild variant="outline">
                    <a
                      href={googleMapsDirectionsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chỉ đường
                    </a>
                  </Button>
                </div>
              </div>
            </article>
          )}
          <div className="marker-list">
            {results.data?.results.map((p) => (
              <button
                type="button"
                key={p.id}
                className={
                  (selected === p.id ? "active " : "") +
                  (hovered === p.id ? "hovered " : "")
                }
                aria-pressed={selected === p.id}
                onClick={() => select(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <Cover
                  place={{
                    name: p.name,
                    cover_image_url:
                      p.supporting_photo?.url || p.cover_image_url,
                  }}
                />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.category.name}</small>
                  <small>{p.address}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: { latitude: number; longitude: number } | null;
  onChange: (value: { latitude: number; longitude: number } | null) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [tileError, setTileError] = useState(false);
  const [generation, setGeneration] = useState(0);

  const targetLat = value?.latitude;
  const targetLng = value?.longitude;

  useEffect(() => {
    if (targetLat !== undefined && targetLng !== undefined && mapRef.current) {
      mapRef.current.flyTo({
        center: [targetLng, targetLat],
        zoom: 15,
        duration: 800,
      });
    }
  }, [targetLat, targetLng]);

  return (
    <div className="place-location">
      <p className="muted small">
        Bản đồ tự động ghim vị trí khi bạn gõ địa chỉ. Bạn cũng có thể chạm vào
        bản đồ để tinh chỉnh.
      </p>
      <div className="location-picker">
        <Map
          key={generation}
          ref={mapRef}
          initialViewState={{
            latitude: value?.latitude || 16.068,
            longitude: value?.longitude || 108.153,
            zoom: 14,
          }}
          minZoom={11}
          maxZoom={18}
          maxBounds={[108.0, 15.8, 108.4, 16.3]}
          mapStyle="/map/style.json"
          onError={(e) => {
            const msg = e.error?.message?.toLowerCase() || "";
            if (
              msg.includes("style") ||
              msg.includes("failed to fetch") ||
              !mapRef.current?.getMap()?.isStyleLoaded()
            ) {
              setTileError(true);
            }
          }}
          onClick={(event) =>
            onChange({
              latitude: Number(event.lngLat.lat.toFixed(6)),
              longitude: Number(event.lngLat.lng.toFixed(6)),
            })
          }
          attributionControl={{ compact: true }}
        >
          <NavigationControl position="top-right" />
          {value && (
            <Marker latitude={value.latitude} longitude={value.longitude}>
              <MapPin
                size={32}
                fill="var(--color-primary, #234e40)"
                color="var(--color-primary, #234e40)"
              />
            </Marker>
          )}
        </Map>
        {tileError && (
          <div className="map-error" role="alert">
            <p>Không tải được bản đồ chọn vị trí.</p>
            <Button
              type="button"
              onClick={() => {
                setTileError(false);
                setGeneration((g) => g + 1);
              }}
            >
              Thử lại bản đồ
            </Button>
          </div>
        )}
      </div>
      {value && (
        <div className="small">
          <span className="success">
            Đã ghim vị trí: ({value.latitude.toFixed(6)},{" "}
            {value.longitude.toFixed(6)})
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() => onChange(null)}
          >
            Bỏ vị trí đã chọn
          </button>
        </div>
      )}
    </div>
  );
}
