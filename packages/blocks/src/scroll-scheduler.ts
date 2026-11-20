type ScrollTask = { read: () => (() => void) | undefined }
type Scheduler = { add: (task: ScrollTask) => { schedule: () => void; dispose: () => void } }
const schedulers = new WeakMap<Window, Scheduler>()

/** One frame/listener per window. Every measurement completes before any style write. */
export function registerScrollTask(win: Window, task: ScrollTask) {
  let scheduler = schedulers.get(win)
  if (!scheduler) {
    const tasks = new Set<ScrollTask>()
    let frame = 0
    const schedule = () => {
      if (frame || win.document.hidden) return
      frame = win.requestAnimationFrame(() => {
        frame = 0
        const writes = [...tasks].map((item) => item.read())
        writes.forEach((write) => write?.())
      })
    }
    win.addEventListener('scroll', schedule, { capture: true, passive: true })
    win.addEventListener('resize', schedule)
    win.document.addEventListener('visibilitychange', schedule)
    scheduler = { add(item) {
      tasks.add(item)
      schedule()
      return { schedule, dispose() {
        tasks.delete(item)
        if (tasks.size) return
        win.cancelAnimationFrame(frame)
        win.removeEventListener('scroll', schedule, true)
        win.removeEventListener('resize', schedule)
        win.document.removeEventListener('visibilitychange', schedule)
        schedulers.delete(win)
      } }
    } }
    schedulers.set(win, scheduler)
  }
  return scheduler.add(task)
}
