import { useEffect, useRef, useState } from "react";
import {
  CubeIcon,
  MoonIcon,
  PlusIcon,
  PencilIcon,
  ServerStackIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "motion/react";
import type { Platform } from "@booking/shared";
import { Button } from "@/components/ui/Button.tsx";
import { usePlatforms } from "@/hooks/usePlatforms.ts";
import {
  createPlatformApi,
  updatePlatformApi,
  deletePlatformApi,
} from "@/services/api.ts";

interface PlatformFormData {
  id: string;
  description: string;
  kubernetes: boolean;
  nightly: boolean;
}

const emptyForm: PlatformFormData = {
  id: "",
  description: "",
  kubernetes: false,
  nightly: false,
};

function PlatformForm({
  initial,
  isEdit,
  onSubmit,
  onCancel,
}: {
  initial: PlatformFormData;
  isEdit: boolean;
  onSubmit: (data: PlatformFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(initial);
    setError("");
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim()) {
      setError("Platform ID is required");
      return;
    }
    onSubmit({ ...form, id: form.id.trim().toLowerCase() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="platform-id"
          className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5"
        >
          Platform ID
        </label>
        <input
          id="platform-id"
          type="text"
          value={form.id}
          onChange={(e) => {
            setForm((f) => ({ ...f, id: e.target.value }));
            setError("");
          }}
          disabled={isEdit}
          placeholder="e.g. dev04"
          className="w-full px-3 py-2 rounded-sm border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm font-mono placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="platform-desc"
          className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5"
        >
          Description (optional)
        </label>
        <input
          id="platform-desc"
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Development environment"
          className="w-full px-3 py-2 rounded-sm border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.kubernetes}
            onChange={(e) =>
              setForm((f) => ({ ...f, kubernetes: e.target.checked }))
            }
            className="rounded-sm border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
          />
          Kubernetes
        </label>
        <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.nightly}
            onChange={(e) =>
              setForm((f) => ({ ...f, nightly: e.target.checked }))
            }
            className="rounded-sm border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
          />
          Nightly
        </label>
      </div>

      {error && (
        <p className="text-xs text-error-600 dark:text-error-400 font-medium">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

export function Platforms() {
  const { platforms, loading, error, setError } = usePlatforms();
  const [editing, setEditing] = useState<Platform | null>(null);
  const [creating, setCreating] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const editInitial: PlatformFormData | null = editing
    ? {
        id: editing.id,
        description: editing.description ?? "",
        kubernetes: editing.kubernetes ?? false,
        nightly: editing.nightly ?? false,
      }
    : null;

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEdit = (platform: Platform) => {
    setCreating(false);
    setEditing(platform);
    requestAnimationFrame(scrollToForm);
  };

  const handleCreate = async (data: PlatformFormData) => {
    try {
      await createPlatformApi({
        id: data.id,
        ...(data.description ? { description: data.description } : {}),
        ...(data.kubernetes ? { kubernetes: true } : {}),
        ...(data.nightly ? { nightly: true } : {}),
      });
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create platform");
    }
  };

  const handleUpdate = async (data: PlatformFormData) => {
    if (!editing) return;
    try {
      await updatePlatformApi(editing.id, {
        id: data.id,
        ...(data.description ? { description: data.description } : {}),
        ...(data.kubernetes ? { kubernetes: true } : {}),
        ...(data.nightly ? { nightly: true } : {}),
      });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update platform");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlatformApi(id);
      if (editing?.id === id) setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete platform");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-surface-500 dark:text-surface-400">
          Loading platforms...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div ref={formRef} />

      {error && (
        <div className="bg-error-100 dark:bg-error-500/15 border border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-400 px-4 py-3 rounded-sm text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Manage Platforms
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-mono">
            {platforms.length} {platforms.length === 1 ? "platform" : "platforms"}
          </p>
        </div>
        {!creating && !editing && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Add Platform
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {creating && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-sm p-4"
          >
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
              New Platform
            </h2>
            <PlatformForm
              initial={emptyForm}
              isEdit={false}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </motion.div>
        )}

        {editInitial && (
          <motion.div
            key={`edit-${editing!.id}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-surface-900 border border-primary-200 dark:border-primary-500/30 rounded-sm p-4"
          >
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
              Edit {editing!.id.toUpperCase()}
            </h2>
            <PlatformForm
              initial={editInitial}
              isEdit={true}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Flags
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {platforms.map((platform) => (
                <tr
                  key={platform.id}
                  className={`transition-colors ${
                    editing?.id === platform.id
                      ? "bg-primary-50 dark:bg-primary-500/10"
                      : "hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-surface-900 dark:text-surface-100">
                    <span className="flex items-center gap-2">
                      {platform.kubernetes ? (
                        <CubeIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                      ) : (
                        <ServerStackIcon className="h-4 w-4 text-surface-400 shrink-0" />
                      )}
                      {platform.id.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600 dark:text-surface-400 text-xs">
                    {platform.description || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {platform.kubernetes && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                          <CubeIcon className="h-3 w-3" />
                          K8S
                        </span>
                      )}
                      {platform.nightly && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
                          <MoonIcon className="h-3 w-3" />
                          Nightly
                        </span>
                      )}
                      {!platform.kubernetes && !platform.nightly && (
                        <span className="text-xs text-surface-400 dark:text-surface-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(platform)}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(platform.id)}
                      >
                        <TrashIcon className="h-3.5 w-3.5 text-error-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
