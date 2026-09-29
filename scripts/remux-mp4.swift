// Rewrap a QuickTime .mov as a web-ready .mp4 without re-encoding.
//
// Passthrough copies the existing H.264 and AAC streams untouched, and
// shouldOptimizeForNetworkUse puts the index at the front so the clip starts
// on the first bytes instead of after the whole file has downloaded.
//
//   swift scripts/remux-mp4.swift <source> <destination>

import AVFoundation
import Foundation

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: remux-mp4.swift <source> <destination>\n".data(using: .utf8)!)
  exit(2)
}

let source = URL(fileURLWithPath: args[1])
let destination = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: destination)

let asset = AVURLAsset(url: source)
guard
  let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough)
else {
  FileHandle.standardError.write("could not open \(source.path)\n".data(using: .utf8)!)
  exit(1)
}

session.outputURL = destination
session.outputFileType = .mp4
session.shouldOptimizeForNetworkUse = true

let done = DispatchSemaphore(value: 0)
session.exportAsynchronously { done.signal() }
done.wait()

if session.status != .completed {
  let reason = session.error?.localizedDescription ?? "unknown error"
  FileHandle.standardError.write("export failed: \(reason)\n".data(using: .utf8)!)
  exit(1)
}
