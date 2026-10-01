import { Button, Typography } from "@mui/material";

import type {
  ProjectedEntity,
  ProjectedRelationship,
  ProjectedDayItem,
} from "./createTripPresentation";
import { describeDependency } from "./describeDependency";
import {
  editorialMarkerClass,
  type EditorialMarkerTone,
} from "../../components/editorial/EditorialPrimitives";

function markerTone(entity: ProjectedEntity): EditorialMarkerTone {
  if (entity.state.tentative || entity.unresolved.any) return "attention";
  if (entity.role === "optional" || entity.role === "flexible_space") {
    return "ready";
  }
  if (entity.anchorPriority === "fixed") return "anchor";
  return "neutral";
}

const stateLabels = {
  tentative: { text: "暫定", className: "text-trip-attention" },
  optional: { text: "可選", className: "text-trip-ready" },
} as const;

function MapAction({ entity }: { entity: ProjectedEntity }) {
  const action = entity.mapAction;
  if (!action) return null;
  return (
    <Button
      aria-label={action.accessibleName}
      className="min-h-11 min-w-11 shrink-0 border-trip-ink px-3 font-utility text-sm text-trip-ink"
      component="a"
      href={action.url}
      rel={action.rel}
      target={action.target}
      variant="outlined"
    >
      {action.label}
    </Button>
  );
}

function EntityBody({ entity }: { entity: ProjectedEntity }) {
  const label = entity.stateLabel ? stateLabels[entity.stateLabel] : null;
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          {entity.time.label && (
            <Typography
              className="shrink-0 font-utility text-xs font-bold tabular-nums text-trip-muted"
              component="span"
            >
              {entity.time.label}
            </Typography>
          )}
          <Typography
            className={
              entity.role === "transit_connector"
                ? "min-w-0 font-utility text-sm leading-snug text-trip-movement"
                : "min-w-0 font-editorial text-[19px] font-bold leading-snug"
            }
            variant="h3"
          >
            {entity.title}
          </Typography>
        </div>
        {!entity.placeLine && <MapAction entity={entity} />}
      </div>

      {(label || entity.unresolved.any) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-utility text-xs">
          {label && <span className={label.className}>{label.text}</span>}
          {entity.unresolved.any && (
            <span className="text-trip-attention">待確認</span>
          )}
        </div>
      )}

      {entity.placeLine && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <Typography className="min-w-0 font-utility text-sm text-trip-muted">
            {entity.placeLine}
          </Typography>
          <MapAction entity={entity} />
        </div>
      )}

      {entity.dependencies.length > 0 && (
        <div
          className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-trip-hairline pt-3 font-utility text-xs text-trip-muted"
          aria-label="預訂與準備狀態"
        >
          {entity.dependencies.map((dependency, index) => (
            <span
              className={
                ["action_needed", "blocked"].includes(dependency.status)
                  ? "text-trip-attention"
                  : ["ready", "confirmed"].includes(dependency.status)
                    ? "text-trip-ready"
                    : undefined
              }
              key={`${dependency.type}:${index}`}
            >
              {describeDependency(dependency)}
              {"reference" in dependency &&
                dependency.reference &&
                ` · ${dependency.reference}`}
              {dependency.detail && ` · ${dependency.detail}`}
            </span>
          ))}
        </div>
      )}

      {entity.notes.length > 0 && (
        <div className="mt-3 space-y-2">
          {entity.notes.map((note) => (
            <Typography
              className="font-editorial text-sm leading-relaxed text-trip-muted"
              key={note}
            >
              {note}
            </Typography>
          ))}
        </div>
      )}

      {entity.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {entity.actions.map((action) => (
            <Button
              className="border-trip-hairline px-4 font-utility text-trip-ink"
              component="a"
              href={action.url}
              key={action.id}
              rel={action.rel}
              target={action.target}
              variant="outlined"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResultEntity({ entity }: { entity: ProjectedEntity }) {
  if (entity.role === "transit_connector") {
    return (
      <article
        data-entity-id={entity.id}
        className="ml-2 flex min-h-11 items-start border-l border-dashed border-trip-hairline py-3 pl-5 text-trip-movement"
      >
        <span aria-hidden="true" className="mr-3 font-utility">
          ↓
        </span>
        <EntityBody entity={entity} />
      </article>
    );
  }

  return (
    <article
      data-entity-id={entity.id}
      className={`${editorialMarkerClass(markerTone(entity), "py-5")} ${
        entity.role === "flexible_space" ? "my-3 py-7" : ""
      }`}
    >
      <EntityBody entity={entity} />
    </article>
  );
}

const relationshipLabels: Record<ProjectedRelationship["type"], string> = {
  sequence: "行程順序",
  alternative: "選一個",
  conditional: "符合條件時",
  fallback: "備用方案",
  parent_child: "內部安排",
};

export function ResultSequenceContexts({
  relationships,
}: {
  relationships: ProjectedRelationship[];
}) {
  if (relationships.length === 0) return null;
  return (
    <aside aria-label="行程順序關係" className="space-y-2">
      {relationships.map((relationship) => (
        <Typography
          className="font-utility text-xs leading-relaxed text-trip-muted"
          data-relationship-id={relationship.id}
          key={relationship.id}
        >
          行程順序：
          {relationship.memberReferences
            .map((reference) => reference.title)
            .join(" → ")}
        </Typography>
      ))}
    </aside>
  );
}

export function ResultDisplayItem({ item }: { item: ProjectedDayItem }) {
  if (item.role !== "relationship_group")
    return <ResultEntity entity={item.entity} />;
  return <ResultRelationshipGroup item={item} />;
}

export function ResultRelationshipGroup({
  item,
}: {
  item: Extract<ProjectedDayItem, { role: "relationship_group" }>;
}) {
  const { relationship } = item;
  return (
    <section
      aria-label={relationshipLabels[relationship.type]}
      className={editorialMarkerClass("alternative", "py-2")}
    >
      <Typography
        className="font-utility text-trip-alternative"
        variant="overline"
      >
        {relationshipLabels[relationship.type]}
      </Typography>
      {relationship.condition && (
        <Typography className="mt-1 font-editorial text-sm text-trip-muted">
          條件：{relationship.condition}
        </Typography>
      )}
      {relationship.memberReferences.length > 0 && (
        <Typography className="mt-1 font-utility text-xs text-trip-muted">
          其他日期成員：
          {relationship.memberReferences
            .map((reference) => reference.title)
            .join("、")}
        </Typography>
      )}
      <div className="mt-4 divide-y divide-trip-hairline border-y border-trip-hairline">
        {item.items.map((child) => (
          <div
            key={child.id}
            className={
              relationship.type === "parent_child" &&
              child.id !== relationship.parentEntityId
                ? "ml-3 border-l border-trip-hairline pl-3"
                : undefined
            }
          >
            {relationship.type === "parent_child" &&
              child.id === relationship.parentEntityId && (
                <Typography className="pt-3 font-utility text-xs text-trip-muted">
                  主要安排
                </Typography>
              )}
            <ResultDisplayItem item={child} />
          </div>
        ))}
      </div>
    </section>
  );
}
