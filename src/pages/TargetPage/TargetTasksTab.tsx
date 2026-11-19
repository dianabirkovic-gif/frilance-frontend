import { useCallback, useState } from "react";
import {
  nextTargetStatus,
  TARGET_STATUS_ORDER,
  type TargetTask,
  type UpdateTargetTaskPayload,
} from "../../api/target";
import { PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import { TargetTaskDrawer } from "../../organisms/TargetTaskDrawer/TargetTaskDrawer";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { ClientFilter } from "./ClientFilter";
import styles from "./TargetPage.module.css";
import {
  useCreateTargetTask,
  useDeleteTargetTask,
  useUpdateTargetTask,
  useUpdateTargetTaskStatus,
} from "./useTargetMutations";
import { useTargetBoard } from "./useTargetBoard";

/**
 * The Завдання tab of Таргет: the targetologist's tasks as a three-column board
 * (To do / In progress / Done), filterable by client.
 *
 * READ opens the board but not its writes — the backend rejects them either
 * way; this just does not offer buttons that would 403. Moving a card forward
 * is one click on its arrow; any other change goes through the drawer.
 */
export function TargetTasksTab() {
  const { t, locale } = useLocale();
  const canEdit = useAuth().canEdit("TARGET");

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TargetTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<TargetTask | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useTargetBoard(selectedClientId);

  const createTask = useCreateTargetTask();
  const updateTask = useUpdateTargetTask();
  const updateStatus = useUpdateTargetTaskStatus();
  const deleteTask = useDeleteTargetTask();

  usePageHeader({
    title: t.targetPage.title,
    subtitle: data
      ? interpolate(t.targetPage.subtitleTemplate, {
          done: data.doneTasks,
          total: data.totalTasks,
          overdue: data.overdueTasks,
        })
      : "",
  });

  const openCreateDrawer = useCallback(() => {
    setEditingTask(null);
    setIsDrawerOpen(true);
  }, []);

  usePageFab(canEdit ? { label: t.targetPage.newTaskButton, onClick: openCreateDrawer } : null);

  async function handleSubmit(payload: UpdateTargetTaskPayload) {
    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    setIsDrawerOpen(false);
  }

  async function handleConfirmDeletion() {
    if (!taskPendingDeletion) return;
    await deleteTask.mutateAsync(taskPendingDeletion.id);
    setTaskPendingDeletion(null);
  }

  if (isLoading) {
    return <div className={styles.state}>{t.targetPage.loading}</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>
          {t.targetPage.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          {t.targetPage.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <ClientFilter
          clients={data.clients}
          selectedClientId={selectedClientId}
          onChange={setSelectedClientId}
          allLabel={t.targetPage.allClients}
          labelTemplate={t.targetPage.clientFilterLabelTemplate}
        />

        <div className={styles.spacer} />

        {canEdit && (
          <button type="button" className={styles.newTaskBtn} onClick={openCreateDrawer}>
            <PlusIcon width={15} height={15} />
            {t.targetPage.newTaskButton}
          </button>
        )}
      </div>

      {data.tasks.length === 0 && <p className={styles.emptyBoard}>{t.targetPage.emptyBoard}</p>}

      <div className={isFetching ? `${styles.board} ${styles.busy}` : styles.board} aria-busy={isFetching}>
        {TARGET_STATUS_ORDER.map((status) => {
          const tasks = data.tasks.filter((task) => task.status === status);
          return (
            <section key={status} className={styles.column} aria-label={t.targetStatus[status]}>
              <header className={styles.columnHeader}>
                <span>{t.targetStatus[status]}</span>
                <span className={styles.count}>{tasks.length}</span>
              </header>

              {tasks.length === 0 ? (
                <p className={styles.columnEmpty}>{t.targetPage.emptyColumn}</p>
              ) : (
                <ul className={styles.cards}>
                  {tasks.map((task) => {
                    const next = nextTargetStatus(task.status);
                    return (
                      <li key={task.id} className={task.overdue ? `${styles.card} ${styles.cardOverdue}` : styles.card}>
                        <div className={styles.cardTop}>
                          <span className={styles.kind}>{t.targetKind[task.kind]}</span>
                          {task.overdue && <span className={styles.overdue}>{t.targetPage.overdueBadge}</span>}
                        </div>
                        <div className={styles.cardTitle}>{task.title}</div>
                        {task.description && <p className={styles.cardDescription}>{task.description}</p>}
                        <div className={styles.cardMeta}>
                          {selectedClientId === null && <span>{task.clientName}</span>}
                          <span>
                            {task.dueDate
                              ? interpolate(t.targetPage.dueTemplate, {
                                  date: new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(locale),
                                })
                              : t.targetPage.noDueDate}
                          </span>
                        </div>

                        {canEdit && (
                          <div className={styles.cardActions}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => {
                                setEditingTask(task);
                                setIsDrawerOpen(true);
                              }}
                            >
                              {t.targetPage.edit}
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => setTaskPendingDeletion(task)}
                            >
                              {t.targetPage.delete}
                            </button>
                            {next && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.advanceBtn}`}
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: task.id, status: next })}
                              >
                                {interpolate(t.targetPage.advanceTemplate, { status: t.targetStatus[next] })}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {canEdit && (
        <TargetTaskDrawer
          open={isDrawerOpen}
          task={editingTask}
          clients={data.clients}
          defaultClientId={selectedClientId}
          isSubmitting={createTask.isPending || updateTask.isPending}
          onSubmit={handleSubmit}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <ConfirmationDialog
        open={taskPendingDeletion !== null}
        title={t.targetPage.deleteConfirmTitle}
        message={interpolate(t.targetPage.deleteConfirmMessageTemplate, { title: taskPendingDeletion?.title ?? "" })}
        isConfirming={deleteTask.isPending}
        onConfirm={handleConfirmDeletion}
        onCancel={() => setTaskPendingDeletion(null)}
      />
    </div>
  );
}
