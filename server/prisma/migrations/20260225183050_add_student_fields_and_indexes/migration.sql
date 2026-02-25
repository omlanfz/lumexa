-- CreateIndex
CREATE INDEX "Booking_studentId_idx" ON "Booking"("studentId");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Review_teacherId_idx" ON "Review"("teacherId");

-- CreateIndex
CREATE INDEX "Shift_teacherId_start_idx" ON "Shift"("teacherId", "start");

-- CreateIndex
CREATE INDEX "Shift_start_idx" ON "Shift"("start");

-- CreateIndex
CREATE INDEX "Shift_isBooked_idx" ON "Shift"("isBooked");

-- CreateIndex
CREATE INDEX "Student_parentId_idx" ON "Student"("parentId");

-- CreateIndex
CREATE INDEX "TeacherProfile_ratingAvg_idx" ON "TeacherProfile"("ratingAvg" DESC);

-- CreateIndex
CREATE INDEX "TeacherProfile_isSuspended_idx" ON "TeacherProfile"("isSuspended");
