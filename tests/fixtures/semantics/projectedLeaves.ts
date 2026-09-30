import type {
  ProjectedDayItem,
  ProjectedEntity,
} from "../../../src/features/result/createTripPresentation";
export function projectedLeaves(items: ProjectedDayItem[]): ProjectedEntity[] {
  return items.flatMap((item) =>
    item.role === "relationship_group"
      ? projectedLeaves(item.items)
      : [item.entity],
  );
}
