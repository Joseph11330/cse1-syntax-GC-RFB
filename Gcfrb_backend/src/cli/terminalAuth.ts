import prompts from "prompts";
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";

/* ------------------------------------------------------------------ *
 * Terminal sign-in / sign-up. Uses the SAME tables and password hashing as the
 * website (users for students, admins for admins), so one account works in both.
 * ------------------------------------------------------------------ */

export interface TerminalAccount {
    id: string;
    email: string;
    fullName: string;
    role: "student" | "admin";
}

export const header = (title: string) => {
    console.clear();
    console.log("=".repeat(64));
    console.log(`  GC RESERVE  |  ${title}`);
    console.log("=".repeat(64));
    console.log("");
};

export const pause = async () => {
    await prompts({ type: "invisible", name: "continue", message: "Press Enter to continue..." });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** username is a required column; derive one from the email and keep it unique. */
const uniqueUsername = async (table: "users" | "admins", email: string) => {
    const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user";
    const { data } = await supabase.from(table).select("username").eq("username", base).maybeSingle();
    return data ? `${base}${Math.floor(1000 + Math.random() * 9000)}` : base;
};

const askCredentials = (withName: boolean) =>
    prompts([
        ...(withName
            ? [{
                type: "text" as const,
                name: "fullName",
                message: "Full name:",
                validate: (v: string) => (v.trim() ? true : "Full name is required"),
            }]
            : []),
        {
            type: "text",
            name: "email",
            message: "Email:",
            validate: (v: string) => (EMAIL_RE.test(v.trim()) ? true : "Enter a valid email"),
        },
        {
            type: "password",
            name: "password",
            message: withName ? "Password (min 8 characters):" : "Password:",
            validate: (v: string) => (!withName || v.length >= 8 ? true : "Use at least 8 characters"),
        },
    ]);

export const login = async (role: "student" | "admin"): Promise<TerminalAccount | null> => {
    header(role === "admin" ? "Admin Sign In" : "Student Sign In");
    const answers = await askCredentials(false);
    if (!answers.email || !answers.password) return null;

    const email = String(answers.email).trim().toLowerCase();
    const query = role === "admin"
        ? supabase.from("admins").select("*").eq("email", email).eq("is_active", true)
        : supabase.from("users").select("*").eq("email", email);
    const { data, error } = await query.maybeSingle();

    const ok = !error && data?.password_hash && (await bcrypt.compare(String(answers.password), data.password_hash));
    if (!ok) {
        console.log("\nInvalid email or password.");
        await pause();
        return null;
    }

    return {
        id: role === "admin" ? data.admin_id : data.user_id,
        email: data.email,
        fullName: data.full_name ?? data.email,
        role,
    };
};

export const registerStudent = async (): Promise<TerminalAccount | null> => {
    header("Create Student Account");
    const answers = await askCredentials(true);
    if (!answers.fullName || !answers.email || !answers.password) return null;

    const { studentId } = await prompts({
        type: "text",
        name: "studentId",
        message: "Student ID (optional):",
    });

    const email = String(answers.email).trim().toLowerCase();
    const { data: existing } = await supabase.from("users").select("user_id").eq("email", email).maybeSingle();
    if (existing) {
        console.log("\nThat email is already registered.");
        await pause();
        return null;
    }

    const { data, error } = await supabase
        .from("users")
        .insert({
            username: await uniqueUsername("users", email),
            full_name: String(answers.fullName).trim(),
            email,
            password_hash: await bcrypt.hash(String(answers.password), 12),
            student_id: String(studentId ?? "").trim() || null,
            user_type: "student",
        })
        .select()
        .single();

    if (error || !data) {
        console.log(`\nFailed to create account: ${error?.message ?? "unknown error"}`);
        await pause();
        return null;
    }

    console.log("\nAccount created. You are now signed in.");
    await pause();
    return { id: data.user_id, email: data.email, fullName: data.full_name, role: "student" };
};

/** True when there is no admin yet, so the first one may be created without signing in. null = lookup failed. */
export const isFirstAdminSetupAvailable = async (): Promise<boolean | null> => {
    const { count, error } = await supabase.from("admins").select("admin_id", { count: "exact", head: true });
    if (error) {
        console.log(`\nCould not check admin accounts: ${error.message}`);
        await pause();
        return null;
    }
    return (count ?? 0) === 0;
};

export const registerAdmin = async (first: boolean): Promise<TerminalAccount | null> => {
    header(first ? "Create First Admin Account" : "Create Admin Account");
    const answers = await askCredentials(true);
    if (!answers.fullName || !answers.email || !answers.password) return null;

    const email = String(answers.email).trim().toLowerCase();
    const { data: existing } = await supabase.from("admins").select("admin_id").eq("email", email).maybeSingle();
    if (existing) {
        console.log("\nThat email is already registered as an admin.");
        await pause();
        return null;
    }

    const { data, error } = await supabase
        .from("admins")
        .insert({
            username: await uniqueUsername("admins", email),
            full_name: String(answers.fullName).trim(),
            email,
            password_hash: await bcrypt.hash(String(answers.password), 12),
            role: "admin",
            is_active: true,
        })
        .select()
        .single();

    if (error || !data) {
        console.log(`\nFailed to create admin: ${error?.message ?? "unknown error"}`);
        await pause();
        return null;
    }

    console.log(first ? "\nFirst admin created. You are now signed in." : "\nAdmin account created.");
    await pause();
    // creating an extra admin must not switch the signed-in session
    return first ? { id: data.admin_id, email: data.email, fullName: data.full_name, role: "admin" } : null;
};
