import { Link } from "react-router";
import { Coffee, Moon, Sparkles, Trees, Wind } from "lucide-react";

/**
 * Contextual discovery prompts.
 *
 * A short row of entry points that turn a need into a concrete filter. Every
 * destination uses a filter value that exists in the seeded taxonomy —
 * attribute codes come from `import_danang.py` (plants, study, architecture,
 * interior, night, food, wood) and category slugs from `data/danang.json`
 * (study, night, vintage, garden, checkin, classic). A prompt must never point
 * at a filter that cannot match.
 */
const PROMPTS = [
  {
    to: "/map?attributes=study",
    label: "Làm việc",
    icon: Wind,
  },
  {
    to: "/map?category=garden",
    label: "Sân vườn",
    icon: Trees,
  },
  {
    to: "/map?category=night",
    label: "Mở 24/7",
    icon: Moon,
  },
  {
    to: "/map?attributes=food",
    label: "Có đồ uống",
    icon: Coffee,
  },
  {
    to: "/map?category=checkin",
    label: "Chỗ chụp ảnh",
    icon: Sparkles,
  },
] as const;

export function DiscoveryPrompt() {
  return (
    <section className="prompt-strip" aria-labelledby="prompt-heading">
      <h2 id="prompt-heading" className="sr-only">
        Gợi ý khám phá
      </h2>
      <ul className="prompt-strip__list" role="list">
        {PROMPTS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link className="prompt-card" to={to}>
              <Icon size={16} aria-hidden />
              <span className="prompt-card__label">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
