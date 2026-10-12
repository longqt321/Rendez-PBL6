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
import { MapPin, List, ArrowUpRight } from "lucide-react";
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
    longitude: number(params, "lng", 108.22, -180, 180),
    latitude: number(params, "lat", 16.067, -85, 85),
    zoom: number(params, "zoom", 14, 2, 20),
  };
  const [bounds, setBounds] = useState<string | null>(null);
  const selected = params.get("selected"),
    me = useMe();
  const [gpsError, setGpsError] = useState(false);
  const [tileError, setTileError] = useState(false),
    [generation, setGeneration] = useState(0);
  const resultPanel = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = discoveryQuery(params);
  query.delete("page");
  const results = useQuery({
    queryKey: ["markers", bounds, query.toString(), me.data?.id],
    enabled: !!bounds,
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
      <h1 className="sr-only">Quán trên bản đồ</h1>
      <Filters compact />
      <div className="map-context">
        <span>Đà Nẵng · Di chuyển bản đồ để xem quán</span>
        <Link to={"/discover?" + params.toString()}>
          Xem ảnh <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
      {gpsError && (
        <p role="status">
          Không lấy được vị trí của bạn. Di chuyển bản đồ để tìm quán.
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
            minZoom={2}
            maxZoom={20}
            mapStyle={
              import.meta.env.VITE_MAP_STYLE ||
              "https://tiles.openfreemap.org/styles/liberty"
            }
            onLoad={sync}
            onResize={sync}
            onMoveEnd={move}
            onError={() => setTileError(true)}
            onClick={() => select(null)}
            attributionControl={{ compact: false }}
          >
            <NavigationControl position="top-right" />
            <GeolocateControl
              position="top-right"
              trackUserLocation={false}
              onError={() => setGpsError(true)}
              onGeolocate={() => setGpsError(false)}
            />
            {results.data?.results.map((p) => (
              <Marker
                key={p.id}
                longitude={p.longitude!}
                latitude={p.latitude!}
                anchor="bottom"
              >
                <button
                  aria-label={"Xem " + p.name}
                  className={"marker " + (p.id === selected ? "selected" : "")}
                  onClick={(event) => {
                    event.stopPropagation();
                    select(p.id);
                  }}
                >
                  <MapPin fill="currentColor" size={34} />
                </button>
              </Marker>
            ))}
          </Map>
          <Button
            className="map-mode-switch"
            onClick={() =>
              resultPanel.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            <List size={16} /> {results.data?.total_places ?? "Xem"} quán trong
            vùng
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
              ? results.data.total_places + " quán trong vùng"
              : "Quán trong vùng"}
          </h2>
          {results.data?.truncated && <p>Phóng to bản đồ để xem thêm quán.</p>}
          <State
            pending={results.isFetching}
            error={results.error}
            onRetry={() => void results.refetch()}
          />
          {results.data?.count === 0 && (
            <p>Không có quán khớp bộ lọc trong vùng này.</p>
          )}
          {place && (
            <article className="marker-preview">
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
              <h3>{place.name}</h3>
              <p>{place.category.name}</p>
              <p className="muted small">{place.address}</p>
              <SaveButton place={place} />
              <a
                href={
                  "https://www.google.com/maps/dir/?api=1&destination=" +
                  place.latitude +
                  "," +
                  place.longitude
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Chỉ đường
              </a>
              <Button asChild>
                <Link
                  to={"/places/" + place.id + "?" + query}
                  state={{ from: "/map?" + params.toString() }}
                >
                  Xem chi tiết
                </Link>
              </Button>
              <Button variant="outline" onClick={() => select(null)}>
                Đóng xem trước
              </Button>
            </article>
          )}
          <div className="marker-list">
            {results.data?.results.map((p) => (
              <button
                key={p.id}
                className={selected === p.id ? "active" : ""}
                onClick={() => select(p.id)}
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
