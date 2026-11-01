import { Link } from "react-router";
import { Coffee, Moon, Sparkles, Trees, Users, Wind } from "lucide-react";

/**
 * Contextual discovery prompts.
 *
 * Open-ended discovery fails when the user has no intention yet. These prompts
 * turn a mood into a concrete search.
 *
 * Every destination here uses a filter value that exists in the seeded
 * taxonomy — attribute codes come from `import_danang.py`
 * (plants, study, architecture, interior, night, food, wood) and category
 * slugs from `data/danang.json` (study, night, vintage, garden, checkin,
 * classic). A prompt must never point at a filter that cannot match.
 */
const PROMPTS = [
  {
    to: "/search?attributes=study",
    label: "Yên tĩnh để làm việc",
    hint: "Bàn học, ổ cắm",
    icon: Wind,
  },
  {
    to: "/search?category=garden",
    label: "Sân vườn & chill",
    hint: "Ngồi ngoài trời",
    icon: Trees,
  },
  {
    to: "/search?category=night",
    label: "Mở muộn",
    hint: "Cho buổi tối dài",
    icon: Moon,
  },
  {
    to: "/search?attributes=food",
    label: "Cà phê & đồ uống",
    hint: "Đồ uống được chú ý",
    icon: Coffee,
  },
  {
    to: "/search?category=checkin",
    label: "Không gian đẹp",
    hint: "Đáng chụp lại",
    icon: Sparkles,
  },
  {
    to: "/posts",
    label: "Xem cộng đồng",
    hint: "Trải nghiệm mới nhất",
    icon: Users,
  },
] as const;

export function DiscoveryPrompt() {
  return (
    <section className="prompt-strip" aria-labelledby="prompt-heading">
      <h2 id="prompt-heading" className="sr-only">
        Gợi ý khám phá
      </h2>
      <ul className="prompt-strip__list" role="list">
        {PROMPTS.map(({ to, label, hint, icon: Icon }) => (
          <li key={to}>
            <Link className="prompt-card" to={to}>
              <span className="prompt-card__icon">
                <Icon size={18} aria-hidden />
              </span>
              <span className="prompt-card__label">{label}</span>
              <span className="prompt-card__hint">{hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
