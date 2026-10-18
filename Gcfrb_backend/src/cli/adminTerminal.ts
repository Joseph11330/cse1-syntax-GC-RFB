import prompts from "prompts";
import { supabase } from "../config/supabase";
import {
    header,
    isFirstAdminSetupAvailable,
    login,
    pause,
    registerAdmin,
    TerminalAccount,
} from "./terminalAuth";
import { BOOKING_SELECT, manilaDate, shapeBooking } from "../lib/bookings";
import { countRoomBookings, decideBooking, Decision } from "../lib/bookingService";

interface Room {
    room_id: number;
    room_number: string;
    room_name: string;
    building: string | null;
    floor: number | null;
    room_type: string | null;
    capacity: number | null;
    is_available: boolean;
}

const roomStatus = (room: Room) => room.is_available ? "AVAILABLE" : "UNAVAILABLE";

const loadRooms = async (): Promise<Room[] | null> => {
    const { data, error } = await supabase
        .from("rooms")
        .select("room_id, room_number, room_name, building, floor, room_type, capacity, is_available")
        .order("room_number", { ascending: true });
    if (error) {
        console.log(`\nFailed to load rooms: ${error.message}`);
        return null;
    }
    return data as Room[];
};

const listRooms = (rooms: Room[]) => {
    console.log("  FACILITY MANAGEMENT");
    console.log("  ---------------------------------------------------------------");
    console.log(`  Total rooms: ${rooms.length}   Available: ${rooms.filter((room) => room.is_available).length}`);
    console.log("");

    if (!rooms.length) {
        console.log("  No rooms found.");
        return;
    }

    console.log("  ID       ROOM #    NAME                     LOCATION             TYPE          CAPACITY  STATUS");
    console.log("  -------- --------- ------------------------ -------------------- ------------- --------- -----------");
    rooms.forEach((room) => {
        const location = `${room.building ?? "-"}${room.floor ? ` / Fl. ${room.floor}` : ""}`;
        console.log(
            `  ${String(room.room_id).slice(0, 8).padEnd(8)}  ` +
            `${room.room_number.slice(0, 9).padEnd(9)}  ` +
            `${room.room_name.slice(0, 24).padEnd(24)}  ` +
            `${location.slice(0, 20).padEnd(20)}  ` +
            `${(room.room_type ?? "-").slice(0, 13).padEnd(13)}  ` +
            `${String(room.capacity ?? "-").padEnd(9)} ${roomStatus(room)}`
        );
    });
    console.log("");
};

const getRoomValues = async (room?: Room) => {
    const typeChoices = [
        { title: "Lecture", value: "lecture" },
        { title: "Laboratory", value: "laboratory" },
        { title: "Conference", value: "conference" },
        { title: "Auditorium", value: "auditorium" },
        { title: "Other", value: "other" },
    ];
    if (room?.room_type && !typeChoices.some((choice) => choice.value === room.room_type)) {
        typeChoices.unshift({ title: room.room_type, value: room.room_type });
    }

    const answers = await prompts([
        {
            type: "text",
            name: "roomNumber",
            message: "Room number / code:",
            initial: room?.room_number ?? "",
            validate: (value) => value.trim() ? true : "Room number is required",
        },
        {
            type: "text",
            name: "roomName",
            message: "Room name:",
            initial: room?.room_name ?? "",
            validate: (value) => value.trim() ? true : "Room name is required",
        },
        {
            type: "text",
            name: "building",
            message: "Building:",
            initial: room?.building ?? "",
        },
        {
            type: "text",
            name: "floor",
            message: "Floor (optional):",
            initial: room?.floor == null ? "" : String(room.floor),
            validate: (value) => !value || /^\d+$/.test(value) ? true : "Floor must be a whole number",
        },
        {
            type: "select",
            name: "roomType",
            message: "Room type:",
            initial: Math.max(0, typeChoices.findIndex((choice) => choice.value === room?.room_type)),
            choices: typeChoices,
        },
        {
            type: "text",
            name: "capacity",
            message: "Maximum capacity (optional):",
            initial: room?.capacity == null ? "" : String(room.capacity),
            validate: (value) => !value || (/^\d+$/.test(value) && Number(value) > 0)
                ? true
                : "Capacity must be a positive whole number",
        },
        {
            type: "select",
            name: "isAvailable",
            message: "Availability:",
            initial: room?.is_available === false ? 1 : 0,
            choices: [
                { title: "Available", value: true },
                { title: "Unavailable", value: false },
            ],
        },
    ]);

    if (!answers.roomNumber || !answers.roomName || !answers.roomType ||
        answers.isAvailable === undefined) return null;

    return {
        room_number: String(answers.roomNumber).trim(),
        room_name: String(answers.roomName).trim(),
        building: String(answers.building ?? "").trim() || null,
        floor: answers.floor ? Number(answers.floor) : null,
        room_type: String(answers.roomType),
        capacity: answers.capacity ? Number(answers.capacity) : null,
        is_available: answers.isAvailable as boolean,
    };
};

const addRoom = async () => {
    header("Add Room");
    const values = await getRoomValues();
    if (!values) return;

    const { error } = await supabase.from("rooms").insert(values);
    if (error) {
        console.log(`\nFailed to add room: ${error.message}`);
        return pause();
    }
    console.log("\nRoom added successfully.");
    await pause();
};

const editRoom = async (room: Room) => {
    header("Edit Room");
    console.log(`${room.room_number} - ${room.room_name} (${roomStatus(room)})\n`);
    const values = await getRoomValues(room);
    if (!values) return;

    const { data, error } = await supabase
        .from("rooms")
        .update(values)
        .eq("room_id", room.room_id)
        .select("room_id")
        .maybeSingle();
    if (error || !data) {
        console.log(`\nFailed to update room: ${error?.message ?? "Room was not found"}`);
        return pause();
    }
    console.log("\nRoom updated successfully.");
    await pause();
};

/** Returns true when the room was deleted. */
const deleteRoom = async (room: Room): Promise<boolean> => {
    // bookings.room_id is ON DELETE CASCADE: deleting a room also deletes every booking for it
    const bookingCount = await countRoomBookings(room.room_id);
    if (bookingCount < 0) {
        console.log("\nCould not check this room's bookings, so it was not deleted.");
        await pause();
        return false;
    }

    if (bookingCount > 0) {
        console.log(`\nWARNING: ${room.room_name} has ${bookingCount} booking(s).`);
        console.log("Deleting the room will permanently delete those bookings too.");
        console.log("To keep the history, set the room to Unavailable instead.\n");
        const { typed } = await prompts({
            type: "text",
            name: "typed",
            message: `Type the room number (${room.room_number}) to delete anyway, or leave blank to cancel:`,
        });
        if (String(typed ?? "").trim() !== room.room_number) {
            console.log("\nRoom was not deleted.");
            await pause();
            return false;
        }
    } else {
        const { confirmed } = await prompts({
            type: "confirm",
            name: "confirmed",
            message: `Permanently delete ${room.room_name} (${room.room_number})?`,
            initial: false,
        });
        if (!confirmed) return false;
    }

    const { error } = await supabase.from("rooms").delete().eq("room_id", room.room_id);
    if (error) {
        console.log(`\nFailed to delete room: ${error.message}`);
        await pause();
        return false;
    }
    console.log("\nRoom deleted.");
    await pause();
    return true;
};

const manageRoom = async (room: Room) => {
    while (true) {
        header("Room Details");
        console.log(`${room.room_number} - ${room.room_name}`);
        console.log(`Building: ${room.building ?? "-"}  Floor: ${room.floor ?? "-"}`);
        console.log(`Type: ${room.room_type ?? "-"}  Capacity: ${room.capacity ?? "-"}`);
        console.log(`Status: ${roomStatus(room)}\n`);

        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "Room actions:",
            choices: [
                { title: "Edit room details", value: "edit" },
                { title: "Change availability", value: "availability" },
                { title: "Delete room", value: "delete" },
                { title: "Back", value: "back" },
            ],
        });
        if (!action || action === "back") return;

        if (action === "edit") {
            await editRoom(room);
        } else if (action === "availability") {
            const { available } = await prompts({
                type: "select",
                name: "available",
                message: "Set availability:",
                initial: room.is_available ? 0 : 1,
                choices: [
                    { title: "Available", value: true },
                    { title: "Unavailable", value: false },
                ],
            });
            if (available === undefined) continue;
            const { error } = await supabase
                .from("rooms")
                .update({ is_available: available })
                .eq("room_id", room.room_id);
            if (error) {
                console.log(`\nFailed to change availability: ${error.message}`);
                await pause();
            }
        } else if (action === "delete") {
            if (await deleteRoom(room)) return;
        }

        const refreshedRooms = await loadRooms();
        const refreshedRoom = refreshedRooms?.find((item) => item.room_id === room.room_id);
        if (!refreshedRoom) return;
        room = refreshedRoom;
    }
};

const manageRooms = async () => {
    while (true) {
        header("Facility Management");
        const rooms = await loadRooms();
        if (!rooms) {
            await pause();
            return;
        }
        listRooms(rooms);

        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "Choose an action:",
            choices: [
                { title: "Add a room", value: "add" },
                ...(rooms.length
                    ? [{ title: "Select a room to view or edit", value: "select" }]
                    : []),
                { title: "Back to admin dashboard", value: "back" },
            ],
        });
        if (!action || action === "back") return;
        if (action === "add") {
            await addRoom();
            continue;
        }

        const { roomId } = await prompts({
            type: "select",
            name: "roomId",
            message: "Select a room:",
            choices: rooms.map((room) => ({
                title: `${room.room_number} - ${room.room_name} [${roomStatus(room)}]`,
                value: room.room_id,
            })),
        });
        const room = rooms.find((item) => item.room_id === roomId);
        if (room) await manageRoom(room);
    }
};

const BOOKING_WITH_USER = `${BOOKING_SELECT.trimEnd()},
    users ( full_name, email )`;

const viewBookings = async () => {
    header("All Bookings");
    const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_WITH_USER)
        .order("booking_date", { ascending: true });
    if (error) {
        console.log(`\nFailed to load bookings: ${error.message}`);
        return pause();
    }
    if (!data?.length) {
        console.log("No bookings yet.");
        return pause();
    }

    const now = Date.now();
    (data as any[]).forEach((row) => {
        const b = shapeBooking(row, now);
        console.log(`${b.reference}  ${b.date}  ${row.start_time} - ${row.end_time}`);
        console.log(`  ${b.facility} (${b.building})  Booked by: ${b.who ?? row.user_id}`);
        console.log(`  Purpose: ${b.purpose || "-"}  Type: ${b.eventType ?? "-"}`);
        console.log(`  Status: ${b.status.toUpperCase()}\n`);
    });
    await pause();
};

const updateBooking = async (account: TerminalAccount) => {
    header("Update Booking Status");
    const today = manilaDate(new Date());
    const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_WITH_USER)
        .gte("booking_date", today)
        .order("booking_date", { ascending: true });

    if (error) {
        console.log(`\nFailed to load bookings: ${error.message}`);
        return pause();
    }
    if (!data?.length) {
        console.log("No upcoming bookings to update.");
        return pause();
    }

    const now = Date.now();
    const shaped = (data as any[]).map((row) => ({ row, b: shapeBooking(row, now) }));
    // pending requests first, then by date
    shaped.sort((x, y) => Number(y.b.status === "pending") - Number(x.b.status === "pending") || x.b.startMs - y.b.startMs);

    const { bookingId } = await prompts({
        type: "select",
        name: "bookingId",
        message: "Select a booking:",
        choices: shaped.map(({ row, b }) => ({
            title: `${b.reference} | ${b.date} ${row.start_time}-${row.end_time} | ${b.facility} | ${b.who ?? "?"} | ${b.status}`,
            value: b.id,
        })),
    });
    if (!bookingId) return;

    const { status } = await prompts({
        type: "select",
        name: "status",
        message: "New status:",
        choices: [
            { title: "Approve", value: "approved" },
            { title: "Reject", value: "rejected" },
            { title: "Cancel", value: "cancelled" },
            { title: "Pending", value: "pending" },
        ],
    });
    if (!status) return;

    let note: string | null = null;
    if (status === "rejected" || status === "cancelled") {
        const answer = await prompts({ type: "text", name: "note", message: "Reason for the student (optional):" });
        note = String(answer.note ?? "").trim() || null;
    }

    // same rules as the website: overlap check, approval record, student notification
    const result = await decideBooking({
        bookingId,
        adminId: account.id,
        decision: status as Decision,
        note,
    });
    if (!result.ok) {
        console.log(`\nCould not update the booking: ${result.error}`);
        return pause();
    }
    console.log(`\nBooking updated to ${status}.`);
    await pause();
};

const adminSession = async (account: TerminalAccount) => {
    while (true) {
        header("Admin Dashboard");
        console.log(`Signed in: ${account.fullName} <${account.email}>\n`);
        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "Choose an admin action:",
            choices: [
                { title: "Facility management - add, view, edit, delete", value: "rooms" },
                { title: "View all bookings", value: "bookings" },
                { title: "Update booking status", value: "booking-status" },
                { title: "Create admin account", value: "create-admin" },
                { title: "Sign out", value: "logout" },
            ],
        });
        if (!action || action === "logout") return;
        if (action === "rooms") await manageRooms();
        if (action === "bookings") await viewBookings();
        if (action === "booking-status") await updateBooking(account);
        if (action === "create-admin") await registerAdmin(false);
    }
};

const main = async () => {
    while (true) {
        header("Admin Terminal");
        console.log("Admin account creation is restricted to the first setup or a signed-in admin.\n");
        const firstAdminSetupAvailable = await isFirstAdminSetupAvailable();
        if (firstAdminSetupAvailable === null) return;

        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "Choose an option:",
            choices: [
                { title: "Admin sign in", value: "login" },
                ...(firstAdminSetupAvailable
                    ? [{ title: "Create the first admin account", value: "signup" }]
                    : []),
                { title: "Exit", value: "exit" },
            ],
        });
        if (action === "exit" || !action) {
            console.log("\nGoodbye.");
            return;
        }
        const account = action === "signup"
            ? await registerAdmin(true)
            : await login("admin");
        if (account) await adminSession(account);
    }
};

main().catch((error: unknown) => {
    console.error("Admin terminal error:", error);
    process.exitCode = 1;
});
