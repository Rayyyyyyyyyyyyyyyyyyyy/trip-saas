import type { ProjectedDependency } from "./createTripPresentation";

// One dependency vocabulary for every Result surface. Overview and the entity
// template render the same `type · status` line, so they must not each carry a
// partial copy. Both records are keyed by the closed projection unions, so a
// new type or status fails typecheck instead of leaking a raw enum value into
// the reading surface.
const dependencyTypeLabels: Record<ProjectedDependency["type"], string> = {
  readiness: "行前準備",
  reservation: "預約",
  ticket: "票券",
};

const dependencyStatusLabels: Record<ProjectedDependency["status"], string> = {
  action_needed: "需要處理",
  blocked: "卡住",
  cancelled: "已取消",
  confirmed: "已確認",
  not_required: "不需要",
  pending: "等待中",
  ready: "已備妥",
  unavailable: "無法取得",
  unknown: "待確認",
};

export function describeDependency(
  dependency: Pick<ProjectedDependency, "type" | "status">,
) {
  return `${dependencyTypeLabels[dependency.type]} · ${dependencyStatusLabels[dependency.status]}`;
}
