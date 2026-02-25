// Add this method to the existing TeachersService class
// File: server/src/teachers/teachers.service.ts
// Add after getNextClass()

  // ─── Get My Students (teacher's roster) ───────────────────────────────────
  // Returns all students the teacher has taught or has upcoming bookings with.
  // Aggregates stats per student for the teacher roster view.

  async getMyStudents(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    // Get all bookings for this teacher, including student and review data
    const bookings = await this.prisma.booking.findMany({
      where: {
        shift: { teacherId: teacher.id },
        paymentStatus: { in: ['PENDING', 'CAPTURED'] },
      },
      include: {
        student: {
          include: {
            parent: { select: { email: true } },
          },
        },
        shift: { select: { start: true, end: true } },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: {
        shift: { start: 'asc' },
      },
    });

    // Group by studentId and aggregate stats
    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      studentAge: number;
      parentEmail: string;
      totalClasses: number;
      completedClasses: number;
      pendingClasses: number;
      lastClassDate: Date | null;
      nextClassDate: Date | null;
      reviews: { rating: number; comment: string | null }[];
    }>();

    const now = new Date();

    for (const booking of bookings) {
      const sid = booking.student.id;

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          studentId: sid,
          studentName: booking.student.name,
          studentAge: booking.student.age,
          parentEmail: booking.student.parent.email,
          totalClasses: 0,
          completedClasses: 0,
          pendingClasses: 0,
          lastClassDate: null,
          nextClassDate: null,
          reviews: [],
        });
      }

      const entry = studentMap.get(sid)!;
      entry.totalClasses++;

      const classStart = new Date(booking.shift.start);

      if (booking.paymentStatus === 'CAPTURED') {
        entry.completedClasses++;
        if (!entry.lastClassDate || classStart > entry.lastClassDate) {
          entry.lastClassDate = classStart;
        }
      } else if (classStart > now) {
        entry.pendingClasses++;
        if (!entry.nextClassDate || classStart < entry.nextClassDate) {
          entry.nextClassDate = classStart;
        }
      }

      if (booking.review) {
        entry.reviews.push(booking.review);
      }
    }

    return Array.from(studentMap.values()).map((s) => {
      const lastReview = s.reviews.length > 0
        ? s.reviews[s.reviews.length - 1]
        : null;

      return {
        studentId: s.studentId,
        studentName: s.studentName,
        studentAge: s.studentAge,
        parentEmail: s.parentEmail,
        totalClasses: s.totalClasses,
        completedClasses: s.completedClasses,
        pendingClasses: s.pendingClasses,
        lastClassDate: s.lastClassDate,
        nextClassDate: s.nextClassDate,
        latestReview: lastReview,
      };
    });
  }