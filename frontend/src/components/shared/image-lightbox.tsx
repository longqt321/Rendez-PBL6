import Lightbox from "yet-another-react-lightbox"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"

interface ImageLightboxProps {
  readonly images: string[]
  readonly index: number
  readonly open: boolean
  readonly onClose: () => void
  readonly altPrefix?: string
}

/** Hộp xem ảnh phóng to toàn màn hình dùng yet-another-react-lightbox. */
export function ImageLightbox({
  images,
  index,
  open,
  onClose,
  altPrefix = "Ảnh phóng to",
}: ImageLightboxProps) {
  if (images.length === 0) return null

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={images.map((src, idx) => ({
        src,
        alt: `${altPrefix} ${idx + 1}`,
      }))}
      carousel={{ finite: images.length <= 1 }}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 250 }}
      render={{
        buttonPrev: images.length <= 1 ? () => null : undefined,
        buttonNext: images.length <= 1 ? () => null : undefined,
      }}
    />
  )
}
