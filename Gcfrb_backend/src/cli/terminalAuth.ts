import prompts from "prompts";
import { supabase } from "../config/supabase";
import { UserRole } from "../types";
import * as readline from "readline";

let currentUser: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
} | null = null;

const clear = () => console.clear();

const pause = async (msg = "\nPress ENTER to continue...") => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    await new Promise<void>((res) =>
        rl.question(msg, () => {
            rl.close();
            res();
        })
    );
};

const header = (title: string) => {
    clear();
    console.log("==========================================");
    console.log(`  GC-RFB Portal - ${title}`);
    console.log("==========================================\n");
};

const signup = async () => {
    header("Sign Up");

    const answers = await prompts([
        { type: "text", name: "fullName", message: "Full name:" },
        { type: "text", name: "email", message: "Email:" },
        { type: "password", name: "password", message: "Password (min 6 chars):" },
        {
            type: "select",
            name: "role",
            message: "Register as:",
            choices: [
                { title: "Student", value: "student" },
                { title: "Admin", value: "admin" },
            ],
        },
    ]);

    if (!answers.email || !answers.password || !answers.role) return;

    if (answers.password.length < 6) {
        console.log("\nPassword must be at least 6 characters.");
        return pause();
    }

    const { data, error } = await supabase.auth.signUp({
        email: answers.email,
        password: answers.password,
        options: {
            data: { full_name: answers.fullName, role: answers.role },
        },
    });

    if (error) {
        console.log(`\nSignup failed: ${error.message}`);
        return pause();
    }

    if (!data.user) {
        console.log("\nSignup failed: no user returned.");
        return pause();
    }

    if (!data.session) {
        console.log("\nSignup succeeded, but email confirmation is still enabled.");
        console.log("Disable it in Supabase -> Authentication -> Providers -> Email.");
        return pause();
    }

    const userId = data.user.id;
    const userEmail = data.user.email ?? answers.email;

    const { error: upsertErr } = await supabase.from("profiles").upsert({
        id: userId,
        email: userEmail,
        full_name: answers.fullName,
        role: answers.role,
    });

    if (upsertErr) {
        console.log(`\nProfile creation warning: ${upsertErr.message}`);
        console.log("You can still log in, but the profile may need fixing.");
        return pause();
    }

    console.log(`\nAccount created for ${userEmail} as ${answers.role}.`);
    console.log("You can now log in.");
    await pause();
};

const login = async () => {
    header("Log In");

    const answers = await prompts([
        { type: "text", name: "email", message: "Email:" },
        { type: "password", name: "password", message: "Password:" },
    ]);

    if (!answers.email || !answers.password) return;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: answers.email,
        password: answers.password,
    });

    if (error || !data.user) {
        console.log(`\nLogin failed: ${error?.message ?? "Invalid credentials"}`);
        return pause();
    }

    const userId = data.user.id;
    const userEmail = data.user.email ?? answers.email;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", userId)
        .maybeSingle();

    let finalProfile = profile;

    if (!finalProfile) {
        const metaRole = (data.user.user_metadata?.role as string) ?? "student";
        const metaName =
            (data.user.user_metadata?.full_name as string) ?? userEmail;

        const { data: created, error: createErr } = await supabase
            .from("profiles")
            .upsert({
                id: userId,
                email: userEmail,
                full_name: metaName,
                role: metaRole,
            })
            .select("role, full_name")
            .single();

        if (createErr || !created) {
            console.log(`\nCould not load or create profile: ${createErr?.message}`);
            return pause();
        }

        finalProfile = created;
    }

    currentUser = {
        id: userId,
        email: userEmail,
        role: finalProfile.role as UserRole,
        fullName: finalProfile.full_name ?? userEmail,
    };

    console.log(`\nWelcome, ${currentUser.fullName} (${currentUser.role})`);
    await pause();
};

const makeReservation = async () => {
    header("New Reservation");

    const { data: rooms, error: roomsErr } = await supabase
        .from("rooms")
        .select("room_id, room_number, room_name, building, floor, room_type")
        .eq("is_available", true)
        .order("room_number", { ascending: true });

    if (roomsErr) {
        console.log(`\nFailed to load rooms: ${roomsErr.message}`);
        return pause();
    }

    if (!rooms || rooms.length === 0) {
        console.log("\nNo rooms available. Ask an admin to add rooms first.");
        return pause();
    }

    const roomChoices = rooms.map((r: any) => ({
        title: `${r.room_number} - ${r.room_name} (${r.building ?? "-"}, Floor ${r.floor ?? "-"}, ${r.room_type ?? "-"})`,
        value: r.room_id,
    }));

    const answers = await prompts([
        {
            type: "select",
            name: "roomId",
            message: "Select a room:",
            choices: roomChoices,
        },
        {
            type: "text",
            name: "date",
            message: "Date (YYYY-MM-DD):",
            initial: new Date().toISOString().slice(0, 10),
            validate: (v) =>
                /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : "Use format YYYY-MM-DD",
        },
        {
            type: "text",
            name: "startTime",
            message: "Start time (HH:MM):",
            initial: "09:00",
            validate: (v) => (/^\d{2}:\d{2}$/.test(v) ? true : "Use format HH:MM"),
        },
        {
            type: "text",
            name: "endTime",
            message: "End time (HH:MM):",
            initial: "10:00",
            validate: (v) => (/^\d{2}:\d{2}$/.test(v) ? true : "Use format HH:MM"),
        },
        { type: "text", name: "purpose", message: "Purpose:" },
        {
            type: "select",
            name: "eventType",
            message: "Event type:",
            choices: [
                { title: "Class", value: "class" },
                { title: "Meeting", value: "meeting" },
                { title: "Exam", value: "exam" },
                { title: "Event", value: "event" },
                { title: "Other", value: "other" },
            ],
        },
    ]);

    if (!answers.roomId || !answers.date || !answers.startTime) return;

    if (!currentUser) {
        console.log("\nNot logged in.");
        return pause();
    }

    const { error } = await supabase.from("bookings").insert({
        user_id: currentUser.id,
        room_id: answers.roomId,
        booking_date: answers.date,
        start_time: answers.startTime,
        end_time: answers.endTime,
        purpose: answers.purpose,
        event_type: answers.eventType,
        booking_status: "pending",
    });

    if (error) {
        console.log(`\nReservation failed: ${error.message}`);
        return pause();
    }

    console.log("\nReservation submitted (status: pending).");
    await pause();
};

const viewMyReservations = async () => {
    header("My Reservations");

    if (!currentUser) return;

    const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("booking_date", { ascending: true });

    if (error) {
        console.log(`\nFailed to load: ${error.message}`);
        return pause();
    }

    if (!data || data.length === 0) {
        console.log("No reservations yet.");
        return pause();
    }

    data.forEach((r: any) => {
        console.log(`#${r.booking_id}  ${r.booking_date}  ${r.start_time}-${r.end_time}`);
        console.log(`   Room: ${r.room_id}`);
        console.log(`   Purpose: ${r.purpose ?? "-"}`);
        console.log(`   Type: ${r.event_type ?? "-"}  Status: ${r.booking_status}`);
        console.log("");
    });

    await pause();
};

const studentDashboard = async () => {
    header("Student Dashboard");
    console.log(`Name:  ${currentUser?.fullName}`);
    console.log(`Email: ${currentUser?.email}`);
    console.log(`Role:  Student\n`);
    console.log("1. Make a room reservation");
    console.log("2. View my reservations");
    console.log("3. Log out\n");

    const { choice } = await prompts({
        type: "select",
        name: "choice",
        message: "Choose:",
        choices: [
            { title: "Make a reservation", value: "1" },
            { title: "View my reservations", value: "2" },
            { title: "Log out", value: "3" },
        ],
    });

    if (choice === "1") return makeReservation();
    if (choice === "2") return viewMyReservations();
    if (choice === "3") {
        currentUser = null;
        return;
    }
};

const viewAllBookings = async () => {
    header("All Bookings");

    const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("booking_date", { ascending: true });

    if (error) {
        console.log(`\nFailed to load: ${error.message}`);
        return pause();
    }

    if (!data || data.length === 0) {
        console.log("No bookings yet.");
        return pause();
    }

    data.forEach((r: any) => {
        console.log(`#${r.booking_id}  ${r.booking_date}  ${r.start_time}-${r.end_time}`);
        console.log(`   User: ${r.user_id}`);
        console.log(`   Room: ${r.room_id}`);
        console.log(`   Purpose: ${r.purpose ?? "-"}`);
        console.log(`   Status: ${r.booking_status}`);
        console.log("");
    });

    await pause();
};

const updateBookingStatus = async () => {
    header("Update Booking Status");

    const { id } = await prompts({
        type: "text",
        name: "id",
        message: "Booking ID to update:",
        validate: (v) =>
            v && /^\d+$/.test(v) ? true : "Booking ID must be a number",
    });
    if (!id) return;

    const { status } = await prompts({
        type: "select",
        name: "status",
        message: "New status:",
        choices: [
            { title: "Approve", value: "approved" },
            { title: "Reject", value: "rejected" },
            { title: "Cancel", value: "cancelled" },
        ],
    });
    if (!status) return;

    const { error } = await supabase
        .from("bookings")
        .update({ booking_status: status })
        .eq("booking_id", Number(id));

    if (error) {
        console.log(`\nUpdate failed: ${error.message}`);
        return pause();
    }

    console.log(`\nBooking #${id} set to '${status}'.`);
    await pause();
};

const adminDashboard = async () => {
    header("Admin Dashboard");
    console.log(`Name:  ${currentUser?.fullName}`);
    console.log(`Email: ${currentUser?.email}`);
    console.log(`Role:  Admin\n`);
    console.log("1. Make a room reservation");
    console.log("2. View all bookings");
    console.log("3. Update booking status");
    console.log("4. Log out\n");

    const { choice } = await prompts({
        type: "select",
        name: "choice",
        message: "Choose:",
        choices: [
            { title: "Make a reservation", value: "1" },
            { title: "View all bookings", value: "2" },
            { title: "Update booking status", value: "3" },
            { title: "Log out", value: "4" },
        ],
    });

    if (choice === "1") return makeReservation();
    if (choice === "2") return viewAllBookings();
    if (choice === "3") return updateBookingStatus();
    if (choice === "4") {
        currentUser = null;
        return;
    }
};

const main = async () => {
    while (true) {
        if (currentUser) {
            if (currentUser.role === "admin") await adminDashboard();
            else await studentDashboard();
            continue;
        }

        header("Main Menu");

        const { choice } = await prompts({
            type: "select",
            name: "choice",
            message: "Select an option:",
            choices: [
                { title: "Log in", value: "login" },
                { title: "Sign up", value: "signup" },
                { title: "Exit", value: "exit" },
            ],
        });

        if (choice === "login") await login();
        if (choice === "signup") await signup();
        if (choice === "exit" || choice === undefined) {
            console.log("\nGoodbye!\n");
            process.exit(0);
        }
    }
};

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});