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
});

export type AppRouter = typeof appRouter;
