import { getFood } from "@pocco/sim";
import { useStore } from "../store.ts";
import { Sheet } from "./Sheet.tsx";
import { ItemIcon } from "./ItemIcon.tsx";

/** ごはんを選ぶ（仕様書 10.1） */
export function FoodSheet() {
  const game = useStore((s) => s.game)!;
  const send = useStore((s) => s.send);
  const setSheet = useStore((s) => s.setSheet);
  const foods = game.inventory.filter((i) => i.kind === "food" && getFood(i.itemId));
  const eaten = game.pet.state.stats;

  const give = async (foodId: string) => {
    setSheet(null);
    await send({ type: "feed", foodId });
  };

  return (
    <Sheet title="ごはん" onClose={() => setSheet(null)}>
      {foods.length === 0 ? (
        <p className="muted">食べ物がありません。明日のおすそわけを待とう</p>
      ) : (
        <div className="food-grid">
          {foods.map((item) => {
            const food = getFood(item.itemId)!;
            return (
              <button key={item.itemId} className="food" onClick={() => give(food.id)}>
                <ItemIcon kind="food" id={food.id} fallback={food.icon} />
                <span className="food-name">{food.name}</span>
                <span className="food-count">×{item.count}</span>
                {!eaten[`food_${food.id}`] && <span className="food-new">NEW</span>}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
