import { getFood, getTreasure } from "@pocco/sim";
import { useStore } from "../store.ts";

/** もちもの（P2 では食べ物のみ） */
export function Items() {
  const game = useStore((s) => s.game)!;
  const foods = game.inventory.filter((i) => i.kind === "food" && getFood(i.itemId));
  const treasures = game.inventory.filter((i) => i.kind === "treasure" && getTreasure(i.itemId));
  return (
    <section className="page">
      <h2 className="page-title pixel">もちもの</h2>
      <h3 className="section-title">たべもの</h3>
      {foods.length === 0 ? (
        <p className="muted">なにも持っていません</p>
      ) : (
        <div className="food-grid">
          {foods.map((item) => {
            const food = getFood(item.itemId)!;
            return (
              <div key={item.itemId} className="food">
                <span className="food-icon" aria-hidden>{food.icon}</span>
                <span className="food-name">{food.name}</span>
                <span className="food-count">×{item.count}</span>
              </div>
            );
          })}
        </div>
      )}
      <h3 className="section-title">ひろいもの</h3>
      {treasures.length === 0 ? (
        <p className="muted">まだ何も拾っていません。留守のあいだに散歩に出かけることがあります</p>
      ) : (
        <div className="food-grid">
          {treasures.map((item) => {
            const t = getTreasure(item.itemId)!;
            return (
              <div key={item.itemId} className={`food${t.rarity === "rare" ? " is-rare" : ""}`}>
                <span className="food-icon" aria-hidden>{t.icon}</span>
                <span className="food-name">{t.name}</span>
                <span className="food-count">×{item.count}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="muted">食べ物は 1 日 1 回のおすそわけで届きます。着せ替え・家具は P4 で追加します。</p>
    </section>
  );
}
