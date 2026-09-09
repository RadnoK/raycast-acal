import EventKit
import Foundation
import RaycastSwiftMacros

struct CalendarValue: Encodable {
    let id: String
    let title: String
    let source: String
    let writable: Bool
}

struct GuestValue: Encodable {
    let name: String
    let email: String
}

struct EventValue: Encodable {
    let id: String
    let calendarId: String
    let title: String
    let start: String
    let end: String
    let timeZone: String
    let location: String
    let notes: String
    let attendees: [GuestValue]
    let allDay: Bool
}

struct HistoryValue: Encodable {
    let calendars: [CalendarValue]
    let events: [EventValue]
    let truncated: Bool
}

struct StatusValue: Encodable {
    let authorized: Bool
    let status: Int
}

private enum CalendarReaderError: LocalizedError, CustomStringConvertible {
    case accessRequired
    case authorizationFailed
    case invalidRange
    case unavailableCalendar
    case noCalendars
    case responseTooLarge

    // The generated bridge prints Error values directly to stderr.
    var description: String { errorDescription ?? "Could not read calendar history." }

    var errorDescription: String? {
        switch self {
        case .accessRequired:
            "Allow Cailendar/Raycast to read calendars in the Cailendar Connections command."
        case .authorizationFailed:
            "Could not request calendar access. Check calendar permissions in System Settings."
        case .invalidRange:
            "Invalid calendar history range. Choose 30, 90, or 180 days."
        case .unavailableCalendar:
            "A saved calendar is no longer available."
        case .noCalendars:
            "No calendars found. Add your Google account in the Calendar app on your Mac."
        case .responseTooLarge:
            "Calendar history is too large. Choose fewer calendars or a shorter history range."
        }
    }
}

// The Raycast bridge owns the child process but has no timeout. Terminate the
// process itself so a stalled EventKit request cannot outlive the 90-second limit.
private func limitProcessLifetime() {
    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 90) {
        FileHandle.standardError.write(Data("Calendar access timed out. Try again.\n".utf8))
        exit(EXIT_FAILURE)
    }
}

@raycast
func nativeCalendarStatus() -> StatusValue {
    limitProcessLifetime()
    let status = EKEventStore.authorizationStatus(for: .event)
    return StatusValue(authorized: status == .fullAccess, status: status.rawValue)
}

@raycast
func nativeAuthorizeCalendar() async throws -> StatusValue {
    limitProcessLifetime()
    let status = EKEventStore.authorizationStatus(for: .event)
    if status == .fullAccess {
        return StatusValue(authorized: true, status: status.rawValue)
    }
    do {
        let store = EKEventStore()
        let granted = try await store.requestFullAccessToEvents()
        return StatusValue(
            authorized: granted,
            status: EKEventStore.authorizationStatus(for: .event).rawValue
        )
    } catch {
        throw CalendarReaderError.authorizationFailed
    }
}

@raycast
func nativeReadHistory(days: Int, calendarIds: [String]) throws -> HistoryValue {
    limitProcessLifetime()
    guard [30, 90, 180].contains(days) else {
        throw CalendarReaderError.invalidRange
    }
    guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
        throw CalendarReaderError.accessRequired
    }

    let store = EKEventStore()
    let allCalendars = store.calendars(for: .event)
    let calendars: [EKCalendar]
    if !calendarIds.isEmpty {
        let selectedIds = Set(calendarIds)
        calendars = allCalendars.filter { selectedIds.contains($0.calendarIdentifier) }
        guard calendars.count == selectedIds.count else {
            throw CalendarReaderError.unavailableCalendar
        }
    } else {
        calendars = allCalendars
    }
    guard !calendars.isEmpty else {
        throw CalendarReaderError.noCalendars
    }

    let now = Date()
    let predicate = store.predicateForEvents(
        withStart: now.addingTimeInterval(-Double(days) * 86400),
        end: now.addingTimeInterval(14 * 86400),
        calendars: calendars
    )
    let events = store.events(matching: predicate)
        .filter { $0.status != .canceled }
        .sorted { $0.startDate > $1.startDate }
    let formatter = ISO8601DateFormatter()
    let values = events.prefix(3000).map { event in
        let guests = (event.attendees ?? []).compactMap { attendee -> GuestValue? in
            let address = attendee.url.absoluteString
            guard address.lowercased().hasPrefix("mailto:") else { return nil }
            let rawEmail = String(address.dropFirst(7))
            return GuestValue(
                name: attendee.name ?? "",
                email: rawEmail.removingPercentEncoding ?? rawEmail
            )
        }
        return EventValue(
            id: "\(event.eventIdentifier ?? event.calendarItemIdentifier):\(formatter.string(from: event.startDate))",
            calendarId: event.calendar.calendarIdentifier,
            title: event.title ?? "",
            start: formatter.string(from: event.startDate),
            end: formatter.string(from: event.endDate),
            timeZone: event.timeZone?.identifier ?? TimeZone.current.identifier,
            location: String((event.location ?? "").prefix(500)),
            notes: String((event.notes ?? "").prefix(1800)),
            attendees: guests,
            allDay: event.isAllDay
        )
    }
    let history = HistoryValue(
        calendars: calendars.map {
            CalendarValue(
                id: $0.calendarIdentifier,
                title: $0.title,
                source: $0.source.title,
                writable: $0.allowsContentModifications
            )
        },
        events: values,
        truncated: events.count > 3000
    )
    // Preserve the former process bridge's 16 MiB response limit.
    guard try JSONEncoder().encode(history).count <= 16 * 1024 * 1024 else {
        throw CalendarReaderError.responseTooLarge
    }
    return history
}
