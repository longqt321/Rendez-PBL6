import "leaflet"

declare module "leaflet" {
  namespace TileLayer {
    class Fallback extends TileLayer {}
  }

  namespace tileLayer {
    function fallback(
      urlTemplate: string,
      options?: TileLayerOptions & { minNativeZoom?: number },
    ): TileLayer.Fallback
  }
}
