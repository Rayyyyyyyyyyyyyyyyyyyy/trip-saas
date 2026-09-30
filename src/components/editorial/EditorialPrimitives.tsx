import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ReactNode,
} from "react";

const markerToneClass = {
  alternative: "border-trip-alternative",
  anchor: "border-trip-anchor",
  attention: "border-trip-attention",
  movement: "border-trip-movement",
  neutral: "border-trip-hairline",
  ready: "border-trip-ready",
} as const;

export type EditorialMarkerTone = keyof typeof markerToneClass;

// The reading measure and the 4px semantic marker are single design decisions.
// Surfaces that cannot use the components below — because they need their own
// element or landmark — compose these instead of restating the raw values.
export const editorialMeasureClass = "mx-auto w-full min-w-0 max-w-[680px]";

// The marker edge itself, without the reading inset. `EditorialFrame` carries
// its own padding, so it composes the edge alone.
function markerEdgeClass(tone: EditorialMarkerTone) {
  return `border-l-4 ${markerToneClass[tone]}`;
}

/**
 * The 4px semantic marker. `nested: true` is the tighter inset used when a
 * marker sits inside another marked block, so the two insets stay a decision
 * of this module rather than a per-surface guess.
 */
export function editorialMarkerClass(
  tone: EditorialMarkerTone,
  className = "",
  { nested = false }: { nested?: boolean } = {},
) {
  const inset = nested ? "pl-3" : "pl-4";
  return `${markerEdgeClass(tone)} bg-transparent ${inset} ${className}`.trim();
}

export function EditorialMeasure({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`${editorialMeasureClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function EditorialSectionHeading({
  children,
  className = "",
  kicker,
  ...props
}: ComponentPropsWithoutRef<"h2"> & { kicker?: ReactNode }) {
  return (
    <h2
      className={`border-b border-trip-hairline pb-2 font-editorial text-2xl font-black leading-tight text-trip-ink ${className}`.trim()}
      {...props}
    >
      {kicker ? (
        <span className="mb-1 block font-utility text-[11px] font-bold tracking-[.16em] text-trip-faint">
          {kicker}
        </span>
      ) : null}
      {children}
    </h2>
  );
}

export function EditorialMarker({
  children,
  className = "",
  tone,
  ...props
}: ComponentPropsWithRef<"div"> & {
  tone: EditorialMarkerTone;
}) {
  return (
    <div className={editorialMarkerClass(tone, className)} {...props}>
      {children}
    </div>
  );
}

export function EditorialFrame({
  children,
  className = "",
  markerTone,
  ...props
}: ComponentPropsWithoutRef<"div"> & { markerTone?: EditorialMarkerTone }) {
  const marker = markerTone ? markerEdgeClass(markerTone) : "";
  return (
    <div
      className={`min-w-0 border border-trip-hairline bg-transparent p-4 ${marker} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
