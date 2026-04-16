/**
 * Staff section layout — accepts EITHER a main ADMIN session OR a valid staff session.
 * This layout is nested inside /admin/layout.tsx which already checks main ADMIN role.
 * Staff users who land here via /staff/login are allowed through by the modified admin layout.
 */
export default function StaffSectionLayout({ children }: { children: React.ReactNode }) {
  // Auth is handled by the parent admin layout (for main admins)
  // or by requireStaffActor() inside each individual page (for staff users).
  return <>{children}</>
}
