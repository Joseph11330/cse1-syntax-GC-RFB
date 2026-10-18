import prompts from "prompts";
import { supabase } from "../config/supabase";
import { header, login, pause, registerStudent, TerminalAccount } from "./terminalAuth";
import {
    BOOKING_SELECT,
    displayBuilding,
    manilaDate,
    parseClock,
    shapeBooking,
} from "../lib/bookings";
import { createBooking, EVENT_TYPES } from "../lib/bookingService";

const green = (value: string) => `\u001b[32m${value}\u001b[0m`;
const bold = (value: string) => `\u001b[1m${value}\u001b[0m`;
const muted = (value: string) => `\u001b[90m${value}\u001b[0m`;
const visibleLength = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, "").length;

const renderLanding = async () => {
    header("GC Reserve");
    // real numbers instead of hard-coded ones
    const { count } = await supabase
        .from("rooms")
        .select("room_id", { count: "exact", head: true })
        .eq("is_available", true);

    const width = Math.max(48, Math.min(72, (process.stdout.columns ?? 80) - 2));
    const border = `  +${"-".repeat(width - 2)}+`;
    const printLine = (content = "") => {
        const clipped = visibleLength(content) > width - 4
            ? `${content.slice(0, width - 7)}...`
            : content;
        console.log(`  | ${clipped}${" ".repeat(Math.max(0, width - 4 - visibleLength(clipped)))} |`);
    };

    console.log(green(border));
    printLine(`${green("GC")}  ${bold("GORDON COLLEGE")}`);
    printLine("    ROOM & FACILITY BOOKING");
    console.log(green(border));
    printLine();
    printLine(bold("  Book a campus room"));
    printLine(bold("  without the sign-up sheet."));
    printLine();
    printLine("  Check what's free across Gordon College,");
    printLine("  request a slot in minutes, and get");
    printLine("  approved without a trip to the office.");
    printLine();
    printLine(`${green(bold(String(count ?? 0)))} Rooms open for booking`);
    printLine();
    printLine(green(bold("  HOW IT WORKS")));
    printLine(`  ${green("01")} Find a room`);
    printLine(`  ${green("02")} Send your request`);
    printLine(`  ${green("03")} Get officer approval`);
    printLine();
    printLine(muted("  Student accounts are saved when you register."));
    console.log(green(border));
    console.log();
};

const browseRooms = async () => {
    header("Available Rooms");
    const { data, error } = await supabase
        .from("rooms")
        .select("room_id, room_number, room_name, building, floor, room_type, capacity")
        .eq("is_available", true)
        .order("room_number", { ascending: true });

    if (error) {
        console.log(`\nFailed to load rooms: ${error.message}`);
        return pause();
    }
    if (!data?.length) {
        console.log("No available rooms.");
        return pause();
    }

    data.forEach((room: any) => {
        console.log(`${room.room_number} - ${room.room_name}`);
        console.log(`  Building: ${displayBuilding(room.building) || "-"}  Floor: ${room.floor ?? "-"}`);
        console.log(`  Type: ${room.room_type ?? "-"}  Capacity: ${room.capacity ?? "-"}`);
        console.log("");
    });
    await pause();
};

const TIME_RE = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;

const makeReservation = async (account: TerminalAccount) => {
    header("New Reservation");
    const { data: rooms, error } = await supabase
        .from("rooms")
        .select("room_id, room_number, room_name, building, floor, room_type, capacity")
        .eq("is_available", true)
        .order("room_number", { ascending: true });

    if (error) {
        console.log(`\nFailed to load rooms: ${error.message}`);
        return pause();
    }
    if (!rooms?.length) {
        console.log("\nNo rooms are currently available.");
        return pause();
    }

    const answers = await prompts([
        {
            type: "select",
            name: "roomId",
            message: "Select a room:",
            choices: rooms.map((room: any) => ({
                title: `${room.room_number} - ${room.room_name} (${displayBuilding(room.building) || "-"}, Floor ${room.floor ?? "-"})`,
                value: room.room_id,
            })),
        },
        {
            type: "text",
            name: "date",
            message: "Date (YYYY-MM-DD):",
            initial: manilaDate(new Date()), // campus date, not UTC
            validate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
                ? true
                : "Use format YYYY-MM-DD",
        },
        {
            type: "text",
            name: "startTime",
            message: "Start time (HH:MM AM/PM):",
            initial: "09:00 AM",
            validate: (value) => TIME_RE.test(value) ? true : "Use format HH:MM AM/PM, e.g. 09:00 AM",
        },
        {
            type: "text",
            name: "endTime",
            message: "End time (HH:MM AM/PM):",
            initial: "10:00 AM",
            validate: (value) => TIME_RE.test(value) ? true : "Use format HH:MM AM/PM, e.g. 10:00 AM",
        },
        {
            type: "text",
            name: "purpose",
            message: "Purpose:",
            validate: (value) => value.trim() ? true : "Purpose is required",
        },
        {
            type: "select",
            name: "eventType",
            message: "Event type:",
            choices: EVENT_TYPES.map((t) => ({ title: t[0].toUpperCase() + t.slice(1), value: t })),
        },
    ]);

    if (!answers.roomId || !answers.date || !answers.startTime || !answers.endTime) return;

    // same checks as the website: past time, end after start, capacity, overlapping bookings
    const result = await createBooking({
        userId: account.id,
        roomId: answers.roomId,
        date: answers.date,
        startMin: parseClock(answers.startTime) ?? 0,
        endMin: parseClock(answers.endTime) ?? 0,
        purpose: answers.purpose,
        eventType: answers.eventType,
    });

    if (!result.ok) {
        console.log(`\nReservation failed: ${result.error}`);
        return pause();
    }
    console.log("\nReservation submitted for approval.");
    await pause();
};

const viewReservations = async (account: TerminalAccount) => {
    header("My Reservations");
    const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("user_id", account.id)
        .order("booking_date", { ascending: true });

    if (error) {
        console.log(`\nFailed to load reservations: ${error.message}`);
        return pause();
    }
    if (!data?.length) {
        console.log("No reservations yet.");
        return pause();
    }

    const now = Date.now();
    (data as any[]).forEach((row) => {
        const b = shapeBooking(row, now);
        console.log(`${b.reference}  ${b.date} ${row.start_time} - ${row.end_time}`);
        console.log(`  ${b.facility} (${b.building})  Purpose: ${b.purpose || "-"}`);
        console.log(`  Type: ${b.eventType ?? "-"}  Status: ${b.status.toUpperCase()}`);
        console.log("");
    });
    await pause();
};

const studentSession = async (account: TerminalAccount) => {
    while (true) {
        header("Student Dashboard");
        console.log(`Signed in: ${account.fullName} <${account.email}>\n`);
        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "Choose an action:",
            choices: [
                { title: "Make a room reservation", value: "reserve" },
                { title: "View my reservations", value: "reservations" },
                { title: "Browse available rooms", value: "rooms" },
                { title: "Sign out", value: "logout" },
            ],
        });

        if (!action || action === "logout") return;
        if (action === "reserve") await makeReservation(account);
        if (action === "reservations") await viewReservations(account);
        if (action === "rooms") await browseRooms();
    }
};

const main = async () => {
    while (true) {
        await renderLanding();
        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "Welcome. Choose an option:",
            choices: [
                { title: "Student sign in", value: "login" },
                { title: "Create student account", value: "signup" },
                { title: "Browse available rooms", value: "rooms" },
                { title: "Exit", value: "exit" },
            ],
        });

        if (action === "exit" || !action) {
            console.log("\nGoodbye.");
            return;
        }
        if (action === "rooms") {
            await browseRooms();
            continue;
        }
        const account = action === "signup"
            ? await registerStudent()
            : await login("student");
        if (account) await studentSession(account);
    }
};

main().catch((error: unknown) => {
    console.error("Student terminal error:", error);
    process.exitCode = 1;
});
