// swift-tools-version: 6.0

import Foundation
import PackageDescription

let infoPlist = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()
    .appendingPathComponent("CalendarHelper-Info.plist")
    .path

let package = Package(
    // The linker uses the executable name as its ad hoc signing identifier.
    name: "com.radnok.acal.calendar-reader",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", exact: "1.1.0")
    ],
    targets: [
        .executableTarget(
            name: "com.radnok.acal.calendar-reader",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            path: "Sources",
            linkerSettings: [
                .unsafeFlags([
                    // Intel output is otherwise unsigned by the linker.
                    "-Xlinker", "-adhoc_codesign",
                    "-Xlinker", "-sectcreate",
                    "-Xlinker", "__TEXT",
                    "-Xlinker", "__info_plist",
                    "-Xlinker", infoPlist,
                ])
            ]
        )
    ]
)
