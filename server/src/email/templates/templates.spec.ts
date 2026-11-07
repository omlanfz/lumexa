import {
  achievementEmail,
  certificateIssuedEmail,
  classBookedEmail,
  classCancelledEmail,
  classReminderEmail,
  classRescheduledEmail,
  missedClassEmail,
  packageExpiredEmail,
  packageExpiringSoonEmail,
  testReportEmail,
} from './student.templates';
import {
  teacherAccountCreatedEmail,
  teacherAdminMessageEmail,
  teacherApprovedEmail,
  teacherClassChangedByStudentEmail,
  teacherClassReminderEmail,
  teacherPenaltyEmail,
  teacherStudentAssignedEmail,
} from './teacher.templates';
import { passwordResetEmail, welcomeEmail } from './auth.templates';
import {
  trialBookingConfirmedParentEmail,
  trialCancelledParentEmail,
  trialClassDetailsParentEmail,
  trialReminderParentEmail,
  trialRescheduledParentEmail,
  type TrialContact,
  type TrialEmailAppointment,
} from './trial.templates';

const WA_URL =
  "https://wa.me/8801774878252?text=Hello!%20I'd%20like%20to%20purchase%208%20class%20credits";

// The text a reader sees: tags dropped, entities decoded.
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

describe('class-credit payment emails', () => {
  describe('1. running low', () => {
    const { subject, html } = packageExpiringSoonEmail({
      studentName: 'Ada',
      courseName: 'AI Builder Path',
      creditsRemaining: 3,
      paymentUrl: WA_URL,
    });

    it('has the agreed subject', () => {
      expect(subject).toBe("Ada's Lumexa class credits are running low");
    });

    it('has the agreed body, word for word', () => {
      expect(text(html)).toContain(
        'Dear Parent, ' +
          'Ada has only 3 class credits remaining for AI Builder Path at Lumexa. ' +
          'To help ensure upcoming classes continue without interruption, we kindly recommend arranging the next payment soon. ' +
          'Make a payment ' +
          'Thank you for your continued support.',
      );
    });

    it('has an amber "Make a payment" button that opens the admin WhatsApp chat', () => {
      expect(html).toContain(`href="${WA_URL}"`);
      expect(html).toContain('background: #f59e0b');
      expect(html).toMatch(/>\s*Make a payment\s*</);
    });

    it('never greets by name', () => {
      expect(html).not.toMatch(/Hi\s/);
      expect(html).not.toContain('Hi Ada');
    });

    it('says "1 class credit" (singular) for a single credit', () => {
      const one = packageExpiringSoonEmail({
        studentName: 'Ada',
        courseName: 'AI Builder Path',
        creditsRemaining: 1,
        paymentUrl: WA_URL,
      });
      expect(text(one.html)).toContain(
        'Ada has only 1 class credit remaining for AI Builder Path at Lumexa.',
      );
    });

    it('escapes the student and course names in the body', () => {
      const evil = packageExpiringSoonEmail({
        studentName: '<img src=x>',
        courseName: '<script>1</script>',
        creditsRemaining: 2,
        paymentUrl: WA_URL,
      });
      expect(evil.html).not.toContain('<img src=x>');
      expect(evil.html).not.toContain('<script>');
    });
  });

  describe('2. no credits remaining', () => {
    const { subject, html } = packageExpiredEmail({
      studentName: 'Ada',
      courseName: 'AI Builder Path',
      paymentUrl: WA_URL,
    });

    it('has the agreed subject', () => {
      expect(subject).toBe(
        "Action needed: Ada's Lumexa class credits have run out",
      );
    });

    it('has the agreed body, word for word', () => {
      expect(text(html)).toContain(
        'Dear Parent, ' +
          'Ada’s available class credits for AI Builder Path at Lumexa have been fully used. ' +
          'Please make a payment to add more credits and keep upcoming classes on schedule. ' +
          'Make a payment ' +
          'Thank you for your understanding and continued support.',
      );
    });

    it('has a red "Make a payment" button that opens the admin WhatsApp chat', () => {
      expect(html).toContain(`href="${WA_URL}"`);
      expect(html).toContain('background: #dc2626');
      expect(html).toMatch(/>\s*Make a payment\s*</);
    });

    it('never greets by name', () => {
      expect(html).not.toMatch(/Hi\s/);
    });
  });

  it('neither email links to the website dashboard any more', () => {
    const a = packageExpiringSoonEmail({
      studentName: 'Ada',
      courseName: 'C',
      creditsRemaining: 2,
      paymentUrl: WA_URL,
    }).html;
    const b = packageExpiredEmail({
      studentName: 'Ada',
      courseName: 'C',
      paymentUrl: WA_URL,
    }).html;
    for (const html of [a, b]) expect(html).not.toContain('/dashboard');
  });
});

describe('"Dear Parent" — no Lumexa email says "Hi {name}"', () => {
  const when = new Date('2026-11-05T04:58:00+06:00');
  const appointment: TrialEmailAppointment = {
    date: 'Wednesday, 4 November 2026',
    timeRange: '4:00 PM – 4:30 PM',
    timezoneLabel: 'Bangladesh Time (GMT+6)',
    duration: '30 minutes',
    local: null,
  };
  const contact: TrialContact = {
    email: 'lumexa.school@gmail.com',
    whatsappDisplay: '+880 1522 122194',
    whatsappUrl: 'https://wa.me/8801522122194',
  };

  const toFamily: Record<string, string> = {
    classBooked: classBookedEmail({
      studentName: 'Ada',
      teacherName: 'Mr Rahman',
      classStart: when,
      classEnd: when,
      classUrl: 'https://x.test/c',
    }).html,
    classRescheduled: classRescheduledEmail({
      studentName: 'Ada',
      teacherName: 'Mr Rahman',
      oldStart: when,
      newStart: when,
      changedBy: 'ADMIN',
    }).html,
    classCancelled: classCancelledEmail({
      studentName: 'Ada',
      teacherName: 'Mr Rahman',
      classStart: when,
      cancelledBy: 'TEACHER',
    }).html,
    classReminder: classReminderEmail({
      studentName: 'Ada',
      teacherName: 'Mr Rahman',
      classStart: when,
      classUrl: 'https://x.test/c',
    }).html,
    missedClass: missedClassEmail({
      studentName: 'Ada',
      teacherName: 'Mr Rahman',
      classStart: when,
    }).html,
    testReport: testReportEmail({
      studentName: 'Ada',
      teacherName: 'Mr Rahman',
      courseTitle: 'AI Builder Path',
      testTitle: 'Course test',
      testTypeLabel: 'Course test',
      submittedAt: when,
      objective: {
        score: 8,
        max: 10,
        mcq: { correct: 4, total: 5 },
        trueFalse: { correct: 4, total: 5 },
      },
      coding: null,
      total: 8,
      totalMax: 10,
      percentage: 80,
      passed: true,
      passScorePct: 60,
      feedback: null,
      strengths: null,
      improvements: null,
      codingFeedback: null,
      dashboardUrl: 'https://x.test/d',
    }).html,
    welcomeParent: welcomeEmail({
      name: 'Sarah',
      role: 'PARENT',
      dashboardUrl: 'https://x.test/l',
    }).html,
    welcomeStudent: welcomeEmail({
      name: 'Ada',
      role: 'STUDENT',
      dashboardUrl: 'https://x.test/l',
    }).html,
    passwordResetParent: passwordResetEmail({
      name: 'Sarah',
      role: 'PARENT',
      resetUrl: 'https://x.test/r',
      expiresMinutes: 15,
    }).html,
    passwordResetNoRole: passwordResetEmail({
      name: 'Sarah',
      resetUrl: 'https://x.test/r',
      expiresMinutes: 15,
    }).html,
    trialConfirmed: trialBookingConfirmedParentEmail({
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI',
      appointment,
      programsUrl: 'https://x.test/p',
      contact,
    }).html,
    trialDetails: trialClassDetailsParentEmail({
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI',
      appointment,
      joinUrl: 'https://x.test/j',
      contact,
    }).html,
    trialReminder: trialReminderParentEmail({
      parentName: 'Sarah',
      childName: 'Alex',
      appointment,
      joinUrl: 'https://x.test/j',
      contact,
    }).html,
    trialRescheduled: trialRescheduledParentEmail({
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI',
      previous: appointment,
      appointment,
      programsUrl: 'https://x.test/p',
      contact,
    }).html,
    trialCancelled: trialCancelledParentEmail({
      parentName: 'Sarah',
      childName: 'Alex',
      appointment,
      trialUrl: 'https://x.test/t',
      contact,
    }).html,
    packageLow: packageExpiringSoonEmail({
      studentName: 'Ada',
      courseName: 'C',
      creditsRemaining: 3,
      paymentUrl: WA_URL,
    }).html,
    packageOut: packageExpiredEmail({
      studentName: 'Ada',
      courseName: 'C',
      paymentUrl: WA_URL,
    }).html,
  };

  it.each(Object.keys(toFamily))('%s opens "Dear Parent,"', (key) => {
    const html = toFamily[key];
    expect(html).toContain('Dear Parent,');
    expect(html).not.toMatch(/>\s*Hi\b/);
    expect(html).not.toContain('Hi Ada');
    expect(html).not.toContain('Hi Sarah');
    expect(html).not.toContain('Hi there');
  });

  it('a parent is never greeted by the name on the account', () => {
    expect(toFamily.trialConfirmed).not.toContain('Sarah');
    expect(toFamily.welcomeParent).not.toContain('Sarah');
    expect(toFamily.passwordResetParent).not.toContain('Sarah');
  });

  it("keeps the achievement email's celebratory heading (it is not a greeting)", () => {
    const { html } = achievementEmail({
      studentName: 'Ada',
      badges: [{ label: 'First Launch', icon: '🚀' }],
      dashboardUrl: 'https://x.test/d',
    });
    expect(html).toContain('Great work, Ada!');
    expect(html).not.toMatch(/>\s*Hi\b/);
  });

  describe('staff are addressed by name — as "Dear", never "Hi" and never "Parent"', () => {
    const toStaff: Record<string, string> = {
      teacherAssigned: teacherStudentAssignedEmail({
        teacherName: 'Mr Rahman',
        studentName: 'Ada',
        dashboardUrl: 'https://x.test/d',
      }).html,
      teacherClassChanged: teacherClassChangedByStudentEmail({
        teacherName: 'Mr Rahman',
        studentName: 'Ada',
        classStart: when,
        action: 'CANCELLED',
      }).html,
      teacherReminder: teacherClassReminderEmail({
        teacherName: 'Mr Rahman',
        studentName: 'Ada',
        classStart: when,
        classUrl: 'https://x.test/c',
      }).html,
      teacherAdminMessage: teacherAdminMessageEmail({
        teacherName: 'Mr Rahman',
        subject: 'Hello',
        message: 'Please note',
      }).html,
      teacherPenalty: teacherPenaltyEmail({
        teacherName: 'Mr Rahman',
        strikes: 1,
        reason: 'Late',
      }).html,
      passwordResetTeacher: passwordResetEmail({
        name: 'Mr Rahman',
        role: 'TEACHER',
        resetUrl: 'https://x.test/r',
        expiresMinutes: 15,
      }).html,
      welcomeTeacher: welcomeEmail({
        name: 'Mr Rahman',
        role: 'TEACHER',
        dashboardUrl: 'https://x.test/l',
      }).html,
    };

    it.each(Object.keys(toStaff))('%s', (key) => {
      const html = toStaff[key];
      expect(html).toContain('Dear Mr Rahman,');
      expect(html).not.toContain('Dear Parent');
      expect(html).not.toMatch(/>\s*Hi\b/);
    });

    it('escapes the name', () => {
      const { html } = teacherPenaltyEmail({
        teacherName: '<b>Eve</b>',
        strikes: 1,
        reason: 'x',
      });
      expect(html).toContain('Dear &lt;b&gt;Eve&lt;/b&gt;,');
    });

    it('the teacher emails that never had a greeting are unchanged', () => {
      expect(
        teacherAccountCreatedEmail({
          teacherName: 'Mr Rahman',
          dashboardUrl: 'https://x.test/d',
        }).html,
      ).not.toContain('Dear');
      expect(
        teacherApprovedEmail({
          teacherName: 'Mr Rahman',
          dashboardUrl: 'https://x.test/d',
        }).html,
      ).not.toContain('Dear');
    });
  });
});

// The certificate email is the ONE family-facing email that is addressed to the
// student by first name rather than "Dear Parent,": the founder wrote it to the
// student ("Hi {{studentFirstName}},"), so it is deliberately not in the
// "Dear Parent" list above. Where it GOES still follows the platform's rule
// (the billing contact, else the student account) — see CertificateEmailService.
describe('certificate email (founder-authored)', () => {
  const params = {
    studentFirstName: 'Nusrat',
    programName: 'AI Builder',
    completionDate: '2 November 2026',
    certificateId: 'LXA-2026-A7K9Q2',
    certificateUrl:
      'https://frontend.test/student-dashboard/certificates?highlight=LXA-2026-A7K9Q2',
    verificationUrl: 'https://frontend.test/verify/LXA-2026-A7K9Q2',
    programCatalogueUrl: 'https://frontend.test/programs',
  };
  const { subject, html } = certificateIssuedEmail(params);
  // What a reader sees: entities decoded (the shared `text` helper leaves &amp;).
  const body = text(html).replace(/&amp;/g, '&');

  it('has the agreed subject', () => {
    expect(subject).toBe(
      '🎉 Congratulations! Your Lumexa certificate is ready!',
    );
  });

  it('greets the student by first name and carries the agreed copy, word for word', () => {
    expect(body).toContain('Hi Nusrat,');
    expect(body).toContain('Congratulations! 🎉');
    expect(body).toContain(
      "You've successfully completed the AI Builder at Lumexa AI School!",
    );
    expect(body).toContain(
      "This is a wonderful milestone in your learning journey. You've put in the effort, explored new ideas, worked on practical projects, and taken another exciting step forward. We're proud of what you've accomplished! 🚀",
    );
    expect(body).toContain(
      'Your official Lumexa Certificate of Completion is attached to this email as a PDF. You can also access it anytime from your student dashboard, where you can download, share, and verify your certificate.',
    );
    expect(body).toContain(
      'One learning adventure ends, but another is waiting! There are always new skills to explore, ideas to discover, and exciting projects to create.',
    );
    expect(body).toContain('Ready for your next challenge?');
    expect(body).toContain(
      'Keep creating, keep experimenting, and never stop learning! 🌟',
    );
  });

  it('lists the programme, completion date and certificate ID', () => {
    expect(body).toContain('Your achievement:');
    expect(body).toContain('Program: AI Builder');
    expect(body).toContain('Completion date: 2 November 2026');
    expect(body).toContain('Certificate ID: LXA-2026-A7K9Q2');
  });

  it('is signed by the founder', () => {
    expect(body).toContain(
      'Warm regards, Fairooz Mashwiyat Omlan Founder & CEO Lumexa AI School Code. Create. Impact.',
    );
  });

  it('links to the certificate, its public verification page and the GENERAL catalogue', () => {
    expect(html).toContain(`href="${params.certificateUrl}"`);
    expect(html).toContain('View &amp; Download Your Certificate');
    expect(html).toContain(`href="${params.verificationUrl}"`);
    expect(html).toContain(`href="${params.programCatalogueUrl}"`);
    expect(html).toContain('Find Your Next Program');
  });

  it('never recommends a specific next programme', () => {
    // The only programme named anywhere is the one just completed.
    expect(html).not.toMatch(
      /Data Scientist|Game Creator|Web Developer|Little Coders|Odyssey/,
    );
    expect(html).not.toMatch(/\?program=/);
    expect(html).not.toMatch(/curriculum/i);
  });

  it('escapes anything it prints', () => {
    const evil = certificateIssuedEmail({
      ...params,
      studentFirstName: '<img src=x onerror=alert(1)>',
      programName: '<script>alert(1)</script>',
    }).html;
    expect(evil).not.toContain('<script>');
    expect(evil).not.toContain('<img src=x');
    expect(evil).toContain('&lt;script&gt;');
  });

  it('falls back to "there" when the student has no first name', () => {
    expect(
      text(certificateIssuedEmail({ ...params, studentFirstName: '' }).html),
    ).toContain('Hi there,');
  });
});
