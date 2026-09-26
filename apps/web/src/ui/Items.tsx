import { useState } from "react";
import {
  FLOORS,
  FURNITURE,
  FURNITURE_SLOTS,
  WALLPAPERS,
  WEAR_SLOT_LABEL,
  getFood,
  getFurniture,
  getTreasure,
  getWearable,
  type DecorTarget,
  type Furniture,
} from "@pocco/sim";
import { useStore } from "../store.ts";
import { Sheet } from "./Sheet.tsx";

type Category = "food" | "wear" | "room" | "treasure";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "food", label: "たべもの" },
  { id: "wear", label: "きせかえ" },
  { id: "room", label: "もようがえ" },
  { id: "treasure", label: "ひろいもの" },
];

/** もちもの。着せ替え・模様替えはここから（仕様書 10.7・10.8） */
export function Items() {
  const game = useStore((s) => s.game)!;
  const send = useStore((s) => s.send);
  const [category, setCategory] = useState<Category>("food");
  const [placing, setPlacing] = useState<Furniture | null>(null);
  const owned = (kind: string) => game.inventory.filter((i) => i.kind === kind && i.count > 0);
  const equipped = game.pet.state.equipped;
  const { room } = game;
  const canDress = game.pet.state.stage !== "egg" && game.pet.state.stage !== "departed" && game.pet.state.activity.type !== "out";

  return (
    <section className="page">
      <h2 className="page-title pixel">もちもの</h2>
      <div className="segmented" role="tablist">
        {CATEGORIES.map((c) => (
          <button key={c.id} role="tab" aria-selected={category === c.id} className={category === c.id ? "is-active" : ""} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {category === "food" && (
        <Grid
          empty="なにも持っていません。食べ物は 1 日 1 回のおすそわけで届きます"
          items={owned("food").flatMap((i) => {
            const f = getFood(i.itemId);
            return f ? [{ id: f.id, icon: f.icon, name: f.name, sub: `×${i.count}` }] : [];
          })}
        />
      )}

      {category === "wear" && (
        <>
          {!canDress && <p className="muted">いまは着せ替えできません</p>}
          <Grid
            empty="着せ替えはまだありません。成長の節目や散歩、図鑑のごほうびで手に入ります"
            items={owned("wear").flatMap((i) => {
              const w = getWearable(i.itemId);
              if (!w) return [];
              const on = equipped[w.slot] === w.id;
              return [
                {
                  id: w.id,
                  icon: w.icon,
                  name: w.name,
                  sub: WEAR_SLOT_LABEL[w.slot],
                  badge: on ? "そうび中" : undefined,
                  onClick: canDress ? () => send({ type: "equip", slot: w.slot, itemId: on ? null : w.id }) : undefined,
                },
              ];
            })}
          />
          <p className="muted">タップで着せる・もう一度タップで脱がせる。好みに合わないと、脱ぎ捨てることも…</p>
        </>
      )}

      {category === "room" && (
        <>
          <h3 className="section-title">かべがみ</h3>
          <Grid
            items={WALLPAPERS.filter((w) => owned("wallpaper").some((i) => i.itemId === w.id)).map((w) => ({
              id: w.id,
              swatch: [w.base, w.accent],
              name: w.name,
              badge: room.wallpaperId === w.id ? "いま" : undefined,
              onClick: () => send({ type: "decorate", target: "wallpaper", itemId: w.id }),
            }))}
          />
          <h3 className="section-title">ゆか</h3>
          <Grid
            items={FLOORS.filter((f) => owned("floor").some((i) => i.itemId === f.id)).map((f) => ({
              id: f.id,
              swatch: [f.base, f.accent],
              name: f.name,
              badge: room.floorId === f.id ? "いま" : undefined,
              onClick: () => send({ type: "decorate", target: "floor", itemId: f.id }),
            }))}
          />
          <h3 className="section-title">かぐ</h3>
          <Grid
            empty="家具はまだありません"
            items={FURNITURE.filter((f) => owned("furniture").some((i) => i.itemId === f.id)).map((f) => {
              const placedAt = Object.entries(room.furniture).find(([, id]) => id === f.id)?.[0];
              return {
                id: f.id,
                icon: f.icon,
                name: f.name,
                sub: f.kind === "wall" ? "かべ" : "ゆか",
                badge: placedAt ? "おいてある" : undefined,
                onClick: () => setPlacing(f),
              };
            })}
          />
        </>
      )}

      {category === "treasure" && (
        <Grid
          empty="まだ何も拾っていません。留守のあいだに散歩に出かけることがあります"
          items={owned("treasure").flatMap((i) => {
            const t = getTreasure(i.itemId);
            return t ? [{ id: t.id, icon: t.icon, name: t.name, sub: `×${i.count}`, rare: t.rarity === "rare" }] : [];
          })}
        />
      )}

      {placing && (
        <Sheet title={`${placing.name}をどこに置く？`} onClose={() => setPlacing(null)}>
          <div className="slot-list">
            {FURNITURE_SLOTS.filter((s) => s.kind === placing.kind).map((slot) => {
              const current = getFurniture(room.furniture[slot.id] ?? "");
              const here = current?.id === placing.id;
              return (
                <button
                  key={slot.id}
                  className="card slot"
                  onClick={() => {
                    send({ type: "decorate", target: slot.id as DecorTarget, itemId: here ? null : placing.id });
                    setPlacing(null);
                  }}
                >
                  <span className="pixel">{slot.label}</span>
                  <span className="muted">
                    {here ? "ここにある → しまう" : current ? `${current.icon} ${current.name} と入れかえ` : "あいている"}
                  </span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </section>
  );
}

interface GridItem {
  id: string;
  name: string;
  icon?: string;
  swatch?: [string, string];
  sub?: string;
  badge?: string;
  rare?: boolean;
  onClick?: () => void;
}

function Grid({ items, empty }: { items: GridItem[]; empty?: string }) {
  if (items.length === 0) return <p className="muted">{empty ?? "なし"}</p>;
  return (
    <div className="food-grid">
      {items.map((it) => {
        const content = (
          <>
            {it.icon && <span className="food-icon" aria-hidden>{it.icon}</span>}
            {it.swatch && (
              <span className="swatch" aria-hidden style={{ background: `repeating-linear-gradient(90deg, ${it.swatch[0]} 0 6px, ${it.swatch[1]} 6px 9px)` }} />
            )}
            <span className="food-name">{it.name}</span>
            {it.sub && <span className="food-count">{it.sub}</span>}
            {it.badge && <span className="food-new is-on">{it.badge}</span>}
          </>
        );
        const cls = `food${it.rare ? " is-rare" : ""}${it.badge ? " is-selected" : ""}`;
        return it.onClick ? (
          <button key={it.id} className={cls} onClick={it.onClick}>{content}</button>
        ) : (
          <div key={it.id} className={cls}>{content}</div>
        );
      })}
    </div>
  );
}
