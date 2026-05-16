import { createTRPCRouter } from "./trpc";
import { clinicRouter } from "./routers/clinic.router";
import { patientRouter } from "./routers/patient.router";
import { appointmentRouter } from "./routers/appointment.router";
import { confirmationRouter } from "./routers/confirmation.router";
import { whatsappRouter } from "./routers/whatsapp.router";
import { analyticsRouter } from "./routers/analytics.router";
import { serviceRouter } from "./routers/service.router";
import { doctorRouter } from "./routers/doctor.router";
import { adminRouter } from "./routers/admin.router";
import { confirmationManagerRouter } from "./routers/confirmationManager.router";
import { publicBookingRouter } from "./routers/publicBooking.router";
import { billingRouter } from "./routers/billing.router";
import { notificationRouter } from "./routers/notification.router";
import { userRouter } from "./routers/user.router";
import { teamRouter } from "./routers/team.router";
import { activityLogRouter } from "./routers/activityLog.router";

export const appRouter = createTRPCRouter({
  clinic: clinicRouter,
  patient: patientRouter,
  appointment: appointmentRouter,
  confirmation: confirmationRouter,
  whatsapp: whatsappRouter,
  analytics: analyticsRouter,
  service: serviceRouter,
  doctor: doctorRouter,
  admin: adminRouter,
  confirmationManager: confirmationManagerRouter,
  publicBooking: publicBookingRouter,
  billing: billingRouter,
  notification: notificationRouter,
  user: userRouter,
  team: teamRouter,
  activityLog: activityLogRouter,
});

export type AppRouter = typeof appRouter;
