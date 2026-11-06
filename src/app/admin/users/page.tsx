import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { updateUser } from "@/app/actions/admin";
import { SaveForm } from "@/components/SaveForm";

export const metadata = { title: "Users" };

export default async function AdminUsers() {
  const [users, showrooms] = await Promise.all([db.select().from(s.users).orderBy(asc(s.users.role), asc(s.users.name)), db.select().from(s.showrooms)]);
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Users and roles</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Consultants see only their own leads and unassigned leads at their showroom. Admins see everything. Roles change on the user's next page load.</p>
      <ul className="mt-8 grid gap-3">
        {users.map((u) => (
          <li key={u.id} className="card p-4 sm:p-5">
            <SaveForm action={updateUser} compact className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_1.2fr_auto]">
              <input type="hidden" name="id" value={u.id} />
              <div className="text-sm"><p className="font-medium">{u.name}</p><p className="text-muted">{u.email}</p></div>
              <div><label className="label text-xs" htmlFor={`r${u.id}`}>Role</label><select id={`r${u.id}`} name="role" defaultValue={u.role} className="field capitalize">{s.ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
              <div><label className="label text-xs" htmlFor={`s${u.id}`}>Showroom (consultants)</label><select id={`s${u.id}`} name="showroomId" defaultValue={u.showroomId ?? ""} className="field"><option value="">None</option>{showrooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
            </SaveForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
