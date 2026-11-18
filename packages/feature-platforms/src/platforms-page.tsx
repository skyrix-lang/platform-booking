import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Box, Moon, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  getListBookingsQueryKey,
  getListPlatformsQueryKey,
  throwUnexpected,
  useCreatePlatform,
  useDeletePlatform,
  useListPlatforms,
  useUpdatePlatform,
} from "@platform-booking/api";
import { createPlatformSchema, type Platform } from "@platform-booking/core";
import {
  Badge,
  Button,
  cn,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@platform-booking/ui";
import { Table } from "./bookings-page";
import { errorMessage } from "./format";
import { ErrorBanner, Loading, PageHeading, PlatformIcon } from "./parts";

type FormInput = z.input<typeof createPlatformSchema>;
type FormOutput = z.output<typeof createPlatformSchema>;

const emptyForm: FormInput = {
  id: "",
  description: "",
  kubernetes: false,
  nightly: false,
};

/** Add, edit and delete the team's platforms. */
export function PlatformsPage() {
  const queryClient = useQueryClient();
  const platforms = useListPlatforms({
    query: { throwOnError: throwUnexpected() },
  });
  const [editing, setEditing] = useState<Platform | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
  const create = useCreatePlatform({ mutation: { onSettled: refresh } });
  const update = useUpdatePlatform({ mutation: { onSettled: refresh } });
  const remove = useDeletePlatform({
    mutation: {
      onSettled: async () => {
        await refresh();
        // Deleting a platform releases its bookings.
        await queryClient.invalidateQueries({
          queryKey: getListBookingsQueryKey(),
        });
      },
    },
  });

  const save = async ({ id, ...fields }: FormOutput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: fields });
        setEditing(null);
      } else {
        await create.mutateAsync({ data: { id, ...fields } });
        setCreating(false);
      }
    } catch (cause) {
      setError(
        errorMessage(
          cause,
          editing ? "Failed to update platform" : "Failed to create platform",
        ),
      );
    }
  };

  if (platforms.isPending) return <Loading>Loading platforms...</Loading>;
  const list = platforms.data ?? [];

  return (
    <div className="space-y-6">
      <div ref={top} className="scroll-mt-20" />

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex items-center justify-between">
        <PageHeading
          title="Manage Platforms"
          detail={`${list.length} ${list.length === 1 ? "platform" : "platforms"}`}
        />
        {!creating && !editing && (
          <Button
            size="sm"
            className="text-xs"
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Platform
          </Button>
        )}
      </div>

      {(creating || editing) && (
        <div
          key={editing?.id ?? "new"}
          className={cn(
            "rounded-md border bg-card p-4 motion-safe:animate-slide-in",
            editing && "border-primary/40",
          )}
        >
          <h2 className="mb-4 text-sm font-semibold">
            {editing ? `Edit ${editing.id.toUpperCase()}` : "New Platform"}
          </h2>
          <PlatformForm
            initial={editing ?? emptyForm}
            isEdit={!!editing}
            onSubmit={save}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      <Table
        label="Platforms"
        columns={["Platform", "Description", "Flags"]}
        action="Actions"
      >
        {list.map((platform) => {
          const name = platform.id.toUpperCase();
          return (
            <tr
              key={platform.id}
              className={cn(
                "transition-colors",
                editing?.id === platform.id
                  ? "bg-primary-soft"
                  : "hover:bg-secondary",
              )}
            >
              <td className="px-4 py-3 font-medium">
                <span className="flex items-center gap-2">
                  <PlatformIcon kubernetes={platform.kubernetes} />
                  {name}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {platform.description || "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {platform.kubernetes && (
                    <Badge className="gap-1 rounded-md bg-info-soft px-1.5 text-info-soft-foreground">
                      <Box aria-hidden="true" className="h-3 w-3" />
                      K8S
                    </Badge>
                  )}
                  {platform.nightly && (
                    <Badge className="gap-1 rounded-md bg-accent-soft px-1.5 text-accent-soft-foreground">
                      <Moon aria-hidden="true" className="h-3 w-3" />
                      Nightly
                    </Badge>
                  )}
                  {!platform.kubernetes && !platform.nightly && (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${name}`}
                    onClick={() => {
                      setCreating(false);
                      setEditing(platform);
                      requestAnimationFrame(() =>
                        top.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                      );
                    }}
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${name}`}
                    onClick={() =>
                      remove.mutate(
                        { id: platform.id },
                        {
                          onSuccess: () => {
                            if (editing?.id === platform.id) setEditing(null);
                          },
                          onError: (cause) =>
                            setError(
                              errorMessage(cause, "Failed to delete platform"),
                            ),
                        },
                      )
                    }
                  >
                    <Trash2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-destructive-soft-foreground"
                    />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function PlatformForm({
  initial,
  isEdit,
  onSubmit,
  onCancel,
}: {
  initial: FormInput;
  isEdit: boolean;
  onSubmit: (values: FormOutput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createPlatformSchema),
    defaultValues: initial,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="space-y-4"
    >
      <Field invalid={!!errors.id}>
        <FieldLabel className="text-xs text-secondary-foreground">
          Platform ID
        </FieldLabel>
        {/* Read-only when editing: an id can't change once bookings use it. */}
        <Input
          {...register("id")}
          readOnly={isEdit}
          placeholder="e.g. dev04"
          className="font-mono read-only:opacity-60"
        />
        <FieldError match={!!errors.id} className="text-xs font-medium">
          {errors.id?.message}
        </FieldError>
      </Field>

      <Field invalid={!!errors.description}>
        <FieldLabel className="text-xs text-secondary-foreground">
          Description (optional)
        </FieldLabel>
        <Input
          {...register("description")}
          placeholder="e.g. Development environment"
        />
        <FieldError match={!!errors.description} className="text-xs">
          {errors.description?.message}
        </FieldError>
      </Field>

      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("kubernetes")}
            className="h-4 w-4 rounded-sm accent-primary"
          />
          Kubernetes
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("nightly")}
            className="h-4 w-4 rounded-sm accent-primary"
          />
          Nightly
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="text-xs"
          disabled={isSubmitting}
        >
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
