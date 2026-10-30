import { describe, it, expect } from "vitest";
import style from "../../public/map/style.json";
import fontLicense from "../../public/map/FONT-LICENSE.txt?raw";
import indexHtml from "../../index.html?raw";

interface RasterSource {
  type: string;
  tiles: string[];
  tileSize: number;
  attribution: string;
}

interface GeoJsonSource {
  type: string;
  data: string;
  attribution: string;
}

interface BackgroundLayer {
  id: string;
  type: string;
  paint: {
    "background-color": string;
  };
}

interface SymbolLayer {
  id: string;
  type: string;
  source: string;
  layout: {
    "text-font": string[];
  };
}

describe("Map configuration, resources, and licenses", () => {
  it("has valid style.json specification conforming to Mapbox/MapLibre v8", () => {
    expect(style.version).toBe(8);
    expect(style.name).toContain("Đà Nẵng");
    expect(style.sources).toBeDefined();

    // Verify raster basemap source (Esri)
    const sources = style.sources as unknown as {
      "esri-street": RasterSource;
      danang: GeoJsonSource;
    };
    const esriSource = sources["esri-street"];
    expect(esriSource).toBeDefined();
    expect(esriSource.type).toBe("raster");
    expect(Array.isArray(esriSource.tiles)).toBe(true);
    expect(esriSource.tiles.length).toBeGreaterThan(0);
    esriSource.tiles.forEach((url: string) => {
      expect(url).toMatch(/\{z\}\/\{y\}\/\{x\}/);
      expect(url).toContain("arcgisonline.com");
    });
    // Required attribution
    expect(esriSource.attribution).toContain("Esri");
    expect(esriSource.attribution).toContain("OpenStreetMap");

    // Verify local GeoJSON vector source
    const danangSource = sources["danang"];
    expect(danangSource).toBeDefined();
    expect(danangSource.type).toBe("geojson");
    expect(danangSource.data).toBe("/map/region.geojson");
    expect(danangSource.attribution).toContain("OpenStreetMap");

    // Verify fallback background color
    const layers = style.layers as unknown as (
      BackgroundLayer | SymbolLayer | { id: string }
    )[];
    const bgLayer = layers.find(
      (l): l is BackgroundLayer => l.id === "background",
    );
    expect(bgLayer).toBeDefined();
    expect(bgLayer?.paint["background-color"]).toBe("#f3f0e8");

    // Verify local glyphs endpoint
    expect(style.glyphs).toBe("/map/glyphs/{fontstack}/{range}.pbf");

    // Verify street names use local fontstack
    const streetLayer = layers.find(
      (l): l is SymbolLayer => l.id === "street-names",
    );
    expect(streetLayer).toBeDefined();
    expect(streetLayer?.layout["text-font"]).toEqual(["Noto Sans Regular"]);
  });

  it("has font license documenting SIL Open Font License compliance", () => {
    expect(fontLicense).toContain("SIL Open Font License");
    expect(fontLicense).toContain("The Noto Project Authors");
  });

  it("does not load third-party fonts or external CDN scripts in index.html", () => {
    expect(indexHtml).not.toContain("fonts.googleapis.com");
    expect(indexHtml).not.toContain("fonts.gstatic.com");
    expect(indexHtml).not.toContain("api.mapbox.com");
    expect(indexHtml).not.toContain("googletagmanager.com");
  });
});
