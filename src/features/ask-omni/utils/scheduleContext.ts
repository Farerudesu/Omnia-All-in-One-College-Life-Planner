import * as ds from '@/lib/dataService';
import { getISODay, toDateString } from '@/lib/dateUtils';

export function getScheduleContext() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Cover past 3 days (including yesterday) through next 7 days (11 days total)
  const dates = Array.from({ length: 11 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 3 + offset);
    return date;
  });
  const todayDateString = toDateString(today);
  const yesterdayDateString = toDateString(yesterday);
  const lastDate = toDateString(dates[dates.length - 1]);
  const courses = new Map(ds.getCourses().map((course) => [course.id, course]));
  const sessions = ds.getClassSessions();
  const exceptions = ds.getSessionExceptions();
  const items = dates
    .flatMap((date) => {
      const dateString = toDateString(date);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const classes = sessions.flatMap((session) => {
        if (!session.daysOfWeek.includes(getISODay(date))) return [];
        const exception = exceptions.find(
          (item) => item.classSessionId === session.id && item.date === dateString
        );
        if (exception?.type === 'no-class') return [];
        const course = courses.get(session.courseId);
        return [
          {
            date: dateString,
            weekday,
            kind: 'class' as const,
            title: course ? `${course.code} - ${course.name}` : 'Class',
            status:
              exception?.type === 'cancelled' || exception?.types?.includes('cancelled')
                ? 'cancelled'
                : undefined,
            startTime: exception?.newStartTime || session.startTime,
            endTime: exception?.newEndTime || session.endTime,
            location: exception?.newRoom || session.room || course?.room,
            note: exception?.note,
          },
        ];
      });
      const events = ds
        .getEvents()
        .filter((event) => event.date === dateString)
        .map((event) => ({
          date: dateString,
          weekday,
          kind: 'event' as const,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          note: event.notes,
        }));
      return [...classes, ...events];
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startTime || '').localeCompare(b.startTime || '')
    );

  // Include assignments (tasks) context
  const assignments = ds.getAssignments();
  const tasksContext = assignments.map((a) => {
    const course = a.courseId ? courses.get(a.courseId) : undefined;
    return {
      id: a.id,
      title: a.title,
      dueDate: a.dueDate,
      course: course ? `${course.code} - ${course.name}` : undefined,
      priority: a.priority,
      status: a.status,
      notes: a.notes,
    };
  });

  // Include recent transactions (finances / expenses / income)
  const transactions = ds.getTransactions();
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
    .map((t) => ({
      date: t.date,
      title: t.merchant,
      amount: t.amount,
      category: t.category,
      type: t.type,
      paymentMethod: t.paymentMethod,
      notes: t.notes,
    }));

  return {
    currentDate: todayDateString,
    yesterdayDate: yesterdayDateString,
    throughDate: lastDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dates: dates.map((date) => ({
      date: toDateString(date),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    })),
    items,
    tasks: tasksContext,
    recentTransactions,
  };
}
