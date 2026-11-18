import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  createBookingSchema,
  daysBetween,
  toISODate,
  type Booking,
  type Platform,
} from "@platform-booking/core";
import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@platform-booking/ui";
import { Calendar } from "./calendar";
import { formatDayLong } from "./format";

/** What the dialog is for: booking a platform, or changing a booking's end date. */
export interface BookingTarget {
  platform: Platform;
  /** When set, the dialog changes this booking's end date. */
  booking?: Booking;
  /** Who is already on the platform, when booking it. */
  takenTrigrams?: string[];
}

/**
 * The book / join / edit-date dialog. Open while `target` is set; it keeps
 * showing the last target while it closes, so it can fade out.
 */
export function BookingDialog({
  target,
  onConfirm,
  onClose,
}: {
  target: BookingTarget | null;
  onConfirm: (trigram: string, endDate: string) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(target);
  if (target && target !== shown) setShown(target);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {shown && (
        <BookingForm
          key={`${shown.platform.id}/${shown.booking?.trigram ?? ""}`}
          target={shown}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  );
}

function BookingForm({
  target: { platform, booking, takenTrigrams = [] },
  onConfirm,
}: {
  target: BookingTarget;
  onConfirm: (trigram: string, endDate: string) => void;
}) {
  const [today] = useState(() => toISODate(new Date()));
  const maxDate = platform.nightly ? today : undefined;
  const startDate = booking?.startDate ?? today;
  const calendarLabel = useId();
  const trigramInput = useRef<HTMLElement | null>(null);

  // The server's schema, plus what only the page knows: who is already here.
  const schema = useMemo(
    () =>
      createBookingSchema
        .pick({ trigram: true, endDate: true })
        .superRefine(({ trigram }, context) => {
          if (!booking && takenTrigrams.includes(trigram)) {
            context.addIssue({
              code: "custom",
              path: ["trigram"],
              message: `${trigram} has already booked this platform`,
            });
          }
        }),
    [booking, takenTrigrams],
  );
  type FormInput = z.input<typeof schema>;
  type FormOutput = z.output<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      trigram: booking?.trigram ?? "",
      endDate: booking?.endDate ?? today,
    },
  });
  const endDate = useWatch({ control, name: "endDate" });
  const { ref: trigramRef, ...trigramField } = register("trigram");

  const onSubmit = handleSubmit(({ trigram, endDate }) =>
    onConfirm(trigram, endDate),
  );

  return (
    <DialogPopup initialFocus={booking ? undefined : trigramInput}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <DialogTitle>
            {booking ? "Edit Release Date" : "Book Platform"}
          </DialogTitle>
          <DialogDescription className="mt-0.5">
            {platform.id.toUpperCase()}
            {booking && ` · ${booking.trigram}`}
            {!booking &&
              takenTrigrams.length > 0 &&
              ` · Also here: ${takenTrigrams.join(", ")}`}
          </DialogDescription>
        </div>
        <DialogClose
          aria-label="Close"
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </DialogClose>
      </div>

      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="space-y-4 p-4"
      >
        {!booking && (
          <Field invalid={!!errors.trigram}>
            <FieldLabel className="text-xs text-secondary-foreground">
              Your trigram name
            </FieldLabel>
            <Input
              {...trigramField}
              ref={(element) => {
                trigramRef(element);
                trigramInput.current = element;
              }}
              maxLength={3}
              autoComplete="off"
              placeholder="ABC"
              className="font-mono uppercase tracking-widest"
            />
            <FieldError
              match={!!errors.trigram}
              className="text-xs font-medium"
            >
              {errors.trigram?.message}
            </FieldError>
          </Field>
        )}

        <div>
          <p
            id={calendarLabel}
            className="mb-1.5 text-xs font-medium text-secondary-foreground"
          >
            Release date
          </p>
          <div className="rounded-md border bg-secondary p-3">
            <Calendar
              labelledBy={calendarLabel}
              selectedDate={endDate}
              minDate={today}
              maxDate={maxDate}
              onSelect={(date) =>
                setValue("endDate", date, { shouldValidate: true })
              }
            />
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {formatDayLong(startDate)} → {formatDayLong(endDate)}{" "}
            <span>({daysBetween(startDate, endDate)}d)</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <DialogClose
            render={<Button type="button" variant="ghost" size="sm" />}
            className="text-xs"
          >
            Cancel
          </DialogClose>
          <Button
            type="submit"
            size="sm"
            className="text-xs"
            disabled={endDate === booking?.endDate}
          >
            Confirm
          </Button>
        </div>
      </form>
    </DialogPopup>
  );
}
