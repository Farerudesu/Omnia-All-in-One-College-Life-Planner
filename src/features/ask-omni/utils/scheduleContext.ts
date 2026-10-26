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
  const rawEvents = ds.getEvents();
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
      const events = rawEvents
        .filter((event) => event.date === dateString)
        .map((event) => ({
          date: dateString,
          weekday,
          kind: 'event' as const,
          type: event.type,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          note: event.notes,
        }));
      return [...classes, ...events];
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || '')
    );

  // Include ALL calendar events (exams, quizzes, deadlines, activities)
  const calendarEvents = rawEvents
    .map((e) => {
      const course = e.courseId ? courses.get(e.courseId) : undefined;
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        type: e.type,
        course: course ? `${course.code} - ${course.name}` : e.course,
        location: e.location,
        notes: e.notes ? e.notes.slice(0, 300) : undefined,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

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
      notes: a.notes ? a.notes.slice(0, 300) : undefined,
    };
  });

  // Include recent transactions (finances / expenses / income)
  const transactions = ds.getTransactions();
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 25)
    .map((t) => ({
      date: t.date,
      title: t.merchant,
      amount: t.amount,
      category: t.category,
      type: t.type,
      paymentMethod: t.paymentMethod,
      notes: t.notes ? t.notes.slice(0, 100) : undefined,
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
    calendarEvents,
    tasks: tasksContext,
    recentTransactions,
  };
}
