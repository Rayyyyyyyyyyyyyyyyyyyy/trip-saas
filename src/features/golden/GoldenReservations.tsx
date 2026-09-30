import { useState } from "react";
import {
  Checkbox,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import {
  editorialMarkerClass,
  EditorialSectionHeading,
} from "../../components/editorial/EditorialPrimitives";
import type { GoldenTodo } from "../../tripData";
import {
  loadGoldenTodos,
  selectGoldenReservationRows,
  toggleGoldenTodo,
} from "./checklist";

function useGoldenTodos(): [GoldenTodo[], (id: string) => void] {
  const [todos, setTodos] = useState(() => loadGoldenTodos(localStorage));
  const toggle = (id: string) =>
    setTodos((current) => toggleGoldenTodo(current, id, localStorage));
  return [todos, toggle];
}

export function GoldenReservations() {
  const [todos, toggleTodo] = useGoldenTodos();
  const completed = todos.filter((todo) => todo.done).length;
  const reservationRows = selectGoldenReservationRows(todos);

  return (
    <div>
      <Typography className="font-utility text-trip-muted" variant="overline">
        出發之前
      </Typography>
      <Typography
        className="mt-2 font-editorial text-[38px] md:text-[56px]"
        variant="h1"
      >
        行前確認清單
      </Typography>

      <section
        aria-label="出發前準備"
        className="mt-8 border-t border-trip-hairline"
      >
        <div className="flex items-baseline justify-between py-4">
          <Typography className="font-editorial font-bold">
            出發前確認
          </Typography>
          <Typography className="font-utility text-xs tabular-nums text-trip-muted">
            {completed} / {todos.length}
          </Typography>
        </div>
        <LinearProgress
          aria-label="已備妥比例"
          className="h-1 bg-trip-sunk"
          variant="determinate"
          value={(completed / todos.length) * 100}
          color={completed === todos.length ? "success" : "secondary"}
        />
        <List className="border-b border-trip-hairline" disablePadding>
          {todos.map((todo) => (
            <ListItemButton
              className="border-t border-trip-hairline px-0 py-2"
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
            >
              <ListItemIcon className="min-w-11">
                <Checkbox
                  edge="start"
                  checked={todo.done}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ "aria-label": todo.label }}
                />
              </ListItemIcon>
              <ListItemText
                primary={todo.label}
                secondary={todo.done ? "已備妥" : "待備妥"}
                primaryTypographyProps={{
                  className: "font-editorial text-trip-ink",
                }}
                secondaryTypographyProps={{
                  className: `font-utility text-xs ${
                    todo.done ? "text-trip-ready" : "text-trip-attention"
                  }`,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </section>

      <section aria-labelledby="golden-reservations" className="mt-12">
        <EditorialSectionHeading id="golden-reservations" kicker="需要備妥">
          預約與票券
        </EditorialSectionHeading>
        <div className="divide-y divide-trip-hairline border-b border-trip-hairline">
          {reservationRows.map((reservation) => (
            <article
              className={editorialMarkerClass(
                reservation.done ? "ready" : "attention",
                "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-4",
              )}
              key={reservation.title}
            >
              <Typography className="font-utility text-xs tabular-nums text-trip-muted">
                {reservation.date}
              </Typography>
              <Typography
                className={`row-span-2 self-center font-utility text-xs font-bold ${
                  reservation.done ? "text-trip-ready" : "text-trip-attention"
                }`}
              >
                {reservation.status}
              </Typography>
              <Typography
                className="font-editorial text-lg font-bold"
                variant="h3"
              >
                {reservation.title}
              </Typography>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
