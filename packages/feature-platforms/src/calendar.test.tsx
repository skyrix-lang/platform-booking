import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "./calendar";
import { formatDayFull } from "./format";

const label = (iso: string) => formatDayFull(iso);

function renderCalendar(props: Partial<Parameters<typeof Calendar>[0]> = {}) {
  const onSelect = vi.fn<(date: string) => void>();
  render(
    <>
      <span id="label">End date</span>
      <Calendar
        selectedDate="2030-03-10"
        minDate="2030-03-05"
        onSelect={onSelect}
        labelledBy="label"
        {...props}
      />
    </>,
  );
  return { onSelect };
}

describe("Calendar", () => {
  it("starts weeks on Monday and marks the selected day", () => {
    renderCalendar();

    expect(screen.getByText("Mar 2030")).toBeVisible();
    expect(
      screen.getByRole("button", { name: label("2030-03-10") }),
    ).toHaveAttribute("aria-pressed", "true");
    // 1 March 2030 is a Friday: after the seven day names, four empty cells.
    const first = screen.getByRole("button", { name: label("2030-03-01") });
    const cells = [...first.parentElement!.children];
    expect(cells.slice(0, 7).map((cell) => cell.textContent)).toEqual([
      "Mo",
      "Tu",
      "We",
      "Th",
      "Fr",
      "Sa",
      "Su",
    ]);
    expect(cells.indexOf(first)).toBe(11);
  });

  it("picks a day between the limits only", async () => {
    const { onSelect } = renderCalendar({ maxDate: "2030-03-12" });

    await userEvent.click(
      screen.getByRole("button", { name: label("2030-03-11") }),
    );

    expect(onSelect).toHaveBeenCalledWith("2030-03-11");
    expect(
      screen.getByRole("button", { name: label("2030-03-04") }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: label("2030-03-13") }),
    ).toBeDisabled();
  });

  it("moves between months, but not before the first bookable one", async () => {
    renderCalendar();

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByText("Apr 2030")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeEnabled();
  });
});
